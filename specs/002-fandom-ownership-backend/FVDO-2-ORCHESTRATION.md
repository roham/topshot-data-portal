# FVDO-2 — Fandom Ownership Backend · Daemon Orchestration (BigQuery-sourced)

**You are the orchestrator.** Loaded once into a `claude --dangerously-skip-permissions` **tmux**
session as user `r_dapperlabs_com` on the kaaos-daemon VM (NOT `-p`). Run autonomously; iterate until
HOLD ≥ 85 or kill-switch (max 6 iterations).

Governing artifacts (read both first — they are the contract):
- `specs/002-fandom-ownership-backend/spec.md` (RATIFIED — BigQuery source of truth)
- `specs/002-fandom-ownership-backend/plan.md` (PLAN-002, BQ-sourced)

Execute plan **P0 → P6**. Each phase = a separate Agent dispatch or Bash block. **Never collapse the
pipeline.** Commit at every phase boundary.

---

## WORKDIR + REPOS

```
VM workdir: /home/r_dapperlabs_com/builds/fandom-ownership/
├── .env.local   ← portal Supabase creds (staged)
├── ghtok        ← dual-repo GitHub token (staged)
├── anthkey      ← Anthropic key, fetched from GSM pantheon-anthropic-api-key (staged)
├── topshot-data-portal/   ← clone → checkout spec/002-fandom-ownership-backend  (migration+ETL+query; PR #13)
└── claude-conversations/  ← clone → main  (fandom-v3 generator + data; Vercel deploy path)
```

**Deploy targets:** portal ETL writes `topshot.fandom_top_holders` (additive table) + commits to the
spec branch; `fandom-v3` → `fandom-v3.vercel.app` auto-deploys on push to claude-conversations main.

**Env at session start:** `export ANTHROPIC_API_KEY=$(cat ~/builds/fandom-ownership/anthkey)`;
`export GH_TOKEN=$(cat ~/builds/fandom-ownership/ghtok)`; `set -a; . ~/builds/fandom-ownership/.env.local; set +a`.
BQ uses the VM service account (confirmed: can query `dapperlabs-data`). Supabase DDL via
`psql "$SUPABASE_DB_URL"`.

## SOURCE OF TRUTH (do not use the Supabase `moments` mirror — it is ~10%/player complete)

BigQuery `dapperlabs-data.production_sem_open.asset_ownership_nba_moment` — current ownership, 35.0M
rows where `is_current_owner = true` (locked INCLUDED, burned EXCLUDED), 753K owners. Join to
`asset_nba_moment` for moment→edition→player. Reconciles to `/supply` (Spanner Δ0.06%).

**Holdings** = COUNT of current-owner moments per `flow_address`. **Holder unit = flow_address**
(identity display-only, never affects rank). **Rank:** `ORDER BY holdings DESC, flow_address ASC`.

---

## SUCCESS CRITERIA (HOLD = 85/100)

| Dim | Pts | Full points when |
|---|---|---|
| **P1 BQ ETL + table** | 25 | `fandom_top_holders` populated from BQ; G4 (`COUNT(*)=COUNT(DISTINCT moment_flow_id)` for current-owner) + G5 (unmapped=0 per rostered player) hold; spot-3 top-100 match direct BQ GROUP BY. |
| **P2/P3 query + generator** | 20 | query returns correct top-N; `gen-fandom-data.mjs` emits the existing JSON shape; `node --check` clean; key-sets match. |
| **P4 parity GREEN** | 20 | `parity-202710.md`: BQ-sourced Jimmy matches prior structure, ranking reconciles, renders. Hard gate — 0 blocks P5/P6. |
| **P5 roster 100** | 15 | committed roster SQL (G6); 100 files; each top-100 matches independent BQ output (G1); table UNIQUE holds (G7); top-1000 + identity coverage reported. |
| **P6 live + verified** | 15 | `fandom-v3.vercel.app/data/index.json` length 100; 3 random players load; Jimmy renders; screenshots. |
| **Reversibility** | 5 | DROP TABLE recorded; `fetch-top40.js` retained; data commits revertible. |

<85 & iter<6 → focused re-loop. iter≥6 → `STALLED.md`.

---

## PHASES (one iteration)

### P0 — Bootstrap (run once)
```bash
cd /home/r_dapperlabs_com/builds/fandom-ownership
command -v psql >/dev/null || (sudo apt-get update -y && sudo apt-get install -y postgresql-client)
export GH_TOKEN=$(cat ghtok)
[ -d topshot-data-portal ] || git clone https://x-access-token:${GH_TOKEN}@github.com/roham/topshot-data-portal.git
( cd topshot-data-portal && git fetch origin && git checkout spec/002-fandom-ownership-backend && git pull --rebase \
  && git config user.email kaaos-daemon@dapperlabs.com && git config user.name "fandom-ownership daemon" )
[ -d claude-conversations ] || git clone https://x-access-token:${GH_TOKEN}@github.com/roham/claude-conversations.git
( cd claude-conversations && git checkout main && git pull --rebase \
  && git config user.email kaaos-daemon@dapperlabs.com && git config user.name "fandom-ownership daemon" )
```
Verify: `bq query ... SELECT 1` on dapperlabs-data; `psql "$SUPABASE_DB_URL" -c 'select 1'`; both repos
`git push --dry-run`. **Gate:** all green or STOP. Write `phase0-provision.md` (NO secrets).

### P1 — BQ ETL + holders table (portal) · KEYSTONE  (Agent: general-purpose, sonnet)
Author migration `topshot-data-portal/supabase/migrations/00XX_fandom_top_holders.sql`
(`fandom_top_holders`: player_id, rank, flow_address, holdings, username, profile_image_url,
topshot_score; `UNIQUE(player_id,rank)` + `UNIQUE(player_id,flow_address)`; anon-read RLS per 0037).
Author ETL `scripts/etl/bq-refresh-fandom-holders.mjs` (mirror `bq-refresh-supply-timeline.mjs`):
**dry-run bytes-billed first**, then BQ aggregate `is_current_owner` (locked-in/burned-out) → moment→
edition→player, top-1000/player for the roster → upsert. Apply migration via `psql "$SUPABASE_DB_URL"`.
**Gate (G4/G5):** uniqueness + unmapped=0; spot-3 reconcile. Commit to spec branch. `phase1-etl-proof.md`
+ DROP rollback.

### P2 — Query module (portal)  (Agent: sonnet)
`lib/supabase/queries/fandom-holders.ts` → top-N + edition metadata, anon path. **Gate:** top-100 for
202710 matches the table; types clean.

### P3 — Generator (fandom-v3)  (Agent: sonnet)
`scripts/gen-fandom-data.mjs` reads P2 → `/data/{playerId}.json` (existing shape; owners[]=top-N w/
holdings+identity; editions[]; partial/fetchedAt). Regenerate index.json + data-layer.js. Run for
**202710 only**. **Gate:** `node --check`; key-sets match existing file.

### P4 — Parity (202710) · HARD GATE  (Agent: opus — judgment)
Bar is NOT equality with the prior GraphQL file (it's 500/edition-capped, incomplete). Bar = (a) JSON
loads in fandom.js unchanged; (b) BQ top-100 ranking == an *independent* BQ `GROUP BY`; (c) document
coverage gain. Render + screenshot. `parity-202710.md`. **Fail → STOP, `phase4-fail.md`, no roster work.**
(plan.md P4 is the authoritative detail.)

### P5 — Roster 100 + full run  (Bash + Agent)
Commit roster SQL artifact (top 100 by mint volume — **G6**). Run ETL + generator across 100. Regenerate
index + data-layer.js. **Gate (G1 all-100 / G7):** 100 files, each top-100 == independent BQ output,
UNIQUE holds, top-1000 + identity coverage reported. `phase5-roster.md`.

### P6 — Deploy + verify  (Bash + Agent: verification)
Commit + push claude-conversations main → wait 90s → `curl -sf -o /dev/null -w "%{http_code}"
https://fandom-v3.vercel.app/` == 200 (retry once). Verify index length 100; 3 random players;
Jimmy == "Jimmy Butler"; screenshot picker + universe. `phase6-verification.md`. Else `git revert` + redeploy.

### Decision
HOLD ≥85 → `DONE.md` + push + exit (kill tmux). <85 & iter<6 → focused re-loop. iter≥6 → `STALLED.md`.

---

## EXECUTION RULES
1. **Never collapse the pipeline** — one Agent/Bash block per phase.
2. **Commit at every phase boundary.**
3. **Write phase output files** for the next phase/iteration.
4. **TaskCreate at start; TaskUpdate per phase; TaskList between phases** — prevents step-dropping.
5. **Self-audit before DONE** — re-read spec DoD (100 players + parity + G1–G7). Unmet → iterate.
6. **Heartbeat** each phase → `heartbeat.txt`.
7. **No secrets in committed files.** Receipts only.
8. **`fandom.js` is read-only** — change the source of bytes, never the viz.
9. **Source = BigQuery.** Never rank off the Supabase `moments` mirror. **Dry-run BQ bytes-billed before
   any large scan**; pre-filter to rostered editions; stay within ~$100/op.
10. **Prod-DDL discipline:** additive `CREATE ... IF NOT EXISTS` only; keep the DROP rollback before proceeding.

## FAILURE HANDLING
- Sub-agent garbage → diagnose, fix prompt, re-dispatch (don't retry identical).
- Git push rejected → `git pull --rebase`, favor your changes, retry.
- BQ scan too large → tighten the edition pre-filter; never silently truncate (mark unmapped, block player).
- Supabase DDL refused → STOP, write exact error to `phase1-fail.md`.
- Vercel deploy lag → push is fine; wait, re-check; don't re-push.
- Anthropic budget kill → partial outputs survive; fresh run resumes from committed state.

## START NOW
1. TaskCreate: one task per phase + bootstrap + decision.
2. Read spec.md + plan.md in full.
3. P0 bootstrap → loop P1→P6. Autonomous — do not stop for permission.
