-- 0007_topshot_multi_window_mvs.sql
-- Adds 7d/30d/90d/1y/all-time materialized views to support real time-period
-- filtering on the portal. Drops the broken unique_buyers/unique_sellers
-- columns from market summary (BQ semantic-open view returns NULL for
-- buyer_safe_name on succeeded marketplace txs — privacy-stripped — so those
-- counts come back 0/1; better to omit than mislead).
--
-- IMPORTANT: this migration was rewritten against the REAL schema after the
-- first attempt failed on `pl.player_name does not exist`. The schema agent
-- created `players.full_name` (matching BQ), not `players.player_name`.
-- `editions.player_name` IS denormalized so we read from there everywhere.
--
-- JOIN pattern used throughout:
--   transactions t
--     JOIN moments m USING (moment_id)
--     LEFT JOIN editions e ON e.edition_id = m.edition_id     -- player_name, edition_name, tier
--     LEFT JOIN sets s ON s.set_id = e.set_id                 -- set_name
--     LEFT JOIN players pl ON pl.player_id = e.player_id      -- full_name (used as player_name alias)

-- =============================================================================
-- market_summary — single-row aggregates per window
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS topshot.mv_market_24h_summary CASCADE;

CREATE MATERIALIZED VIEW topshot.mv_market_summary_24h AS
SELECT
    1 AS singleton_id,
    COUNT(t.transaction_id)::bigint                                  AS total_tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                    AS total_volume_usd,
    COUNT(DISTINCT t.moment_id)::bigint                              AS unique_moments_traded,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)  AS median_price_usd,
    AVG(t.gross_amount_usd)::numeric(20, 4)                          AS avg_price_usd,
    MAX(t.gross_amount_usd)::numeric                                 AS max_price_usd,
    MIN(t.gross_amount_usd)::numeric                                 AS min_price_usd,
    now()                                                            AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED'
  AND t.source_updated_at >= now() - INTERVAL '24 hours';
CREATE UNIQUE INDEX uidx_mv_market_summary_24h_singleton ON topshot.mv_market_summary_24h (singleton_id);

CREATE MATERIALIZED VIEW topshot.mv_market_summary_7d AS
SELECT 1 AS singleton_id, COUNT(t.transaction_id)::bigint AS total_tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       AVG(t.gross_amount_usd)::numeric(20, 4) AS avg_price_usd,
       MAX(t.gross_amount_usd)::numeric AS max_price_usd,
       MIN(t.gross_amount_usd)::numeric AS min_price_usd, now() AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '7 days';
CREATE UNIQUE INDEX uidx_mv_market_summary_7d_singleton ON topshot.mv_market_summary_7d (singleton_id);

CREATE MATERIALIZED VIEW topshot.mv_market_summary_30d AS
SELECT 1 AS singleton_id, COUNT(t.transaction_id)::bigint AS total_tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       AVG(t.gross_amount_usd)::numeric(20, 4) AS avg_price_usd,
       MAX(t.gross_amount_usd)::numeric AS max_price_usd,
       MIN(t.gross_amount_usd)::numeric AS min_price_usd, now() AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '30 days';
CREATE UNIQUE INDEX uidx_mv_market_summary_30d_singleton ON topshot.mv_market_summary_30d (singleton_id);

CREATE MATERIALIZED VIEW topshot.mv_market_summary_90d AS
SELECT 1 AS singleton_id, COUNT(t.transaction_id)::bigint AS total_tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       AVG(t.gross_amount_usd)::numeric(20, 4) AS avg_price_usd,
       MAX(t.gross_amount_usd)::numeric AS max_price_usd,
       MIN(t.gross_amount_usd)::numeric AS min_price_usd, now() AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '90 days';
CREATE UNIQUE INDEX uidx_mv_market_summary_90d_singleton ON topshot.mv_market_summary_90d (singleton_id);

CREATE MATERIALIZED VIEW topshot.mv_market_summary_1y AS
SELECT 1 AS singleton_id, COUNT(t.transaction_id)::bigint AS total_tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       AVG(t.gross_amount_usd)::numeric(20, 4) AS avg_price_usd,
       MAX(t.gross_amount_usd)::numeric AS max_price_usd,
       MIN(t.gross_amount_usd)::numeric AS min_price_usd, now() AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '365 days';
CREATE UNIQUE INDEX uidx_mv_market_summary_1y_singleton ON topshot.mv_market_summary_1y (singleton_id);

CREATE MATERIALIZED VIEW topshot.mv_market_summary_all_time AS
SELECT 1 AS singleton_id, COUNT(t.transaction_id)::bigint AS total_tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       AVG(t.gross_amount_usd)::numeric(20, 4) AS avg_price_usd,
       MAX(t.gross_amount_usd)::numeric AS max_price_usd,
       MIN(t.gross_amount_usd)::numeric AS min_price_usd, now() AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED';
CREATE UNIQUE INDEX uidx_mv_market_summary_all_singleton ON topshot.mv_market_summary_all_time (singleton_id);

-- =============================================================================
-- largest_sales — top 50 per window (gets player_name from editions, not players)
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS topshot.mv_largest_sales_24h CASCADE;

CREATE MATERIALIZED VIEW topshot.mv_largest_sales_24h AS
SELECT
    t.transaction_id, t.moment_id, t.gross_amount_usd, t.net_amount_usd,
    t.buyer_safe_name, t.seller_safe_name, t.transaction_type_id,
    t.client_marketplace_safe_name, t.source_updated_at AS sold_at,
    m.serial_number, m.edition_id, e.edition_name, m.top_shot_score,
    e.play_id, m.play_name,
    e.set_id, s.set_name,
    e.player_id, e.player_name,
    e.tier_id, e.tier_name
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
LEFT JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED'
  AND t.source_updated_at >= now() - INTERVAL '24 hours'
ORDER BY t.gross_amount_usd DESC
LIMIT 50;
CREATE UNIQUE INDEX uidx_mv_largest_sales_24h_tx ON topshot.mv_largest_sales_24h (transaction_id);

CREATE MATERIALIZED VIEW topshot.mv_largest_sales_7d AS
SELECT t.transaction_id, t.moment_id, t.gross_amount_usd, t.net_amount_usd,
       t.buyer_safe_name, t.seller_safe_name, t.transaction_type_id,
       t.client_marketplace_safe_name, t.source_updated_at AS sold_at,
       m.serial_number, m.edition_id, e.edition_name, m.top_shot_score,
       e.play_id, m.play_name, e.set_id, s.set_name,
       e.player_id, e.player_name, e.tier_id, e.tier_name
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
LEFT JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '7 days'
ORDER BY t.gross_amount_usd DESC LIMIT 50;
CREATE UNIQUE INDEX uidx_mv_largest_sales_7d_tx ON topshot.mv_largest_sales_7d (transaction_id);

CREATE MATERIALIZED VIEW topshot.mv_largest_sales_30d AS
SELECT t.transaction_id, t.moment_id, t.gross_amount_usd, t.net_amount_usd,
       t.buyer_safe_name, t.seller_safe_name, t.transaction_type_id,
       t.client_marketplace_safe_name, t.source_updated_at AS sold_at,
       m.serial_number, m.edition_id, e.edition_name, m.top_shot_score,
       e.play_id, m.play_name, e.set_id, s.set_name,
       e.player_id, e.player_name, e.tier_id, e.tier_name
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
LEFT JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '30 days'
ORDER BY t.gross_amount_usd DESC LIMIT 50;
CREATE UNIQUE INDEX uidx_mv_largest_sales_30d_tx ON topshot.mv_largest_sales_30d (transaction_id);

CREATE MATERIALIZED VIEW topshot.mv_largest_sales_1y AS
SELECT t.transaction_id, t.moment_id, t.gross_amount_usd, t.net_amount_usd,
       t.buyer_safe_name, t.seller_safe_name, t.transaction_type_id,
       t.client_marketplace_safe_name, t.source_updated_at AS sold_at,
       m.serial_number, m.edition_id, e.edition_name, m.top_shot_score,
       e.play_id, m.play_name, e.set_id, s.set_name,
       e.player_id, e.player_name, e.tier_id, e.tier_name
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
LEFT JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '365 days'
ORDER BY t.gross_amount_usd DESC LIMIT 50;
CREATE UNIQUE INDEX uidx_mv_largest_sales_1y_tx ON topshot.mv_largest_sales_1y (transaction_id);

CREATE MATERIALIZED VIEW topshot.mv_largest_sales_all_time AS
SELECT t.transaction_id, t.moment_id, t.gross_amount_usd, t.net_amount_usd,
       t.buyer_safe_name, t.seller_safe_name, t.transaction_type_id,
       t.client_marketplace_safe_name, t.source_updated_at AS sold_at,
       m.serial_number, m.edition_id, e.edition_name, m.top_shot_score,
       e.play_id, m.play_name, e.set_id, s.set_name,
       e.player_id, e.player_name, e.tier_id, e.tier_name
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
LEFT JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED'
ORDER BY t.gross_amount_usd DESC LIMIT 50;
CREATE UNIQUE INDEX uidx_mv_largest_sales_all_tx ON topshot.mv_largest_sales_all_time (transaction_id);

-- =============================================================================
-- player_volume — group by player, sum volume per window
-- Uses pl.full_name AS player_name (players table has full_name, not player_name)
-- =============================================================================

CREATE MATERIALIZED VIEW topshot.mv_player_90d_volume AS
SELECT pl.player_id, pl.full_name AS player_name, pl.last_known_team_id,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COALESCE(AVG(t.gross_amount_usd), 0)::numeric(20, 4) AS avg_price_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       COALESCE(MAX(t.gross_amount_usd), 0)::numeric AS max_price_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
JOIN topshot.players pl ON pl.player_id = e.player_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '90 days'
GROUP BY pl.player_id, pl.full_name, pl.last_known_team_id;
CREATE UNIQUE INDEX uidx_mv_player_90d_volume_player ON topshot.mv_player_90d_volume (player_id);

CREATE MATERIALIZED VIEW topshot.mv_player_1y_volume AS
SELECT pl.player_id, pl.full_name AS player_name, pl.last_known_team_id,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COALESCE(AVG(t.gross_amount_usd), 0)::numeric(20, 4) AS avg_price_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       COALESCE(MAX(t.gross_amount_usd), 0)::numeric AS max_price_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
JOIN topshot.players pl ON pl.player_id = e.player_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '365 days'
GROUP BY pl.player_id, pl.full_name, pl.last_known_team_id;
CREATE UNIQUE INDEX uidx_mv_player_1y_volume_player ON topshot.mv_player_1y_volume (player_id);

CREATE MATERIALIZED VIEW topshot.mv_player_all_time_volume AS
SELECT pl.player_id, pl.full_name AS player_name, pl.last_known_team_id,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       COALESCE(AVG(t.gross_amount_usd), 0)::numeric(20, 4) AS avg_price_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd,
       COALESCE(MAX(t.gross_amount_usd), 0)::numeric AS max_price_usd,
       COUNT(DISTINCT t.moment_id)::bigint AS unique_moments_traded
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
JOIN topshot.players pl ON pl.player_id = e.player_id
WHERE t.transaction_state_id = 'SUCCEEDED'
GROUP BY pl.player_id, pl.full_name, pl.last_known_team_id;
CREATE UNIQUE INDEX uidx_mv_player_all_volume_player ON topshot.mv_player_all_time_volume (player_id);

-- =============================================================================
-- edition_activity — group by edition, sum volume per window
-- Reads player_name + set_name from editions/sets (joined), not from plays/players
-- =============================================================================

CREATE MATERIALIZED VIEW topshot.mv_edition_7d_activity AS
SELECT e.edition_id, e.edition_name, e.set_id, s.set_name,
       e.play_id, e.player_id, e.player_name, e.tier_name,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '7 days'
GROUP BY e.edition_id, e.edition_name, e.set_id, s.set_name, e.play_id, e.player_id, e.player_name, e.tier_name;
CREATE UNIQUE INDEX uidx_mv_edition_7d_activity_edition ON topshot.mv_edition_7d_activity (edition_id);

CREATE MATERIALIZED VIEW topshot.mv_edition_30d_activity AS
SELECT e.edition_id, e.edition_name, e.set_id, s.set_name,
       e.play_id, e.player_id, e.player_name, e.tier_name,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '30 days'
GROUP BY e.edition_id, e.edition_name, e.set_id, s.set_name, e.play_id, e.player_id, e.player_name, e.tier_name;
CREATE UNIQUE INDEX uidx_mv_edition_30d_activity_edition ON topshot.mv_edition_30d_activity (edition_id);

CREATE MATERIALIZED VIEW topshot.mv_edition_1y_activity AS
SELECT e.edition_id, e.edition_name, e.set_id, s.set_name,
       e.play_id, e.player_id, e.player_name, e.tier_name,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED' AND t.source_updated_at >= now() - INTERVAL '365 days'
GROUP BY e.edition_id, e.edition_name, e.set_id, s.set_name, e.play_id, e.player_id, e.player_name, e.tier_name;
CREATE UNIQUE INDEX uidx_mv_edition_1y_activity_edition ON topshot.mv_edition_1y_activity (edition_id);

CREATE MATERIALIZED VIEW topshot.mv_edition_all_time_activity AS
SELECT e.edition_id, e.edition_name, e.set_id, s.set_name,
       e.play_id, e.player_id, e.player_name, e.tier_name,
       COUNT(t.transaction_id)::bigint AS tx_count,
       COALESCE(SUM(t.gross_amount_usd), 0)::numeric AS total_volume_usd,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd) AS median_price_usd
FROM topshot.transactions t
JOIN topshot.moments m USING (moment_id)
JOIN topshot.editions e ON e.edition_id = m.edition_id
LEFT JOIN topshot.sets s ON s.set_id = e.set_id
WHERE t.transaction_state_id = 'SUCCEEDED'
GROUP BY e.edition_id, e.edition_name, e.set_id, s.set_name, e.play_id, e.player_id, e.player_name, e.tier_name;
CREATE UNIQUE INDEX uidx_mv_edition_all_activity_edition ON topshot.mv_edition_all_time_activity (edition_id);

-- =============================================================================
-- Update etl.refresh_all_materialized_views() to include the new MVs.
-- DROP first because the existing function returns TABLE(...) and we're
-- changing it to RETURNS void; CREATE OR REPLACE can't change signature.
-- Also DROP the duplicate topshot.refresh_all_materialized_views() — the
-- canonical one lives in etl (private, service_role only).
-- =============================================================================

DROP FUNCTION IF EXISTS etl.refresh_all_materialized_views();
DROP FUNCTION IF EXISTS topshot.refresh_all_materialized_views();

CREATE FUNCTION etl.refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = topshot, etl, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_market_summary_24h;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_market_summary_7d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_market_summary_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_market_summary_90d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_market_summary_1y;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_market_summary_all_time;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_largest_sales_24h;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_largest_sales_7d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_largest_sales_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_largest_sales_1y;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_largest_sales_all_time;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_24h_volume;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_7d_volume;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_30d_volume;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_90d_volume;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_1y_volume;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_all_time_volume;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_24h_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_7d_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_30d_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_1y_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_all_time_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_set_24h_activity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_set_completion_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_player_market_cap;
END;
$$;

REVOKE ALL ON FUNCTION etl.refresh_all_materialized_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION etl.refresh_all_materialized_views() TO service_role;
