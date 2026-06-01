-- Per-edition all-time realized-sale summary: last sale price + date + count.
-- Vanity-proof valuation source for illiquid blue-chips (GRAIL), where 90d
-- realized windows cover <20% of editions. Same "real sale" predicate as
-- mv_edition_growth_90d (gross_amount_usd >= 1, completed_at not null).
--
-- Use last_sale_usd (most recent actual transaction, carry-forward semantics) ×
-- circulation instead of lowest_ask × circulation, which imputes a single vanity
-- ask across every circulating moment. (All-time median dropped — percentile_cont
-- over full history blew the statement timeout; last-sale is the index basis.)

set statement_timeout = '600s';

drop materialized view if exists topshot.mv_edition_last_sale;

create materialized view topshot.mv_edition_last_sale as
with recent as (select max(completed_at) as maxd from topshot.transactions),
sales as (
  select m.edition_id, t.gross_amount_usd as px, t.completed_at as ts
  from topshot.transactions t
  join topshot.moments m on m.moment_id = t.moment_id
  cross join recent
  where t.gross_amount_usd >= 1
    and t.completed_at is not null
    and t.completed_at >= recent.maxd - interval '365 days'   -- bound the scan; covers ~all grail sales
),
last as (
  select distinct on (edition_id) edition_id, px as last_sale_usd, ts as last_sale_at
  from sales
  order by edition_id, ts desc
),
cnt as (
  select edition_id, count(*) as n_sales from sales group by 1
)
select l.edition_id, l.last_sale_usd, l.last_sale_at, c.n_sales
from last l
join cnt c using (edition_id);

create unique index if not exists mv_edition_last_sale_idx on topshot.mv_edition_last_sale (edition_id);
