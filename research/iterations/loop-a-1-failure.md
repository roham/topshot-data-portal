# Loop A Iteration 1 — Cross-Vendor FAIL Report

**Date:** 2026-05-18
**Verdict:** FAIL (weighted_overall: 46 / 100)
**Model:** gpt-5.5-2026-04-23
**Verify path:** loop/v7/state/iteration-1.verify.json

---

## Root cause: branch contamination + real schema bugs

The cross-vendor reviewer returned FAIL for two categories of issues:

### Category 1 — Branch contamination (orchestrator issue, not builder code)

The bootstrap branch (`dexter/loop-a-1-bootstrap-admin-review`) includes commit `0e4abfc [v5 loop] player-detail-variant-a-three-axis-matrix: judge-passed` which is NOT in the branch's intended scope. This commit modifies `features.json` and `progress.md`, appearing in the diff as if the bootstrap iteration flipped a player-detail feature to passes:true. This is NOT correct — it's a contaminating v5 loop commit that snuck into the branch because the Builder's worktree included uncommitted/unmerged work.

**Fix:** Create a clean branch from current `origin/main` (65eb9b4) that cherry-picks only commits `5a770f0`, `63a6878`, and `240d750` — the three actual bootstrap commits.

### Category 2 — Real schema/code bugs

These are legitimate findings that must be fixed:

#### 2.1 Missing UNIQUE constraint on `iteration_id` (P1)
The seed uses `ON CONFLICT DO NOTHING` but there's no uniqueness constraint on `iteration_id`. Multiple rows can exist for the same iteration, making votes ambiguous.

**Fix:** Add `UNIQUE (iteration_id)` to the `topshot.feature_reviews` table definition, or add it as a separate `CREATE UNIQUE INDEX`. Update the seed to `ON CONFLICT (iteration_id) DO NOTHING`.

#### 2.2 Overly broad `authenticated_select` RLS policy (P1)
The `authenticated_select` policy allows ANY authenticated Supabase user to SELECT all review rows including proposals, CEO comments, and cross-vendor paths. The admin page reads server-side with service role, so this broad policy is unnecessary and leaks internal operational data.

**Fix:** Remove the `authenticated_select` policy and the `GRANT SELECT ON topshot.feature_reviews TO authenticated`. Only `service_role` needs access.

#### 2.3 POST route does not upsert — returns 404 if row missing (P2)
The API says "upsert vote" but actually only updates existing rows. If `iteration_id` not found, returns 404.

**Fix:** Make the POST route a true upsert: if the row doesn't exist yet, insert it. Or at minimum, document that votes can only be cast on existing rows and the error is intentional.

#### 2.4 Token in URL query param + DOM (P1)
`?token=<value>` in the URL means the token is stored in browser history, server logs, and referrer headers. Exposing it via `data-token` DOM attribute for inline scripts increases surface area.

**Fix:** Primary auth should be via `x-admin-token` header (for API calls) and for the page, use either an HTTP-only cookie after initial verification or accept that this is an internal tool and document the security limitation.

---

## What the cross-vendor reviewer got wrong

The reviewer flagged "unauthorized track selection" because BOOTSTRAP isn't in the rubric's §4 track list. But the orchestration prompt §3 explicitly defines Iteration 1 as a bootstrap iteration that does NOT close a data gap and does NOT use the normal track selection. The rubric §4 is superseded by the orchestration prompt §3 for iteration 1 only. This is NOT a violation.

The reviewer also scored A1 at 50 (baseline) — correct, since this iteration doesn't close any data gaps. That was expected.

---

## Actions required for next Builder dispatch

1. **Create a clean branch** from `origin/main` with only the 3 bootstrap commits (cherry-pick `5a770f0`, `63a6878`, `240d750`).

2. **Fix schema**: Add `UNIQUE (iteration_id)` to migration. Update seed `ON CONFLICT`.

3. **Fix RLS**: Remove `authenticated_select` policy and authenticated GRANT.

4. **Fix POST**: Make it a true upsert or explicitly document/handle the 404 case.

5. **Update `apply-0015.mjs`**: After the schema changes, update the migration script to reflect the new UNIQUE constraint.

6. **Do NOT change any files outside Loop A ownership boundary** per CHARTER §6.

7. **Re-run `npm run build`** after fixes.

8. **Commit the fixed script changes** (`loop/v7/scripts/verify-via-openai.py` parameter fixes: `max_completion_tokens`, removed `temperature`, safe usage serialization) as a separate commit.

---

## Orchestrator note (anti-shortcircuit)

These fixes are mechanical. The BOOTSTRAP iteration IS the right track for Iteration 1 per orchestration prompt §3. After fixing the above, the next verification run should PASS or NEEDS-WORK, at which point merge proceeds.
