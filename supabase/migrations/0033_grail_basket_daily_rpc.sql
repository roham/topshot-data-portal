-- Daily basket total for an index, server-side + VANITY-CAPPED. PostgREST
-- disables aggregates, and per-edition history fan-out (then JS pivot/sum) times
-- out for 90d/1Y windows (the chart silently went empty). This RPC returns ONE
-- row per date — the exact shape the chart needs — using idx_marketcaps_edition.
--
-- Each edition's daily mcap is capped at its last realized sale × that day's
-- circulation (mv_edition_last_sale) before summing, so a vanity ask in the
-- history (one $500K Curry ask = a $10M phantom) can't fake a crash in the
-- series. Editions never sold use raw market_cap. Raised statement_timeout.

create or replace function topshot.index_basket_daily(p_edition_ids text[], p_since date)
returns table(d date, total_usd numeric)
language sql
security definer
set search_path = topshot, pg_temp
stable
as $$
  select mc.date,
         sum(
           case
             when ls.last_sale_usd is not null
               then least(mc.market_cap, ls.last_sale_usd * coalesce(mc.num_moments_in_circulation, 0))
             else mc.market_cap
           end
         )
  from topshot.market_caps mc
  left join topshot.mv_edition_last_sale ls on ls.edition_id = mc.edition_id
  where mc.edition_id = any(p_edition_ids)
    and mc.date >= p_since
    and mc.market_cap > 0
  group by mc.date
  order by mc.date;
$$;

alter function topshot.index_basket_daily(text[], date) set statement_timeout = '60s';
grant execute on function topshot.index_basket_daily(text[], date) to anon;
