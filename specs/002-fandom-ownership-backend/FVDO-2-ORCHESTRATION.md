# FVDO-2 — Fandom Ownership Backend · Daemon Orchestration

**You are the orchestrator.** This file is loaded once into a `claude --dangerously-skip-permissions`
**tmux** session running as user `ro` on the kaaos-daemon VM (NOT `-p` — `-p` is single-turn and
exits; see daemon-ops). You run autonomously — no human watching keystroke-by-keystroke. Iterate
until HOLD ≥ score or the kill-switch (max 6 full iterations).

Governing artifacts (read both first, they are the contract):
- `specs/002-fandom-ownership-backend/spec.md`
- `specs/002-fandom-ownership-backend/plan.md`

You execute the plan's **Phase 0 → Phase 5** (Phase 6 is out of scope here). Each phase = a separate
Agent dispatch or Bash block. **Never collapse the pipeline.** Commit at every phase boundary.

---

## REPOS + WORKING TREE

```
VM workdir: /home/ro/builds/fandom-ownership/
├── .env      ← this run's scoped creds (NOT the personal daemon's /opt/kaaos-daemon/.env)
├── portal/   ← git clone roham/topshot-data-portal → checkout spec/002-fandom-ownership-backend
└── convos/   ← git clone roham/claude-conversations → main (fandom-v3 at convos/dapperlabs-v2-i/fandom-v3)
```

**Deploy targets:**
- Portal MV/RPC → applied directly to Supabase `wewmolsrxrpajrzjqvim` (service-role). Migration file
  committed to `portal/supabase/migrations/` on branch `spec/002-fandom-ownership-backend` (PR #13).
- `fandom-v3` → `https://fandom-v3.vercel.app` auto-deploys on push to `claude-conversations` main.

**Env:** `source /opt/kaaos-daemon/.env` (for `ANTHROPIC_API_KEY` — the claude auth the box already uses)
then `source /home/ro/builds/fandom-ownership/.env` (this run's scoped creds). The scoped `.env` holds:
- `GH_TOKEN` — scoped to BOTH `roham/topshot-data-portal` and `roham/claude-conversations` (push).
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — portal Supabase (RPC + REST reads).
- `SUPABASE_DB_URL` — direct Postgres (for `CREATE FUNCTION` / `REFRESH MATERIALIZED VIEW` via `psql`).
- `SUPABASE_SECRET_KEY` — alias of the service-role key (portal's local name).

Git identity: `user.email=kaaos-daemon@dapperlabs.com`, `user.name=fandom-ownership daemon`.

---

## SUCCESS CRITERIA (HOLD = 85/100)

| Dim | Pts | Full points when |
|---|---|---|
| **P1 MV/RPC live** | 20 | `mv_holders_by_player` + `player_ownership_export` exist; RPC owner count for 202710 reconciles ±0 to `COUNT(DISTINCT owner_flow_address)` over the player's editions. |
| **P2 generator correct** | 20 | `gen-fandom-data.mjs` emits the locked output contract; `node --check` clean; output key-sets match the existing file. |
| **P3 parity GREEN** | 25 | `parity-202710.md` written; same top-level/owner/edition keys; editions>0 & owners>0; renders in fandom.js without schema break; coverage delta documented as `partial`. **Hard gate — 0 here blocks P4/P5.** |
| **P4 roster 48** | 15 | 48 `/data/*.json`, every file editions>0 & owners>0, index length 48, data-layer.js bundled list = 48. |
| **P5 live + verified** | 15 | `fandom-v3.vercel.app/data/index.json` length 48; 3 random players load; Jimmy renders; screenshots in `phase5-verification.md`. |
| **Reversibility kept** | 5 | DROP statements recorded; `fetch-top40.js` retained; data commits revertible. |

<85 AND iter<6 → append failed-dim list, GOTO Phase 1 focused on gaps. iter≥6 → write `STALLED.md`.

---

## PHASES (one iteration)

### Phase 0 — Bootstrap + provision (run once)
```bash
cd /home/ro/builds/fandom-ownership
command -v psql >/dev/null || sudo apt-get update -y && sudo apt-get install -y postgresql-client
[ -d topshot-data-portal ] || git clone https://x-access-token:${GH_TOKEN}@github.com/roham/topshot-data-portal.git
( cd topshot-data-portal && git fetch origin && git checkout spec/002-fandom-ownership-backend && git pull --rebase \
  && git config user.email kaaos-daemon@dapperlabs.com && git config user.name "fandom-ownership daemon" )
[ -d claude-conversations ] || git clone https://x-access-token:${GH_TOKEN}@github.com/roham/claude-conversations.git
( cd claude-conversations && git checkout main && git pull --rebase \
  && git config user.email kaaos-daemon@dapperlabs.com && git config user.name "fandom-ownership daemon" )
ln -sfn topshot-data-portal portal; ln -sfn claude-conversations convos
```
Verify: `psql "$SUPABASE_DB_URL" -c 'select 1'` OK; Supabase REST reachable (`count=exact` HEAD on
`topshot.moments` ~8.58M); both repos `git push --dry-run` OK. Write `phase0-provision.md` (receipts,
NO secrets). **Gate:** all green or STOP. Portal commits/pushes go to `spec/002-fandom-ownership-backend`
(PR #13); convos data pushes go to `main` (the Vercel deploy path).

### Phase 1 — Ownership MV + RPC  (Agent: general-purpose, sonnet) · LOAD-BEARING
Author `portal/supabase/migrations/00XX_mv_holders_by_player.sql` per plan FR-1/FR-2:
`mv_holders_by_player(player_id, owner_flow_address, edition_id, holdings)` + index on `player_id`;
RPC `topshot.player_ownership_export(p_player_id text)` returning the full graph (editions + every
owner with holdings + LEFT JOIN collectors identity), `SECURITY DEFINER`, anon-grant per migration
0037. Apply via `psql "$SUPABASE_DB_URL" -f <migration>` then `REFRESH MATERIALIZED VIEW
topshot.mv_holders_by_player;`. Commit the migration to portal main.
**Gate:** reconciliation query passes for 202710. Record DROP rollback in `phase1-rpc-proof.md`.

### Phase 2 — Generator  (Agent: general-purpose, sonnet)
Write `convos/dapperlabs-v2-i/scripts/gen-fandom-data.mjs` — reads `player_ownership_export` via
PostgREST (`SUPABASE_SERVICE_ROLE_KEY`) per roster id → writes `fandom-v3/data/{playerId}.json` in
the locked contract (mirror `fetch-top40.js` `normalizeOwner`; carry holdings/topshotScore/partial/
fetchedAt). Regenerate `data/index.json`; update `data-layer.js` `PLAYERS`. Keep `fetch-top40.js`.
Run for **202710 only** this phase. **Gate:** `node --check` clean; key-sets match existing file.

### Phase 3 — Parity proof  (Agent: general-purpose, opus — judgment) · HARD GATE
Diff Supabase-sourced `202710.json` vs the current GraphQL file (structure, owner-count delta, holdings
sanity). Load in fandom.js (headless or `node --check` + DOM smoke); screenshot if Playwright present.
Write `parity-202710.md`. **Gate:** pass FR-4 → continue. Fail → STOP, write `phase3-fail.md`, do NOT
touch the roster.

### Phase 4 — Roster to 48  (Bash + Agent)
Rank by mint volume from `mv_player_market_cap`/volume MVs, exclude existing 30, take next 18. Add ids
to the roster file. Run `gen-fandom-data.mjs` across all 48 (concurrency 4, idempotent). Regenerate
index + data-layer.js. Write `phase4-roster.md`. **Gate:** 48 files, each editions>0 & owners>0.

### Phase 5 — Deploy + verify  (Bash + Agent: verification)
Commit + push `convos` main → wait 90s → `curl -sf -o /dev/null -w "%{http_code}" https://fandom-v3.vercel.app/`
== 200 (retry once after 60s). Verify: `index.json` length 48; 3 random players `editions>0`; Jimmy
(`202710.json`) name == "Jimmy Butler"; screenshot the picker + Jimmy's universe. Write
`phase5-verification.md`. **Gate:** all pass. Else `git revert` HEAD, push, redeploy, log to
`phase5-deploy-fail.md`.

### Phase decision
Tally HOLD. ≥85 → `DONE.md` + final push + exit (kill tmux). <85 & iter<6 → focused re-loop. iter≥6 → `STALLED.md`.

---

## EXECUTION RULES
1. **Never collapse the pipeline** — one Agent/Bash block per phase. Parallelize nothing across phases.
2. **Commit at every phase boundary** so partial progress is recoverable.
3. **Write phase output files** so the next phase/iteration can read them.
4. **TaskCreate at start; TaskUpdate per phase; TaskList between phases** — prevents step-dropping.
5. **Self-audit before DONE** — re-read spec.md DoD (48 live + parity-proven). Anything unmet → iterate.
6. **Heartbeat** every phase → `heartbeat.txt` (ISO + phase). Wrapper kills if stale.
7. **No secrets in committed files.** Receipts only.
8. **fandom.js is read-only** — this pipeline changes the source of bytes, never the viz.
9. **Prod-DDL discipline (Phase 1):** apply only additive `CREATE ... IF NOT EXISTS`; never `DROP`/
   `ALTER` an in-use object; keep the rollback in the proof file before proceeding.

## FAILURE HANDLING
- Sub-agent garbage → diagnose (scope/path/context), fix prompt, re-dispatch (don't retry identical).
- Git push rejected → `git pull --rebase`, favor your data/migration changes, retry.
- RPC statement timeout on a high-mint player → confirm the MV index is used; if needed, page the RPC
  by edition inside the generator. Never silently truncate — mark `partial`.
- Supabase DDL refused (perms) → STOP, write the exact error to `phase1-fail.md`, do not improvise.
- Vercel deploy lag → push is fine; wait, re-check; don't re-push.
- Anthropic budget kill → partial outputs survive in workdir; a fresh run resumes from committed state.

## OUTPUT ARTIFACTS (per iteration, in `/home/ro/builds/fandom-ownership/iter-{N}/`)
`phase0-provision.md`, the migration file, `phase1-rpc-proof.md`, `gen-fandom-data.mjs`,
`parity-202710.md`, `phase4-roster.md`, `phase5-verification.md`, `iteration.json`, `heartbeat.txt`.
Final: `DONE.md` or `STALLED.md`.

## START NOW
1. TaskCreate: one task per phase + bootstrap + decision.
2. Read spec.md + plan.md in full.
3. Phase 0 bootstrap. Then loop Phase 1→5. Do not stop to ask permission — autonomous mode.
