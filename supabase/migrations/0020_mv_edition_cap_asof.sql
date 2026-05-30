-- Edition-level floor market cap AS-OF each window date, with per-edition
-- carry-forward (latest snapshot on-or-before the target date). This is the ONE
-- correct foundation for segment/window cap-move exploration: ~8.7K edition rows
-- the app aggregates by any dimension (tier, scarcity, series, team, player,
-- cohort) and any window — no client-side carry-forward, no row-cap truncation,
-- no sampling. Floor cap = market_caps.market_cap (lowest_ask × circulation).
--
-- Carry-forward is done set-based via DISTINCT ON (edition_id) ORDER BY date DESC,
-- which uses the (edition_id, date) PK index. Refreshed by the ETL.

create materialized view if not exists topshot.mv_edition_cap_asof as
with l as (select max(date) as d from topshot.market_caps),
c_now  as (select distinct on (edition_id) edition_id, market_cap c from topshot.market_caps, l where date <= l.d           order by edition_id, date desc),
c_7    as (select distinct on (edition_id) edition_id, market_cap c from topshot.market_caps, l where date <= l.d - 7       order by edition_id, date desc),
c_30   as (select distinct on (edition_id) edition_id, market_cap c from topshot.market_caps, l where date <= l.d - 30      order by edition_id, date desc),
c_90   as (select distinct on (edition_id) edition_id, market_cap c from topshot.market_caps, l where date <= l.d - 90      order by edition_id, date desc),
c_180  as (select distinct on (edition_id) edition_id, market_cap c from topshot.market_caps, l where date <= l.d - 180     order by edition_id, date desc),
c_365  as (select distinct on (edition_id) edition_id, market_cap c from topshot.market_caps, l where date <= l.d - 365     order by edition_id, date desc)
select
  e.edition_id,
  e.player_id,
  e.player_name,
  e.tier_name,
  e.mint_count,
  e.set_id,
  s.series_number,
  e.team_at_moment_current_name as team,
  c_now.c  as cap_now,
  c_7.c    as cap_d7,
  c_30.c   as cap_d30,
  c_90.c   as cap_d90,
  c_180.c  as cap_d180,
  c_365.c  as cap_d365
from c_now
join topshot.editions e on e.edition_id = c_now.edition_id
left join topshot.sets s on s.set_id = e.set_id
left join c_7   on c_7.edition_id   = c_now.edition_id
left join c_30  on c_30.edition_id  = c_now.edition_id
left join c_90  on c_90.edition_id  = c_now.edition_id
left join c_180 on c_180.edition_id = c_now.edition_id
left join c_365 on c_365.edition_id = c_now.edition_id
where c_now.c is not null and c_now.c > 0;

create unique index if not exists mv_edition_cap_asof_edition_idx
  on topshot.mv_edition_cap_asof (edition_id);
create index if not exists mv_edition_cap_asof_capnow_idx
  on topshot.mv_edition_cap_asof (cap_now desc);
