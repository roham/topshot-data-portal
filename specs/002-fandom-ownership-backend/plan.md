# PLAN-002 — Fandom Ownership Backend

**spec_id:** 002-fandom-ownership-backend
**Status:** active ⟳
**Author:** Dexter (for Roham)
**Date:** 2026-06-08
**Governing constitution:** `topshot-data-portal/constitution.md` (repo scope) → Dapper Labs company constitution.

---

## Q7 — Approach & Alternatives

**Chosen approach: Portal-canonical export + static generator (consolidate onto Supabase).**
Add one MV + one RPC in the portal that produce the *full* per-player ownership graph from
`topshot.moments` + `topshot.collectors`; replace `fandom-v3`'s GraphQL ingestor with a generator
that reads the RPC and emits the existing static `/data/{playerId}.json` shape. `fandom.js` is
untouched; the static-first architecture is preserved. Roster size becomes a query parameter.

*Why:* serves the DoD (48 players live, parity-proven) while killing the redundant GraphQL pipeline
and the per-batch backfill friction. Manages the riskiest assumption (schema drift) by proving parity
on one player before expanding. Reversible at every step.

**Alternative A — Runtime Supabase reads from fandom-v3.**
*Tradeoff:* always-fresh, no generator step; but breaks the static-first model, adds a serverless
dependency + Supabase egress on every visitor, and needs auth/rate-limiting on a public site.
*Why not:* fandom-v3's value is a fast static CDN graph; runtime DB reads regress that for no
showcase benefit.

**Alternative B — Keep GraphQL, just script more players.**
*Tradeoff:* zero portal change; but re-paginates GraphQL for data the portal already has, stays
rate-limited, and never unlocks league-scale roster or cross-player overlap.
*Why not:* leaves the redundant pipeline and the scaling ceiling in place — the exact problem.

---

## Q8 — DACI

- **Driver:** Dexter (executing for Roham).
- **Approver:** Roham.
- **Consulted:** portal data/ETL owner (BQ→Supabase ownership backfill); fandom-v3 maintainer (same surface).
- **Informed:** anyone reading `fandom-v3.vercel.app`; the `#topshot-data` channel if one exists.

No financial / legal / HR special situation. Data is already-public on-chain ownership + the
portal's existing collector mirror. (See Q10 for the prod-DDL flag.)

---

## Q9 — Dependencies & Sequencing

**Depends on:**
- Portal Supabase (`wewmolsrxrpajrzjqvim`): `topshot.moments.owner_flow_address` (6.25M populated),
  `topshot.collectors` (1.68M), `topshot.editions`, `mv_player_market_cap` (for roster ranking).
- Service-role key for DDL + RPC creation (portal `.env.local` → provisioned to the daemon VM).
- Two repos on the VM: `roham/topshot-data-portal` (push) and `roham/claude-conversations` (push;
  GH-token workaround — VM has no claude-conversations deploy key).
- Vercel git auto-deploy on `fandom-v3` (push-to-main; no Vercel token needed).

**Blockers (must land before start):** VM auth provisioning — Supabase service-role key + a GH token
scoped to BOTH repos in `/opt/kaaos-daemon/.env`. (Phase 0.)

**Critical path:** P0 provision → **P1 MV/RPC** (keystone; everything downstream reads it) → P2
generator → **P3 parity gate** (must pass before any roster work) → P4 roster-48 → P5 deploy.
P6 (value/cross-player) is post-priority, gated separately, parallelizable after P5.

**Effort:** medium · multi-pass. (P1 + P2 are the substance; P3 is a hard gate; P4–P5 are mechanical.)

---

## Q10 — Risk

**Blast radius:**
- Surface: internal/prototype. `fandom-v3` is a prototype showcase; the portal change is an
  *additive* MV/RPC with **no customer-facing UI change** to topshot.world.
- Special situations: none financial/legal/HR. ⚠ **One load-bearing op:** Phase 1 applies DDL
  (CREATE MATERIALIZED VIEW + CREATE FUNCTION) to the **live portal Supabase**. Additive and
  reversible, but it is prod data infrastructure — Approver (Roham) green-lights prod DDL; the
  pipeline verifies + keeps a rollback before proceeding.

**Reversibility:**
- Code/deploy: reversible (revert commits; `fandom-v3` redeploys from main).
- World/user effect: reversible — `DROP MATERIALIZED VIEW topshot.mv_holders_by_player` +
  `DROP FUNCTION topshot.player_ownership_export`; the generated JSON is git-tracked and revertible.

**Undo:** (1) revert the portal migration + drop the MV/RPC; (2) `git revert` the fandom-v3 data
commits and push → Vercel redeploys the prior graph; (3) `fetch-top40.js` remains in-tree as the
fallback ingestor until parity is signed off.

---

## Phase plan (detailed — each phase is an autonomous pipeline stage)

> Every phase: produces a named artifact, has a deterministic gate, commits at its boundary, and is
> reversible. Phases run sequentially except where noted. **Cross-vendor verification runs on this
> plan and on each phase output before development advances.**

### Phase 0 — Provision (daemon bootstrap) · reversible
- **Do:** clone both repos on the VM; load Supabase service-role key + dual-repo GH token into
  `/opt/kaaos-daemon/.env`; verify connectivity (a `count=exact` HEAD on `topshot.moments`, a
  `git push --dry-run` on each repo).
- **Artifact:** `phase0-provision.md` (connectivity receipts; no secrets in the file).
- **Gate:** Supabase reachable + both repos pushable. Else STOP and surface the exact missing cred.

### Phase 1 — Ownership MV + RPC (portal repo) · KEYSTONE · load-bearing (prod DDL)
- **Do:** author migration `supabase/migrations/00XX_mv_holders_by_player.sql`:
  - `topshot.mv_holders_by_player` = `SELECT e.player_id, m.owner_flow_address, m.edition_id,
    COUNT(*) AS holdings FROM topshot.moments m JOIN topshot.editions e USING (edition_id) WHERE
    m.owner_flow_address IS NOT NULL GROUP BY 1,2,3`; index on `(player_id)`.
  - RPC `topshot.player_ownership_export(p_player_id text)` returning the full graph: editions for
    the player (with set/play/tier/circulationCount) + every owner row from the MV, LEFT JOIN
    `collectors` for identity, shaped to the FR-2 contract. `SECURITY DEFINER`, anon-grant per 0037.
  - Apply via the repo's migration path; `REFRESH MATERIALIZED VIEW` once.
- **Artifact:** the migration file + `phase1-rpc-proof.md`.
- **Gate:** RPC owner count for `202710` reconciles (±0) to `COUNT(DISTINCT owner_flow_address)` over
  that player's editions. **Rollback kept:** the DROP statements, recorded in the proof file.

### Phase 2 — Generator (fandom-v3 / scripts) · reversible
- **Do:** write `scripts/gen-fandom-data.mjs` — reads `player_ownership_export` per roster id →
  emits `/data/{playerId}.json` in the locked output contract (mirror `fetch-top40.js`'s
  `normalizeOwner` User/NonCustodial mapping; carry `holdings`, `topshotScore`, `partial`,
  `partialReason`, `fetchedAt`). Regenerate `data/index.json`; update `data-layer.js` `PLAYERS`.
  Keep `fetch-top40.js` in-tree (fallback).
- **Artifact:** the script + a generated `202710.json` (not yet committed to the live roster).
- **Gate:** `node --check` clean; output validates against the existing file's top-level + owner +
  edition key sets.

### Phase 3 — Parity proof · HARD GATE (no roster work until green)
- **Do:** structurally diff Supabase-sourced `202710.json` vs the current GraphQL file; load it in
  `fandom.js` locally; screenshot Jimmy's universe.
- **Artifact:** `specs/002-fandom-ownership-backend/parity-202710.md` (key diff, owner-count delta vs
  72.8% coverage, render screenshot path, pass/fail per FR-4).
- **Gate:** same keys, editions>0, owners>0, renders without a `fandom.js` schema break, coverage
  delta documented. **If fail → STOP, report, do not expand roster.**

### Phase 4 — Roster expansion to 48 · reversible
- **Do:** rank players by mint volume (`mv_player_market_cap` / volume MVs), exclude the existing 30,
  take the next 18; add ids to `TOP-30-PLAYERS.json` (rename to roster file); run the generator
  across all 48; regenerate `index.json` + `data-layer.js`.
- **Artifact:** 48 `/data/*.json` + refreshed index; `phase4-roster.md` (the 18 chosen + why).
- **Gate:** 48 files; every file `editions>0 && owners>0`; index length 48.

### Phase 5 — Deploy + verify · reversible
- **Do:** commit + push `fandom-v3` to main (Vercel auto-deploys); wait; live-verify.
- **Artifact:** `phase5-verification.md` (curl outputs + screenshots).
- **Gate:** `200` on `/`; `index.json` length 48; 3 random players load; picker renders 48; Jimmy
  loads. Else `git revert` + redeploy.

### Phase 6 — Value-weighting + real cross-player · STRETCH · gated separately
- **Do (post-priority):** join `transactions`/`market_caps` so owners carry value; recompute
  `crossPlayerFan` from full-league overlap (now possible with league-scale data). Own spec amendment.
- **Gate:** separate sign-off; not part of the 48-live DoD.

---

*Cross-vendor verification gate runs on this plan, and on each phase output, before development advances.*
