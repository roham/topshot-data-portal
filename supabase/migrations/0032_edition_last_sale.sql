-- Per-edition all-time realized-sale summary: last sale, all-time median, and
-- sale count. Vanity-proof valuation source for illiquid blue-chips (GRAIL),
-- where 90d realized windows cover <20% of editions. Same "real sale" predicate
-- as mv_edition_growth_90d (gross_amount_usd >= 1, completed_at not null).
--
-- Use last_sale_usd (most recent actual transaction, carry-forward semantics) or
-- median_sale_usd (robust) × circulation instead of lowest_ask × circulation,
-- which imputes a single vanity ask across every circulating moment.

drop materialized view if exists topshot.mv_edition_last_sale;

create materialized view topshot.mv_edition_last_sale as
with sales as (
  select m.edition_id, t.gross_amount_usd as px, t.completed_at as ts
  from topshot.transactions t
  join topshot.moments m on m.moment_id = t.moment_id
  where t.gross_amount_usd >= 1
    and t.completed_at is not null
),
agg as (
  select edition_id,
         count(*) as n_sales,
         percentile_cont(0.5) within group (order by px) as median_px,
         max(ts) as last_sale_at
  from sales
  group by 1
),
last as (
  select distinct on (edition_id) edition_id, px as last_sale_usd
  from sales
  order by edition_id, ts desc
)
select a.edition_id,
       l.last_sale_usd,
       a.last_sale_at,
       a.n_sales,
       round(a.median_px::numeric, 2) as median_sale_usd
from agg a
join last l using (edition_id);

create unique index if not exists mv_edition_last_sale_idx on topshot.mv_edition_last_sale (edition_id);
