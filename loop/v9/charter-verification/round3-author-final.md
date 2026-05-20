# Dexter's round-3 response — closing convergence

You held 5 findings in round 2, surfaced 4 new concerns, and asked 8 questions. I'm answering each concretely and folding the fixes in. Round 3 is the convergence round — confirm or refuse.

## Concessions

### V8→V9 migration — CONCEDED (you were right)

I checked V8 state. `loop/v8/state/task-ledger.json` has a real queue with Tier A items that haven't shipped:
- A-3 sticky Mcap toggle — NOT SHIPPED, maps to POLISH-EXISTING
- A-4 compare-formulas drawer — NOT SHIPPED, maps to VIZ-COMPLETENESS (blocked on mv_market_caps_avgsale per handover §7 B1)
- A-5 per-card Pro toggle — NOT SHIPPED, maps to POLISH-EXISTING
- A-2 IndexPillRow — SUPERSEDED (TopNav owns it now), retire with rationale

`program-database/` carries forward unchanged. Migration tool spec:

```ts
// loop/v9/tools/migrate_v8_queues.ts
//
// Reads loop/v8/state/task-ledger.json `queue` array. For each item:
//   status === "shipped" → log to migration-report.md, skip
//   status === "queued" with track-mapping rule → write to corresponding V9 queue
//   status === "queued" with no clear mapping → flag for manual review
//   status === "superseded" → log to migration-report.md with rationale
//
// Track-mapping rules:
//   files_to_touch includes app/page.tsx OR components/TopNav.tsx → tentatively DISCOVERABILITY-GAP (manual confirm)
//   signature_move contains "toggle"|"chrome"|"sticky"|"density" → POLISH-EXISTING
//   signature_move contains "chart"|"depth"|"multi-line"|"crosshair"|"sparkline" → VIZ-COMPLETENESS
//   default → POLISH-EXISTING
//
// Writes:
//   loop/v9/queues/{discoverability,polish,visual}.json (with schema_version:"v9")
//   loop/v9/state/migration-report.md (audit trail)
//   loop/v9/MIGRATED (atomic flag — Track Selector refuses to dispatch without this file)
```

Activation gate: V9 ACTIVE flag write-step depends on MIGRATED flag existing. Orchestrator refuses to dispatch first iter if MIGRATED is absent.

### Queue file schema — CONCEDED

```
loop/v9/queues/{discoverability,polish,visual}.json
```

```json
{
  "schema_version": "v9",
  "track": "DISCOVERABILITY-GAP" | "POLISH-EXISTING" | "VIZ-COMPLETENESS",
  "queue": [
    {
      "id": "DISC-001A",
      "title": "...",
      "track": "DISCOVERABILITY-GAP",
      "rw_class": "READ-WRITE",
      "status": "open" | "in_progress" | "done" | "blocked" | "retired",
      "priority": 100,
      "created_at": "2026-05-19T...Z",
      "updated_at": "...",
      "age_hours": 0,
      "blocked_by": null,
      "rationale": "...",
      "end_state": "...",
      "comparable_primary": "...",
      "comparable_cross_domain": "...",
      "signature_move": "...",
      "doctrine_quote": "...",
      "load_bearing_file": "...",
      "spot_read_target": "...",
      "estimated_effort": "S" | "M" | "L",
      "estimated_minutes": 60
    }
  ]
}
```

CI check: `loop/v9/scripts/validate-queue-schemas.sh` runs on every commit touching `loop/v9/queues/*.json`. Validates against `loop/v9/schemas/queue.schema.json` (JSON Schema draft-07).

### banned-terms.yml + DOM scan — CONCEDED

```yaml
# loop/v9/lint/banned-terms.yml
version: 1
banned:
  - pattern: "explore!"
    rationale: "marketing exclamation"
    severity: error
  - pattern: "discover!"
    severity: error
  - pattern: "trending now"
    severity: error
  - pattern: "coming soon"
    severity: error
  - pattern: "still computing"
    severity: error
  - pattern: "≥ 7 days"
    severity: error
  - pattern: "data not yet available"
    severity: error
  - pattern: "(?i)\\bawesome\\b"
    severity: warn
  - pattern: "(?i)\\bamazing\\b"
    severity: warn
  - pattern: "(?i)\\bbest-in-class\\b"
    severity: warn  # we'll cite Card Ladder etc. but never claim it about ourselves
allowlist:
  - file_glob: "research/**/*.md"  # doctrine docs can reference banned terms in critique context
  - file_glob: ".full-review/**"
```

Both `loop/v9/prompts/doctrine-checker-patch.md` (per-iter diff grep) AND `loop/v8/scripts/verify-deterministic.sh` (copy-audit step) load from `banned-terms.yml`. Single source of truth.

Baseline iter (filed as P0 POLISH-EXISTING task at V9 boot): run a repo-wide grep + Playwright DOM-text scan on `app/page.tsx`, `components/TopNav.tsx`, and the 4 highest-traffic surfaces (`/players`, `/sniper`, `/movers`, `/feed`). Clean violations. After that, per-iter diff grep prevents regression.

### Doctrine "quote-matches-change" validation — CONCEDED

Commit message template (enforced by Doctrine Checker):

```
[V9 ITER-<N> IMPL] <one-line description>

Primary comparable: <verbatim>
Cross-domain comparable: <verbatim>
Signature move: <verbatim>
Doctrine quote: "<verbatim from research/00-product-pillars-v3.md>"
Why this quote applies: <one sentence connecting the quote to the touched files/components>
Touched files: <list>
```

Doctrine Checker LLM check (Sonnet):
- Reads commit message
- Reads `git show HEAD --stat` for touched files
- Asks: "Does the cited doctrine quote materially constrain or guide the change in the touched files?"
- Returns PASS only if the quote-to-change semantic connection is concrete (not generic "data viz is the brand" applied to a CSS-only change). FAIL otherwise; Implementer re-dispatches with refined commit message.

### Discovery Auditor → inventory-only — CONCEDED

Refined Discovery Auditor output:

```json
// loop/v9/state/iteration-<N>/discovery-audit.json
{
  "schema_version": "v9",
  "iter": "<N>",
  "inventory": [
    {
      "route": "/players",
      "page_tsx_exists": true,
      "linked_from_topnav_primary": false,
      "linked_from_homepage": false,
      "linked_from_search_resolver": false,
      "linked_from_footer": false,
      "verdict": "UNREACHABLE-AS-HERO",
      "evidence": {
        "grep_topnav": "0 matches for href=\"/players\" in components/TopNav.tsx",
        "grep_homepage": "0 matches for /players in app/page.tsx",
        "grep_search": "0 matches in components/SearchResolver.tsx"
      }
    }
  ]
}
```

Ranking + proposals + comparable citations move to Planner (who reads `discovery-audit.json` as input). Auditor is now pure inventory; no overlap with Planner.

### Search resolver path — CONCEDED (configurable + fallback)

Track Selector loads resolver paths from `loop/v9/config/discoverability-rules.yml`:

```yaml
search_resolver_paths:
  - components/SearchResolver.tsx
  - components/CommandPalette/index.tsx
  - components/CommandMenu/index.tsx
  - components/TopNav.tsx  # current /u/ resolver lives here
fallback_glob: "components/**/*Search*.{ts,tsx}"
fallback_glob_secondary: "components/**/*Command*.{ts,tsx}"
```

If primary paths all empty, Track Selector falls back to globs. If all empty, route is presumed unreachable from search.

### M2 — filename audit before rename — CONCEDED

Before renaming `00b-discovery-audit.md` → `discovery-audit.md`, run:

```bash
git grep -nE '00b-discovery-audit|00b-' loop/ scripts/ .claude/ .github/
```

If any matches → update them in the SAME commit as the rename. If no matches → safe to rename.

Conservative call: KEEP the `00b-` prefix for now. The cost of breaking a script reference is higher than the cost of an awkward filename. Reconsider after V9 has 10+ iters under its belt and the file references are fully audited.

### Cron tick reentrancy lock — CONCEDED

```
loop/v9/LOCK
```

Written atomically at iter-start:

```json
{
  "iter_id": "<N>",
  "pid": <pid>,
  "started_at": "<iso>",
  "stage": "track-selector" | "discovery-auditor" | "planner" | ...,
  "expected_completion": "<iso + 90min>"
}
```

Cron tick checks LOCK first:
- LOCK absent OR LOCK.expected_completion < now → safe to dispatch new iter
- LOCK present AND not expired → defer; log to `state/cron-deferred.jsonl`

LOCK removed on iter-complete OR on Meta-Track activation.

### Judge escalation triggers — CONCEDED (formalize in §3 G7)

Default: Haiku-tier ×3 voting per iter. Escalate to full gpt-5 ×3 voting when ANY:
1. Reviewer disagreement (G5 returns "Quality FAIL, Completeness PASS" or vice versa)
2. Probe/screenshot anomaly (G6 deterministic verifier flags `viz_nuance_warning: true`)
3. Doctrine/architectural change (iter touches `loop/`, `research/00-foundation*.md`, `research/00-product-pillars*.md`, or `components/TopNav.tsx`)
4. Meta-Track active (previous iter failed)

Default cost: ~$0.30/iter Haiku voting. Escalated: ~$3/iter full gpt-5. Expected escalation rate: ~15% of iters → average cost ~$0.70/iter Judge stage. Inside §10 budget envelope.

## M1 ordering — CONFIRMED in final §6

Iter sequence:
1. **Iter-1: DISC-001A** (DISCOVERABILITY-GAP, ≤60 min) — Players-teaser tile on `/` above the Grail+Rookies hero pair. List shape (PSA-sidebar comparable), reusing existing `Sparkline` primitive. Top 6 players by 24h volume, each row clickable to `/player/[id]`.
2. **Iter-2: NAV-001** (POLISH-EXISTING, ~75 min) — ⌘K command palette on TopNav with universal resolver (players + sets + editions + teams + usernames + addresses), `/` keyboard shortcut bind, `?` for shortcut help modal.
3. **Iter-3: DISC-001B** (DISCOVERABILITY-GAP, ~75 min) — Players home tile upgrade to chart-canvas hero with Polymarket multi-line (one line per top-6 player) over `?w=` window.

This matches Roham's verbatim "home page followed by navigation" priority order.

## Round-3 questions answered (your 8)

1. ✅ Queue schema + paths + schema_version:'v9' + CI validation — defined above
2. ✅ V8→V9 migration tool + blocking gate — defined above
3. ✅ banned-terms.yml + DOM-level scan baseline iter — defined above
4. ✅ Doctrine "quote-matches-change" via "Why this quote applies" line + LLM check — defined above
5. ✅ Discovery Auditor inventory-only — refined above
6. ✅ M1 ordering codified — confirmed above
7. ✅ Filename rename audit — deferred; keep `00b-` prefix until 10+ iters in
8. ✅ Judge escalation triggers — formalized above

## Final question back to you

With every "must_fix_remaining" from round 2 now addressed (the 9 items), are we ship-ready? Return round-3 verdict in the same JSON schema:

- `verdict_round3`: PASS / NEEDS-WORK / FAIL
- `would_recommend_shipping_round3`: yes / with_fixes / no
- Any remaining must-fix items
- `convergence_reached`: yes / no (i.e., is round 4 needed?)
