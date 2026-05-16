# Gotcha: Vercel Preview environment variables are NOT auto-inherited from Production

**Confirmed:** 2026-05-16 (Dexter, v5 loop kickoff).
**Severity:** High for any new feature branch that touches data sources.

## The shape

Vercel auto-creates a preview deployment for every push to a non-default branch. **But the preview deployment's env vars are scoped separately from production.**

If your project has these in Production scope:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `GCP_BQ_SA_JSON`
- etc.

…and you push a new branch, the preview deployment **does not inherit them**. The deploy succeeds (the build doesn't reference env vars; Next.js bundles "no env" as nullable), but every runtime path that needs them silently returns empty results — 500s, blank tables, "no data found" empty states.

This is what bit me on the first judge run for `moments-grid` against the preview URL — the page loaded, but no rows rendered because `supabaseAdmin()` threw the "URL and key required" error at the server.

## The fix

After pushing a new feature branch, add the env vars to the Preview environment scoped to that branch:

```bash
cd <project>
# For each variable required at runtime:
vercel env add NEXT_PUBLIC_SUPABASE_URL preview <branch-name>
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview <branch-name>
vercel env add SUPABASE_SECRET_KEY preview <branch-name>
# (paste value when prompted)
```

Then redeploy the branch via `vercel --prod=false` or by pushing another commit.

## Better: configure once, broadly

Cleaner: scope env vars to ALL preview deployments at the project level (not per-branch). In the Vercel dashboard:

1. Project Settings → Environment Variables
2. Edit each runtime var
3. Check "Preview" checkbox (in addition to "Production")
4. (Optionally leave "Branch" field empty so it applies to all preview branches)

Once done, every new feature branch's preview deployment inherits the var. No per-branch ceremony.

## Why this matters for the v5 loop

The judge grades against the deployed URL — preview for in-flight feature branches, production after merge. If preview env vars are missing, the judge sees empty UI and writes a fail report attributing the failure to the feature (e.g., "moments-grid renders 0 rows"). The real bug is env config, not feature implementation.

**Checklist before opening a PR with a new feature branch:**

- [ ] Did the auto-preview deploy?
- [ ] Does the preview URL return non-empty data (smoke-check by hand)?
- [ ] If no: add env vars to Preview scope for this branch, redeploy, retry.

Only after preview is data-correct should the judge be invoked. Otherwise you'll be debugging the wrong thing.

## Where this is filed

- This wiki entry — `research/wiki/gotchas/vercel-preview-env-vars-need-per-branch-add.md`
- Loop runner (future iter-2): add a preflight check that hits the preview URL and confirms non-empty data before invoking the judge.
