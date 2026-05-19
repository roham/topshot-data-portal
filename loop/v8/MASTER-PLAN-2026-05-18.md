# Top Shot Data Portal — V8 Master Plan

**Date:** 2026-05-18
**Author:** Dexter, synthesizing four parallel subagent dispatches + the V7 Charter + Doctrine v1.1 + THE-WAY §VI
**Status:** v0.1 DRAFT — awaiting practitioner survey (§5 below) + Roham sign-off
**Supersedes (when locked):** `loop/v7/CHARTER.md` for execution; doctrine v1.1 remains the spec.
**Audience:** Roham (sign-off + steer). Dexter executes against this; subsequent sessions re-read this file at boot.

---

## §0 — How to read this

If you have 60 seconds, read §1 (where we are) + §2 (where we're going) + §3 (the ship-list). Skip §5 if the practitioner survey hasn't filed yet.

If you have 5 minutes, read §1 → §4 + §6 (the verification gates).

If you have 15 minutes, read everything in order.

The doctrine (P1-P9 + §0 comparables) is the spec. This document is the *execution shape* — how we honor the doctrine in V8.

---

## §1 — Where we are (state snapshot, 2026-05-18 22:30Z)

### Data state — Phase 1 DONE
- **`topshot.moments.owner_flow_address`:** 6,249,548 moments populated with real Flow addresses (was 162K OAuth garbage at session start). 20-sample post-UPDATE verification: 20/20 Flow-hex shape.
- **`topshot.collectors`:** 1,673,305 collectors loaded with usernames + avatars (from fandom-v3 import yesterday — confirmed intact).
- **`topshot.market_caps`:** 866 distinct daily snapshots from 2024-01-01 → 2026-05-16, 6.1M rows. The 28-month historical backfill we thought we needed is *already done* — the ETL had pre-loaded it.
- **Open gaps:** sibling parallels not in `editions`; `transactions.buyer_safe_name` 0%, `seller_safe_name` 24.5%; `mv_player_movers_90d` design drafted but not applied; `asset_ownership_nba_moment_history` (197.8M rows, NEW finding) not yet pulled.

### Visible production state
- **`/` homepage:** TS50 Index hero (30D, P7-default) above the existing 6-block strip
- **`/market-cap`:** TS50 Index hero (365D) between header and KPI strip
- **`/player/[id]`:** Top Holders panel (Glassnode-style supply-distribution, top-20 holders, concentration %)
- **`/moments`:** Owner column joined to collectors.username
- **`/collectors`:** 1.67M-named leaderboard (V7 ship)
- **All customer-facing pages:** 0 design-process copy leaks (V7 audit-copy enforcement)

### Charter state
- **V7 Charter** at `loop/v7/CHARTER.md` is in force. Defines two-loop architecture (Data Quality, Visualization), 7/8-axis rubrics, multi-track selection, cross-vendor judge (gpt-5.5 verifies Claude output), STOP file pattern, phase progression D → B → C → A.
- **V7 Loop A:** STOPPED (intentional). Was halted mid-iter when the iter-2 PII incident surfaced. Will not auto-resume.
- **Loop B:** never auto-started; Dexter is the in-the-loop builder for V8.

### Design specs committed today (commit `20ab4b6`)
- `research/design-specs/2026-05-18-index-toggles-and-progressive-disclosure.md` — Grail Index spec (Sub-100 Circulation as Candidate B), pill-row interaction, global sticky McapFormulaToggle, drawer inventory.
- `research/design-specs/2026-05-18-progressive-disclosure-research.md` — four primitives only (Cmd-K, Pro Mode toggle, TradingView fx-button drawer, hard-nav card→page).
- `research/design-specs/2026-05-18-viz-and-animation-research.md` — viz stack (graduate hero to visx; keep Recharts for sparklines; ECharts for treemap/sankey), framer-motion sole motion lib, TradingView aesthetic anchor.

### Convergence across all three design specs
- **Aesthetic anchor:** TradingView (not Linear, not Stripe, not Bloomberg)
- **Animation lib:** framer-motion only
- **Switching primitive:** segmented pills > dropdowns
- **Mcap default:** floor (doctrine §P1 non-negotiable)
- **Power affordances:** Cmd-K palette + per-card Pro toggle + TradingView fx-button drawer + Polymarket-style hard-nav card→page
- **Transition timing:** ≤300ms cross-fade on index swap; ≤220ms drawer slide; <120ms toggle; instant for crosshair

---

## §2 — Where we're going (V8 vision in one paragraph)

**Top Shot Data Portal V8 is a TradingView-class market-data terminal for NBA Top Shot pro trader-collectors.** Fresh visitors land on a clean, graph-first surface (TS50 / Grail composite index hero + 6-block strip + canonical movers). One click reveals Bloomberg-tier density. Power users live inside Cmd-K (Linear-class palette) and toggle Pro Mode (Stripe-class binary chrome switch) to swap consumer view → dense KPI tables per-card. Every chart honors doctrine: faithful-not-smoothed (P1), graphs-first (P2), comparable-load-bearing (P3), parallels-first-class (P5), trader-verbatim-spec (P6), 30D-default (P7). Animation budget is parsimonious — framer-motion for drawer + shared-layout transitions; hard cuts for crosshair + index swap; never decoration. The portal serves listing-side + sale-side data globally via a single sticky toggle, with floor as canonical default. Every load-bearing chart cites its comparable in the methodology popover. Every UI surface earns its pixels by being either a chart or one click from one.

---

## §3 — The ship-list (sequenced, doctrine-tagged, estimated)

Each item: doctrine principle + load-bearing comparable + acceptance criterion + estimated effort. Per THE-WAY §VI ("Loop construction is structural, not discretionary"), each item below becomes one Loop B iter against the V8 Charter (§5 when drafted).

### Tier A — Foundation (next session, ~3-5h)

| # | Item | Doctrine | Comparable | Acceptance | Effort |
|---|---|---|---|---|---|
| A1 | **Grail Index** synthesizer (`getGrailIndex`, Sub-100 Circulation, value-weighted) | §P1 faithful | Glassnode supply-distribution | `getGrailIndex({lookbackDays:30}).series.length ≥ 5`; basket has ~50-200 editions | 45min |
| A2 | **`<IndexPillRow>`** segmented control, replaces TS50Hero Card title | §0.1 CL50 | Card Ladder Pro + Polymarket category pills | `?index=ts50` (default) and `?index=grail` both render; 300ms cross-fade on swap | 60min |
| A3 | **Global Mcap Toggle** promoted to sticky page-level chrome strip | §P1 (default floor) | TradingView global timeframe | Toggle sticky on scroll w/ hairline shadow; URL `?mcap=` preserved across nav | 45min |
| A4 | **Cmd-K palette** via `cmdk` lib | §0.2 Bloomberg keyboard-first | Linear command palette | Cmd-K opens centered modal; type `lebron` → top match navigates to LeBron profile; fuzzy across players + moments + sets + collectors + actions | 90min |
| A5 | **Per-card Pro toggle** on 6-block strip | §P2 graphs-first / power-behind | Stripe Developers toggle | Each of 6 blocks has top-right toggle; OFF = current view; ON = dense KPI table; localStorage-persisted | 90min |

**Tier A acceptance:** Roham clicks ✓ on `/admin/review` for an iter-snapshot of the homepage post-Tier-A AND copy-audit shows 0 P0 customer-facing leaks.

### Tier B — Power (session +1, ~5-7h)

| # | Item | Doctrine | Comparable | Acceptance | Effort |
|---|---|---|---|---|---|
| B1 | **TS50/Grail hero chart Recharts → visx** with TradingView locked-y-axis crosshair | §P4 charts are substance | TradingView crosshair-with-locked-y-axis-read | Crosshair tracks cursor instantly; tooltip shows date + index + basket mcap + %Δ from baseline | 2h |
| B2 | **`+ overlay` drawer** on hero chart (left-side slide, 320px) | §P2 density-on-drill | TradingView fx-button indicator drawer | Drawer opens via `+ overlay` button; comp-set floor + VWAP + owner-count overlays selectable; framer-motion 220ms spring | 90min |
| B3 | **Polymarket-style card → detail shared-layout transition** via `layoutId` | §0.1 Polymarket card escalation | Polymarket market-card → market-detail | Click any /moments row → /moment/[flowId] page; chart morphs in place over 350ms; rest of page fades in behind | 90min |
| B4 | **`/u/[username]` Supabase rewrite** | §3 footnote (architectural) | OTM detail-page | Page renders bag from Supabase, no live GraphQL; closes §3 violation; bag composition treemap added | 2h |
| B5 | **`/set/[id]` per-set Top Collectors panel** | §0.2 PSA Set Registry | PSA registry leaderboard | `getHoldersBySet({set_id})` wired into panel; renders top 20 + closest-to-completion sub-section | 60min |

### Tier C — Density (session +2, ~6-8h)

| # | Item | Doctrine | Comparable | Acceptance | Effort |
|---|---|---|---|---|---|
| C1 | **Avg-sale historical mcap MV** (`mv_market_caps_avgsale`) | §P1 | per V7 §7 | Daily-grain MV joining transactions + circulation, 20+ months back; refresh schedule documented | 2h |
| C2 | **Polymarket cards-grid landings** standardized across `/sets`, `/teams`, `/editions`, `/collectors` (`/players` already has it) | §0.1 + §P2 | Polymarket cards-grid | Each landing has chart-strip ABOVE the table; each strip has 3 cards (top movers / index / gainers-losers) | 2.5h |
| C3 | **`/moment/[flowId]` six-panel drill** (price history, sale distribution, circulation-by-parallel, holders, parallels, activity) | §0.2 Bloomberg-tier density | OTM moment-detail | All six panels render with real data; parallels-first-class compliance verified | 2h |
| C4 | **`mv_player_movers_90d`** migration applied (the .draft from V7) | §P5 | per V7 spec | MV refreshes, populates /player movers panel, supports `?w=15/30/90` cuts | 90min |

### Tier D — Polish (session +3, ~4-6h)

| # | Item | Doctrine | Acceptance | Effort |
|---|---|---|---|---|
| D1 | **Mobile-first audit** at 375×812 via Playwright | §P9 (earned breadth) | Each page screenshot passes adversarial vision review | 90min |
| D2 | **Sparklines everywhere** — every list row gets a 30D sparkline | §P4 + Magic Eden signature | grep for missing sparkline = 0 on list pages | 90min |
| D3 | **Empty-state pass per §P8** — every blank cell becomes "🆕 NEW DROP / be first to list" | §P8 | grep for blank "—" on listing cells = 0 | 60min |
| D4 | **URL filter state** for every chart filter (window, parallel, tier) | §P4 + Pillar 4 §1 | Open URL in fresh tab, state preserved | 90min |
| D5 | **Final `audit-copy.mjs --llm` pass** + cross-vendor gpt-5.5 verdict | §P9 / V7 charter | 0 P0 customer-facing leaks AND PASS verdict | 30min |

---

## §4 — How we know we're there (verification primitives per Tier)

Per THE-WAY §VI ("generate-score-ship, never generate-ship") and the V7 charter's cross-vendor judge:

### Per-iter (every item above)
1. **Build clean:** `npm run build` exit 0; `npx tsc --noEmit` 0 errors (judge-spec noise excluded).
2. **Doctrine principle named:** the commit message + code comment cite the principle + named comparable. No vapor.
3. **Live render:** production URL hits 200 after Vercel deploy; the new surface renders without console errors.
4. **Screenshot diff (visual):** Playwright captures desktop (1440×900) + mobile (375×812); adversarial vision subagent reviews against doctrine.
5. **Copy audit:** `scripts/audit-copy.mjs --llm` returns 0 P0 customer-facing leaks.

### Per-Tier (every Tier A/B/C/D close)
6. **Cross-vendor judge:** `loop/v7/scripts/verify-via-openai.py` runs against the shipped surface; gpt-5.5 verdict PASS.
7. **CEO signal (Phase 1 = D in Charter §2):** Roham clicks ✓ or 🎨 or ✗ on `/admin/review?token=…` for the Tier rollup proposal.

### Per-session (every wind-down per THE-WAY §VI)
8. **Verification artifact:** filed at `~/agents/dexter/memory/active-tasks/<task-id>/verification.md` with (a) what was verified, (b) mechanism, (c) verdict, (d) deviations.
9. **SESSION.md / shortterm.md update:** next-Dexter knows what's in flight, what's blocked, what landed.
10. **Episodic memory:** auto-filed by hook at `~/agents/dexter/memory/episodic/YYYY-MM-DD-<slug>.md`.

---

## §5 — V8 Charter patches (TO BE FILLED from practitioner survey)

*The practitioner survey subagent is running in background (dispatch ID `a7fda57ee4ff3bf80`). When it returns with the survey of Anthropic / Microsoft Research / OpenAI / DeepMind / Cursor / Cognition / Sourcegraph / Aider / Karpathy / LangChain practices, this section gets populated with concrete patches to the V7 charter.*

**Expected return:** within the next 5-10 minutes of session time.

**Working hypothesis** (pending survey confirmation):
- **Keep V7's** two-loop architecture, multi-track selection, cross-vendor judge, STOP file, phase progression D→B→C→A
- **Add** Magentic-One's five-questions-per-step Progress Ledger answer (already in the hook per THE-WAY §VI line 233)
- **Add** Cognition/Devin-style explicit planner-executor-verifier separation per iter
- **Add** Anthropic's "Building effective agents" tool-choice gating (use the right primitive per task type — Workflow vs Agent vs Tool)
- **Add** explicit budget gates per iter: token cap, BQ bytes-billed cap, Vercel deploys per change cap
- **Revise** the 7-axis Loop A rubric and 8-axis Loop B rubric based on what we learned from V7 — likely simplify, possibly add an explicit "mobile-first" axis to Loop B per §D1
- **Revise** the META track triggers — V7 says "same fail-shape 3 consecutive iters"; we may want a stall counter on the Progress Ledger's forward-progress question per Magentic-One

Concrete patches land in §5.1 - §5.N when the survey returns. Until then, V7 Charter is the in-force loop spec.

---

## §6 — Risks & guards (named failure modes + mitigations)

From V7 handover §8 (9 failure modes we hit this weekend) + THE-WAY §VI:

| # | Failure mode | Mitigation in V8 |
|---|---|---|
| FM1 | OAuth IDs written to `owner_flow_address` as PII | PII shape gate in every BQ-write script (3-layer: pre-flight 20-sample + per-100K-row + post-write 20-sample). Already in `bq-pull-ownership-to-csv.mjs`. |
| FM2 | Trusted curated BQ table list, missed `asset_ownership_nba_moment` | `INFORMATION_SCHEMA.TABLES` enumeration is mandatory pre-flight on every data iter. Now in dedicated artifact `research/data-schema/bq-full-enumeration-2026-05-18.md`. |
| FM3 | Doubled down "PII isn't relevant" twice when Roham challenged | Confidence-level gate baked into rubrics: when a claim is challenged once, prove it; when challenged twice, recheck premise from sources. Per THE-WAY "hold the live object." |
| FM4 | 14K lines of doctrine before customer-visible impact | Tier A enforces: customer-visible UI shipped each session, doctrine artifacts queued separately. |
| FM5 | Fandom-v3 reuse path discovery 4h late | Mandatory artifact-inventory pre-flight: before any data-touching work, grep `research/` + `scripts/` for prior art on the same gap. |
| FM6 | In-memory Map for 35M rows → OOM | All bulk DB ops use stream→file→bulk-load, never in-memory aggregation. |
| FM7 | Three writers racing on Supabase → schema-cache thrash | `/tmp/topshot-bulk-writer.lock` single-writer contract enforced in every bulk-write script. |
| FM8 | VM IAP tunnel hiccup | Retry once silently; surface to Roham on second failure. Operational noise; low-leverage to over-guard. |
| FM9 | Design-process copy leaks into customer-facing pages | `scripts/audit-copy.mjs` runs on every iter pre-commit; CI-fails on P0 leaks. Now baked into Tier acceptance §4.5. |
| FM10 | Supabase auth path opaque (db.<ref>.supabase.co IPv6-only; pooler needs `aws-1` not `aws-0`; needs `sslmode=require`) | Voice-DNA pair filed: never instruct Roham to navigate Supabase dashboards; link the page, ask for screenshot, never describe clicks. Pooler config now in `.env.local` with `?sslmode=require`. |
| FM11 | Cluster resource exhaustion mid-bulk-write | `SET statement_timeout = 0` for COPY + UPDATE FROM JOIN; pre-chunk CSVs into ~7M-row pieces; fallback chunked-update script available. |
| FM12 | Classifier misfire opens redundant task ledgers | Auto-kill misfire ledgers when same task_id prefix repeats; treat the original ledger as canonical. |

### Anti-patterns explicitly named (don't drift here)
- Bloomberg-amber aesthetic — TradingView modern dark > Bloomberg legacy
- Tabs inside cards — they're the UX cope for "we don't know what's primary"
- "Advanced..." links — Apple's defensive move; power users don't read down
- Hover-to-reveal critical info — touch users get nothing
- Decoration animation (number-rolls, pulses, bouncing chips) — pro traders hate UI theatre
- Per-card mcap toggles — worldview controls live page-level
- Dropdown for ≤6 options — pills win on muscle memory
- Generate-ship without generate-score-ship — every visual change has a screenshot subagent gate

---

## §7 — Open questions for Roham to decide

These are the ten from Spec B + three from the V8 Charter formation. Defaults in **bold** — Dexter executes these unless overridden:

1. **Grail def for V1:** Sub-100 Circulation (Candidate B). ← **default**. Override: Curated Grail-12 (C) or Ultimate-only (A).
2. Curated Grail-12 inclusion list: **defer to week 2** with research artifact + Discord cross-check.
3. **Circulation threshold for Grail B: ≤100.** Override: ≤50 (tighter) or ≤25 (very tight, single-listing volatile).
4. **Default index on landing: TS50.** Override: Grail (narrower lens).
5. **Mcap toggle naming: "Low ask / Avg sale (30d)".** Override: "Listed / Sold" (visceral).
6. **Sticky toggle: page-level.** Override: keep card-level for scope-minimal V6.
7. **Compare-formulas drawer: ship behind feature flag.** Override: defer to V9.
8. **Cmd-K palette: ship in Tier A.** Override: defer to Tier B.
9. **`[+ Custom]` pill slot: reserve, telegraph roadmap.** Override: hide entirely.
10. **Animation budget: 300ms cross-fade on index swap, hard cuts elsewhere.** Override: 200ms hard cut on swap (Bloomberg-pace).
11. **Aesthetic anchor: TradingView.** Override: Linear (cleaner motion) or Stripe (more polish).
12. **Phase progression in V8: stay at Phase 1 (D = live taste-daemon, manual ✓/✗/🎨).** Override: advance to Phase 2 (B = vote-in-loop) after Tier A.
13. **Sub-agent dispatch in V8: parallel research/design subagents (this session's pattern), sequential code subagents.** Override: full-parallel (canon-decoherence risk per [[on-canon-decoherence-at-fan-out]]).

---

## §8 — Boot order for next session

1. Read this master plan (this file).
2. Read `research/doctrine.md` if doctrine principles need reload.
3. Read `loop/v7/CHARTER.md` until V8 supersedes (post §5 patch).
4. Read the three design specs in `research/design-specs/2026-05-18-*` for execution detail on Tier A items.
5. Re-read `~/agents/dexter/memory/SESSION.md` + recent episodic.
6. Run `node --env-file=.env.local scripts/count-state.mjs` to verify data state is unchanged.
7. Begin Tier A items in order: A1 → A2 → A3 → A4 → A5.
8. Verification gate at session-end: file `verification.md` per §4.

---

## §9 — The two-line summary

**Phase 1 done; foundation for Phase 2 strong; design specs converge on TradingView + framer-motion + segmented-pills + Cmd-K + per-card-Pro-toggle.** Tier A (Grail Index + pill row + global Mcap toggle + Cmd-K + Pro toggles) is the next coherent ship unit; V8 Charter patches awaiting practitioner survey; Roham's 13 decisions in §7 unblock the run.
