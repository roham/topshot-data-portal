-- Per-edition sub-edition (parallel) breakdown for the edition detail page.
-- Aggregates disabled in PostgREST → SECURITY DEFINER RPC.
create or replace function topshot.edition_subeditions(p_edition_id text)
returns table(subedition_id text, n bigint, min_sn int, max_sn int)
language sql security definer set search_path = topshot, pg_temp stable as $$
  select subedition_id, count(*), min(serial_number), max(serial_number)
  from topshot.moments where edition_id = p_edition_id group by 1 order by count(*) asc;
$$;
grant execute on function topshot.edition_subeditions(text) to anon;
