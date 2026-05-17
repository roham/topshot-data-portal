-- =============================================================================
-- 0013 — topshot.player_movers(window_days int): meme-coin style movers RPC.
--
-- Per Roham 2026-05-17 20:45Z: "What about a top movers section highlighting
-- biggest changes over last 15/30/90 days? Color coded the way a meme coin
-- tracking site would show."
--
-- For each player, compute:
--   - avg_recent = AVG(gross_amount_usd) over [now - N days, now]
--   - avg_prior  = AVG(gross_amount_usd) over [now - 2N days, now - N days]
--   - pct_change = (recent - prior) / prior * 100
--   - latest_volume = SUM in the recent window
-- Filter: ≥ 5 tx in BOTH windows (signal threshold; suppresses noise).
--
-- Returns 60 rows (30 biggest gainers + 30 biggest losers) ordered by
-- absolute pct_change descending. Caller can slice further client-side.
--
-- Data path: transactions JOIN moments JOIN editions (for player_id) on the
-- live-tx table. Window is wall-clock, not data-snapshot — completed_at is
-- the canonical event timestamp.
--
-- All reads from topshot.* Supabase — no live BQ at request time. Function
-- is STABLE (no side effects), SECURITY DEFINER so anon role can call via
-- PostgREST /rest/v1/rpc/player_movers.
-- =============================================================================

CREATE OR REPLACE FUNCTION topshot.player_movers(window_days int)
RETURNS TABLE (
    player_id          text,
    player_name        text,
    team_name          text,
    avg_recent_usd     numeric,
    avg_prior_usd      numeric,
    pct_change         numeric,
    tx_count_recent    bigint,
    tx_count_prior     bigint,
    volume_recent_usd  numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = topshot, public
AS $$
    WITH t AS (
        SELECT
            tx.completed_at,
            tx.gross_amount_usd,
            e.player_id
        FROM topshot.transactions tx
        JOIN topshot.moments m ON m.moment_id = tx.moment_id
        JOIN topshot.editions e ON e.edition_id = m.edition_id
        WHERE tx.transaction_state_id = 'SUCCEEDED'
          AND tx.completed_at IS NOT NULL
          AND tx.gross_amount_usd > 0
          AND tx.completed_at >= NOW() - (window_days * 2 || ' days')::interval
          AND e.player_id IS NOT NULL
    ),
    recent_agg AS (
        SELECT
            player_id,
            AVG(gross_amount_usd) AS avg_recent,
            SUM(gross_amount_usd) AS volume_recent,
            COUNT(*) AS tx_recent
        FROM t
        WHERE completed_at >= NOW() - (window_days || ' days')::interval
        GROUP BY player_id
        HAVING COUNT(*) >= 5
    ),
    prior_agg AS (
        SELECT
            player_id,
            AVG(gross_amount_usd) AS avg_prior,
            COUNT(*) AS tx_prior
        FROM t
        WHERE completed_at <  NOW() - (window_days     || ' days')::interval
          AND completed_at >= NOW() - (window_days * 2 || ' days')::interval
        GROUP BY player_id
        HAVING COUNT(*) >= 5
    ),
    joined AS (
        SELECT
            r.player_id,
            r.avg_recent,
            p.avg_prior,
            ((r.avg_recent - p.avg_prior) / NULLIF(p.avg_prior, 0)) * 100 AS pct_change,
            r.tx_recent,
            p.tx_prior,
            r.volume_recent
        FROM recent_agg r
        JOIN prior_agg p ON p.player_id = r.player_id
        WHERE p.avg_prior > 0
    ),
    ranked AS (
        SELECT
            j.*,
            row_number() OVER (ORDER BY j.pct_change DESC) AS gainer_rank,
            row_number() OVER (ORDER BY j.pct_change ASC)  AS loser_rank
        FROM joined j
    )
    SELECT
        pl.player_id,
        pl.full_name AS player_name,
        pl.last_known_team_full_name AS team_name,
        r.avg_recent AS avg_recent_usd,
        r.avg_prior AS avg_prior_usd,
        r.pct_change,
        r.tx_recent AS tx_count_recent,
        r.tx_prior AS tx_count_prior,
        r.volume_recent AS volume_recent_usd
    FROM ranked r
    JOIN topshot.players pl ON pl.player_id = r.player_id
    WHERE r.gainer_rank <= 30 OR r.loser_rank <= 30
    ORDER BY ABS(r.pct_change) DESC;
$$;

GRANT EXECUTE ON FUNCTION topshot.player_movers(int) TO anon, authenticated, service_role;

COMMENT ON FUNCTION topshot.player_movers(int) IS
    'Top movers (gainers + losers) over a given window. Returns 60 rows ordered by abs(pct_change) desc. window_days = 15 | 30 | 90 typical. Per-player avg sale recent vs prior. Filter: ≥5 tx both windows.';
