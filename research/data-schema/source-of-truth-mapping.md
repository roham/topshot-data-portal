# Source-of-Truth Mapping & Known Gaps

**Generated:** 2026-05-17 21:30Z (Wave 1 foundations sprint)
**Status:** Load-bearing for Loop A (Data Quality Loop). Every Loop A agent reads this before proposing any fix.
**Scope (per Roham 2026-05-17):** Loop A scope = C — Discovery + Fix + Organize. This doc GROWS over time as Loop A's DISCOVERY track finds new columns / tables / GraphQL endpoints we should be pulling. The §5 gap list expands; the §2 per-table mapping expands; the §3 source-of-truth hierarchy expands.

This doc maps each Supabase `topshot.*` table to its source-of-truth in BigQuery `dapperlabs-data.production_sem_open.*` AND the Top Shot GraphQL API, names every column transformation (rename, drop, derive), and **lists every confirmed gap** with its three-line fix.

The V5 failure was schema-from-imagination. This is the structural counter: every Loop A claim about data must reference either:
1. `research/data-schema/bq-bnp-views.md` (BQ source ground truth — regenerate every DISCOVERY iteration)
2. `research/data-schema/supabase-topshot.md` (Supabase destination ground truth — regenerate every DISCOVERY iteration)
3. `research/probes-v2/*.json` (Top Shot GraphQL empirical discovery — 52 probes, growing)
4. Or a NEW probe committed to the repo (one of the three above).

---

## §1 — Source-of-truth hierarchy

When two sources disagree on the same fact, the canonical authority is:

| Domain | Canonical source | Why |
|---|---|---|
| Transactions (sales, listings, transfers) | BigQuery `production_sem_open.transaction` | Immutable, deduplicated, joined to assets at the warehouse |
| Player / team / set / play / edition / moment / pack / drop catalog | BigQuery `production_sem_open.asset_nba_*` | Refreshed nightly from primary Top Shot DB |
| Market caps (floor × circulation per day) | BigQuery `production_sem_open.asset_nba_market_caps` | Pre-aggregated daily snapshots |
| Parallel taxonomy (Base, Diamond, Anthology, etc.) | Top Shot GraphQL (`parallels { name }`) | NOT in BQ — only on the live API |
| Sibling-edition relationships (same play, different parallel) | Top Shot GraphQL (`editions.parallel.parallelID`) | Each parallel has a distinct edition_id; our BQ pulls only Base |
| Real-time ownership (collector's BAG) | Top Shot GraphQL (`searchUsers → moments`) | The chain itself; `moments.owner_flow_address` in our DB only updates when ETL runs |
| Listing density / depth ladder | Top Shot GraphQL (`edition.lowestAsk`, `moment.listings`) | Per-moment listings are NOT in BQ |
| Pack EV / open-status / contents | Top Shot GraphQL (`pack.contents`) | BQ has pack metadata but not per-pack realized contents |
| Set completion (per user) | Derived from `moments` + `sets` in Supabase | No canonical source; computed via MV |

**Doctrine §3 footnote (Roham 2026-05-17):** *No live BQ at request time. No live Top Shot GraphQL at request time.* Portal reads only from `topshot.*` Supabase. BQ + GraphQL are FILL-side only.

---

## §2 — Per-table source mapping

### 2.1 — `topshot.players` ← `production_sem_open.asset_nba_player`

| Supabase column | BQ column | Transformation | Notes |
|---|---|---|---|
| All `players` allowlist cols (lines 213–235 of etl-helpers.mjs) | Same name in BQ | None — straight copy after PII filter | `last_known_primary_postion` (BQ typo) preserved verbatim |

**Cursor:** `row_updated_at`. **PK:** `player_id`. **staleHours:** 24 (mostly static).

**Gap status:** ✅ Clean. 1,287 rows.

### 2.2 — `topshot.teams` ← `production_sem_open.asset_nba_team`

| Supabase column | BQ column | Transformation | Notes |
|---|---|---|---|
| All `teams` allowlist cols (lines 236–244) | Same name in BQ | None | |

**Gap status:** ✅ Clean. 58 rows.

### 2.3 — `topshot.sets` ← `production_sem_open.asset_nba_set`

**Gap status:** ✅ Clean. 268 rows.

### 2.4 — `topshot.plays` ← `production_sem_open.asset_nba_play`

| Supabase column | BQ column | Transformation | Notes |
|---|---|---|---|
| `away_team_historical_name` | `away_team__historical_name` (double underscore) | **Renamed at sync.mjs:117–123** | BQ typo normalized |
| All other `plays` allowlist cols | Same name | None | |

**Gap status:** ✅ Clean. 9,556 rows.

### 2.5 — `topshot.editions` ← `production_sem_open.asset_nba_edition`

**Gap status:** ⚠️ Coverage gap. 11,904 rows. All `parallel_id` collapsed to 0 (Base) after sample probe of 50 random un-resolvable editions confirmed they all resolve to Base. **Sibling parallels (Diamond, Anthology, Crystal, Hexwave, etc.) are NOT in our DB** — they have separate edition_ids in Top Shot's universe and our ETL only pulls Base-parallel editions. The 22 named parallels are seeded in `topshot.parallel_types` but no `editions` rows reference them.

**Fix scope (DERIVATIVE, Loop A):** ETL extension to pull sibling editions from Top Shot GraphQL `editions { ... parallel { parallelID name } }` and insert them into `topshot.editions` with the right `parallel_id`. Then a `topshot.edition_parallels` lookup if needed.

### 2.6 — `topshot.moments` ← `production_sem_open.asset_nba_moment`

| Supabase column | BQ column | Transformation | Notes |
|---|---|---|---|
| `owner_flow_address` | `owner_user_id` | **TARGET RENAME, NOT YET APPLIED** | Per schema comment: "Same as BQ owner_user_id but renamed for explicitness — this value is observable on-chain." |

**Gap status:** 🔧 **CODE FIX APPLIED 2026-05-18 — BACKFILL PENDING.** ETL edits applied (commit 804714c on branch dexter/loop-a-2-owner-flow-address): `owner_user_id` removed from global `PII_DENYLIST`, added to `ALLOWLISTS.moments`, rename block (`owner_user_id` → `owner_flow_address`) added to `sync.mjs`. 42/42 ETL tests pass. Current state: 249,459 / 3,892,846 rows populated (6.4%) — from a prior partial sync, not this fix. Gap remains open until backfill runs on daemon VM with BQ credentials:
```bash
ETL_BACKFILL_START=2024-01-01 node scripts/etl/bq-backfill-historical.mjs --tables=moments
```
**Verification probe target (post-backfill):** `with_owner_flow_address >= 3,400,000` (≥97%).

**Fix (three-edit, ~15min):**
1. `scripts/etl/lib/etl-helpers.mjs` BLOCKLIST line ~21: remove `owner_user_id` OR move to per-table blocklist that exempts `moments` (per-table treatment is safer because `owner_user_id` IS a Dapper UUID on the `transactions` table).
2. `scripts/etl/lib/etl-helpers.mjs` `ALLOWLISTS.moments` (lines 80–119): add `"owner_user_id"`.
3. `scripts/etl/lib/sync.mjs` around line 117 (where existing renames live): add a moments-specific rename block:
   ```js
   if (sbTable === "moments") {
     for (const r of filtered) {
       if ("owner_user_id" in r) { r.owner_flow_address = r.owner_user_id; delete r.owner_user_id; }
     }
   }
   ```
4. Re-run moments backfill: `ETL_BACKFILL_START=2024-01-01 node scripts/etl/bq-backfill-historical.mjs --tables=moments` on VM. ~10–30 min.

**Subsequent dependencies:** /u/[username] portfolio rebuild against Supabase (currently uses live Top Shot GraphQL — doctrine violation per §3 footnote) becomes possible once owner_flow_address is populated.

### 2.7 — `topshot.transactions` ← `production_sem_open.transaction`

| Supabase column | BQ column | Transformation | Notes |
|---|---|---|---|
| `transaction_id` | `id` | **Renamed at sync.mjs:110** | Canonical PK |
| `moment_id` | `product_specific_asset_id` | **Renamed at sync.mjs:111** | FK to `moments.moment_id` |
| `source_updated_at` | `updated_at` | **Renamed at sync.mjs:112** | Supabase has its own auto-managed `updated_at` trigger |
| All other allowed cols | Same | None | |

**BQ-side filter:** `WHERE client_safe_name = 'nba_top_shot'` (BQ table contains other Dapper games too).

**Gap status:** ❌ **TWO CONFIRMED GAPS.**

1. **Time coverage gap (CONFIRMED).** Supabase has 2,487,715 rows from `2024-09-06` to `2026-05-16` — **20 months, not 2 years.** Per audit baseline `[03-transactions-time-range]` 2026-05-17. Roham asked for 2-year minimum.
   - **Fix (BACKFILL):** `ETL_BACKFILL_START=2024-05-18 ETL_BACKFILL_END=2024-09-05 node scripts/etl/bq-backfill-historical.mjs --tables=transactions` on VM. ~15–30 min for 4-month chunk.

2. **`buyer_safe_name` / `seller_safe_name` partial coverage (CONFIRMED).** Per audit baseline `[04-transactions-name-coverage]`:
   - `buyer_safe_name`: **0% populated** (0 / 2,487,715). ❌
   - `seller_safe_name`: 24.5% populated (609,014 / 2,487,715). ⚠️
   - **Fix:** unknown until BQ source is probed. Run `bq query "SELECT COUNT(*), COUNT(buyer_safe_name), COUNT(seller_safe_name) FROM \`dapperlabs-data.production_sem_open.transaction\` WHERE client_safe_name='nba_top_shot' AND DATE(updated_at) >= '2026-05-01'"` to verify whether BQ has the columns populated.
   - If BQ has them: investigate why ALLOWLIST'd fields are coming through as NULL (column-name typo? pre-filter strip?).
   - If BQ doesn't have them: needs a different approach — maybe join through a separate `users` table at fill time, or accept that older transactions don't have safe_names because the column was added later.

### 2.8 — `topshot.market_caps` ← `production_sem_open.asset_nba_market_caps`

**Gap status:** ✅ **Clean and comprehensive.** 6,102,039 rows, 866 distinct dates, 2024-01-01 → 2026-05-16. 28 months of coverage. Per audit baseline `[02-market_caps-time-range]`.

**Note:** `mv_player_market_cap` covers $82M of $117M total market_caps sum. The $35M delta is editions not joined to a known player_id. This is a JOIN-completeness gap, not a market_caps data gap.

### 2.9 — `topshot.packs` ← `production_sem_open.asset_nba_pack`

**Gap status:** ✅ Clean. 19,567 rows.

### 2.10 — `topshot.drops` ← `production_sem_open.asset_nba_drop`

**Gap status:** ✅ Clean. 1,007 rows.

---

## §3 — Materialized view inventory + completeness

Supabase has 50 `topshot.*` tables, of which ~24 are MVs:

### Working MVs (data-bearing, audit-verified)

| MV | Purpose | Status |
|---|---|---|
| `mv_player_market_cap` | Player-level mcap floor + 24h/30d activity | ✅ 1,275 rows. Covers $82M of $117M total ($35M player-unattributed) |
| `mv_player_movers_15d` | 15-day mover gainers/losers | ✅ 667 rows |
| `mv_player_movers_30d` | 30-day mover gainers/losers | ✅ 829 rows |
| `mv_player_*_volume` (24h/7d/30d/90d/1y/all_time) | Per-player rolling volume | ✅ |
| `mv_set_completion_distribution` | Histogram of set completions | ✅ |
| `mv_set_24h_activity` | Set-level recent activity | ✅ |
| `mv_market_summary_*` (24h/7d/30d/90d/1y/all_time) | Aggregate market state | ✅ |
| `mv_edition_*_activity` (24h/7d/30d/1y/all_time) | Per-edition rolling stats | ✅ |
| `mv_largest_sales_*` (24h/7d/30d/1y/all_time) | Top recent sales | ✅ |

### Missing / failed MVs

| MV | Why missing | Fix path |
|---|---|---|
| `mv_player_movers_90d` | Statement_timeout at 180-day scan over 2+ years | Pre-aggregate to `mv_player_daily_volume` (smaller grain), then compose 90D from 90 daily rows per player. Per V6 handover next steps. |
| `mv_player_daily_volume` (proposed) | Doesn't exist yet | Build it. Enables 90D + arbitrary-window mover MVs to compose cheaply. |
| `mv_edition_parallels` (proposed) | Sibling editions don't exist in our `editions` table yet (see 2.5) | Depends on 2.5 ETL extension |

---

## §4 — Top Shot GraphQL ground truth (52 probes)

Live API at `https://public-api.nbatopshot.com/graphql`. Introspection disabled (probe `ceiling-09`). Schema discovered empirically.

Source-of-truth artifacts:
- `research/probes-v2/discovery-*.json` — discovery probes
- `research/probes-v2/shape-*.json` — confirmed query shapes
- `research/probes-v2/ceiling-*.json` — known limitations (introspection off, pagination limits, etc.)
- `research/probes-v2/final-*.json` — finalized working queries
- `research/probes-v2/open-*.json` — open questions still being probed
- `research/01-data-ceilings-v2.md` — synthesis of the 10 ceilings

**Known accessible domains (per `discovery-*` and `shape-*` probes):**
- `searchUsers` (by prefix; takes username partial) → user profile + moments
- `moment.transferHistory` (per-moment provenance)
- `searchListings` (cross-edition listings query)
- `getPriceHistory` (per-edition price history)
- `edition.lowestAsk` + `edition.bestBid` (per-edition depth-of-book proxies)
- `searchSets` (filter by series, league)
- `getSeries` (Top Shot series enumeration)
- `searchChallenges` (challenge / set-completion data)
- `editions.parallel.parallelID` (the parallel taxonomy — the source for our 22 named parallels in `parallel_types`)

**Known limitations:**
- Introspection disabled (no `__schema` queries; we discovered by probing)
- No raw bulk-export endpoint — must paginate per query
- No "all editions with all sibling parallels" — must fetch per-set
- No `holder_distribution` endpoint (probed; doesn't exist as `open-04` discovered)
- Some endpoints rate-limit aggressively

---

## §5 — Critical gaps summary (Loop A's TODO list)

| Priority | Gap | Table affected | Fix type | Est time |
|---|---|---|---|---|
| **P0** | `moments.owner_flow_address` NULL across 3.5M rows | moments | CORRECTIVE (code fix applied; backfill pending on daemon VM) | 30 min (backfill) |
| **P0** | `transactions.buyer_safe_name` 0% populated | transactions | INVESTIGATE then CORRECTIVE | 1 hr |
| **P0** | `transactions.seller_safe_name` 24.5% populated | transactions | INVESTIGATE then CORRECTIVE | 1 hr |
| **P1** | `transactions` only covers 20 months (2024-09 → 2026-05) | transactions | BACKFILL | 30 min |
| **P1** | `mv_player_movers_90d` missing (180-day timeout) | movers | DERIVATIVE (pre-agg daily MV first) | 1 hr |
| **P2** | Sibling parallels not in `editions` (only Base) | editions | DERIVATIVE (ETL extension to pull from GraphQL) | 3 hr |
| **P2** | `mv_player_market_cap` $35M unattributed (editions not joined to player_id) | mv_player_market_cap | INVESTIGATE | 1 hr |
| **P3** | `mv_edition_parallels` proposed but not built | (new) | DERIVATIVE | 2 hr |
| **P3** | Daily-grain MV `mv_player_daily_volume` proposed | (new) | DERIVATIVE | 1 hr |
| **P4** | Pack EV / contents not in BQ — would need GraphQL fill | packs | DERIVATIVE (optional) | 4 hr |

**Total to clean Loop A baseline:** ~14 hours of agent work, mostly mechanical.

---

## §6 — Loop A's contract with this doc

Every Loop A iteration that proposes a data fix MUST:

1. **Cite a specific cell of §2 or §5** that documents the gap.
2. **Quote the exact schema lines** from `bq-bnp-views.md` or `supabase-topshot.md` that prove the gap exists.
3. **Reference the migration / script that will be modified.**
4. **Include a verification probe** that will be run post-fix to confirm the gap is closed (e.g., "after re-running, `SELECT COUNT(*) FROM moments WHERE owner_flow_address IS NOT NULL` should be ≥ 3,400,000").
5. **Update this doc** when the gap is closed: change ❌ to ✅ and add a `**Closed:** YYYY-MM-DD` line.

Negative findings ("can't determine," "data unavailable," "not in source") require positive proof: a query against the live source that returns 0 rows. Curated knowledge bases are starting context, not the final word.

---

*This doc supersedes any pre-loop assumptions about data shape. When source ground-truth and this doc disagree, ground-truth wins and this doc is updated.*
