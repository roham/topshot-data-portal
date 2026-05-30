-- Realized economics — monthly. Actual cleared trades (not floor/ask quotes):
-- GMV, trade count, median + avg sale price per calendar month. Powers the
-- /lab/economy trend that shows the real dollar-volume story the floor hides.
--
-- Single-table scan over topshot.transactions (SUCCEEDED, USD priced). Fast to
-- refresh; the unique index on month enables REFRESH ... CONCURRENTLY.

create materialized view if not exists topshot.mv_realized_monthly as
select
  date_trunc('month', source_updated_at)::date            as month,
  count(*)::bigint                                          as trades,
  round(sum(gross_amount_usd))::bigint                      as gmv,
  round(percentile_cont(0.5) within group (order by gross_amount_usd))::numeric(12,2) as median_usd,
  round(avg(gross_amount_usd))::numeric(12,2)              as avg_usd
from topshot.transactions
where transaction_state_id = 'SUCCEEDED'
  and gross_amount_usd is not null
group by 1;

create unique index if not exists mv_realized_monthly_month_idx
  on topshot.mv_realized_monthly (month);
