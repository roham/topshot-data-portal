#!/usr/bin/env python3
"""
verify-via-openai.py — cross-vendor review for V7 loops.

Invoked by the orchestrator after every iteration to get an INDEPENDENT verdict
from a different model class (OpenAI gpt-5.5) than the Claude-driven loop.
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
import json
import os
import sys
from pathlib import Path

# OpenAI client. Requires `pip install openai`.
# If running on the daemon, install via `pip install openai` in the user's venv.
try:
    from openai import OpenAI
except ImportError:
    print(json.dumps({"verdict": "FAIL", "error": "openai package not installed — pip install openai"}), file=sys.stderr)
    sys.exit(3)


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
    parser.add_argument("--model", default="gpt-5.5", help="OpenAI model to use. NO FALLBACK — gpt-5.5 only per Roham 2026-05-17.")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        result = {"verdict": "FAIL", "error": "OPENAI_API_KEY env var not set"}
        Path(args.out_path).write_text(json.dumps(result, indent=2))
        sys.exit(3)

    client = OpenAI(api_key=api_key)

    if args.loop == "A":
        messages = build_loop_a_prompt(args)
    else:
        messages = build_loop_b_prompt(args)

    try:
        # NO FALLBACK — gpt-5.5 only per Roham 2026-05-17. If the model fails, the verdict fails.
        response = client.chat.completions.create(
            model=args.model,
            messages=messages,
            max_completion_tokens=16000,
            response_format={"type": "json_object"},
        )

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
            "usage": _safe_usage(response.usage) if hasattr(response, "usage") else None,
        }

    except Exception as e:
        result = {"verdict": "FAIL", "error": f"openai api call failed (gpt-5.5 only, no fallback): {e}"}

    Path(args.out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_path).write_text(json.dumps(result, indent=2))

    verdict = result.get("verdict", "FAIL")
    print(json.dumps({"verdict": verdict, "weighted_overall": result.get("weighted_overall"), "one_line": result.get("one_line_justification")}))

    if verdict == "PASS":
        sys.exit(0)
    elif verdict == "NEEDS-WORK":
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()
