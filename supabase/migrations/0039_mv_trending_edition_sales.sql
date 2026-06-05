-- 0039_trending_edition_sales.sql
-- Precomputed INDIVIDUAL cleared sales for the most-traded editions — the StockX
-- scatter source. The live transactions⋈moments join is 6–18s and a single MV
-- query over many editions exceeds the pooler's DDL cap. So this is a plain TABLE
-- populated PER EDITION (each single-edition join is index-driven and fast),
-- refreshed by scripts/etl/refresh-trending-sales.mjs.
--
-- Rollback: drop table topshot.trending_edition_sales;

create table if not exists topshot.trending_edition_sales (
  edition_id     text        not null,
  completed_at   timestamptz not null,
  price          numeric     not null,
  serial_number  integer,
  tx_type        text,
  inserted_at    timestamptz not null default now()
);

create index if not exists trending_edition_sales_idx
  on topshot.trending_edition_sales (edition_id, completed_at desc);

alter table topshot.trending_edition_sales enable row level security;

do $$
begin
  drop policy if exists "trending_edition_sales_anon_read" on topshot.trending_edition_sales;
  drop policy if exists "trending_edition_sales_service_all" on topshot.trending_edition_sales;
  create policy "trending_edition_sales_anon_read" on topshot.trending_edition_sales for select to anon, authenticated using (true);
  create policy "trending_edition_sales_service_all" on topshot.trending_edition_sales for all to service_role using (true) with check (true);
end $$;

grant select on topshot.trending_edition_sales to anon, authenticated;
grant all on topshot.trending_edition_sales to service_role;
