# PLAN-002 — Fandom Ownership Backend (BigQuery-sourced)

**spec_id:** 002-fandom-ownership-backend
**Status:** active ⟳
**Author:** Dexter (for Roham)
**Date:** 2026-06-14
**Governing constitution:** `topshot-data-portal/constitution.md` → Dapper Labs company constitution.
**Supersedes:** the prior Supabase-mirror plan (rejected — mirror is ~10%/player complete).

---

## Q7 — Approach & Alternatives

**Chosen: BigQuery aggregation ETL → small Supabase table → generator, modeled on SPEC-001 `/supply`.**
A portal ETL aggregates current ownership in BigQuery (`asset_ownership_nba_moment`, `is_current_owner`,
locked-in/burned-out) joined to moment→edition→player, to top-1000 holders per player for the top-100
roster, and upserts `topshot.fandom_top_holders`. A query module reads it; the `fandom-v3` generator
emits the existing static JSON. `fandom.js` untouched; static-first preserved.

*Why:* it's the only source that can satisfy the One Metric (complete current ownership: 35M rows /
753K owners, reconciled to Spanner within 0.06% via `/supply`). It reuses a pattern the portal already
ships, so it's low-novelty. Bounded BQ scan (pre-filtered to rostered editions).

**Alternative A — Supabase-mirror MV/RPC** (the prior plan). *Rejected:* the mirror holds ~10% of each
player's moments → quietly-wrong rankings. The cross-vendor gate failed it on exactly this.

**Alternative B — Runtime BQ reads from `fandom-v3`.** *Rejected:* breaks static-first, puts BQ egress +
cost on every visitor, needs auth on a public site. The generator (build-time) is correct.

---

## Q8 — DACI

- **Driver:** Dexter (for Roham). **Approver:** Roham.
- **Consulted:** portal ETL owner (`/supply` BQ pipeline, ownership backfill); fandom-v3 maintainer.
- **Informed:** `fandom-v3.vercel.app` viewers; `#topshot-data` if it exists.

No financial/legal/HR special situation. Data is public on-chain ownership.

---

## Q9 — Dependencies & Sequencing

**Depends on (all confirmed reachable 2026-06-14):**
- BQ `dapperlabs-data.production_sem_open.asset_ownership_nba_moment` (35.0M current-owner rows) +
  `asset_nba_moment` (52.18M) for moment→edition→player. VM SA + local both query it. ✓
- The `/supply` ETL pattern (`scripts/etl/bq-refresh-supply-timeline.mjs`) as the template. ✓
- `topshot.collectors` (1.68M) for display identity (LEFT JOIN). ✓
- `fandom-v3` repo (claude-conversations) for the generator + static data. ✓
- Daemon VM: node/bq/jq/claude present, GH token (both repos), Supabase creds, **Anthropic key staged
  from GSM**, passwordless sudo. `psql` installs in P0. ✓

**Blockers:** none remaining — the recurring Anthropic-key blocker is resolved (VM self-fetches from
GSM `pantheon-anthropic-api-key`).

**Critical path:** P0 provision → **P1 BQ ETL + table** (keystone) → P2 query module → P3 generator →
**P4 parity gate (Jimmy)** → P5 roster-100 + full run → P6 deploy. **Effort:** medium · multi-pass.

---

## Q10 — Risk

**Blast radius:** internal/prototype. `fandom-v3` is a prototype; the portal change is an *additive*
ETL + one new table — **no customer-facing UI change** to topshot.world.

**Special situations:** none. **BQ scan cost** is the only spend vector — bounded by pre-filtering to
the 100 rostered players' editions; dry-run bytes-billed first; within the ~$100/op prototype tolerance.

**Reversibility:**
- Code/deploy: reversible (revert commits; `fandom-v3` redeploys from main).
- World/user effect: reversible — `DROP TABLE topshot.fandom_top_holders`; `git revert` the fandom data
  commits → Vercel redeploys prior graph; `fetch-top40.js` retained as fallback ingestor.

**Undo:** drop the table + the ETL, revert fandom-v3 data, redeploy. No destructive op on existing data.

---

## Phase plan (detailed — each phase: artifact + deterministic gate + reversible)

> Cross-vendor verification runs on this plan and each phase output before development advances.

### P0 — Provision + pin roster (daemon bootstrap) · reversible
- Install `psql`; clone portal (spec branch) + claude-conversations (main); verify BQ query, Supabase
  REST, both-repo push.
- **Pin the roster up front (G6):** commit `specs/002-fandom-ownership-backend/roster-100.sql` (top 100
  players by mint volume) **and** its frozen output `roster-100.json` (playerId list) as artifacts.
  Everything downstream filters by this list — it must exist before P1, not after.
- **Gate:** all green (BQ ✓, Supabase ✓, repos ✓, psql ✓, roster pinned ✓). Artifact `phase0-provision.md`.

### P1 — BQ ETL + holders table (portal) · KEYSTONE
- Migration `00XX_fandom_top_holders.sql`: `topshot.fandom_top_holders(player_id, rank, flow_address,
  holdings, username, profile_image_url, topshot_score)` with `UNIQUE(player_id, rank)` +
  `UNIQUE(player_id, flow_address)`, anon-read RLS per 0037.
- ETL `scripts/etl/bq-refresh-fandom-holders.mjs` (mirrors `bq-refresh-supply-timeline.mjs`): BQ
  aggregate current-owner→moment→edition→player → top-1000/player for the roster → upsert table; LEFT
  JOIN `collectors`. **Ownership semantics explicit:** `is_current_owner = true`, `is_locked` counts,
  `is_burned` excluded, escrow/undistributed have no holder. **Dedup guard:** one row per
  `moment_flow_id` (assert `COUNT(*)=COUNT(DISTINCT moment_flow_id)` *before* aggregating — the moment→
  edition→player join must not fan out). **Address normalization:** `flow_address` lowercased, validated
  `^[a-f0-9]{16}$` (reuse the repo PII-gate regex). **Atomic rerank:** per-player `DELETE` + bulk
  `INSERT` inside one transaction (never partial-update a player's ranks). Dry-run bytes-billed first;
  pre-filter the scan to the roster's editions. Deterministic rank (`holdings DESC, flow_address ASC`).
- **Gate (G4/G5):** dedup assertion holds; **unmapped current-owned for any rostered player = 0** (else
  that player blocked); spot-3 top-100 vs an *independent* direct BQ `GROUP BY` (the validation query is
  authored separately from the ETL query). Artifact `phase1-etl-proof.md` + DROP rollback recorded.

### P2 — Query module (portal) · reversible
- `lib/supabase/queries/fandom-holders.ts` — top-N holders per player (**keyset-paginated** to clear
  Supabase's 1000-row default API cap when reading the full top-1000) + **edition metadata from
  `topshot.editions`** joined by `player_id` (the holders table has no editions; that's the source).
- **Gate:** returns correct, fully-paginated top-1000 for 202710 matching the table. types clean.

### P3 — Generator (fandom-v3) · reversible
- `scripts/gen-fandom-data.mjs` reads P2 → writes `/data/{playerId}.json` in the existing shape
  (owners[] = top-N holders w/ holdings+identity; editions[] from `topshot.editions`; partial/fetchedAt).
  Regenerate `index.json` + `data-layer.js`. Keep `fetch-top40.js`.
- **Gate:** `node --check` clean; output key-sets + types match the existing file exactly.

### P4 — Parity gate (Jimmy Butler 202710) · HARD GATE
- The prior GraphQL file is itself incomplete (500-serial/edition cap), so the bar is **NOT equality
  with it.** Bar = (a) JSON **structurally** loads in `fandom.js` unchanged; (b) BQ-sourced top-100
  ranking **reconciles to an independent BQ `GROUP BY`** (ground truth); (c) document the **coverage
  gain** over the old capped file (more owners, complete holdings). Load in fandom.js; screenshot.
- **Gate (G1 for 1 player):** structure compatible + ranking == independent BQ + renders. Artifact
  `parity-202710.md`. **Fail → STOP, no roster work.**

### P5 — Full run across the pinned roster (100) · reversible
- Run ETL + generator across the P0-pinned `roster-100.json`. (Roster already committed in P0 — G6.)
- **Gate (G1 all-100/G7):** 100 files; each top-100 matches independent BQ output; table UNIQUE holds;
  top-1000 + identity coverage reported. Artifact `phase5-roster.md`.

### P6 — Deploy + verify · reversible
- Push claude-conversations main → Vercel auto-deploys → live-verify.
- **Gate:** `index.json` length 100; 3 random players load; Jimmy renders. Else `git revert` + redeploy.
  Artifact `phase6-verification.md`.

---

*Cross-vendor verification gate runs on this plan, and on each phase output, before development advances.*
