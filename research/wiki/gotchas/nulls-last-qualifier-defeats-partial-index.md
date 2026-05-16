# Gotcha: `nullsFirst: false` (a.k.a. `nullslast` qualifier) defeats partial indexes

**Confirmed:** 2026-05-16 (Dexter, v5 loop kickoff).
**Severity:** High for any query that sorts on a column with a partial index `WHERE col IS NOT NULL`.

## The numbers

Same query, same data, same Supabase project:

| Order clause sent to PostgREST | Time | Notes |
|--------------------------------|------|-------|
| `order=listing_price_usd.desc` | **0.8s** | Index scan |
| `order=listing_price_usd.desc.nullslast` | **30s+** (times out) | Full sort fallback |

## Why

The partial index `idx_moments_listing_price ON topshot.moments (listing_price_usd) WHERE listing_price_usd IS NOT NULL` *cannot contain NULLs* by construction. But Postgres's query planner doesn't propagate that constraint into the `ORDER BY ... NULLS LAST` semantic. When the client says "I want NULLs at the end," the planner reads that as "the index may not be sufficient" and falls back to a full sort over the underlying rows — defeating the index entirely.

The fix is to omit the NULLs qualifier when the WHERE clause has already excluded NULLs.

## Implementation pattern

When using `supabase-js`:

```ts
// ❌ Wrong — adds .nullslast qualifier to PostgREST URL
q.order("listing_price_usd", { ascending: false, nullsFirst: false })

// ✅ Right — postgres default (NULLS FIRST for desc, NULLS LAST for asc),
// but the partial index excludes NULLs entirely so it doesn't matter.
q.order("listing_price_usd", { ascending: false })
```

The supabase-js client `order(col, { ascending, nullsFirst })` overload always sends a qualifier when `nullsFirst` is specified. Omit the second arg entirely for partial-index sorts.

## When you DO want explicit NULLs ordering

When sorting on a column that is NULL-permitting (no partial index excluding them) AND you care about NULL placement, the qualifier is correct and the perf cost is the cost of doing business. Example: sorting moments by `top_shot_score` where NULLs are valid (un-scored moments).

For those cases, accept the table scan or add a covering index.

## Where this is filed

- `lib/supabase/queries/moments-grid.ts` — switch case for sort has a verbose comment explaining the omission.
- `app/api/moments/export/route.ts` — same pattern, same comment.

## Generalization

This isn't Supabase-specific. Any Postgres partial index with `WHERE col IS NOT NULL` will be bypassed by `ORDER BY col DESC NULLS LAST` (or `ASC NULLS FIRST` for asc-direction partial indexes — same shape, different direction). When in doubt: omit the qualifier, trust the WHERE clause, measure.
