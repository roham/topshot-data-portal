-- =============================================================================
-- 0014 — topshot.mv_player_movers_{15,30,90}d: precomputed movers MVs.
--
-- The on-the-fly player_movers(window_days) RPC from migration 0013 was hitting
-- statement_timeout (8s default) on PostgREST because the CTE scan over
-- ~143K-300K transactions × moments × editions joins per request was too
-- heavy. Materializing the aggregation into MVs makes queries instant.
--
-- 3 MVs (one per window). Refresh strategy: REFRESH MATERIALIZED VIEW
-- CONCURRENTLY <name> from a daily cron. ~5-30s per refresh; runs offline.
-- =============================================================================

DROP FUNCTION IF EXISTS topshot.player_movers(int);

-- Helper: a single MV creation pattern reused across the three windows.
-- Each MV holds gainers + losers ranked by pct_change.

CREATE MATERIALIZED VIEW IF NOT EXISTS topshot.mv_player_movers_15d AS
WITH t AS (
    SELECT tx.completed_at, tx.gross_amount_usd, e.player_id
    FROM topshot.transactions tx
    JOIN topshot.moments m  ON m.moment_id = tx.moment_id
    JOIN topshot.editions e ON e.edition_id = m.edition_id
    WHERE tx.transaction_state_id = 'SUCCEEDED'
      AND tx.completed_at IS NOT NULL
      AND tx.gross_amount_usd > 0
      AND tx.completed_at >= NOW() - INTERVAL '30 days'
      AND e.player_id IS NOT NULL
),
recent_agg AS (
    SELECT player_id,
           AVG(gross_amount_usd) AS avg_recent,
           SUM(gross_amount_usd) AS volume_recent,
           COUNT(*) AS tx_recent
    FROM t
    WHERE completed_at >= NOW() - INTERVAL '15 days'
    GROUP BY player_id
    HAVING COUNT(*) >= 5
),
prior_agg AS (
    SELECT player_id,
           AVG(gross_amount_usd) AS avg_prior,
           COUNT(*) AS tx_prior
    FROM t
    WHERE completed_at <  NOW() - INTERVAL '15 days'
      AND completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY player_id
    HAVING COUNT(*) >= 5
)
SELECT
    pl.player_id,
    pl.full_name AS player_name,
    pl.last_known_team_full_name AS team_name,
    r.avg_recent AS avg_recent_usd,
    p.avg_prior AS avg_prior_usd,
    ((r.avg_recent - p.avg_prior) / NULLIF(p.avg_prior, 0)) * 100 AS pct_change,
    r.tx_recent AS tx_count_recent,
    p.tx_prior AS tx_count_prior,
    r.volume_recent AS volume_recent_usd,
    now() AS refreshed_at
FROM recent_agg r
JOIN prior_agg p ON p.player_id = r.player_id
JOIN topshot.players pl ON pl.player_id = r.player_id
WHERE p.avg_prior > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_movers_15d_player_id
    ON topshot.mv_player_movers_15d (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_movers_15d_pct
    ON topshot.mv_player_movers_15d (pct_change DESC NULLS LAST);

CREATE MATERIALIZED VIEW IF NOT EXISTS topshot.mv_player_movers_30d AS
WITH t AS (
    SELECT tx.completed_at, tx.gross_amount_usd, e.player_id
    FROM topshot.transactions tx
    JOIN topshot.moments m  ON m.moment_id = tx.moment_id
    JOIN topshot.editions e ON e.edition_id = m.edition_id
    WHERE tx.transaction_state_id = 'SUCCEEDED'
      AND tx.completed_at IS NOT NULL
      AND tx.gross_amount_usd > 0
      AND tx.completed_at >= NOW() - INTERVAL '60 days'
      AND e.player_id IS NOT NULL
),
recent_agg AS (
    SELECT player_id,
           AVG(gross_amount_usd) AS avg_recent,
           SUM(gross_amount_usd) AS volume_recent,
           COUNT(*) AS tx_recent
    FROM t
    WHERE completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY player_id
    HAVING COUNT(*) >= 5
),
prior_agg AS (
    SELECT player_id,
           AVG(gross_amount_usd) AS avg_prior,
           COUNT(*) AS tx_prior
    FROM t
    WHERE completed_at <  NOW() - INTERVAL '30 days'
      AND completed_at >= NOW() - INTERVAL '60 days'
    GROUP BY player_id
    HAVING COUNT(*) >= 5
)
SELECT
    pl.player_id,
    pl.full_name AS player_name,
    pl.last_known_team_full_name AS team_name,
    r.avg_recent AS avg_recent_usd,
    p.avg_prior AS avg_prior_usd,
    ((r.avg_recent - p.avg_prior) / NULLIF(p.avg_prior, 0)) * 100 AS pct_change,
    r.tx_recent AS tx_count_recent,
    p.tx_prior AS tx_count_prior,
    r.volume_recent AS volume_recent_usd,
    now() AS refreshed_at
FROM recent_agg r
JOIN prior_agg p ON p.player_id = r.player_id
JOIN topshot.players pl ON pl.player_id = r.player_id
WHERE p.avg_prior > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_movers_30d_player_id
    ON topshot.mv_player_movers_30d (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_movers_30d_pct
    ON topshot.mv_player_movers_30d (pct_change DESC NULLS LAST);

CREATE MATERIALIZED VIEW IF NOT EXISTS topshot.mv_player_movers_90d AS
WITH t AS (
    SELECT tx.completed_at, tx.gross_amount_usd, e.player_id
    FROM topshot.transactions tx
    JOIN topshot.moments m  ON m.moment_id = tx.moment_id
    JOIN topshot.editions e ON e.edition_id = m.edition_id
    WHERE tx.transaction_state_id = 'SUCCEEDED'
      AND tx.completed_at IS NOT NULL
      AND tx.gross_amount_usd > 0
      AND tx.completed_at >= NOW() - INTERVAL '180 days'
      AND e.player_id IS NOT NULL
),
recent_agg AS (
    SELECT player_id,
           AVG(gross_amount_usd) AS avg_recent,
           SUM(gross_amount_usd) AS volume_recent,
           COUNT(*) AS tx_recent
    FROM t
    WHERE completed_at >= NOW() - INTERVAL '90 days'
    GROUP BY player_id
    HAVING COUNT(*) >= 5
),
prior_agg AS (
    SELECT player_id,
           AVG(gross_amount_usd) AS avg_prior,
           COUNT(*) AS tx_prior
    FROM t
    WHERE completed_at <  NOW() - INTERVAL '90 days'
      AND completed_at >= NOW() - INTERVAL '180 days'
    GROUP BY player_id
    HAVING COUNT(*) >= 5
)
SELECT
    pl.player_id,
    pl.full_name AS player_name,
    pl.last_known_team_full_name AS team_name,
    r.avg_recent AS avg_recent_usd,
    p.avg_prior AS avg_prior_usd,
    ((r.avg_recent - p.avg_prior) / NULLIF(p.avg_prior, 0)) * 100 AS pct_change,
    r.tx_recent AS tx_count_recent,
    p.tx_prior AS tx_count_prior,
    r.volume_recent AS volume_recent_usd,
    now() AS refreshed_at
FROM recent_agg r
JOIN prior_agg p ON p.player_id = r.player_id
JOIN topshot.players pl ON pl.player_id = r.player_id
WHERE p.avg_prior > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_player_movers_90d_player_id
    ON topshot.mv_player_movers_90d (player_id);
CREATE INDEX IF NOT EXISTS idx_mv_player_movers_90d_pct
    ON topshot.mv_player_movers_90d (pct_change DESC NULLS LAST);

GRANT SELECT ON topshot.mv_player_movers_15d, topshot.mv_player_movers_30d, topshot.mv_player_movers_90d
    TO anon, authenticated, service_role;
