-- 0038_edition_sales_rpc.sql
-- Individual cleared sales for an edition — the raw dots behind a StockX-style
-- scatter (edition_price_history is a daily rollup; this is every sale).
--
-- SECURITY DEFINER (PostgREST aggregates/raw cross-joins gated) + grant anon,
-- mirroring topshot.edition_price_history (0024).
--
-- Returns most-recent-first, capped at p_limit (the scatter samples the tail).

create or replace function topshot.edition_sales(
  p_edition_id text,
  p_since_days int default null,
  p_limit int default 400
)
returns table(t timestamptz, price numeric, serial_number int, tx_type text)
language sql
security definer
set search_path = topshot, pg_temp
stable as $$
  select t.completed_at as t,
         t.gross_amount_usd as price,
         m.serial_number,
         t.transaction_type_id as tx_type
  from topshot.transactions t
  join topshot.moments m on m.moment_id = t.moment_id
  where m.edition_id = p_edition_id
    and t.gross_amount_usd > 0
    and t.completed_at is not null
    and (p_since_days is null
         or t.completed_at >= (select max(completed_at) from topshot.transactions) - make_interval(days => p_since_days))
  order by t.completed_at desc
  limit p_limit;
$$;

grant execute on function topshot.edition_sales(text, int, int) to anon, authenticated;
