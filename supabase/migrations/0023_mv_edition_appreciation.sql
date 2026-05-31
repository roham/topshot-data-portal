-- Per-edition appreciation from MSRP. The "physical card" unit: each edition
-- (player × play × set × tier × parallel) priced from its pack-derived MSRP
-- (packs.price / moments_per_pack) to its current floor, with the multiple.
-- Powers the most-appreciating index AND rookies-in-$ (is_rookie flag). One read.
-- ~1,835 rows (only editions whose moments map to a priced pack).

create materialized view if not exists topshot.mv_edition_appreciation as
with msrp as (
  select m.edition_id,
         avg(pk.price / nullif(pk.moments_per_pack, 0)) as msrp,
         count(*) as n_moments
  from topshot.moments m
  join topshot.packs pk on pk.pack_id = m.pack_id
  where pk.price > 0 and pk.moments_per_pack > 0 and m.edition_id is not null
  group by 1
),
lf as (
  -- carry-forward: latest snapshot with a live ask per edition
  select distinct on (edition_id) edition_id, lowest_ask_price as floor, date as floor_date
  from topshot.market_caps
  where lowest_ask_price > 0
  order by edition_id, date desc
)
select
  e.edition_id,
  e.player_id,
  e.player_name,
  e.tier_name,
  e.mint_count,
  e.parallel_id,
  e.set_id,
  e.series_name,
  e.edition_name,
  p.draft_year,
  (p.draft_year in ('2024', '2025')) as is_rookie,
  round(msrp.msrp::numeric, 2) as msrp,
  msrp.n_moments,
  lf.floor,
  lf.floor_date,
  round((lf.floor / msrp.msrp)::numeric, 3) as mult
from msrp
join topshot.editions e using (edition_id)
left join topshot.players p on p.player_id = e.player_id
left join lf using (edition_id)
where msrp.msrp > 0;

create unique index if not exists mv_edition_appreciation_idx
  on topshot.mv_edition_appreciation (edition_id);
create index if not exists mv_edition_appreciation_mult_idx
  on topshot.mv_edition_appreciation (mult desc nulls last);
