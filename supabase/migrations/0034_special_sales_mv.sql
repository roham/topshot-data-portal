-- Special-serial sales showcase source for /sales.
--
-- The /sales surface was a flat "biggest sales" spreadsheet. The collector
-- audience cares WHY a sale is special: serial #1, a serial that matches the
-- player's jersey number, or a premium parallel (Omega / Galactic). This MV
-- precomputes every real settled sale that qualifies for at least one of those
-- "special serial" stories, enriched with the fields the showcase renders.
--
-- Grain: one row per transaction (real sales only). Parallels are first-class
-- (Principle IV) — the parallel lives on moments.subedition_id, NOT on
-- editions.parallel_id (which is 0 for all editions). parallel_types maps
-- 21=Galactic, 22=Omega, 0=Base, 1..20=other visual parallels.
--
-- "Real sale" predicate matches the largest_sales / growth family: SUCCEEDED,
-- marketplace type (P2P/OFFER/DIRECT — excludes GIFT transfers), gross > $50,
-- completed_at present. Sales are shown AS-IS per the constitution (no vanity
-- cap — these are settled marks, not asks).
--
-- All-time real sales >$50 ≈ 120k rows; the special subset is a few thousand.
-- Driven from transactions (small) → moments (PK join) → plays/editions/sets
-- (PK joins) — all index joins, no full moments scan. Bound the statement.

set statement_timeout = '600s';

drop materialized view if exists topshot.mv_special_sales cascade;

create materialized view topshot.mv_special_sales as
with sales as (
  select
    t.transaction_id,
    t.gross_amount_usd,
    t.completed_at,
    t.buyer_safe_name,
    t.seller_safe_name,
    m.moment_id,
    m.moment_flow_id,
    m.serial_number,
    m.subedition_id,
    m.edition_id,
    m.edition_name,
    m.set_id,
    m.play_id
  from topshot.transactions t
  join topshot.moments m on m.moment_id = t.moment_id
  where t.transaction_state_id = 'SUCCEEDED'
    and t.transaction_type_id in ('P2P', 'OFFER', 'DIRECT')
    and t.gross_amount_usd > 50
    and t.completed_at is not null
    and m.serial_number is not null
),
enriched as (
  select
    s.*,
    pl.player_id,
    coalesce(p.full_name, pl.player_name)                          as player_name,
    pl.play_name,
    pl.jersey_number_at_moment                                     as jersey_number,
    case when pl.jersey_number_at_moment ~ '^[0-9]+$'
         then pl.jersey_number_at_moment::int end                  as jersey_num_int,
    st.set_name,
    st.series_number,
    e.tier_name,
    e.mint_count                                                   as circulation,
    e.team_at_moment_team_id                                       as team_id,
    case when s.subedition_id ~ '^[0-9]+$'
         then pt.name end                                          as parallel_name
  from sales s
  left join topshot.plays    pl on pl.play_id    = s.play_id
  left join topshot.players  p  on p.player_id   = pl.player_id
  left join topshot.sets     st on st.set_id     = s.set_id
  left join topshot.editions e  on e.edition_id  = s.edition_id
  left join topshot.parallel_types pt
         on s.subedition_id ~ '^[0-9]+$' and pt.parallel_id = s.subedition_id::int
)
select
  transaction_id,
  gross_amount_usd,
  completed_at,
  buyer_safe_name,
  seller_safe_name,
  moment_id,
  moment_flow_id,
  serial_number,
  subedition_id,
  edition_id,
  edition_name,
  set_id,
  set_name,
  series_number,
  play_id,
  play_name,
  player_id,
  player_name,
  jersey_number,
  tier_name,
  circulation,
  team_id,
  parallel_name,
  (serial_number = 1)                                              as is_serial_one,
  (subedition_id = '22')                                           as is_omega,
  (subedition_id = '21')                                           as is_galactic,
  (jersey_num_int is not null
    and serial_number = jersey_num_int
    and serial_number > 1)                                         as is_jersey_match,
  (serial_number between 2 and 10)                                 as is_low_serial,
  (circulation is not null and circulation > 1
    and serial_number = circulation)                               as is_last_serial
from enriched
where serial_number = 1
   or subedition_id in ('21', '22')
   or (jersey_num_int is not null and serial_number = jersey_num_int and serial_number > 1)
   or (serial_number between 2 and 10)
   or (circulation is not null and circulation > 1 and serial_number = circulation);

-- transaction_id is unique → enables REFRESH ... CONCURRENTLY in the ETL.
create unique index mv_special_sales_pk        on topshot.mv_special_sales (transaction_id);
create index        mv_special_sales_completed on topshot.mv_special_sales (completed_at desc);
create index        mv_special_sales_gross     on topshot.mv_special_sales (gross_amount_usd desc);

-- PostgREST must reload or it can't see the new relation.
notify pgrst, 'reload schema';
