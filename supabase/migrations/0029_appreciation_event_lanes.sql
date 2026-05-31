set statement_timeout = '600s';  -- heavy transaction joins; must be in-session (psql -c does NOT carry into -f)

-- Appreciation event lanes — the three non-line-chart categories. Each is an
-- event/data-shape the trending line chart misses.

-- A) Appreciation story — a specific serial that genuinely CLIMBED: latest sale
--    >= 3x its earliest sale, latest sale >= $100. (max/min would catch declines
--    too — we want upward trajectory only.)
drop materialized view if exists topshot.mv_serial_appreciation;
create materialized view topshot.mv_serial_appreciation as
with mt as (
  select moment_id,
         min(gross) as lo, max(gross) as hi, count(*) as n,
         (array_agg(gross order by completed_at asc))[1] as first_sale,
         (array_agg(gross order by completed_at desc))[1] as last_sale,
         max(completed_at)::date as last_at
  from (select moment_id, gross_amount_usd as gross, completed_at
        from topshot.transactions where gross_amount_usd > 0 and completed_at is not null) tx
  group by 1
  having count(*) >= 2
),
lf as (select distinct on (edition_id) edition_id, lowest_ask_price as floor from topshot.market_caps where lowest_ask_price > 0 order by edition_id, date desc)
select m.moment_id, m.edition_id, m.serial_number, e.player_name, e.tier_name, e.mint_count, e.parallel_id, e.series_name,
       (e.image_urls)[1] as image_url,
       mt.lo, mt.hi, mt.first_sale, mt.last_sale, mt.n, mt.last_at, lf.floor as edition_floor,
       round((mt.last_sale / nullif(mt.first_sale,0))::numeric, 2) as mult
from mt
join topshot.moments m on m.moment_id = mt.moment_id
join topshot.editions e on e.edition_id = m.edition_id
left join lf on lf.edition_id = m.edition_id
where mt.last_sale >= 100 and mt.last_sale >= 3 * mt.first_sale;
create unique index if not exists mv_serial_appreciation_idx on topshot.mv_serial_appreciation (moment_id);
create index if not exists mv_serial_appreciation_last_idx on topshot.mv_serial_appreciation (last_sale desc nulls last);

-- C) Floor-smashed — the low ask leapt after a sale (>=1.5x the 30d-prior min, now >=$50).
drop materialized view if exists topshot.mv_edition_floor_smash;
create materialized view topshot.mv_edition_floor_smash as
with lf as (
  select edition_id, lowest_ask_price,
         first_value(lowest_ask_price) over (partition by edition_id order by date desc) as cur_floor
  from topshot.market_caps
  where lowest_ask_price > 0 and date >= (select max(date) from topshot.market_caps) - 30
),
agg as (select edition_id, max(cur_floor) as floor_now, min(lowest_ask_price) as floor_before from lf group by edition_id)
select e.edition_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id, e.series_name,
       (e.image_urls)[1] as image_url,
       agg.floor_before, agg.floor_now,
       round((agg.floor_now / nullif(agg.floor_before,0))::numeric, 2) as jump_mult
from agg join topshot.editions e using (edition_id)
where agg.floor_now >= 1.5 * agg.floor_before and agg.floor_now >= 50;
create unique index if not exists mv_edition_floor_smash_idx on topshot.mv_edition_floor_smash (edition_id);
create index if not exists mv_edition_floor_smash_jump_idx on topshot.mv_edition_floor_smash (jump_mult desc nulls last);

-- D) High-value illiquid — expensive AND rarely trades, but PROVABLY valuable
--    (has a real prior sale) and floor not absurdly stuck above it. Kills the
--    $5,000,000 troll-listings with 0 sales.
drop materialized view if exists topshot.mv_edition_illiquid_highvalue;
create materialized view topshot.mv_edition_illiquid_highvalue as
with hf as (  -- high-floor editions FIRST (small set); $100k cap kills the $5M troll-asks
  select edition_id, floor from (
    select distinct on (edition_id) edition_id, lowest_ask_price as floor
    from topshot.market_caps where lowest_ask_price > 0 order by edition_id, date desc
  ) z where floor >= 200 and floor <= 100000
),
s90 as (  -- bounded 90d window + pre-filtered to high-floor editions = fast (no all-time scan)
  select m.edition_id, count(*) as sales_90d,
         (array_agg(t.gross_amount_usd order by t.completed_at desc))[1] as last_sale,
         max(t.completed_at)::date as last_at, max(t.gross_amount_usd) as max_sale_ever
  from topshot.transactions t join topshot.moments m on m.moment_id = t.moment_id
  where m.edition_id in (select edition_id from hf) and t.gross_amount_usd > 0
    and t.completed_at >= (select max(completed_at) from topshot.transactions) - interval '90 days'
  group by 1
)
select e.edition_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id, e.series_name,
       (e.image_urls)[1] as image_url,
       hf.floor, coalesce(s90.sales_90d, 0) as sales_90d, s90.sales_90d as sales_ever,
       s90.last_sale, s90.last_at, s90.max_sale_ever,
       mt.msrp_pack, mt.msrp as pack_msrp
from hf
join topshot.editions e using (edition_id)
left join s90 using (edition_id)
left join topshot.mv_edition_msrp_tiered mt using (edition_id)
where coalesce(s90.sales_90d, 0) <= 5;
create unique index if not exists mv_edition_illiquid_highvalue_idx on topshot.mv_edition_illiquid_highvalue (edition_id);
create index if not exists mv_edition_illiquid_highvalue_floor_idx on topshot.mv_edition_illiquid_highvalue (floor desc nulls last);
