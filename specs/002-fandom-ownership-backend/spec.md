# SPEC-002 — Fandom Ownership Backend

**Status:** ratified
**Author:** Dexter (for Roham)
**Date:** 2026-06-14
**spec_id:** 002-fandom-ownership-backend
**owner:** Roham
**constitution:** topshot-data-portal/constitution.md (repo scope) → Dapper Labs company constitution
**Governs:** the new ownership export layer in `topshot-data-portal` (an MV + an RPC over
`topshot.moments` + `topshot.collectors`) and its first consumer, the `fandom-v3` ownership
graph (`claude-conversations/dapperlabs-v2-i/fandom-v3`). Cross-repo.

## Q1 — Problem & why now

`fandom-v3` (the ownership "pride engine" at `fandom-v3.vercel.app`) sources its per-player
ownership graph from the public NBATS GraphQL API via `scripts/fetch-top40.js` — paginating
`searchMintedMoments → ownerV2` per player, capped at 500 serials/edition, top-30 players only.
That ingestor is rate-limited, slow, and re-fetches data the portal **already holds at league
scale** — verified live 2026-06-14:

- `topshot.moments`: **8,578,408** rows; **6,249,557 (72.8%)** carry a real `owner_flow_address`.
- `topshot.collectors`: **1,677,429** resolved identities (username, avatar, topshotScore, type).

**Why now:** adding players today means another multi-pass GraphQL backfill + git churn from
multi-MB JSON. Sourcing from Supabase makes roster size a query parameter — the difference between
"30 players, painfully" and "100 players, trivially."

## Q2 — Target user & outcome

**The digital-native collector** who wants to pull market data and explore market information about
Top Shot assets — here, *who holds what*: the top collectors of any given player, their depth, and
their identity. The consumer surface is `fandom-v3`; the human is a collector using it to read the
ownership landscape of a player. Job-to-be-done: see any top-100 player's leading holders, fast,
without a fragile ingest.

## Q3 — Definition of Done & the One Metric

**Done means:** the **top 100 players** (by mint volume) are live on `fandom-v3.vercel.app`, each
rendering its leading holders, parity-proven against the current GraphQL output for an overlap player.

**The One Metric (coverage):** **100% of the top-100 holders of every player** are present and
correctly ranked — with **good coverage of the top-1000** holders per player as the stretch target.
- Hard gate: top-100 holders complete for all 100 players.
- Stretch: top-1000 holders well-covered.
- Baseline today: 30 players, full owner lists from GraphQL (no ranked-coverage guarantee).

## Q4 — Non-goals

- Rebuilding `fandom.js` / the 3D viz. Source-of-bytes change only.
- Runtime Supabase reads from `fandom-v3` (stays static — generator writes JSON at build time).
- A full long-tail owner dump. We cap at **top-N holders per player** (N≥1000); the one-moment tail
  is out of scope.
- Resolving the 27.2% NULL-owner moments (separate BQ ETL concern; surfaced as `partial`, not fixed here).
- Value-weighting + real cross-player overlap (transactions/market_caps) — **stretch, Phase 6, gated separately.**
- Any change to the portal's customer-facing UI (topshot.world). Additive MV/RPC only.

## Q5 — Riskiest assumptions

1. **Ranking integrity under partial coverage** — the top-100/top-1000 holder ranking is computed
   from the 72.8%-populated `owner_flow_address`. If a true top holder's moments fall heavily in the
   27.2% NULL set, the ranking is distorted. *Test:* for 3 players, compare Supabase top-100 vs the
   GraphQL-sourced holdings; if rank-correlation is low, the coverage gap is load-bearing. *Kill/pivot:*
   if ranking is unreliable, gate on improving `owner_flow_address` coverage before shipping 100.
2. **RPC performance at top-1000 × 100 players** — bounded top-N keeps it cheap, but the MV must be
   indexed on `player_id` + ordered by holdings. *Test:* RPC p95 for the highest-mint player.
3. **`fandom.js` tolerates a capped owners[] list** — the viz currently gets full owner arrays; a
   top-N list must not break rendering. *Test:* the Phase 3 parity diff + local render.

## Q6 — Prior art & build-vs-buy

Reuse heavily: `topshot.collectors`, `moments.owner_flow_address`, and especially the existing
`lib/supabase/queries/holders.ts` — which *already* ranks top-N holders by count (currently capped
at top-20 / `MAX_PAGES=50`); we promote it to top-1000 and back it with an MV. Plus SPEC-001's
BQ→Supabase→consumer convention. **Recommendation: reuse + build-thin** — net-new = one MV, one RPC,
one generator.

## Functional requirements

- **FR-1** Portal migration creates `topshot.mv_holders_by_player` — `(player_id, owner_flow_address,
  holdings)` ranked aggregation over `moments` (holdings = COUNT of that player's owned moments per
  owner), indexed for fast top-N retrieval.
- **FR-2** Portal RPC `topshot.player_top_holders(p_player_id text, p_limit int default 1000)` returns
  the top-N holders for a player (holdings + LEFT JOIN `collectors` identity), plus the player's
  edition metadata for the viz. Anon-readable per the 0003/0037 RLS posture.
- **FR-3** New ingestor `fandom-v3` `scripts/gen-fandom-data.mjs` reads FR-2 → writes
  `/data/{playerId}.json` in the existing shape (owners[] = top-N holders with type/flowAddress/
  dapperID/username/profileImageUrl/topshotScore/holdings; editions[]; partial flags; fetchedAt).
  Regenerates `index.json` + bundled `PLAYERS` in `data-layer.js`. `fandom.js` unchanged.
- **FR-4** Parity: a Supabase-sourced file for an overlap player (e.g. `202710` Jimmy Butler) matches
  the current GraphQL file in structure and top-holder ranking; coverage delta documented.
- **FR-5** Roster expands from 30 → **100** players (top 100 by mint volume, ranked from
  `mv_player_market_cap` / volume MVs).
- **FR-6** `fandom-v3` deploys to `fandom-v3.vercel.app` (push-to-main auto-deploy) with all 100
  players live; static-first architecture preserved.

## Verification

- FR-2 top-100 holders for 3 players reconcile to a direct `GROUP BY owner_flow_address` ranking.
- The One Metric: for all 100 players, top-100 holders present (100%); top-1000 coverage reported.
- FR-4 parity report written (`specs/002-fandom-ownership-backend/parity-202710.md`).
- FR-6 live: `curl fandom-v3.vercel.app/data/index.json | jq length` == 100; 3 random players load.

---

*Cross-vendor verification gate runs on this spec before it advances to plan.*
