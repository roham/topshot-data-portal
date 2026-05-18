# Loop A — Multi-Axis Quality Rubric (Data Quality & Completeness)

**Status:** Load-bearing for the Loop A orchestration. Every iteration grades itself against these axes BEFORE declaring complete.
**Inheritance:** Inverts the V4 single-axis ("journey passes") failure mode. Adopts the lore-vault 10-dimensional model. Adapted for data work.

The V4 judge accepted "honest empty state" as PASS because the only axis was "DOM rendered without error." This rubric makes that failure structurally impossible — completeness, accuracy, freshness, and organization are scored INDEPENDENTLY and any axis under threshold fails the iteration.

---

## §1 — The seven axes

| Axis | Question it answers | How it's measured | Pass threshold | Weight |
|---|---|---|---|---|
| **A1. Completeness** | Are all the rows that should exist actually present? | Row count vs. expected; date-range coverage vs. target; NULL coverage per critical column | All P0/P1 gaps in `source-of-truth-mapping.md` §5 closed. Date ranges meet doctrine §9 + audit targets. NULL coverage on critical columns < 1% unless documented exception. | 25% |
| **A2. Accuracy** | Does our data match the source-of-truth? | Sampled cross-check: `SELECT * FROM topshot.X LIMIT N` vs. equivalent BQ query for same N keys. Row-equality check. | 100% of sampled rows match BQ source within type-normalization tolerance (e.g., timestamp precision, decimal trailing zeros). | 20% |
| **A3. Freshness** | How current is the data vs. the source? | Max(`source_updated_at`) in Supabase vs. Max(`updated_at`) in BQ source. Lag in hours. | Lag ≤ 24h for daily-grain (market_caps, set_completion). Lag ≤ 2h for streaming-grain (transactions, moments, listings). ETL cursor advancing on schedule. | 15% |
| **A4. Schema correctness** | Are columns the right types, with the right constraints, indexed appropriately? | Schema introspection vs. expected. PKs enforced. FKs not broken. Indexes present on join columns. | 100% of join columns indexed. PK / unique constraints present. No type mismatches. | 10% |
| **A5. Organization (derivative quality)** | Are the new tables / MVs / RPCs the loop has built actually useful + correct? | Per derivative: cardinality matches semantic expectation (e.g., one row per (player, day) in `mv_player_daily_volume`); ROW_NUMBER / partition logic correct; refresh strategy defined. | Each derivative artifact has: doc-comment with semantic invariant; row-count assertion at refresh; refresh cron OR explicit on-demand strategy. | 10% |
| **A6. PII / safety boundary** | Is the BLOCKLIST / ALLOWLIST tight + correct? Are we storing only what we should? | Diff of ETL helpers vs. `etl-helpers.test.mjs`; per-table audit of stored columns vs. expected per ALLOWLIST. | No regressions on `etl-helpers.test.mjs`. Per-table BLOCKLIST exceptions (like `owner_user_id` → `owner_flow_address` on `moments` only) are documented + tested. | 10% |
| **A7. Doctrine compliance** | Does the data shape support the doctrine? | Manual check vs. doctrine §0–§9. Critical: does the data support parallels-as-first-class (P5)? Default-30D windows on movers (P7)? Faithful display of vanity asks (P1)? | All doctrine-relevant data shapes can be queried by a single Supabase call (no client-side stitching across 5 tables). | 10% |

**Pass overall:** ≥ 80% weighted score AND all P0 gaps in source-of-truth-mapping §5 closed AND zero regressions on etl-helpers.test.mjs.

---

## §2 — Per-table completeness criteria (A1 detail)

These are the hard-coded targets. A future loop iteration may revise upward but never downward without doctrine approval.

| Table | Min row count | Min date range | NULL-coverage critical cols | Notes |
|---|---|---|---|---|
| `players` | ≥ 1,200 (per league + retirees) | n/a (catalog) | `player_id`, `full_name`, `last_known_team_id` → < 1% NULL | |
| `teams` | ≥ 30 (current + a few defunct) | n/a | `team_id`, `full_name` → 0 NULL | |
| `sets` | ≥ 200 | n/a | `set_id`, `set_name`, `series_name` → 0 NULL | |
| `plays` | ≥ 9,000 | n/a | `play_id`, `play_name`, `player_id` → < 1% NULL | |
| `editions` | ≥ 11,000 | n/a | `edition_id`, `play_id`, `set_id`, `tier_id`, `parallel_id` → 0 NULL | parallel_id should not be NULL (use sentinel 0 or named) |
| `moments` | ≥ 3,500,000 | n/a (catalog of all minted) | `moment_id`, `edition_id`, `player_id`, `tier_id`, `serial_number`, **`owner_flow_address`** → < 5% NULL | owner_flow_address is the V6→V7 critical fix |
| `transactions` | ≥ 5,000,000 (~2.5M/year × 2y) | **MIN ≤ 2024-05-18** (24 months back from 2026-05-17) | `transaction_id`, `moment_id`, `gross_amount_usd`, `completed_at`, **`buyer_safe_name`**, **`seller_safe_name`** | safe_name coverage to be revised after BQ-side investigation |
| `market_caps` | ≥ 6,000,000 (~7K editions × 866 days) | MIN ≤ 2024-05-18 | `date`, `edition_id`, `lowest_ask_price`, `market_cap` → 0 NULL | |
| `packs` | ≥ 19,000 | n/a | `pack_id`, `pack_name`, `drop_id` → 0 NULL | |
| `drops` | ≥ 1,000 | n/a | `drop_id`, `started_at` → 0 NULL | |
| `parallel_types` | 23 (Base + 22 named) | n/a (taxonomy) | 0 NULL | seeded |
| `mv_player_market_cap` | ≥ 1,200 | n/a (snapshot) | All cols 0 NULL | |
| `mv_player_movers_15d` | ≥ 600 (movers in window) | n/a (snapshot) | All cols 0 NULL | |
| `mv_player_movers_30d` | ≥ 800 (movers in window) | n/a (snapshot) | All cols 0 NULL | |
| `mv_player_movers_90d` | ≥ 1,000 (movers in window) | n/a (snapshot) | All cols 0 NULL | **TO BE BUILT (90d MV missing per V6)** |

**Critical-column rule:** any column listed above with NULL > threshold = A1 FAIL for that table.

---

## §3 — Verification probes (the audit script)

Every iteration of Loop A re-runs the audit. The audit script is `/tmp/data-quality-audit.mjs` (committed to repo under `loop/v7/scripts/data-quality-audit.mjs` going forward).

**Probes:**
1. **01-row-counts** — confirms baseline volume per table
2. **02-market_caps-time-range** — verifies 2-year coverage
3. **03-transactions-time-range** — verifies 2-year coverage
4. **04-transactions-name-coverage** — checks buyer/seller safe_name fill rates
5. **05-moments-ownership-coverage** — `owner_flow_address` fill rate (critical post-V6 fix)
6. **06-editions-parallel-distribution** — parallel_id NULL count, named-parallel coverage
7. **07-etl-cursor-state** — every table's cursor lag from now (freshness check)
8. **08-mv-row-counts** — every MV's row count vs. expected
9. **09-mv-refresh-freshness** — last refresh timestamp per MV
10. **10-cross-source-accuracy** — sampled SELECT * LIMIT 100 vs. equivalent BQ query for the same 100 PKs (10 each from 10 random partitions)

Each probe emits JSON `{label, result, elapsed, status: "PASS"|"FAIL"|"WARN", details}`. The orchestrator aggregates → score per axis → overall pass/fail.

---

## §4 — Multi-track selection rule (per V7 charter)

The Loop A orchestrator runs one of these tracks per iteration, picked by deterministic priority:

| Priority | Track | Trigger condition |
|---|---|---|
| 1 | **BUILD-FAILING** | `npm run build` returns non-zero. Fix first. |
| 2 | **AUDIT-FAILING** | Last audit run had any P0 probe at FAIL. Re-run + fix root cause. |
| 3 | **CEO-CORRECTIVE** | `/admin/review` surface has any ✗ vote on a Loop A artifact within last 72h. Address. |
| 4 | **CORRECTIVE** | Any P0 gap from source-of-truth-mapping §5 still open. Fix. |
| 5 | **BACKFILL** | Any P1 gap (time range, name coverage). Fill. |
| 6 | **DERIVATIVE** | Any P2/P3 gap (sibling parallels, daily-grain MV, etc.). Build. |
| 7 | **VERIFY** | Audit clean, no votes pending, no gaps. Re-run audit to regress-check; if still clean, idle 1 hour. |
| 8 | **META** | Same fail-shape 3 consecutive iterations. Pause, re-research, re-author. |

**Anti-stall:** if no CEO vote (✓/✗/🎨) for 72h consecutive, force META track (re-engage the human).

**Track exit:** after any track completes, write `loop/v7/state/iteration-<N>.json` with `{track, started_at, finished_at, score_per_axis, overall_pass, files_changed, commits}`. The next iteration reads this + picks the next track.

---

## §5 — Tier model

| Role | Model | Why |
|---|---|---|
| Orchestrator (Loop A) | Claude Opus 4.7 | Track selection + spot-read load-bearing files + multi-track coordination |
| Researcher (per iteration) | Claude Sonnet 4.5 | Schema lookup, gap discovery, fix design |
| Builder (per iteration) | Claude Sonnet 4.5 | Apply migrations, run backfills, build MVs |
| Mechanical probes | Claude Haiku | Single-query probes (row counts, date ranges) — high-volume Map operations |
| Vision-judge | Claude Sonnet 4.5 (vision) | n/a for Loop A (no viz) |
| Cross-vendor reviewer | OpenAI gpt-5.5 | Independent verdict on each iteration before commit |
| Quality reviewer (Stage 2) | Claude Opus 4.7 | Reviews the cross-vendor verdict + the substantive change. Substance review. |

---

## §6 — Cross-vendor (gpt-5.5) review protocol for Loop A

After each Loop A iteration completes its proposed change but BEFORE the orchestrator commits, the cross-vendor reviewer:

1. Receives: the iteration's proposed diff (git diff against HEAD), the audit probe results pre + post, the source-of-truth doc, the doctrine.
2. Answers (structured JSON output):
   - `verdict`: PASS | FAIL | NEEDS-WORK
   - `axis_scores`: {a1: 0-100, a2: 0-100, ..., a7: 0-100}
   - `weighted_overall`: 0-100
   - `failure_modes`: array of {axis, what, evidence_excerpt}
   - `improvements`: array of {axis, suggestion, priority: P0|P1|P2}
   - `doctrine_violations`: array of {principle, what_breaks_it}
   - `would_you_ship_this`: boolean + 1-line justification
3. If `verdict = FAIL`: orchestrator does NOT commit. Reads the verdict, re-dispatches the iteration's builder with the failure_modes as input.
4. If `verdict = NEEDS-WORK`: orchestrator may commit but opens a follow-up task.
5. If `verdict = PASS`: orchestrator commits + pushes + advances cursor.

**Why gpt-5.5 specifically:** different architecture, different training data, different blind spots than Claude. The V4 failure was Claude judging Claude — converged on its own blind spots. Cross-vendor breaks the convergence.

---

## §7 — CEO signal: how Roham's vote feeds Loop A

In Phase 1 (D = live taste-daemon), Loop A surfaces every PROPOSED CHANGE (not every iteration) to `/admin/review` BEFORE applying. Proposal-approval pattern (not vote-on-output, since Loop A's outputs are data not visuals).

Surface shape:
- "Loop A proposes: <description>"
- Diff preview (per-file or schema-level)
- Affected tables / MVs / row counts
- Three buttons: ✓ approve & apply / ✗ reject / 🎨 reshape
- Comment field

If ✓: orchestrator applies the change, advances.
If ✗: orchestrator drops the proposal, marks the track exhausted, picks the next.
If 🎨: orchestrator re-prompts the iteration with the comment as redirect.

**Anti-stall:** if a proposal sits in /admin/review for >72h without vote, the orchestrator de-prioritizes that track. Anti-stall doesn't override Phase 1 — it routes around it.

---

## §8 — Loop A → Loop B handoff

Loop A is sequential-precedent to Loop B per Roham's Q3=A. The handoff signal:

**Loop A "complete enough for Loop B kickoff" =** A1 (completeness) ≥ 90% AND A2 (accuracy) ≥ 90% AND ALL P0 gaps closed in source-of-truth-mapping §5 AND last 3 audit runs clean.

When this signal fires, Loop A drops to maintenance cadence (audit-only, P1-or-lower fixes) and Loop B's orchestrator kicks off.

---

*This rubric supersedes the V5 features.json "passes: bool" flag for Loop A's artifacts. Boolean was the V4 blind spot; multi-axis with thresholds is the corrective.*
