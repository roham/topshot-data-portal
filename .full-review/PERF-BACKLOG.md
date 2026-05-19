# Performance Backlog

Deferred from the 2026-05-19 perf sprint. Quick wins shipped; structural items below.

## Strategic — move to materialized index views

### `mv_index_daily(slug, date, adjusted_ratio, basket_mcap_usd)`
The right permanent solve for the synthesizer hot path. Eliminates the entire synthesize-on-read pattern.

**SQL sketch:**
```sql
CREATE TABLE topshot.index_basket_membership (
  slug TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  weight NUMERIC,
  valid_from DATE NOT NULL,
  valid_to DATE,
  PRIMARY KEY (slug, edition_id, valid_from)
);

CREATE MATERIALIZED VIEW topshot.mv_edition_indexed_value AS
SELECT
  edition_id, date, market_cap,
  market_cap / NULLIF(FIRST_VALUE(market_cap) OVER (
    PARTITION BY edition_id ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ), 0) AS ratio_vs_baseline
FROM topshot.market_caps WHERE market_cap > 0;

CREATE MATERIALIZED VIEW topshot.mv_index_daily AS
SELECT b.slug, v.date,
       SUM(b.weight * v.ratio_vs_baseline) / SUM(b.weight) AS adjusted_ratio,
       SUM(v.market_cap) AS basket_mcap_usd
FROM topshot.index_basket_membership b
JOIN mv_edition_indexed_value v ON v.edition_id = b.edition_id
GROUP BY b.slug, v.date;
```

Synthesizer becomes:
```typescript
const { data } = await sb.from("mv_index_daily")
  .select("date, adjusted_ratio, basket_mcap_usd")
  .eq("slug", "grail")
  .gte("date", sinceDate)
  .order("date", { ascending: true });
```

**Effort:** medium (~2-3 days). 100x speedup. Removes `maxDuration = 60` need entirely.

## Structural — sniper + whales as MVs

### `mv_sniper_<w>_candidates(edition_id, floor_usd, avg_recent_sale, tx_count, gap_pct)`
Eliminates the get-list-then-fetch-detail N+1 in `/sniper`. Single query: `SELECT * WHERE gap_pct >= 5 ORDER BY gap_pct DESC LIMIT 50`.

### `mv_whales_<w>(user_name, side, total_usd, tx_count, biggest_sale_usd)`
Fixes the whales ranking semantic bug — current client-side aggregation of `mv_largest_sales_*` is biased toward big-single-sale whales, missing volume-whales. DB-side `SUM(gross_amount_usd) GROUP BY buyer_safe_name` gets correct ranking.

## Structural — `mv_index_basket_membership` to replace CSV-as-config

Move `research/data-schema/grail-225-with-edition-ids-2026-05-19.csv` into `topshot.index_basket_membership`. Eliminates `parseGrailBasket()` disk read. Enables runtime basket updates without recompile.

## Structural — extract shared synthesizer kernel

`lib/indices/synthesizer-core.ts` with a `BasketStrategy` interface. ts50 / grail / rookies each become ~30 LOC of strategy + result mapping instead of ~280 LOC each.

**Effort:** medium. Blocks the F2 migration above.

## Cache layer

### Add `/api/revalidate` endpoint
Cache tags are properly emitted by all queries but no consumer. ETL refresh-MV jobs should POST to invalidate Next cache after view refresh.

```typescript
// app/api/revalidate/route.ts
export async function POST(req: Request) {
  const { tags, secret } = await req.json();
  if (secret !== process.env.REVALIDATE_SECRET) return new Response("forbidden", { status: 403 });
  for (const tag of tags) revalidateTag(tag);
  return Response.json({ revalidated: tags });
}
```

### Pick one cache layer per page
Mixed page-revalidate + unstable_cache today. Document one convention. Recommend: inner unstable_cache only, page revalidate dropped.

## Window-MV reorganization

22 per-window MVs today across player/edition/largest-sales/market-summary families. Move to daily-grain per-conceptual-dataset MVs (~8 total) with date-range query parameters. Adds 6m/2y as first-class instead of folding to nearest existing. ~3x write-amplification reduction.

**Effort:** large (~2-3 weeks engineering, dual-run, cutover).

## Observability

### Per-synthesizer duration logging
Add structured logs around CSV parse / current-mcap / history / pivot phases. Single Vercel log query tells operator which span is the bottleneck on a given day.

### Make hydration vs missing distinguishable in MV results
`most-active-editions.ts` returns `[]` for both "no data" and "error" — operators can't tell. Return discriminated `{ ok: true; rows } | { ok: false; reason }`.

## Cleanup

- `most-active-editions.ts:73-115` — drop the conditional sets/players hydration once `mv_edition_24h_activity` is brought to schema-parity with peers.
- `/editions/page.tsx:49-101` — chain of 2 queries. Pre-join in `mv_editions_directory`.
- `IndexTimeWindowPills.tsx:33-40` — hoist `URLSearchParams` construction.
- Constituents sort by `weight` is equivalent to sort by `current_mcap_usd` (no division → no FP stability concerns). Switch.

## What shipped this sprint (2026-05-19)

- ✅ Parallel pagination with concurrency=6 on both synthesizers (~25s → ~5-7s on 1Y cold)
- ✅ Error bubbling in pagination loops (eliminates silent-truncation bug class that caused the chart drops)
- ✅ Single-pass baseline derivation (~500ms saved per cold miss)
- ✅ SHA-derived cache key on both synthesizers (eliminates manual v2/v3/v4 bumping)
- ✅ Per-MiniHero Suspense boundaries (Rookies paints in ~4s, doesn't wait for Grail)
- ✅ Deeper findings catalog at `.full-review/01-quality-architecture.md`
