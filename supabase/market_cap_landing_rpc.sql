-- market_cap_landing() — server-side aggregation for the /market-cap graph-first
-- landing. Replaces the page's ~250 sequential PostgREST round-trips (it was
-- paginating 261K raw market_caps rows to do math Postgres should do) with a
-- single RPC call returning a small JSONB blob.
--
-- Faithfully reproduces lib/supabase/queries/market-cap-landing.ts semantics:
-- byTier / byParallel (+ placeholder rows for named parallels with 0 editions) /
-- topSets(20) / byTeam(30) / totalOverTime / gainers+losers(8 each, latest>1000 &
-- |pct|>1) / concentration(7 cutoffs) / topPlayers(200, floor + avg-sale) / totals.
--
-- SECURITY DEFINER + granted to anon so the cookie-free page client can call it.

CREATE OR REPLACE FUNCTION topshot.market_cap_landing()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = topshot, pg_temp
AS $$
WITH latest AS (
  SELECT max(date) AS d FROM market_caps
),
bounds AS (
  SELECT
    (SELECT d FROM latest) AS hi,
    (SELECT min(date) FROM market_caps
       WHERE date >= (SELECT d FROM latest) - INTERVAL '30 days' AND market_cap > 0) AS lo
),
-- latest-date editions with positive mcap, joined to edition dims + player/team
lm AS (
  SELECT mc.edition_id, mc.market_cap,
         e.tier_name, e.set_id, e.parallel_id, e.player_id,
         p.full_name AS player_full_name,
         p.last_known_team_full_name AS team_name,
         p.last_known_team_id AS team_id
  FROM market_caps mc
  JOIN editions e ON e.edition_id = mc.edition_id
  LEFT JOIN players p ON p.player_id = e.player_id
  WHERE mc.date = (SELECT d FROM latest) AND mc.market_cap > 0
),
by_tier AS (
  SELECT COALESCE(tier_name, 'Unknown') AS tier_name,
         SUM(market_cap) AS total_mcap, COUNT(*)::int AS edition_count
  FROM lm GROUP BY 1 ORDER BY 2 DESC
),
-- live parallels (by id), name via parallel_types
by_par_live AS (
  SELECT lm.parallel_id,
         CASE WHEN lm.parallel_id IS NULL THEN 'Unknown (backfill pending)'
              ELSE COALESCE(pt.name, 'Parallel ' || lm.parallel_id) END AS parallel_name,
         SUM(lm.market_cap) AS total_mcap, COUNT(*)::int AS edition_count
  FROM lm LEFT JOIN parallel_types pt ON pt.parallel_id = lm.parallel_id
  GROUP BY lm.parallel_id, parallel_name ORDER BY total_mcap DESC
),
-- placeholder rows for named parallels (id>0) with no live editions
by_par_ph AS (
  SELECT pt.parallel_id, pt.name AS parallel_name, 0::numeric AS total_mcap, 0 AS edition_count
  FROM parallel_types pt
  WHERE pt.parallel_id > 0
    AND pt.parallel_id NOT IN (SELECT parallel_id FROM by_par_live WHERE parallel_id IS NOT NULL)
),
by_set AS (
  SELECT lm.set_id, s.set_name, s.series_number, SUM(lm.market_cap) AS total_mcap
  FROM lm JOIN sets s ON s.set_id = lm.set_id
  WHERE lm.set_id IS NOT NULL
  GROUP BY lm.set_id, s.set_name, s.series_number
  ORDER BY total_mcap DESC LIMIT 20
),
by_team AS (
  SELECT COALESCE(team_name, 'Unknown') AS team_name, MAX(team_id) AS team_id,
         SUM(market_cap) AS total_mcap, COUNT(DISTINCT player_id)::int AS player_count
  FROM lm WHERE player_id IS NOT NULL
  GROUP BY 1 ORDER BY total_mcap DESC LIMIT 30
),
over_time AS (
  SELECT date::text AS date, SUM(market_cap) AS total_mcap, COUNT(*)::int AS edition_count
  FROM market_caps
  WHERE date >= (SELECT lo FROM bounds) AND market_cap > 0
  GROUP BY date ORDER BY date
),
-- per-player earliest (lo) vs latest (hi) mcap within the window
mover_raw AS (
  SELECT e.player_id,
         SUM(mc.market_cap) FILTER (WHERE mc.date = (SELECT lo FROM bounds)) AS earliest,
         SUM(mc.market_cap) FILTER (WHERE mc.date = (SELECT hi FROM bounds)) AS latest
  FROM market_caps mc
  JOIN editions e ON e.edition_id = mc.edition_id
  WHERE mc.date IN ((SELECT lo FROM bounds), (SELECT hi FROM bounds))
    AND mc.market_cap > 0 AND e.player_id IS NOT NULL
  GROUP BY e.player_id
),
movers AS (
  SELECT mr.player_id, COALESCE(p.full_name, 'Unknown') AS player_name,
         COALESCE(mr.earliest, 0) AS earliest_mcap, COALESCE(mr.latest, 0) AS latest_mcap,
         CASE WHEN COALESCE(mr.earliest,0) > 0
              THEN ((COALESCE(mr.latest,0) - mr.earliest) / mr.earliest) * 100 ELSE 0 END AS pct_change
  FROM mover_raw mr LEFT JOIN players p ON p.player_id = mr.player_id
  WHERE COALESCE(mr.latest,0) > 1000
    AND abs(CASE WHEN COALESCE(mr.earliest,0) > 0
                 THEN ((COALESCE(mr.latest,0) - mr.earliest) / mr.earliest) * 100 ELSE 0 END) > 1
),
gainers AS (SELECT * FROM movers ORDER BY pct_change DESC LIMIT 8),
losers  AS (SELECT * FROM movers ORDER BY pct_change ASC  LIMIT 8),
-- top 200 players by floor mcap, with avg-sale formula from 30d volume
tp AS (
  SELECT m.player_id, m.player_name, m.last_known_team_full_name AS team_name,
         m.total_market_cap_usd::numeric AS floor_mcap,
         COALESCE(m.total_moments_in_circulation, 0)::numeric AS circ,
         COALESCE(m.edition_count, 0)::int AS edition_count,
         COALESCE(v.tx_count, 0)::numeric AS tx_count,
         COALESCE(v.total_volume_usd, 0)::numeric AS total_vol
  FROM mv_player_market_cap m
  LEFT JOIN mv_player_30d_volume v ON v.player_id = m.player_id
  ORDER BY m.total_market_cap_usd DESC NULLS LAST LIMIT 200
),
tp_calc AS (
  SELECT player_id, player_name, team_name, floor_mcap, circ, edition_count, tx_count, total_vol,
         CASE WHEN tx_count > 0 THEN total_vol / tx_count ELSE 0 END AS avg_sale,
         CASE WHEN tx_count > 0 THEN (total_vol / tx_count) * circ ELSE 0 END AS avg_sale_mcap
  FROM tp
),
-- concentration across ALL players (floor)
pr AS (
  SELECT total_market_cap_usd::numeric AS v,
         row_number() OVER (ORDER BY total_market_cap_usd DESC NULLS LAST) AS rn
  FROM mv_player_market_cap
),
player_total AS (SELECT COALESCE(SUM(v),0) AS t FROM pr),
conc AS (
  SELECT n, CASE WHEN (SELECT t FROM player_total) > 0
                 THEN (SELECT COALESCE(SUM(v),0) FROM pr WHERE rn <= n) / (SELECT t FROM player_total) * 100
                 ELSE 0 END AS share_pct
  FROM unnest(ARRAY[10,25,50,100,250,500,1000]) AS n
),
-- avg-sale concentration across the top-200 set (matches JS, which uses top-200)
avs AS (
  SELECT avg_sale_mcap AS v, row_number() OVER (ORDER BY avg_sale_mcap DESC) AS rn FROM tp_calc
),
avs_total AS (SELECT COALESCE(SUM(v),0) AS t FROM avs),
conc_avs AS (
  SELECT n, CASE WHEN (SELECT t FROM avs_total) > 0
                 THEN (SELECT COALESCE(SUM(v),0) FROM avs WHERE rn <= n) / (SELECT t FROM avs_total) * 100
                 ELSE 0 END AS share_pct
  FROM unnest(ARRAY[10,25,50,100,250,500,1000]) AS n
)
SELECT jsonb_build_object(
  'asOfDate', (SELECT d::text FROM latest),
  'byTier', COALESCE((SELECT jsonb_agg(jsonb_build_object('tier_name',tier_name,'total_mcap',total_mcap,'edition_count',edition_count)) FROM by_tier), '[]'),
  'byParallel', COALESCE((
     SELECT jsonb_agg(x) FROM (
       SELECT jsonb_build_object('parallel_id',parallel_id,'parallel_name',parallel_name,'total_mcap',total_mcap,'edition_count',edition_count) AS x FROM by_par_live
       UNION ALL
       SELECT jsonb_build_object('parallel_id',parallel_id,'parallel_name',parallel_name,'total_mcap',total_mcap,'edition_count',edition_count) FROM by_par_ph
     ) u), '[]'),
  'topSets', COALESCE((SELECT jsonb_agg(jsonb_build_object('set_id',set_id,'set_name',set_name,'series_number',series_number,'total_mcap',total_mcap)) FROM by_set), '[]'),
  'byTeam', COALESCE((SELECT jsonb_agg(jsonb_build_object('team_id',team_id,'team_name',team_name,'total_mcap',total_mcap,'player_count',player_count)) FROM by_team), '[]'),
  'totalOverTime', COALESCE((SELECT jsonb_agg(jsonb_build_object('date',date,'total_mcap',total_mcap,'edition_count',edition_count)) FROM over_time), '[]'),
  'gainers', COALESCE((SELECT jsonb_agg(jsonb_build_object('player_id',player_id,'player_name',player_name,'earliest_mcap',earliest_mcap,'latest_mcap',latest_mcap,'pct_change',pct_change)) FROM gainers), '[]'),
  'losers', COALESCE((SELECT jsonb_agg(jsonb_build_object('player_id',player_id,'player_name',player_name,'earliest_mcap',earliest_mcap,'latest_mcap',latest_mcap,'pct_change',pct_change)) FROM losers), '[]'),
  'concentration', COALESCE((SELECT jsonb_agg(jsonb_build_object('top_n',n,'share_pct',share_pct) ORDER BY n) FROM conc), '[]'),
  'concentrationAvgSale', COALESCE((SELECT jsonb_agg(jsonb_build_object('top_n',n,'share_pct',share_pct) ORDER BY n) FROM conc_avs), '[]'),
  'topPlayers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
       'player_id',player_id,'player_name',player_name,'team_name',team_name,
       'total_market_cap_usd',floor_mcap,'avg_sale_market_cap_usd',avg_sale_mcap,
       'tx_count_30d',tx_count,'avg_sale_price_30d',avg_sale,
       'edition_count',edition_count,'total_circulation',circ) ORDER BY floor_mcap DESC NULLS LAST) FROM tp_calc), '[]'),
  'totalMcap', (SELECT COALESCE(SUM(market_cap),0) FROM lm),
  'totalEditions', (SELECT COUNT(*)::int FROM lm),
  'playerCount', (SELECT COUNT(*)::int FROM mv_player_market_cap),
  'playerAttributedMcap', (SELECT t FROM player_total),
  'totalAvgSaleMcap', (SELECT COALESCE(SUM(avg_sale_mcap),0) FROM tp_calc),
  'top10SharePct', CASE WHEN (SELECT t FROM player_total) > 0
       THEN (SELECT COALESCE(SUM(v),0) FROM pr WHERE rn <= 10) / (SELECT t FROM player_total) * 100 ELSE 0 END,
  'top10ShareAvgSalePct', CASE WHEN (SELECT t FROM avs_total) > 0
       THEN (SELECT COALESCE(SUM(v),0) FROM avs WHERE rn <= 10) / (SELECT t FROM avs_total) * 100 ELSE 0 END
);
$$;

REVOKE ALL ON FUNCTION topshot.market_cap_landing() FROM public;
GRANT EXECUTE ON FUNCTION topshot.market_cap_landing() TO anon, authenticated, service_role;
