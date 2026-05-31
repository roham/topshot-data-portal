-- Corrected, ODDS-BASED per-tier MSRP + per-edition price-history RPC.
--
-- The flat packs.price/moments_per_pack was tier-blind (every edition came out
-- ~$5). True MSRP differs per tier and is driven by pull odds: for a pack product
-- at price P with N moments, a tier-T moment's expected pack-acquisition cost is
--   MSRP_T = P / (N * p_T),  where p_T = (tier-T moments) / (all moments) in that product.
-- e.g. 2026 NBA Playoffs Standard Pack ($25, N=5): Common $6.25, Rare $25, Legendary $1,923, Ultimate $20,000.

create materialized view if not exists topshot.mv_edition_msrp_tiered as
with prod as (  -- pack PRODUCT (by name): price, N, per-tier moment counts (odds from full coverage)
  select pk.pack_name, max(pk.price) as price, max(pk.moments_per_pack) as n,
         e.tier_name, count(*)::numeric as cnt
  from topshot.packs pk
  join topshot.moments m on m.pack_id = pk.pack_id
  join topshot.editions e on e.edition_id = m.edition_id
  where pk.price > 0
  group by pk.pack_name, e.tier_name
),
prodmsrp as (
  select pack_name, tier_name, price, n,
         cnt / nullif(sum(cnt) over (partition by pack_name), 0) as p_tier,
         price / (n * nullif(cnt / nullif(sum(cnt) over (partition by pack_name), 0), 0)) as msrp_tier
  from prod
),
edprod as (  -- edition -> primary priced pack product (the one contributing the most of its moments)
  select distinct on (m.edition_id) m.edition_id, pk.pack_name,
         count(*) over (partition by m.edition_id, pk.pack_name) as c
  from topshot.moments m join topshot.packs pk on pk.pack_id = m.pack_id
  where pk.price > 0
  order by m.edition_id, c desc
)
select e.edition_id, e.tier_name, ep.pack_name as msrp_pack,
       round(pm.msrp_tier::numeric, 2) as msrp,
       round(pm.p_tier::numeric, 6) as pull_odds
from edprod ep
join topshot.editions e on e.edition_id = ep.edition_id
join prodmsrp pm on pm.pack_name = ep.pack_name and pm.tier_name = e.tier_name
where pm.msrp_tier > 0;

create unique index if not exists mv_edition_msrp_tiered_idx on topshot.mv_edition_msrp_tiered (edition_id);

-- Per-edition price history (StockX / Card-Ladder style). Aggregates are disabled
-- in PostgREST, so this is a SECURITY DEFINER RPC the cookie-free client calls.
create or replace function topshot.edition_price_history(p_edition_id text, p_since_days int default null)
returns table(d date, n bigint, median numeric, lo numeric, hi numeric, avg_usd numeric)
language sql
security definer
set search_path = topshot, pg_temp
stable as $$
  select date(t.completed_at) as d,
         count(*) as n,
         percentile_cont(0.5) within group (order by t.gross_amount_usd) as median,
         min(t.gross_amount_usd) as lo,
         max(t.gross_amount_usd) as hi,
         avg(t.gross_amount_usd) as avg_usd
  from topshot.transactions t
  join topshot.moments m on m.moment_id = t.moment_id
  where m.edition_id = p_edition_id
    and t.gross_amount_usd > 0
    and t.completed_at is not null
    and (p_since_days is null
         or t.completed_at >= (select max(completed_at) from topshot.transactions) - make_interval(days => p_since_days))
  group by 1
  order by 1;
$$;

grant execute on function topshot.edition_price_history(text, int) to anon;
