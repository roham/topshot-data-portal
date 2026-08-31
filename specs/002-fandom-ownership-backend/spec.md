# SPEC-002 — Fandom Ownership Backend

**Status:** ratified
**Author:** Dexter (for Roham)
**Date:** 2026-06-14
**spec_id:** 002-fandom-ownership-backend
**owner:** Roham
**constitution:** topshot-data-portal/constitution.md (repo scope) → Dapper Labs company constitution
**Governs:** a new BigQuery-sourced ownership aggregation in `topshot-data-portal` (ETL → small
Supabase table → query), modeled on SPEC-001 `/supply`, and its first consumer, the `fandom-v3`
ownership graph (`claude-conversations/dapperlabs-v2-i/fandom-v3`). Cross-repo.

## Q1 — Problem & why now

`fandom-v3` (the ownership "pride engine" at `fandom-v3.vercel.app`) sources its per-player owner
graph from the public NBATS GraphQL API via `scripts/fetch-top40.js` — paginated, 500-serial/edition
cap, top-30 only. We want the **top 100 players**, each showing their leading holders.

Neither the GraphQL pull nor the Supabase `topshot.moments` mirror is complete. Verified 2026-06-14:
the Supabase mirror holds only ~10–19% of each player's true minted moments (e.g. Jimmy Butler:
22,273 of 240,280), with ~7–16% owner-attributed. The **complete current ownership lives in
BigQuery**, the same source `/supply` already reconciles to within 0.06% of production Spanner.

**Why now:** the portal already proved the pattern (SPEC-001 `/supply`: BQ aggregate → Supabase →
page, reconciled to Spanner). Ownership is the same shape. Doing it from BQ makes roster size a query
and makes a true holder ranking possible; doing it from the mirror would ship a quietly-wrong ranking.

## Ground truth (live `/supply`, BQ↔Spanner Δ0.06%)

- Ever minted **52,183,278** · Burned **15,240,402** (29.2%) · Circulating **36,942,876**
- Currently locked **5,671,735** (15.4% of circulating)
- BQ current ownership: **35,006,547** current-owner rows (5.34M locked, 0 burned), **753,253**
  distinct current owners. (Circulating − current-owned ≈ 1.9M = in-pack/undistributed; no holder.)

## Q2 — Target user & outcome

**The digital-native collector** who wants to pull market data and explore market information about
Top Shot assets — here, *who holds what*: the leading collectors of any top-100 player, their depth,
and their identity. Surface = `fandom-v3`. JTBD: read the ownership landscape of a player on complete
data, fast.

## Q3 — Definition of Done & the One Metric

**Done means:** the **top 100 players** (by mint volume) live on `fandom-v3.vercel.app`, each
rendering its leading holders, sourced from BigQuery, parity-checked against the prior GraphQL output
for an overlap player.

**The One Metric (coverage):** **100% of the top-100 holders of every player, correctly ranked**,
with **good coverage of the top-1000** holders per player. Now achievable because BQ is complete.
- Hard gate: top-100 holders complete + correctly ranked for all 100 players.
- Stretch: top-1000 holders covered; identity (username/avatar) coverage reported per player.
- Baseline: 30 players from a capped GraphQL pull.

## Q4 — Non-goals

- Rebuilding `fandom.js` / the 3D viz. Source-of-bytes change only.
- Runtime BQ/Supabase reads from `fandom-v3` (stays static — generator writes JSON at build time).
- A full long-tail owner dump. Cap at top-N holders per player (N≥1000); the one-moment tail is out.
- Re-deriving supply (that's `/supply`); we reuse its BQ reconciliation, not redo it.
- Value-weighting + real cross-player overlap (transactions/market_caps) — stretch, Phase 6, gated separately.
- Any change to the portal's customer-facing UI (topshot.world). Additive ETL + table only.

## Holdings, holder unit & ranking (definition — locked)

- A holder's **holdings** = count of moments where `is_current_owner = true`, **locked included,
  burned excluded** (burned moments have no current owner). Per BQ `asset_ownership_nba_moment`.
- **Holder unit = `flow_address`.** Ranking is by raw on-chain address, never by consolidated
  collector identity. Identity fields (username/avatar/topshotScore) are **display-only and may
  never affect rank**.
- **Ranking is deterministic:** `ORDER BY holdings DESC, flow_address ASC`. Ties broken by address.

## Q5 — Riskiest assumptions

1. **Moment→player join completeness in BQ** — holder ranking requires mapping each owned
   `moment_flow_id` → edition → player. *Test:* reconcile a player's BQ holder total against
   `/supply`-style edition mint sums; unmapped moments must be reported, not dropped silently.
2. **BQ scan cost** — aggregating 35M ownership × moment join. *Test:* dry-run bytes-billed; if heavy,
   pre-filter to the 100 rostered players' editions (bounds the scan). Tolerance per CLAUDE.md (~$100/op).
3. **Identity coverage for top holders** — `topshot.collectors` (1.68M, GraphQL-seeded) may miss some
   top holders → flowAddress-only rows. *Test:* report identity-resolved % of top-100 per player;
   this is a stretch metric, not a blocker.
4. **`fandom.js` tolerates a capped, BQ-shaped owners[] list** — *Test:* the Phase 3 parity diff + local render.

## Q6 — Prior art & build-vs-buy

Reuse heavily: SPEC-001 `/supply` ETL pattern (BQ aggregate → small Supabase table → consumer) and
its reconciliation discipline; the BQ tables `asset_ownership_nba_moment` + `asset_nba_moment`; the
existing `scripts/bq-pull-ownership-*.mjs` tooling; `topshot.collectors` for identity. **Recommendation:
reuse + build-thin** — net-new = one BQ aggregation ETL, one small Supabase table + read, one generator.

## Functional requirements

- **FR-1** Portal ETL `scripts/etl/bq-refresh-fandom-holders.mjs` aggregates in BigQuery —
  `is_current_owner = true` ownership joined to moment→edition→player — to **top-N (N=1000) holders per
  player by holdings**, for the top-100 rostered players, and upserts `topshot.fandom_top_holders`
  (`player_id, rank, flow_address, holdings`), LEFT JOIN `collectors` for identity. Idempotent,
  cron-friendly, mirrors `bq-refresh-supply-timeline.mjs`. **Unmapped current-owned moments for a
  rostered player are a hard gate: must be 0, else that player is blocked from launch** (not silently
  dropped). Table enforces `UNIQUE(player_id, rank)` and `UNIQUE(player_id, flow_address)`.
- **FR-2** Query module `lib/supabase/queries/fandom-holders.ts` (+ anon-readable RLS per 0003/0037)
  returns top-N holders for a player with identity + holdings, plus the player's edition metadata.
- **FR-3** New ingestor `fandom-v3` `scripts/gen-fandom-data.mjs` reads FR-2 → writes
  `/data/{playerId}.json` in the existing shape (owners[] = top-N holders with type/flowAddress/
  dapperID/username/profileImageUrl/topshotScore/holdings; editions[]; partial flags; fetchedAt).
  Regenerates `index.json` + bundled `PLAYERS`. `fandom.js` unchanged.
- **FR-4** Parity: a BQ-sourced file for an overlap player (`202710` Jimmy Butler) matches the prior
  GraphQL file in structure; holder ranking reconciles; coverage gain over the old capped pull documented.
- **FR-5** Roster expands 30 → **100** players (top 100 by mint volume).
- **FR-6** `fandom-v3` deploys to `fandom-v3.vercel.app` (push-to-main auto-deploy) with all 100
  players live; static-first preserved.

## Verification (hard gates)

- **G1** For **all 100** roster players, generated JSON top-100 exactly matches an independent BQ
  verification query on `(player_id, rank, flow_address, holdings)`. Not a 3-player spot check.
- **G4** Current-owner rows are unique by moment: `COUNT(*) = COUNT(DISTINCT moment_flow_id)` for
  `is_current_owner = true` (no double-counted holdings).
- **G5** Unmapped current-owned moments = 0 for every shipped player (else that player is blocked).
- **G6** The top-100 roster is produced by committed SQL and committed as an artifact (reproducible).
- **G7** `topshot.fandom_top_holders` enforces `UNIQUE(player_id, rank)` + `UNIQUE(player_id, flow_address)`.
- The One Metric: all 100 players have complete, correctly-ranked top-100 holders; top-1000 + identity
  coverage reported per player.
- FR-4 parity report (`specs/002-fandom-ownership-backend/parity-202710.md`).
- FR-6 live: `curl fandom-v3.vercel.app/data/index.json | jq length` == 100; 3 random players load.

---

*Cross-vendor verification gate runs on this spec before it advances to plan.*
