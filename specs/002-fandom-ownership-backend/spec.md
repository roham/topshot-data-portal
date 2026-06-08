# SPEC-002 — Fandom Ownership Backend

**Status:** active
**Author:** Dexter (for Roham)
**Date:** 2026-06-08
**spec_id:** 002-fandom-ownership-backend
**Governs:** the new ownership export layer in `topshot-data-portal` (an MV + an RPC over
`topshot.moments` + `topshot.collectors`) and its first consumer, the `fandom-v3` ownership
graph (`claude-conversations/dapperlabs-v2-i/fandom-v3`). Cross-repo.

## Problem

`fandom-v3` (the ownership "pride engine" at `fandom-v3.vercel.app`) sources its per-player
ownership graph from the public NBATS GraphQL API via `scripts/fetch-top40.js` — paginating
`searchMintedMoments → ownerV2` per player, capped at 500 serials/edition. That ingestor is
rate-limited, slow, and only ever holds the **top 30 players**. Adding players means another
multi-pass GraphQL backfill, and the per-player JSON files (1–3 MB each) churn into git history
on every refresh.

Meanwhile the **portal's Supabase already holds the whole-league ownership graph** — verified
live 2026-06-08:

- `topshot.moments`: **8,578,408** rows; **6,249,557 (72.8%)** carry a real `owner_flow_address`
  (landed by commit `0fe4faa` "ownership backfill: 6.25M moments now have real Flow addresses").
- `topshot.collectors`: **1,677,429** resolved identities (username, avatar, topshotScore, type).

So `fandom-v3` is re-paginating GraphQL for data the portal already has at league scale. The
two share upstream lineage (`collectors` was originally seeded by the same `fetch-top40.js`);
consolidating onto Supabase removes a redundant pipeline and unlocks arbitrary roster size.

## Why an export layer in the portal (not a fandom-v3 change alone)

The portal is the canonical ownership backend. `fandom-v3` is a static-first consumer that wants
**full per-edition owner lists with holdings + identity** in its existing JSON shape. The portal's
existing `holders.ts` returns only **top-20** holders (capped `MAX_PAGES=50`), which is insufficient.
The right home for "produce the complete ownership graph for a player" is a portal MV + RPC, behind
the same BQ→Supabase→consumer convention the repo already uses (see SPEC-001).

## Definitions (locked)

- **Owned moment** = a `topshot.moments` row with non-null `owner_flow_address`. The 27.2% with
  NULL owner are **unresolved**, surfaced honestly as `partial: true` + `partialReason` on the
  edition/player, never fabricated.
- **Holdings** = `COUNT(moment_id)` for an `(owner_flow_address, edition_id)` pair.
- **Owner identity** = LEFT JOIN to `topshot.collectors` on `flow_address`. Custodial (`type='user'`)
  has username/avatar/topshotScore/dapperID; non-custodial (`type='nc'`) has address only.
- **fandom-v3 output contract** (must match the existing `/data/{playerId}.json` shape exactly):
  top-level `{ playerId, name, team, teamSlug, teamColors, totalMintedMomentCount, editions[],
  owners[], fetchedAt, partial, partialReason }`; each owner `{ type, flowAddress, dapperID,
  username, profileImageUrl, topshotScore, holdings }`; each edition `{ editionKey, set, play,
  edition, tier, circulationCount, ... }`. `dapperID` is INTERNAL — present in the JSON only if
  the current pipeline already emits it; do not newly surface it in UI.

## Functional requirements

- **FR-1** Portal migration creates `topshot.mv_holders_by_player` — full (not top-N)
  `(player_id, owner_flow_address, edition_id, holdings)` aggregation over `moments`, refreshable.
- **FR-2** Portal RPC `topshot.player_ownership_export(p_player_id text)` returns the COMPLETE
  ownership graph for a player (every owned edition + every owner with holdings + JOINed identity),
  in one call, anon-readable per the 0003/0037 RLS posture. Bounded by the player's own data, not a
  global page cap.
- **FR-3** New ingestor `fandom-v3` `scripts/gen-fandom-data.mjs` reads FR-2 → writes
  `/data/{playerId}.json` in the locked output contract, regenerates `data/index.json`, and updates
  the bundled `PLAYERS` fallback in `data-layer.js`. Drop-in replacement for `fetch-top40.js`'s
  source; the consumer (`fandom.js`) is unchanged.
- **FR-4** Parity: a Supabase-sourced file for player `202710` (Jimmy Butler) structurally matches
  the current GraphQL-sourced file (same keys, editions>0, owners>0); owner-count delta is
  documented against the 72.8% coverage and emitted as `partial`/`partialReason`, not hidden.
- **FR-5** Roster expands from 30 → 48: the next 18 players by mint volume (ranked from
  `mv_player_market_cap` / volume MVs, excluding the existing 30) are added and generated.
- **FR-6** `fandom-v3` deploys to `fandom-v3.vercel.app` (push-to-main auto-deploy) with all 48
  players live; first-paint still served from `index.json` + bundled fallback (static-first
  architecture preserved).

## Non-goals

- Rebuilding `fandom.js` / the 3D viz. Source-of-bytes change only.
- Runtime Supabase reads from `fandom-v3` (stays static — generator writes JSON at build time).
- Resolving the 27.2% NULL-owner moments (separate BQ ETL concern; surfaced as `partial`, not fixed here).
- Value-weighting + real cross-player overlap (transactions/market_caps) — **stretch, Phase 6, gated separately.**
- Any change to the portal's customer-facing UI (topshot.world). Additive MV/RPC only.

## Verification

- FR-2 RPC for `202760`/`202710` returns owner count reconciling to
  `SELECT COUNT(DISTINCT owner_flow_address) FROM topshot.moments WHERE edition_id IN (player's editions)`.
- FR-3 generator output passes a schema check against the existing file shape; `node --check` clean.
- FR-4 parity report written (`specs/002-fandom-ownership-backend/parity-202710.md`).
- FR-6 live: `curl fandom-v3.vercel.app/data/index.json | jq length` == 48; 3 random players load;
  Jimmy's universe renders (screenshot).

## Riskiest assumptions

1. The RPC for a high-mint player returns within statement timeout without a page cap (mitigate:
   MV-backed, indexed on `player_id`).
2. 72.8% coverage is acceptable for a showcase graph (Roham to confirm; `partial` makes it honest).
3. `fandom.js` reads no field that the GraphQL path emitted but Supabase can't reconstruct (de-risked
   by the Phase 3 parity diff before any roster expansion).

## Prior art / build-vs-buy

Reuse heavily: `topshot.collectors`, `moments.owner_flow_address`, the `holders.ts` aggregation
pattern (promoted from top-N to full), SPEC-001's BQ→Supabase→consumer convention. Net-new = one MV,
one RPC, one generator script. Build thin.
