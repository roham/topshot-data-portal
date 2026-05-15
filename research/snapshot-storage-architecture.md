# Snapshot accumulator — storage architecture (iter-2 revision)

**Status:** active as of `[TOPSHOT-PORTAL-V2 STAGE-7 iter-2]`
**Supersedes:** the STAGE-3 design that ran cron in Vercel scheduled functions and required a manually-managed `SNAPSHOTS_GH_TOKEN` PAT.

## What changed

| | Before (STAGE-3) | After (iter-2) |
|---|---|---|
| **Cron runtime** | Vercel scheduled functions | GitHub Actions workflows |
| **Cron config** | `vercel.json` `crons` | `.github/workflows/snapshot-*.yml` |
| **Write auth** | `SNAPSHOTS_GH_TOKEN` (fine-grained PAT on Vercel) | Action's implicit `GITHUB_TOKEN` |
| **Write path** | App code calling GitHub Contents API | Action runs `node scripts/snapshot-*.mjs` → `fs.writeFile` → `git commit` → `git push` |
| **Cron route files** | `app/api/cron/*/route.ts` × 6 | gone — pure scripts in `scripts/snapshot-*.mjs` × 6 |
| **Storage** | Same: JSON in repo `.snapshots/{cadence}/{key}.json` | Same |
| **Deploy** | Same: Vercel auto-deploys on push to main | Same |
| **Manual credential setup** | Required (PAT issuance, env-var dance) | **None** |

## Why this is the right architecture

GitHub Actions provisions `GITHUB_TOKEN` with `permissions: contents: write` automatically inside every workflow run. The Vercel↔GitHub integration that already deploys this repo handles the deploy half. The Action commits a snapshot to `main`; Vercel auto-deploys; the new snapshot is live behind the same URL on the next request.

End-to-end: zero manual credential management. No PAT issuance, no rotation, no env-var setup, no cross-cloud auth ceremony.

The original STAGE-3 design treated the repo as a runtime data store accessed from a Vercel function via the GitHub API. That collapsed two concerns: where data lives (the repo) and what runs the write (the cron). Separating them — repo as data store, Actions as cron — is what this revision does.

## Read path (unchanged in principle, updated in code)

Render-side reads in `lib/snapshots/store.ts` go through anonymous public endpoints:

- **Listing:** `https://api.github.com/repos/{owner}/{repo}/contents/.snapshots/{cadence}?ref={branch}` — anonymous Contents API, edge-cached by `next: { revalidate: 60 }`.
- **Fetching:** `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/.snapshots/{cadence}/{key}.json` — anonymous raw, edge-cached.

Filenames are filesystem-safe ISO-8601 (`2026-05-15T01-38-58Z.json`) — colons replaced with dashes — so lexical sort = chronological sort. No additional manifest file required.

## Cadences (cron schedules, in UTC)

| Workflow | Cron | Cadence | Script |
|---|---|---|---|
| `snapshot-hot.yml` | `*/15 * * * *` | 15min — top-30 hot editions | `scripts/snapshot-hot.mjs` |
| `snapshot-warm.yml` | `0 * * * *` | 1h — sets at ranks 30..200 | `scripts/snapshot-warm.mjs` |
| `snapshot-market.yml` | `*/30 * * * *` | 30min — market-wide aggregate | `scripts/snapshot-market.mjs` |
| `snapshot-players.yml` | `5,35 * * * *` | 30min — per-player rollup | `scripts/snapshot-players.mjs` |
| `snapshot-portfolios.yml` | `10,40 * * * *` | 30min — watchlist portfolios | `scripts/snapshot-portfolios.mjs` |
| `snapshot-nba.yml` | `0 */6 * * *` | 6h — prior-day NBA games | `scripts/snapshot-nba.mjs` |

Each workflow:
1. `actions/checkout@v4` with `token: ${{ secrets.GITHUB_TOKEN }}` (implicit; `permissions: contents: write` at workflow level)
2. `actions/setup-node@v4` Node 20
3. `node scripts/snapshot-{cadence}.mjs` — pulls Top Shot GraphQL data, writes `.snapshots/{cadence}/{timestamp}.json`
4. Git config + `git diff --staged --quiet` no-op check (skips empty windows cleanly) + `git pull --rebase` (avoid races with other workflows) + `git push origin HEAD:main`
5. `concurrency: { group: snapshot-{cadence}, cancel-in-progress: false }` — no overlapping runs for the same cadence

## How to add a new cadence

1. Add `scripts/snapshot-{newCadence}.mjs` — pull → aggregate → `writeSnapshot("newCadence", snapshotKeyNow(), data)`
2. Add `.github/workflows/snapshot-{newCadence}.yml` — copy any existing workflow, change the cron expression and the `git add` path
3. Extend the `Cadence` union in `lib/snapshots/store.ts` (one-line type addition)
4. Push to main. The workflow registers on next scheduled tick.

That's it. No Vercel env changes. No PAT issuance. The repo connection handles deploys, the Action handles writes, the cycle is complete.

## Optional repo secrets / variables that affect behavior

- `vars.PORTFOLIO_WATCHLIST` — comma-separated flowAddresses (snapshot-portfolios). When unset the script logs a skip and exits 0.
- `secrets.BALLDONTLIE_API_KEY` — bumps balldontlie.io rate limit (snapshot-nba). Optional.

None of these are required for the accumulator to start working — the workflows degrade gracefully when they're missing.

## What was removed in iter-2

- `vercel.json` — deleted (no Vercel crons anymore)
- `app/api/cron/{hot,warm,market,players,portfolios,nba-games}/route.ts` — 6 files deleted
- `@vercel/blob` dependency — removed
- All references to `SNAPSHOTS_GH_TOKEN` in code — gone
- The "one manual step Roham owns" listed in `iter/0-foundation/v2-stage-3.md` — that step no longer exists

## Smoke test

Run `node scripts/snapshot-market.mjs` locally; verify `.snapshots/market/{timestamp}.json` lands. Sample local run:

```
{"cadence":"market","txCount":28,"bytes":2796,"file":"...snapshots/market/2026-05-15T01-38-58Z.json"}
```

The first Action run will happen automatically on the next cron tick after merge, or on demand via `gh workflow run snapshot-hot.yml --repo roham/topshot-data-portal`.
