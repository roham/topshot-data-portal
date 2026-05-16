-- 0005_topshot_materialized_views.sql
-- Materialized views for hot aggregate queries in the topshot schema.
--
-- All MVs are refreshed via etl.refresh_all_materialized_views(),
-- invoked by the ETL cron after each successful incremental run (5-15min cadence).
--
-- Concurrency note: every MV has a UNIQUE INDEX to enable
-- REFRESH MATERIALIZED VIEW CONCURRENTLY (no read-lock on portal).
--
-- Apply after 0007.
--
-- Rollback: drop MVs individually; or `DROP SCHEMA topshot CASCADE` removes them.

-- =============================================================================
-- mv_player_24h_volume — 24-hour activity rollup, per player
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_player_24h_volume AS
SELECT
    p.player_id,
    p.full_name              AS player_name,
    p.last_known_team_id,
    p.last_known_team_full_name,
    COUNT(t.transaction_id)::bigint                                  AS tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                    AS total_volume_usd,
    COUNT(DISTINCT t.buyer_safe_name)::bigint                        AS unique_buyers,
    COUNT(DISTINCT t.seller_safe_name)::bigint                       AS unique_sellers,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)  AS median_price_usd,
    MIN(t.gross_amount_usd)::numeric                                 AS min_price_usd,
    MAX(t.gross_amount_usd)::numeric                                 AS max_price_usd,
    now()                                                            AS refreshed_at
FROM topshot.players p
JOIN topshot.editions e   ON e.player_id = p.player_id
JOIN topshot.moments  m   ON m.edition_id = e.edition_id
JOIN topshot.transactions t
    ON t.moment_id = m.moment_id
   AND t.transaction_state_id = 'SUCCEEDED'
   AND t.source_updated_at >= now() - INTERVAL '24 hours'
GROUP BY p.player_id, p.full_name, p.last_known_team_id, p.last_known_team_full_name;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_24h_volume_player_id
    ON topshot.mv_player_24h_volume (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_24h_volume_total
    ON topshot.mv_player_24h_volume (total_volume_usd DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mv_player_24h_volume_tx_count
    ON topshot.mv_player_24h_volume (tx_count DESC);

COMMENT ON MATERIALIZED VIEW topshot.mv_player_24h_volume IS
    'Per-player 24-hour SUCCEEDED-trade rollup. Refreshed every 5-15min by ETL.';

-- =============================================================================
-- mv_player_7d_volume — same shape, 7-day window
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_player_7d_volume AS
SELECT
    p.player_id,
    p.full_name              AS player_name,
    p.last_known_team_id,
    p.last_known_team_full_name,
    COUNT(t.transaction_id)::bigint                                  AS tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                    AS total_volume_usd,
    COUNT(DISTINCT t.buyer_safe_name)::bigint                        AS unique_buyers,
    COUNT(DISTINCT t.seller_safe_name)::bigint                       AS unique_sellers,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)  AS median_price_usd,
    MIN(t.gross_amount_usd)::numeric                                 AS min_price_usd,
    MAX(t.gross_amount_usd)::numeric                                 AS max_price_usd,
    now()                                                            AS refreshed_at
FROM topshot.players p
JOIN topshot.editions e   ON e.player_id = p.player_id
JOIN topshot.moments  m   ON m.edition_id = e.edition_id
JOIN topshot.transactions t
    ON t.moment_id = m.moment_id
   AND t.transaction_state_id = 'SUCCEEDED'
   AND t.source_updated_at >= now() - INTERVAL '7 days'
GROUP BY p.player_id, p.full_name, p.last_known_team_id, p.last_known_team_full_name;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_7d_volume_player_id
    ON topshot.mv_player_7d_volume (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_7d_volume_total
    ON topshot.mv_player_7d_volume (total_volume_usd DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW topshot.mv_player_7d_volume IS
    'Per-player 7-day SUCCEEDED-trade rollup. Refreshed every 5-15min by ETL.';

-- =============================================================================
-- mv_player_30d_volume — same shape, 30-day window
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_player_30d_volume AS
SELECT
    p.player_id,
    p.full_name              AS player_name,
    p.last_known_team_id,
    p.last_known_team_full_name,
    COUNT(t.transaction_id)::bigint                                  AS tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                    AS total_volume_usd,
    COUNT(DISTINCT t.buyer_safe_name)::bigint                        AS unique_buyers,
    COUNT(DISTINCT t.seller_safe_name)::bigint                       AS unique_sellers,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)  AS median_price_usd,
    MIN(t.gross_amount_usd)::numeric                                 AS min_price_usd,
    MAX(t.gross_amount_usd)::numeric                                 AS max_price_usd,
    now()                                                            AS refreshed_at
FROM topshot.players p
JOIN topshot.editions e   ON e.player_id = p.player_id
JOIN topshot.moments  m   ON m.edition_id = e.edition_id
JOIN topshot.transactions t
    ON t.moment_id = m.moment_id
   AND t.transaction_state_id = 'SUCCEEDED'
   AND t.source_updated_at >= now() - INTERVAL '30 days'
GROUP BY p.player_id, p.full_name, p.last_known_team_id, p.last_known_team_full_name;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_30d_volume_player_id
    ON topshot.mv_player_30d_volume (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_30d_volume_total
    ON topshot.mv_player_30d_volume (total_volume_usd DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW topshot.mv_player_30d_volume IS
    'Per-player 30-day SUCCEEDED-trade rollup. Refreshed every 5-15min by ETL.';

-- =============================================================================
-- mv_edition_24h_activity — 24h activity per edition
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_edition_24h_activity AS
SELECT
    e.edition_id,
    e.edition_name,
    e.set_id,
    e.play_id,
    e.player_id,
    e.tier_name,
    COUNT(t.transaction_id)::bigint                                              AS tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                                AS volume_usd,
    (COUNT(DISTINCT t.buyer_safe_name) + COUNT(DISTINCT t.seller_safe_name))::bigint AS unique_traders,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)              AS median_price_usd,
    MIN(t.gross_amount_usd)::numeric                                             AS min_price_usd,
    MAX(t.gross_amount_usd)::numeric                                             AS max_price_usd,
    now()                                                                        AS refreshed_at
FROM topshot.editions e
JOIN topshot.moments m       ON m.edition_id = e.edition_id
JOIN topshot.transactions t
    ON t.moment_id = m.moment_id
   AND t.transaction_state_id = 'SUCCEEDED'
   AND t.source_updated_at >= now() - INTERVAL '24 hours'
GROUP BY e.edition_id, e.edition_name, e.set_id, e.play_id, e.player_id, e.tier_name;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_edition_24h_activity_edition_id
    ON topshot.mv_edition_24h_activity (edition_id);
CREATE INDEX IF NOT EXISTS idx_mv_edition_24h_activity_volume
    ON topshot.mv_edition_24h_activity (volume_usd DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW topshot.mv_edition_24h_activity IS
    'Per-edition 24-hour SUCCEEDED-trade rollup. Powers "hottest editions" leaderboard.';

-- =============================================================================
-- mv_set_24h_activity — 24h activity per set
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_set_24h_activity AS
SELECT
    s.set_id,
    s.set_name,
    s.series_number,
    s.series_name,
    s.set_tier_name,
    COUNT(t.transaction_id)::bigint                                  AS tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                    AS volume_usd,
    COUNT(DISTINCT m.edition_id)::bigint                             AS unique_editions_traded,
    COUNT(DISTINCT t.buyer_safe_name)::bigint                        AS unique_buyers,
    COUNT(DISTINCT t.seller_safe_name)::bigint                       AS unique_sellers,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)  AS median_price_usd,
    now()                                                            AS refreshed_at
FROM topshot.sets s
JOIN topshot.editions e      ON e.set_id = s.set_id
JOIN topshot.moments  m      ON m.edition_id = e.edition_id
JOIN topshot.transactions t
    ON t.moment_id = m.moment_id
   AND t.transaction_state_id = 'SUCCEEDED'
   AND t.source_updated_at >= now() - INTERVAL '24 hours'
GROUP BY s.set_id, s.set_name, s.series_number, s.series_name, s.set_tier_name;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_set_24h_activity_set_id
    ON topshot.mv_set_24h_activity (set_id);
CREATE INDEX IF NOT EXISTS idx_mv_set_24h_activity_volume
    ON topshot.mv_set_24h_activity (volume_usd DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW topshot.mv_set_24h_activity IS
    'Per-set 24-hour SUCCEEDED-trade rollup.';

-- =============================================================================
-- mv_market_24h_summary — single-row aggregate for homepage KPI strip
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_market_24h_summary AS
SELECT
    1                                                                AS singleton_id,
    COUNT(t.transaction_id)::bigint                                  AS total_tx_count,
    COALESCE(SUM(t.gross_amount_usd), 0)::numeric                    AS total_volume_usd,
    COUNT(DISTINCT t.buyer_safe_name)::bigint                        AS unique_buyers,
    COUNT(DISTINCT t.seller_safe_name)::bigint                       AS unique_sellers,
    COUNT(DISTINCT t.moment_id)::bigint                              AS unique_moments_traded,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.gross_amount_usd)  AS median_price_usd,
    AVG(t.gross_amount_usd)::numeric                                 AS avg_price_usd,
    MAX(t.gross_amount_usd)::numeric                                 AS max_price_usd,
    MIN(t.gross_amount_usd)::numeric                                 AS min_price_usd,
    now()                                                            AS refreshed_at
FROM topshot.transactions t
WHERE t.transaction_state_id = 'SUCCEEDED'
  AND t.source_updated_at >= now() - INTERVAL '24 hours';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_market_24h_summary_singleton
    ON topshot.mv_market_24h_summary (singleton_id);

COMMENT ON MATERIALIZED VIEW topshot.mv_market_24h_summary IS
    'Single-row 24-hour market KPI strip. singleton_id always = 1; the unique index is required for CONCURRENTLY refresh.';

-- =============================================================================
-- mv_largest_sales_24h — top 50 sales in last 24h
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_largest_sales_24h AS
SELECT
    t.transaction_id,
    t.moment_id,
    t.gross_amount_usd,
    t.net_amount_usd,
    t.buyer_safe_name,
    t.seller_safe_name,
    t.transaction_type_id,
    t.client_marketplace_safe_name,
    t.source_updated_at                              AS sold_at,
    m.serial_number,
    m.edition_id,
    m.edition_name,
    m.top_shot_score,
    m.play_id,
    m.play_name,
    m.set_id,
    m.set_name,
    e.player_id,
    e.player_name,
    e.tier_name,
    now()                                            AS refreshed_at
FROM topshot.transactions t
JOIN topshot.moments  m   ON m.moment_id = t.moment_id
LEFT JOIN topshot.editions e ON e.edition_id = m.edition_id
WHERE t.transaction_state_id = 'SUCCEEDED'
  AND t.source_updated_at >= now() - INTERVAL '24 hours'
  AND t.gross_amount_usd IS NOT NULL
ORDER BY t.gross_amount_usd DESC
LIMIT 50;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_largest_sales_24h_tx_id
    ON topshot.mv_largest_sales_24h (transaction_id);

COMMENT ON MATERIALIZED VIEW topshot.mv_largest_sales_24h IS
    'Top 50 SUCCEEDED sales by gross_amount_usd in last 24h. Materialized to avoid full sort on every page-load.';

-- =============================================================================
-- mv_set_completion_distribution — per set, histogram of completion among owners
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_set_completion_distribution AS
WITH owner_set_holdings AS (
    SELECT
        m.owner_flow_address,
        m.set_id,
        COUNT(DISTINCT m.edition_id) AS editions_owned
    FROM topshot.moments m
    WHERE m.owner_flow_address IS NOT NULL
      AND m.moment_status IN ('MINTED','LOCKED','UNLOCKED')
    GROUP BY m.owner_flow_address, m.set_id
),
set_edition_counts AS (
    SELECT
        e.set_id,
        COUNT(DISTINCT e.edition_id) AS total_editions
    FROM topshot.editions e
    GROUP BY e.set_id
),
completion_buckets AS (
    SELECT
        h.set_id,
        sec.total_editions,
        CASE
            WHEN sec.total_editions = 0                                              THEN 'N/A'
            WHEN h.editions_owned * 100.0 / sec.total_editions = 100                 THEN '100% (complete)'
            WHEN h.editions_owned * 100.0 / sec.total_editions >= 75                 THEN '75-99%'
            WHEN h.editions_owned * 100.0 / sec.total_editions >= 50                 THEN '50-74%'
            WHEN h.editions_owned * 100.0 / sec.total_editions >= 25                 THEN '25-49%'
            WHEN h.editions_owned * 100.0 / sec.total_editions >= 10                 THEN '10-24%'
            ELSE                                                                          '<10%'
        END AS bucket
    FROM owner_set_holdings h
    JOIN set_edition_counts sec ON sec.set_id = h.set_id
)
SELECT
    cb.set_id,
    s.set_name,
    s.series_number,
    cb.bucket,
    COUNT(*)::bigint AS owner_count,
    MAX(cb.total_editions) AS total_editions_in_set,
    now()            AS refreshed_at
FROM completion_buckets cb
LEFT JOIN topshot.sets s ON s.set_id = cb.set_id
GROUP BY cb.set_id, s.set_name, s.series_number, cb.bucket;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_set_completion_distribution_pk
    ON topshot.mv_set_completion_distribution (set_id, bucket);

COMMENT ON MATERIALIZED VIEW topshot.mv_set_completion_distribution IS
    'For each set, histogram of how-many-owners-hold-what-fraction-of-the-set. Powers "X% complete" community charts.';

-- =============================================================================
-- mv_player_market_cap — sum of edition market caps per player
-- =============================================================================
CREATE MATERIALIZED VIEW topshot.mv_player_market_cap AS
WITH latest_dates AS (
    SELECT MAX(date) AS max_date FROM topshot.market_caps
),
latest_mc AS (
    SELECT mc.*
    FROM topshot.market_caps mc, latest_dates ld
    WHERE mc.date = ld.max_date
)
SELECT
    p.player_id,
    p.full_name              AS player_name,
    p.last_known_team_id,
    p.last_known_team_full_name,
    COALESCE(SUM(latest_mc.market_cap), 0)::numeric              AS total_market_cap_usd,
    COALESCE(SUM(latest_mc.num_moments_in_circulation), 0)::bigint AS total_moments_in_circulation,
    COUNT(DISTINCT e.edition_id)::bigint                         AS edition_count,
    (SELECT max_date FROM latest_dates)                          AS as_of_date,
    now()                                                        AS refreshed_at
FROM topshot.players p
JOIN topshot.editions e   ON e.player_id = p.player_id
LEFT JOIN latest_mc       ON latest_mc.edition_id = e.edition_id
GROUP BY p.player_id, p.full_name, p.last_known_team_id, p.last_known_team_full_name;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_market_cap_player_id
    ON topshot.mv_player_market_cap (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_market_cap_total
    ON topshot.mv_player_market_cap (total_market_cap_usd DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW topshot.mv_player_market_cap IS
    'Per-player aggregate market cap (sum of edition market caps as of latest market_caps date). Powers OTM-style "Market Cap" leaderboard.';

-- =============================================================================
-- Grants — MVs are read-only public; service_role refreshes them
-- =============================================================================
DO $$
DECLARE
    v text;
    mvs text[] := ARRAY[
        'mv_player_24h_volume',
        'mv_player_7d_volume',
        'mv_player_30d_volume',
        'mv_edition_24h_activity',
        'mv_set_24h_activity',
        'mv_market_24h_summary',
        'mv_largest_sales_24h',
        'mv_set_completion_distribution',
        'mv_player_market_cap'
    ];
BEGIN
    FOREACH v IN ARRAY mvs
    LOOP
        EXECUTE format('GRANT SELECT ON topshot.%I TO anon, authenticated', v);
        EXECUTE format('GRANT ALL ON topshot.%I TO service_role', v);
    END LOOP;
END $$;

-- =============================================================================
-- Refresh function — SECURITY DEFINER in etl (locked-down schema)
-- so only the ETL service_role can call it. Search path pinned for safety.
-- =============================================================================
CREATE OR REPLACE FUNCTION etl.refresh_all_materialized_views()
RETURNS TABLE (mv_name text, refreshed_at timestamptz, duration_ms bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = topshot, etl, pg_temp
AS $$
DECLARE
    v text;
    mvs text[] := ARRAY[
        'mv_player_24h_volume',
        'mv_player_7d_volume',
        'mv_player_30d_volume',
        'mv_edition_24h_activity',
        'mv_set_24h_activity',
        'mv_market_24h_summary',
        'mv_largest_sales_24h',
        'mv_set_completion_distribution',
        'mv_player_market_cap'
    ];
    t_start timestamptz;
BEGIN
    FOREACH v IN ARRAY mvs
    LOOP
        t_start := clock_timestamp();
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.%I', v);
        mv_name      := v;
        refreshed_at := now();
        duration_ms  := EXTRACT(MILLISECONDS FROM (clock_timestamp() - t_start))::bigint;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;

COMMENT ON FUNCTION etl.refresh_all_materialized_views() IS
    'Refreshes every topshot.mv_* CONCURRENTLY (no read-lock). SECURITY DEFINER owner runs the refresh; only service_role can EXECUTE. Returns one row per MV with refresh duration. Lives in etl so it is not exposed to PostgREST/anon.';

-- Permissions on the refresh function — service_role only
REVOKE ALL ON FUNCTION etl.refresh_all_materialized_views() FROM PUBLIC;
REVOKE ALL ON FUNCTION etl.refresh_all_materialized_views() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION etl.refresh_all_materialized_views() TO service_role;

-- =============================================================================
-- Initial populate — refresh once so MVs are non-empty after migration.
-- CONCURRENTLY requires non-empty MVs, so on first run we do a non-concurrent
-- refresh; subsequent ETL invocations use the SECURITY DEFINER fn above.
-- =============================================================================
REFRESH MATERIALIZED VIEW topshot.mv_player_24h_volume;
REFRESH MATERIALIZED VIEW topshot.mv_player_7d_volume;
REFRESH MATERIALIZED VIEW topshot.mv_player_30d_volume;
REFRESH MATERIALIZED VIEW topshot.mv_edition_24h_activity;
REFRESH MATERIALIZED VIEW topshot.mv_set_24h_activity;
REFRESH MATERIALIZED VIEW topshot.mv_market_24h_summary;
REFRESH MATERIALIZED VIEW topshot.mv_largest_sales_24h;
REFRESH MATERIALIZED VIEW topshot.mv_set_completion_distribution;
REFRESH MATERIALIZED VIEW topshot.mv_player_market_cap;
