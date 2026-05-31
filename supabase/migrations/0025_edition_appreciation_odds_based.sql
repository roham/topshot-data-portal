-- Rebuild mv_edition_appreciation to use the ODDS-BASED per-tier MSRP
-- (mv_edition_msrp_tiered) instead of the flat pack/N MSRP. The flat version
-- manufactured fake multiples (e.g. a Legendary "114×" off a $5 MSRP); the true
-- pull-cost MSRP makes the index honest — most chase tiers are at/below pull cost,
-- and the real outperformers are editions whose floor genuinely exceeds MSRP.

drop materialized view if exists topshot.mv_edition_appreciation;

create materialized view topshot.mv_edition_appreciation as
with lf as (
  select distinct on (edition_id) edition_id, lowest_ask_price as floor, date as floor_date
  from topshot.market_caps
  where lowest_ask_price > 0
  order by edition_id, date desc
)
select
  e.edition_id, e.player_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id,
  e.set_id, e.series_name, e.edition_name,
  p.draft_year,
  (p.draft_year in ('2024', '2025')) as is_rookie,
  mt.msrp, mt.pull_odds, mt.msrp_pack,
  lf.floor, lf.floor_date,
  round((lf.floor / nullif(mt.msrp, 0))::numeric, 3) as mult
from topshot.mv_edition_msrp_tiered mt
join topshot.editions e using (edition_id)
left join topshot.players p on p.player_id = e.player_id
left join lf using (edition_id)
where mt.msrp > 0;

create unique index if not exists mv_edition_appreciation_idx on topshot.mv_edition_appreciation (edition_id);
create index if not exists mv_edition_appreciation_mult_idx on topshot.mv_edition_appreciation (mult desc nulls last);
