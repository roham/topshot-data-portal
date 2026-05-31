-- Coverage gate on odds-based MSRP. Empirical pull odds derived from our
-- moments table are only trustworthy when we've captured ~all of a pack's
-- moments. Most packs are partially sampled AND biased toward Rare (rares trade
-- /list more, so they're over-represented) — which produced nonsense like
-- "Rare = 64.8% pull odds, MSRP $7.72" for the Rookie Rush pack (1,466/6,444 =
-- 23% coverage). Only emit MSRP for packs with >=90% moment coverage; otherwise
-- the edition gets no MSRP (honest absence beats a fabricated number).

drop materialized view if exists topshot.mv_edition_appreciation;
drop materialized view if exists topshot.mv_edition_msrp_tiered;

create materialized view topshot.mv_edition_msrp_tiered as
with declared as (
  select pack_name, sum(tot) as declared
  from (select pack_name, pack_id, max(total_moments) as tot from topshot.packs where price > 0 group by 1, 2) z
  group by 1
),
prod as (
  select pk.pack_name, max(pk.price) as price, max(pk.moments_per_pack) as n, e.tier_name, count(*)::numeric as cnt
  from topshot.packs pk
  join topshot.moments m on m.pack_id = pk.pack_id
  join topshot.editions e on e.edition_id = m.edition_id
  where pk.price > 0
  group by pk.pack_name, e.tier_name
),
sampled as (select pack_name, sum(cnt) as s from prod group by 1),
cov as (select d.pack_name, s.s / nullif(d.declared, 0) as coverage from declared d join sampled s using (pack_name)),
prodmsrp as (
  select p.pack_name, p.tier_name, p.price, p.n,
         p.cnt / nullif(sum(p.cnt) over (partition by p.pack_name), 0) as p_tier,
         p.price / (p.n * nullif(p.cnt / nullif(sum(p.cnt) over (partition by p.pack_name), 0), 0)) as msrp_tier,
         c.coverage
  from prod p
  join cov c using (pack_name)
  where c.coverage >= 0.9   -- trust odds only at near-complete coverage
),
edprod as (
  select distinct on (m.edition_id) m.edition_id, pk.pack_name,
         count(*) over (partition by m.edition_id, pk.pack_name) as c
  from topshot.moments m join topshot.packs pk on pk.pack_id = m.pack_id
  where pk.price > 0
  order by m.edition_id, c desc
)
select e.edition_id, e.tier_name, ep.pack_name as msrp_pack,
       round(pm.msrp_tier::numeric, 2) as msrp,
       round(pm.p_tier::numeric, 6) as pull_odds,
       round(pm.coverage::numeric, 3) as coverage
from edprod ep
join topshot.editions e on e.edition_id = ep.edition_id
join prodmsrp pm on pm.pack_name = ep.pack_name and pm.tier_name = e.tier_name
where pm.msrp_tier > 0;

create unique index if not exists mv_edition_msrp_tiered_idx on topshot.mv_edition_msrp_tiered (edition_id);

-- Rebuild appreciation on the gated MSRP.
create materialized view topshot.mv_edition_appreciation as
with lf as (
  select distinct on (edition_id) edition_id, lowest_ask_price as floor, date as floor_date
  from topshot.market_caps where lowest_ask_price > 0
  order by edition_id, date desc
)
select e.edition_id, e.player_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id,
       e.set_id, e.series_name, e.edition_name, p.draft_year,
       (p.draft_year in ('2024', '2025')) as is_rookie,
       mt.msrp, mt.pull_odds, mt.msrp_pack, mt.coverage,
       lf.floor, lf.floor_date,
       round((lf.floor / nullif(mt.msrp, 0))::numeric, 3) as mult
from topshot.mv_edition_msrp_tiered mt
join topshot.editions e using (edition_id)
left join topshot.players p on p.player_id = e.player_id
left join lf using (edition_id)
where mt.msrp > 0;

create unique index if not exists mv_edition_appreciation_idx on topshot.mv_edition_appreciation (edition_id);
create index if not exists mv_edition_appreciation_mult_idx on topshot.mv_edition_appreciation (mult desc nulls last);
