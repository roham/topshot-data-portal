-- Per-edition 90d realized-price growth + weekly sparkline, straight from real
-- sales. The honest "most appreciating" — trailing momentum, no MSRP/odds, no
-- debut-baseline doom. Windows are relative to the data's max sale date (data is
-- ~2 weeks stale), not wall-clock.

create materialized view topshot.mv_edition_growth_90d as
with recent as (select max(completed_at) as maxd from topshot.transactions),
sales as (
  select m.edition_id, t.gross_amount_usd as px, t.completed_at as ts
  from topshot.transactions t
  join topshot.moments m on m.moment_id = t.moment_id
  cross join recent
  where t.gross_amount_usd > 0 and t.completed_at is not null
    and t.completed_at >= recent.maxd - interval '98 days'
),
weekly as (
  select edition_id, date_trunc('week', ts)::date as wk,
         percentile_cont(0.5) within group (order by px) as med, count(*) as n
  from sales group by 1, 2
),
spark as (
  select edition_id,
         array_agg(round(med::numeric, 2) order by wk) as sparkline,
         sum(n) as n_sales
  from weekly group by 1
),
cur as (
  select s.edition_id, percentile_cont(0.5) within group (order by s.px) as price_now
  from sales s cross join recent r where s.ts >= r.maxd - interval '14 days' group by 1
),
prior as (
  select s.edition_id, percentile_cont(0.5) within group (order by s.px) as price_prior
  from sales s cross join recent r
  where s.ts >= r.maxd - interval '98 days' and s.ts < r.maxd - interval '70 days' group by 1
)
select e.edition_id, e.player_name, e.tier_name, e.mint_count, e.parallel_id, e.series_name,
       (e.image_urls)[1] as image_url,
       (p.draft_year in ('2024', '2025')) as is_rookie,
       sp.n_sales, sp.sparkline,
       round(c.price_now::numeric, 2) as price_now,
       round(pr.price_prior::numeric, 2) as price_prior,
       round((((c.price_now - pr.price_prior) / nullif(pr.price_prior, 0)) * 100)::numeric, 1) as growth_pct
from spark sp
join topshot.editions e using (edition_id)
left join topshot.players p on p.player_id = e.player_id
left join cur c using (edition_id)
left join prior pr using (edition_id)
where sp.n_sales >= 5;

create unique index if not exists mv_edition_growth_90d_idx on topshot.mv_edition_growth_90d (edition_id);
create index if not exists mv_edition_growth_90d_growth_idx on topshot.mv_edition_growth_90d (growth_pct desc nulls last);
