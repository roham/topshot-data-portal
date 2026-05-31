set statement_timeout = '420s';
-- Propagate sub-edition (parallel) scarcity to the edition-level lanes. The
-- edition mint_count is misleading (a "/4099" is often really a /99 parallel).
-- Add each edition's sub-edition profile: how many parallels, and the scarcest
-- one's circulation. Bounded to each lane's editions so the moment scan is fast.

-- C) Floor-smashed + sub-edition profile
drop materialized view if exists topshot.mv_edition_floor_smash;
create materialized view topshot.mv_edition_floor_smash as
with lf as (
  select edition_id, lowest_ask_price,
         first_value(lowest_ask_price) over (partition by edition_id order by date desc) as cur_floor
  from topshot.market_caps where lowest_ask_price > 0 and date >= (select max(date) from topshot.market_caps) - 30
),
agg as (select edition_id, max(cur_floor) as floor_now, min(lowest_ask_price) as floor_before from lf group by edition_id),
elig as (select edition_id, floor_now, floor_before from agg where floor_now >= 1.5 * floor_before and floor_now >= 50),
subed as (
  select edition_id, count(*) as n_sub, min(cnt) as scarcest_sub
  from (select edition_id, subedition_id, count(*) cnt from topshot.moments where edition_id in (select edition_id from elig) group by 1,2) z
  group by edition_id
)
select e.edition_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id, e.series_name,
       (e.image_urls)[1] as image_url,
       elig.floor_before, elig.floor_now, round((elig.floor_now / nullif(elig.floor_before,0))::numeric, 2) as jump_mult,
       coalesce(sp.n_sub, 1) as n_sub, sp.scarcest_sub
from elig join topshot.editions e using (edition_id)
left join subed sp using (edition_id);
create unique index on topshot.mv_edition_floor_smash (edition_id);
create index on topshot.mv_edition_floor_smash (jump_mult desc nulls last);

-- D) High-value illiquid + sub-edition profile
drop materialized view if exists topshot.mv_edition_illiquid_highvalue;
create materialized view topshot.mv_edition_illiquid_highvalue as
with lf as (select distinct on (edition_id) edition_id, lowest_ask_price as floor
            from topshot.market_caps where lowest_ask_price > 0 order by edition_id, date desc),
s90 as (
  select m.edition_id, count(*) as sales_90d, max(t.gross_amount_usd) as max_sale_ever, max(t.completed_at)::date as last_at
  from topshot.transactions t join topshot.moments m on m.moment_id = t.moment_id
  where t.gross_amount_usd > 0 and t.completed_at >= (select max(completed_at) from topshot.transactions) - interval '90 days'
  group by 1
),
elig as (
  select lf.edition_id, lf.floor, s90.sales_90d, s90.max_sale_ever, s90.last_at
  from lf join s90 using (edition_id)
  where lf.floor >= 200 and s90.sales_90d between 1 and 5 and lf.floor <= 3 * s90.max_sale_ever
),
subed as (
  select edition_id, count(*) as n_sub, min(cnt) as scarcest_sub
  from (select edition_id, subedition_id, count(*) cnt from topshot.moments where edition_id in (select edition_id from elig) group by 1,2) z
  group by edition_id
)
select e.edition_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id, e.series_name,
       (e.image_urls)[1] as image_url,
       elig.floor, elig.sales_90d, elig.sales_90d as sales_ever, elig.max_sale_ever as last_sale, elig.last_at, elig.max_sale_ever,
       mt.msrp_pack, mt.msrp as pack_msrp, coalesce(sp.n_sub, 1) as n_sub, sp.scarcest_sub
from elig join topshot.editions e using (edition_id)
left join subed sp using (edition_id)
left join topshot.mv_edition_msrp_tiered mt using (edition_id);
create unique index on topshot.mv_edition_illiquid_highvalue (edition_id);
create index on topshot.mv_edition_illiquid_highvalue (floor desc nulls last);
