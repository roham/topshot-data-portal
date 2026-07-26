#!/usr/bin/env python3
"""
verify-via-openai.py — cross-vendor review for V7 loops.

Invoked by the orchestrator after every iteration to get an INDEPENDENT verdict
from a different model class (OpenAI gpt-5.6-sol) than the Claude-driven loop.
The V4 failure was Claude judging Claude — converged on its own blind spots.
Cross-vendor review breaks the convergence.

Usage:
  python verify-via-openai.py \\
    --loop A \\
    --iteration-state loop/v7/state/iteration-0042.json \\
    --diff-path /tmp/iteration-0042.diff \\
    --rubric-path research/quality-rubrics/loop-a-rubric.md \\
    --doctrine-path research/doctrine.md \\
    --source-of-truth-path research/data-schema/source-of-truth-mapping.md \\
    --audit-baseline-path research/audits-baseline/2026-05-17-baseline.md \\
    --out-path loop/v7/state/iteration-0042.verify.json

For Loop B (vision-diff):
  python verify-via-openai.py \\
    --loop B \\
    --iteration-state loop/v7/state/iteration-0017.json \\
    --diff-path /tmp/iteration-0017.diff \\
    --rubric-path research/quality-rubrics/loop-b-rubric.md \\
    --doctrine-path research/doctrine.md \\
    --rendered-screenshot /tmp/iteration-0017-rendered.png \\
    --comparable-screenshot research/comparables/dapper-market/moment-detail-15340.png \\
    --comparable-name "dapper.market moment detail" \\
    --signature-move "3D holographic card render center; dense right panel with parallel selector, price tiers, activity tabs" \\
    --out-path loop/v7/state/iteration-0017.verify.json

Exit codes:
  0 — PASS
  1 — NEEDS-WORK
  2 — FAIL
  3 — script error (API failure, missing inputs, etc.)
"""

import argparse
import base64
import glob
import hashlib
import json
import os
import sys
import time
from pathlib import Path

# OpenAI client. Requires `pip install openai`.
# If running on the daemon, install via `pip install openai` in the user's venv.
try:
    from openai import OpenAI
except ImportError:
    print(json.dumps({"verdict": "FAIL", "error": "openai package not installed — pip install openai"}), file=sys.stderr)
    sys.exit(3)

# --- Iteration cap (cures the 15+ iteration slot machine) ---
# The V7 loop's design is: FAIL -> re-dispatch Builder -> iterate -> verify again.
# Without a cap, a stuck track churns 15+ iterations burning tokens and bloating
# scope. The cap is per (loop, track) across all iterations within a rolling
# window. After MAX_VERIFY_FAILS non-PASS verdicts on the same track, the script
# refuses to verify and tells the orchestrator to surface to Roham and STOP.
# See dexter wiki/learnings/2026-07-25-unbounded-verification-retry-slot-machine.md
MAX_VERIFY_FAILS = 3          # non-PASS verdicts per (loop, track) in the window, then surface
VERIFY_WINDOW_SECONDS = 6 * 3600  # rolling window; verifies older than this don't count


def _cap_state_dir():
    d = Path("loop/v7/state/.verify-cap")
    d.mkdir(parents=True, exist_ok=True)
    return d


def _cap_key(loop, track):
    return f"{loop}-{track}"


def _load_cap_state(loop, track):
    f = _cap_state_dir() / f"{_cap_key(loop, track)}.json"
    if not f.exists():
        return {"loop": loop, "track": track, "fails": []}
    try:
        return json.loads(f.read_text())
    except Exception:
        return {"loop": loop, "track": track, "fails": []}


def _save_cap_state(loop, track, state):
    f = _cap_state_dir() / f"{_cap_key(loop, track)}.json"
    f.write_text(json.dumps(state, indent=2))


def _prune_fails(state, now=None):
    now = now if now is not None else time.time()
    state["fails"] = [x for x in state.get("fails", []) if now - x.get("ts", 0) < VERIFY_WINDOW_SECONDS]
    return state["fails"]


def check_verify_cap(loop, track):
    """Return (ok, message). ok=False means refuse to verify — surface to Roham."""
    state = _load_cap_state(loop, track)
    recent = _prune_fails(state)
    if len(recent) >= MAX_VERIFY_FAILS:
        return False, (
            f"BOUND: {len(recent)} non-PASS verdicts on loop {loop} track {track} in the last "
            f"{VERIFY_WINDOW_SECONDS//3600}h (cap={MAX_VERIFY_FAILS}). The slot machine stops here. "
            f"DO NOT re-dispatch Builder. Surface the failure_modes to Roham and STOP. "
            f"See dexter wiki/learnings/2026-07-25-unbounded-verification-retry-slot-machine.md"
        )
    return True, ""


def record_verify_result(loop, track, verdict):
    """Record a verify result. Only non-PASS verdicts count toward the cap."""
    if verdict == "PASS":
        return  # PASS resets nothing; the cap is on consecutive fails
    state = _load_cap_state(loop, track)
    state.setdefault("fails", []).append({"verdict": verdict, "ts": time.time()})
    _save_cap_state(loop, track, state)


# --- Model cascade (rip out the no-fallback constraint per Roham 2026-07-25) ---
# The 2026-05-17 "gpt-5.6-sol ONLY — NO FALLBACK" decision is reverted. The V4
# failure (Claude judging Claude) is cured by cross-vendor, not by a single
# model. A cascade gives resilience without losing cross-vendor independence.
MODELS_TO_TRY = ["gpt-5.6-sol", "gpt-5.1", "gpt-4o"]


def read_file(path: str | None) -> str:
    if not path:
        return ""
    p = Path(path)
    if not p.exists():
        return f"<missing file: {path}>"
    return p.read_text()


def read_image_b64(path: str | None) -> str | None:
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        return None
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def build_loop_a_prompt(args) -> list[dict]:
    """Build the messages array for Loop A (data quality) review."""
    doctrine = read_file(args.doctrine_path)
    rubric = read_file(args.rubric_path)
    sot = read_file(args.source_of_truth_path)
    audit_baseline = read_file(args.audit_baseline_path)
    iteration_state = read_file(args.iteration_state)
    diff = read_file(args.diff_path)

    system = """You are an independent code + data review agent for the Top Shot Data Portal V7 Loop A (data quality + completeness).

A Claude-driven autonomous loop has just completed an iteration that modifies the portal's data layer (ETL scripts, Supabase migrations, materialized views, audit probes). Your job is to give an INDEPENDENT verdict on whether the change is correct, complete, and aligned with doctrine.

The V4 failure was Claude judging Claude — converged on its own blind spots. Your job is to break that convergence. Read critically. Find what the in-loop judge missed.

IMPORTANT — BOOTSTRAP TRACK EXCEPTION:
If the iteration state shows track = "BOOTSTRAP", this is the special Loop A Iteration 1 infrastructure build. Per the orchestration protocol, Iteration 1 does NOT close data gaps — its sole product is the supervision infrastructure (/admin/review surface, feature_reviews table, CEO vote API) that subsequent iterations use. Judge it on:
- Does the migration create the feature_reviews table correctly with required columns, constraints, and policies?
- Does the /admin/review page render review proposals and vote buttons correctly?
- Does the /api/admin/review GET/POST API work correctly?
- Is the build GREEN?
- Are there security or schema correctness issues?
Do NOT penalize BOOTSTRAP for failing to close P0 data gaps — that is not its purpose. Do NOT cite the rubric's 8-track list as a basis for FAIL on a BOOTSTRAP iteration.

You MUST output ONLY valid JSON matching the schema below. No prose before/after the JSON. No markdown fences. Just the JSON object."""

    user = f"""## Context

### Doctrine (load-bearing principles)

{doctrine}

---

### Multi-axis Rubric (how Loop A iterations are graded)

{rubric}

---

### Source-of-truth mapping (ground truth for data shape + known gaps)

{sot}

---

### Audit baseline (pre-iteration data quality snapshot)

{audit_baseline}

---

### This iteration's state

```json
{iteration_state}
```

---

### Git diff applied by this iteration

```diff
{diff}
```

---

## Your task

Review this iteration's change. Answer these questions independently of any Claude judgment that has already been made:

1. **Does the change address the gap it claims to address?** Quote specific lines of the diff that act on the gap. If the diff is unrelated to the claimed gap, that's a FAIL.

2. **Does the change have HIDDEN failure modes?** Specifically:
   - Will the change break any other table / MV / query downstream?
   - Is the migration reversible if it fails mid-apply?
   - Will the change cause a data inconsistency between source-of-truth and Supabase mirror?
   - Does it leak PII (per BLOCKLIST) or remove a PII-protective measure?

3. **Score each rubric axis (A1–A7) 0–100.** Provide brief evidence for each.

4. **Identify doctrine violations.** Cite the principle (P1–P9) and the specific code/data that violates it.

5. **Identify what the in-loop Claude reviewer likely MISSED.** This is your value-add.

6. **Would you ship this if you were the CEO?** Boolean + 1-line justification.

## Output schema (JSON only, no other text)

{{
  "verdict": "PASS" | "FAIL" | "NEEDS-WORK",
  "axis_scores": {{
    "a1_completeness": 0-100,
    "a2_accuracy": 0-100,
    "a3_freshness": 0-100,
    "a4_schema_correctness": 0-100,
    "a5_organization": 0-100,
    "a6_pii_safety": 0-100,
    "a7_doctrine_compliance": 0-100
  }},
  "weighted_overall": 0-100,
  "addresses_claimed_gap": true | false,
  "addresses_evidence": "specific lines from diff",
  "hidden_failure_modes": [
    {{ "what": "...", "severity": "P0|P1|P2", "evidence": "..." }}
  ],
  "doctrine_violations": [
    {{ "principle": "P1..P9", "what_breaks_it": "..." }}
  ],
  "in_loop_judge_likely_missed": [
    {{ "what": "...", "why_critical": "..." }}
  ],
  "improvements": [
    {{ "axis": "a1..a7", "suggestion": "...", "priority": "P0|P1|P2" }}
  ],
  "would_you_ship_this": true | false,
  "one_line_justification": "..."
}}

Pass criteria:
- verdict = PASS iff: weighted_overall ≥ 80 AND no P0 hidden_failure_modes AND no doctrine_violations AND would_you_ship_this = true.
- verdict = NEEDS-WORK iff: weighted_overall ≥ 70 AND no P0 hidden_failure_modes AND ≤ 1 doctrine_violation (P3+).
- Otherwise: verdict = FAIL.

Be specific. Cite line numbers from the diff. Quote schema lines from the rubric. Do not say "looks reasonable" — say what specifically you verified.
"""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def build_loop_b_prompt(args) -> list[dict]:
    """Build the messages array for Loop B (viz + design) review with vision inputs."""
    doctrine = read_file(args.doctrine_path)
    rubric = read_file(args.rubric_path)
    iteration_state = read_file(args.iteration_state)
    diff = read_file(args.diff_path)

    rendered_b64 = read_image_b64(args.rendered_screenshot)
    comparable_b64 = read_image_b64(args.comparable_screenshot)

    system = """You are an independent visual design + code review agent for the Top Shot Data Portal V7 Loop B (visualization + design).

A Claude-driven autonomous loop has just shipped a portal page. A Claude vision-judge has already scored it. Your job is to give an INDEPENDENT vision-diff verdict between the rendered page and its named comparable, AND verify the in-loop judge didn't miss something.

The V4 failure: 8 of 11 features "passed" but were visually broken because the in-loop Claude judge accepted honest empty state as PASS on viz features. Your job is to catch what Claude misses.

You MUST output ONLY valid JSON matching the schema below. No prose. No markdown. Just the JSON object."""

    user_content = [
        {
            "type": "text",
            "text": f"""## Context

### Doctrine

{doctrine}

---

### Multi-axis Loop B Rubric

{rubric}

---

### This iteration's state

```json
{iteration_state}
```

---

### Git diff

```diff
{diff[:5000]}
```

(Diff truncated to 5K chars if larger.)

---

### Comparable name

{args.comparable_name}

### Signature move to port (per doctrine §0 + rubric §2)

{args.signature_move}

---

Below are TWO images attached:
1. **COMPARABLE SCREENSHOT** — what we are trying to port.
2. **RENDERED PAGE SCREENSHOT** — what our portal actually shipped.

Compare them. Score the fidelity.
"""
        }
    ]

    # Attach comparable image
    if comparable_b64:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{comparable_b64}", "detail": "high"}
        })
    else:
        user_content.append({"type": "text", "text": "(comparable screenshot missing — verdict cannot score B1 fidelity)"})

    # Attach rendered image
    if rendered_b64:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{rendered_b64}", "detail": "high"}
        })
    else:
        user_content.append({"type": "text", "text": "(rendered screenshot missing — verdict cannot score B1 fidelity)"})

    user_content.append({
        "type": "text",
        "text": """
## Your task

Compare the comparable screenshot to the rendered page screenshot. Identify:

1. **Does the rendered page port the signature move described above?** (Y/N)
2. **Visual fidelity score, 1-10** (10 = indistinguishable; 7 = recognizable; 4 = inspired-by; 1 = nothing in common).
3. **Specific gaps:** what moves from the comparable are MISSING on the rendered page?
4. **Specific extras to remove:** what's on the rendered page that shouldn't be there?
5. **Density verdict:** does the rendered page meet the comparable's data density?
6. **Doctrine violations:** cite principle + what breaks it.

## Output schema (JSON only)

{
  "verdict": "PASS" | "FAIL" | "NEEDS-WORK",
  "axis_scores": {
    "b1_fidelity": 1-10,
    "b2_data_substance": 0-100,
    "b3_interactivity": 0-100,
    "b4_doctrine_compliance": 0-100,
    "b5_layout_density": 0-100,
    "b6_performance_a11y": 0-100,
    "b7_cross_vendor": 0-100,
    "b8_ceo_signal": 0-100
  },
  "weighted_overall": 0-100,
  "ports_signature_move": true | false,
  "fidelity_score": 1-10,
  "gaps": [
    { "what": "...", "severity": "P0|P1|P2", "specific_fix": "..." }
  ],
  "extras_to_remove": [
    { "what": "...", "reason": "..." }
  ],
  "density_verdict": "below" | "matches" | "exceeds",
  "doctrine_violations": [
    { "principle": "P1..P9", "what_breaks_it": "..." }
  ],
  "in_loop_judge_likely_missed": [
    { "what": "...", "why_critical": "..." }
  ],
  "would_you_ship_this": true | false,
  "one_line_justification": "..."
}

Pass criteria:
- verdict = PASS iff: ports_signature_move = true AND fidelity_score ≥ 7 AND density_verdict ∈ {matches, exceeds} AND 0 P0 gaps AND 0 doctrine_violations AND would_you_ship_this = true.
- Otherwise: NEEDS-WORK or FAIL based on severity.

Be specific. Don't say "looks good" — say which exact comparable element is present or missing.
"""
    })

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop", required=True, choices=["A", "B"])
    parser.add_argument("--iteration-state", required=True)
    parser.add_argument("--diff-path", required=True)
    parser.add_argument("--rubric-path", required=True)
    parser.add_argument("--doctrine-path", required=True)
    parser.add_argument("--source-of-truth-path", default=None)
    parser.add_argument("--audit-baseline-path", default=None)
    parser.add_argument("--rendered-screenshot", default=None)
    parser.add_argument("--comparable-screenshot", default=None)
    parser.add_argument("--comparable-name", default=None)
    parser.add_argument("--signature-move", default=None)
    parser.add_argument("--out-path", required=True)
    parser.add_argument("--model", default=None,
                        help="OpenAI model to use. If omitted, cascades: gpt-5.6-sol -> gpt-5.1 -> gpt-4o. "
                             "(The 2026-05-17 'gpt-5.6-sol ONLY — NO FALLBACK' decision is reverted per Roham 2026-07-25.)")
    parser.add_argument("--seed", type=int, default=None, help="Optional OpenAI seed for reproducible voting (V8 P13).")
    parser.add_argument("--temperature", type=float, default=None, help="Optional temperature override (V8 P13).")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        result = {"verdict": "FAIL", "error": "OPENAI_API_KEY env var not set"}
        Path(args.out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out_path).write_text(json.dumps(result, indent=2))
        sys.exit(3)

    # --- Iteration cap: refuse after MAX_VERIFY_FAILS non-PASS on the same (loop, track) ---
    iteration_state = json.loads(Path(args.iteration_state).read_text())
    track = iteration_state.get("track", "UNKNOWN")
    ok, cap_msg = check_verify_cap(args.loop, track)
    if not ok:
        result = {"verdict": "FAIL", "error": cap_msg, "bound": "verify-cap-exceeded"}
        Path(args.out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out_path).write_text(json.dumps(result, indent=2))
        print(json.dumps({"verdict": "FAIL", "bound": "verify-cap-exceeded", "one_line": cap_msg}))
        sys.exit(2)

    client = OpenAI(api_key=api_key)

    if args.loop == "A":
        messages = build_loop_a_prompt(args)
    else:
        messages = build_loop_b_prompt(args)

    # --- Model cascade (replaces the no-fallback constraint) ---
    models_to_try = [args.model] if args.model else MODELS_TO_TRY
    result = None
    last_err = None
    for model in models_to_try:
        try:
            kwargs = {
                "model": model,
                "messages": messages,
                "max_completion_tokens": 16000,
                "response_format": {"type": "json_object"},
            }
            if args.seed is not None:
                kwargs["seed"] = args.seed
            if args.temperature is not None:
                kwargs["temperature"] = args.temperature
            response = client.chat.completions.create(**kwargs)

            content = response.choices[0].message.content
            result = json.loads(content)
            def _safe_usage(u):
                if u is None:
                    return None
                return {
                    "completion_tokens": getattr(u, "completion_tokens", None),
                    "prompt_tokens": getattr(u, "prompt_tokens", None),
                    "total_tokens": getattr(u, "total_tokens", None),
                }

            result["_meta"] = {
                "model_used": response.model,
                "model_requested": model,
                "usage": _safe_usage(response.usage) if hasattr(response, "usage") else None,
            }
            break  # success — stop the cascade
        except Exception as e:
            last_err = f"{model}: {e}"
            continue

    if result is None:
        result = {"verdict": "FAIL", "error": f"all models failed in cascade: {last_err}"}

    Path(args.out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_path).write_text(json.dumps(result, indent=2))

    verdict = result.get("verdict", "FAIL")
    print(json.dumps({"verdict": verdict, "weighted_overall": result.get("weighted_overall"), "one_line": result.get("one_line_justification")}))

    # Record for the iteration cap (only non-PASS counts).
    record_verify_result(args.loop, track, verdict)
    recent_fails = _prune_fails(_load_cap_state(args.loop, track))
    if verdict != "PASS" and len(recent_fails) >= MAX_VERIFY_FAILS:
        print(f"BOUND: {len(recent_fails)} non-PASS verdicts on loop {args.loop} track {track}. "
              f"DO NOT re-dispatch Builder. Surface to Roham and STOP.", file=sys.stderr)

    if verdict == "PASS":
        sys.exit(0)
    elif verdict == "NEEDS-WORK":
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()
