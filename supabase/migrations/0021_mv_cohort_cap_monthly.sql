-- Monthly floor market cap per cohort, for overlaid time-series line charts.
-- For each month-end over the last ~13 months and each cohort (tier band,
-- scarcity band, rookies, whole market), the total floor cap with per-edition
-- carry-forward (latest snapshot on-or-before the month). Lets the UI overlay
-- cohort trajectories (indexed) to compare who's rising vs bleeding over time.
--
-- Carry-forward via correlated lateral (latest cap <= month per edition). Heavy
-- but refreshed off-cycle by the ETL, not at request time.

create materialized view if not exists topshot.mv_cohort_cap_monthly as
with months as (
  select generate_series(
    date_trunc('month', (select max(date) from topshot.market_caps)) - interval '12 months',
    date_trunc('month', (select max(date) from topshot.market_caps)),
    interval '1 month')::date as m
),
em as (
  select e.edition_id, e.tier_name, e.mint_count, p.draft_year, mo.m as month,
    (select mc.market_cap from topshot.market_caps mc
     where mc.edition_id = e.edition_id and mc.date <= mo.m
     order by mc.date desc limit 1) as cap
  from topshot.editions e
  cross join months mo
  left join topshot.players p on p.player_id = e.player_id
),
-- per-edition median cap over the window — to drop stuck-listing spikes
emed as (
  select edition_id, percentile_cont(0.5) within group (order by cap) as med
  from em where cap is not null and cap > 0 group by edition_id
),
emc as (
  select em.month, em.cap, em.tier_name,
    case when em.mint_count <= 1 then '1-of-1' when em.mint_count <= 25 then '/25'
         when em.mint_count <= 99 then '/99' when em.mint_count <= 499 then '/499'
         when em.mint_count <= 4999 then '/4,999' else '5,000+' end as scar,
    (em.draft_year in ('2024','2025')) as is_rookie
  from em join emed using (edition_id)
  -- exclude per-edition outliers (stuck/frozen asks): cap >5x or <0.2x its own median
  where em.cap is not null and em.cap > 0 and emed.med > 0
    and em.cap <= 5 * emed.med and em.cap >= 0.2 * emed.med
)
select cohort, month, round(sum(cap))::bigint as cap, count(*) as eds
from (
  select 'Tier · ' || coalesce(tier_name,'Unknown') as cohort, month, cap from emc
  union all select 'Scarcity · ' || scar, month, cap from emc
  union all select 'Rookies (24-25)', month, cap from emc where is_rookie
  union all select 'Market (all)', month, cap from emc
) z
group by cohort, month;

create unique index if not exists mv_cohort_cap_monthly_idx
  on topshot.mv_cohort_cap_monthly (cohort, month);
