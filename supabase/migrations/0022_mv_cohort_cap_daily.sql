-- Daily floor market cap per cohort — so a normal absolute time-series chart can
-- be zoomed with the site's standard window bubbles (24H/7D/30D/90D/6M/1Y/ALL).
-- For each day (last ~540) and cohort (tier band, scarcity band, rookies, whole
-- market): sum of that day's floor caps, with a per-edition outlier guard to drop
-- transient stuck-ask spikes. Bounded ~540d × ~13 cohorts ≈ 7K rows.

create materialized view if not exists topshot.mv_cohort_cap_daily as
with recent as (select max(date) as maxd from topshot.market_caps),
base as (
  select mc.date, mc.edition_id, mc.market_cap, e.tier_name, e.mint_count, p.draft_year
  from topshot.market_caps mc
  join topshot.editions e on e.edition_id = mc.edition_id
  left join topshot.players p on p.player_id = e.player_id
  cross join recent
  where mc.date >= recent.maxd - 540 and mc.market_cap > 0
),
med as (
  select edition_id, percentile_cont(0.5) within group (order by market_cap) as m
  from base group by edition_id
),
g as (
  select b.date, b.market_cap, b.tier_name, b.mint_count, b.draft_year
  from base b join med using (edition_id)
  where med.m > 0 and b.market_cap <= 5 * med.m and b.market_cap >= 0.2 * med.m
),
gc as (
  select date, market_cap, tier_name, (draft_year in ('2024','2025')) as is_rookie,
    case when mint_count <= 1 then '1-of-1' when mint_count <= 25 then '/25'
         when mint_count <= 99 then '/99' when mint_count <= 499 then '/499'
         when mint_count <= 4999 then '/4,999' else '5,000+' end as scar
  from g
)
select cohort, date, round(sum(market_cap))::bigint as cap, count(*) as eds
from (
  select 'Tier · ' || coalesce(tier_name,'Unknown') as cohort, date, market_cap from gc
  union all select 'Scarcity · ' || scar, date, market_cap from gc
  union all select 'Rookies (24-25)', date, market_cap from gc where is_rookie
  union all select 'Market (all)', date, market_cap from gc
) z
group by cohort, date;

create unique index if not exists mv_cohort_cap_daily_idx
  on topshot.mv_cohort_cap_daily (cohort, date);
