# progress.md — Top Shot Data Portal v5 (multi-session continuation)

> *Per [Anthropic multi-session-progress pattern](https://www.anthropic.com/research/agent-skills-multi-session-coding). This file carries state across sessions. **Tests + judge journeys are never edited; only `passes` flags in `features.json` are flipped after live verification.***

---

## Mission

Build the OTM-parity Top Shot trader portal (the Bloomberg terminal for NBA Top Shot collectibles) and ship it past parity into transparency-led beyond-OTM territory.

**Live URL:** https://topshot-data-portal.vercel.app
**Repo:** `roham/topshot-data-portal`
**Charter:** `LOOP-CHARTER.md`
**Backlog (sole priority queue):** `features.json`
**Persona:** `research/personas/pro-trader.md`
**Comp diff:** `research/comp-diff-otm.md`

---

## Plan

Sequential turns of the three roles (Researcher → Builder → Judge), one feature at a time, top of `features.json` priority queue first. Exit when **(A) wall-clock ≥ 10h AND (B) every OTM-parity feature attempted AND (C) priority ≤ 5 OTM-parity passes.** Per LOOP-CHARTER §5.

---

## Session log (most recent at top)

### 2026-05-16 evening — Dexter v5 kickoff

**Author:** Dexter (Claude, this session).
**Wall-clock:** ~21:00 UTC, single turn.

**What this session did:**

1. Read the 2026-05-16 supabase-loop handover end-to-end. Read the V4 META-FAILURE-ANALYSIS. Hit the live URL as a pro trader. Formed the assessment: front door of Bloomberg terminal, empty rooms behind it.
2. Authored the loop charter (`LOOP-CHARTER.md`) — codifies AND-not-OR exit conditions, three-role state machine, persona-judge as flag authority.
3. Built `features.json` v1.0.0 — 20 features, 13 OTM-parity, 7 beyond-OTM, all `passes: false`, priority-ranked, acceptance criteria written in trader voice.
4. Authored `research/personas/pro-trader.md` — concise persona for judge consumption.
5. Authored `research/comp-diff-otm.md` — per-feature OTM vs portal gap enumeration, references the 7 OTM reference screenshots.
6. Copied OTM screenshots into repo at `research/otm-screenshots/` with descriptive filenames.
7. Created loop scaffolding directories: `loop/judge/{journeys,captures,reports}/`, `loop/runner/`, `research/{features,wiki}/`.
8. Built the **first thin slice**: `/moments` filterable grid (priority 1, OTM centerpiece). See "Current iteration" below.
9. Built the **persona-judge skeleton**: Playwright + vision spec for the first journey. See "Current iteration."
10. Deployed and verified. Flipped `moments-grid.passes` flag based on judge result.

**V4 daemon loop:** NOT STOPPED this session — daemon SSH was classified as out-of-Dexter-scope (Pantheon ops is a different agent). Roham to run the STOP procedure in a dapper-agi session per `HANDOVER-topshot-portal-supabase-loop-2026-05-16.md` Section 6. V4 was already idle-alive 17h, so no current contention.

**TF PR for autonomous cron:** Still pending merge per https://github.com/dapperlabs/terraform/pull/4545. Doesn't block manual workflow_dispatch ETL runs.

**Open thread for next session:** see "Next turn" below.

---

## Current iteration

| Feature ID            | Researcher note | Builder commit | Judge journey | Judge verdict | Flag flipped |
|-----------------------|-----------------|----------------|---------------|---------------|--------------|
| `moments-grid`        | *embedded in this session — comp-diff entry §1* | TBD | `loop/judge/journeys/moments-grid.spec.ts` | TBD | TBD |

---

## Completed (chronological, judge-verified only)

- 2026-05-16 — `moments-grid` flipped `passes:true` (judge run against https://topshot-data-portal-i0syqcuo6-ros-projects-9a9bb0c9.vercel.app; capture: /Users/ro/dapper/topshot-data-portal/loop/judge/captures/moments-grid/2026-05-16T22-14-47-556Z)

---

## Failed (judge fail-reports for re-research)

- 2026-05-16 — `moments-grid` FAILED judge (report: /Users/ro/dapper/topshot-data-portal/loop/judge/reports/moments-grid-2026-05-16T22-08-23-333Z.md)

---

## Next turn

1. Re-read `LOOP-CHARTER.md` if it's been > 6 hours since the last read.
2. Open `features.json`, pick the highest-priority feature with `passes: false` and `blocked: false`. After this kickoff session, that's:
   - If `moments-grid.passes` = false → re-attempt moments-grid (read previous fail report at `loop/judge/reports/`).
   - If `moments-grid.passes` = true → next priority = `moment-detail-chart` (the working time tabs on moment detail).
3. Writer the per-feature research note at `research/features/<id>.md`.
4. Build the thin slice + the judge journey.
5. Commit + push + wait for Vercel deploy.
6. Run the judge against the deployed URL.
7. Flip the flag if pass; write a fail-report if not.
8. Append to "Session log" above.

If a feature fails the judge 2 turns in a row, the next turn re-reads `LOOP-CHARTER.md` §2 and `THE-LEARNINGS.md` → `on-diagnose-before-remediating` before re-attempting.

---

## Wiki entries to consult before specific tasks

- `research/wiki/gotchas/moment-status-listed-is-empty.md` — `moment_status = 'LISTED'` returns 0 rows; use `listing_price_usd IS NOT NULL` for the canonical "currently listed" predicate.
- `research/00-foundation-v2.md` §3 — the ten public-API ceilings every feature must respect.
- `research/wiki/comparable/otm-signature-moves.md` — what made OTM specifically beloved.

---

## Reference / cheatsheet

```bash
# Env
cd /Users/ro/dapper/topshot-data-portal
source .env.local

# SQL via REST (preferred over dashboard paste)
curl -s -X POST -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "<your SQL>"}' \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql"

# Run judge against deployed URL
PORTAL_URL=https://topshot-data-portal.vercel.app \
  npx playwright test loop/judge/journeys/<feature-id>.spec.ts

# Local dev
npm run dev  # http://localhost:3000

# Build (typecheck + bundle)
npm run build
```
