# Gotcha: `exec_sql` RPC is ~30× slower than native PostgREST

**Confirmed:** 2026-05-16 (Dexter, v5 loop kickoff).
**Severity:** Critical for any query that returns more than ~100 rows or runs more than once per request.

## The numbers

Same query, same WHERE clause, same data volume:

| Path | Limit | Rows returned | Time |
|------|-------|---------------|------|
| `exec_sql` RPC via `rpc/exec_sql` | 500 | 500 | **33s** |
| Native PostgREST `/rest/v1/moments?...` | 500 | 500 | **1.2s** |

That's a **27× speedup** by switching surface, with zero query change.

## Why

`exec_sql` is a `SECURITY DEFINER` function (per `supabase/migrations`) that runs the SQL inside a PL/pgSQL block, captures the result via `json_agg`, and serializes back to the client as a JSON-typed function return. PostgREST has a streaming, row-major serializer that emits results as it reads them and uses pg native protocols.

For small result sets (< 50 rows, < 5 columns) the difference is invisible. For everything else, exec_sql is a tarpit.

## When exec_sql is still OK

- DDL: `CREATE / ALTER / DROP` statements that can't go through PostgREST.
- One-off admin queries against system catalogs (`pg_class`, `pg_indexes`).
- Operations PostgREST doesn't support (e.g. `EXPLAIN`).

## When to switch

Anything that:
- Reads a table with > 50 row results
- Runs on a hot path (every page render, every API request)
- Needs JOIN composition (PostgREST embedded relations work for FK joins)

## Implementation pattern

Use `supabaseAdmin()` from `lib/supabase/admin.ts` (server-only, bypasses RLS, pinned to `topshot` schema):

```ts
const { data, error } = await supabaseAdmin()
  .from("moments")
  .select("moment_id, listing_price_usd, edition_id")
  .not("listing_price_usd", "is", null)
  .lte("listing_price_usd", maxPrice)
  .order("listing_price_usd", { ascending: true })
  .range(offset, offset + 49);
```

For JOIN queries where the FK isn't in the PostgREST schema cache, use the two-stage pattern: pre-resolve `edition_ids` from the small table, then filter the large table with `IN (...)`. See `lib/supabase/queries/moments-grid.ts` for the canonical example.

## Where this is filed

- `lib/supabase/queries/moments-grid.ts` — comments at the top of the file reference this gotcha.
- `lib/supabase/queries/*` — every new query in this directory uses PostgREST native by default. If you find yourself reaching for `rpc('exec_sql')`, read this entry first.
