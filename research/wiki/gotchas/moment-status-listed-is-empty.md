# Gotcha: `topshot.moments.moment_status = 'LISTED'` returns zero rows

**Confirmed:** 2026-05-16 (Dexter).
**Severity:** Critical for any "currently listed" predicate.

## What happens

```sql
SELECT count(*) FROM topshot.moments WHERE moment_status = 'LISTED';
-- → 0
```

Despite the CHECK constraint declaring `LISTED` as a valid status, the BQ ETL never writes `LISTED` to that column — it remains in `MINTED`/`LOCKED`/`BURNED` (the live distinct values per migration 0002 comment).

## What works instead

```sql
SELECT count(*) FROM topshot.moments WHERE listing_price_usd IS NOT NULL;
-- → 318,885 (as of 2026-05-16)
```

`listing_price_usd IS NOT NULL` is the **canonical predicate for "this moment is currently listed."** The CHECK constraint reserves `LISTED` for a derived state the ETL was supposed to compute and currently does not.

## Why it matters

- The Moments grid's "Listed only" filter is one of the most-used filters per the OTM persona.
- The depth ladder for any edition needs to count listed moments to derive a floor.
- The circulation breakdown shows "Listings" as a number; must use the same predicate as the rest.

## Where this is encoded

- `supabase/migrations/0002_topshot_init_tables.sql` line 296: comment notes the `MINTED, LOCKED, BURNED` live distinct values.
- `lib/supabase/queries/*.ts`: every new query that filters by listing state must use `listing_price_usd IS NOT NULL`.

## Future fix

The ETL could derive `LISTED` by setting `moment_status='LISTED' WHERE listing_price_usd IS NOT NULL` in a post-sync step. Until then, do not rely on the column.
