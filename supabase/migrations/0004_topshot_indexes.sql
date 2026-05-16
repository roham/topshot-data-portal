-- 0004_topshot_indexes.sql
-- Indexes for the topshot schema — covers every column that powers a portal
-- filter, sort, or join under realistic load.
--
-- Apply after 0006.
--
-- Rollback: drop indexes individually (`DROP INDEX topshot.<name>`); or
-- `DROP SCHEMA topshot CASCADE` removes them with the tables.

-- =============================================================================
-- transactions — heaviest table; the recent-trades / leaderboard / per-user
-- query surface lives here.
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tx_updated_at
    ON topshot.transactions (source_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_row_updated_at
    ON topshot.transactions (row_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_moment_id
    ON topshot.transactions (moment_id);
CREATE INDEX IF NOT EXISTS idx_tx_buyer_safe_name
    ON topshot.transactions (buyer_safe_name);
CREATE INDEX IF NOT EXISTS idx_tx_seller_safe_name
    ON topshot.transactions (seller_safe_name);
CREATE INDEX IF NOT EXISTS idx_tx_type_state
    ON topshot.transactions (transaction_type_id, transaction_state_id);
CREATE INDEX IF NOT EXISTS idx_tx_gross_amount
    ON topshot.transactions (gross_amount_usd DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tx_marketplace
    ON topshot.transactions (client_marketplace_safe_name);
CREATE INDEX IF NOT EXISTS idx_tx_completed_at
    ON topshot.transactions (completed_at DESC NULLS LAST);

COMMENT ON INDEX topshot.idx_tx_updated_at IS
    'Powers "recent transactions" feeds. source_updated_at DESC is the canonical wall-clock timestamp for trade events.';
COMMENT ON INDEX topshot.idx_tx_row_updated_at IS
    'ETL cursor index — incremental fetcher uses MAX(row_updated_at) as the high-watermark.';
COMMENT ON INDEX topshot.idx_tx_gross_amount IS
    'Powers "largest sales" leaderboards.';

-- =============================================================================
-- moments — the per-NFT detail / listing / portfolio surface
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_moments_edition_id
    ON topshot.moments (edition_id);
CREATE INDEX IF NOT EXISTS idx_moments_owner
    ON topshot.moments (owner_flow_address);
CREATE INDEX IF NOT EXISTS idx_moments_set_id
    ON topshot.moments (set_id);
CREATE INDEX IF NOT EXISTS idx_moments_play_id
    ON topshot.moments (play_id);
CREATE INDEX IF NOT EXISTS idx_moments_status
    ON topshot.moments (moment_status);
CREATE INDEX IF NOT EXISTS idx_moments_top_shot_score
    ON topshot.moments (top_shot_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_moments_serial
    ON topshot.moments (serial_number);

-- Partial index for active listings only — small fraction of total moments,
-- but the hottest query path (the "marketplace").
CREATE INDEX IF NOT EXISTS idx_moments_listed
    ON topshot.moments (listed_at DESC)
    WHERE listed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moments_listing_price
    ON topshot.moments (listing_price_usd ASC NULLS LAST)
    WHERE listing_price_usd IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moments_listed_edition
    ON topshot.moments (edition_id, listing_price_usd ASC NULLS LAST)
    WHERE listing_price_usd IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moments_pack_id
    ON topshot.moments (pack_id)
    WHERE pack_id IS NOT NULL;

COMMENT ON INDEX topshot.idx_moments_listed IS
    'Partial index — only currently-listed moments. Powers "for sale" feeds.';
COMMENT ON INDEX topshot.idx_moments_listing_price IS
    'Partial index — only listed moments. Sorted ascending for "cheapest" queries.';
COMMENT ON INDEX topshot.idx_moments_listed_edition IS
    'Composite for "cheapest listed in edition X" — the per-edition floor-price query.';

-- =============================================================================
-- editions — moderately hot; per-set/per-play lookups
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_editions_set_id
    ON topshot.editions (set_id);
CREATE INDEX IF NOT EXISTS idx_editions_play_id
    ON topshot.editions (play_id);
CREATE INDEX IF NOT EXISTS idx_editions_player_id
    ON topshot.editions (player_id);
CREATE INDEX IF NOT EXISTS idx_editions_tier
    ON topshot.editions (tier_name);
CREATE INDEX IF NOT EXISTS idx_editions_team_id
    ON topshot.editions (team_at_moment_team_id);

-- =============================================================================
-- plays — per-player / per-team / per-category filters
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_plays_player_id
    ON topshot.plays (player_id);
CREATE INDEX IF NOT EXISTS idx_plays_team_id
    ON topshot.plays (team_at_moment_team_id);
CREATE INDEX IF NOT EXISTS idx_plays_home_team
    ON topshot.plays (home_team_team_id);
CREATE INDEX IF NOT EXISTS idx_plays_away_team
    ON topshot.plays (away_team_team_id);
CREATE INDEX IF NOT EXISTS idx_plays_category
    ON topshot.plays (play_category);
CREATE INDEX IF NOT EXISTS idx_plays_type
    ON topshot.plays (play_type);
CREATE INDEX IF NOT EXISTS idx_plays_season
    ON topshot.plays (season_code);
CREATE INDEX IF NOT EXISTS idx_plays_status
    ON topshot.plays (play_status);
CREATE INDEX IF NOT EXISTS idx_plays_date
    ON topshot.plays (date_of_play DESC NULLS LAST);

-- =============================================================================
-- players — name search + team filter
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_players_team_id
    ON topshot.players (last_known_team_id);
CREATE INDEX IF NOT EXISTS idx_players_full_name
    ON topshot.players (full_name);
-- Case-insensitive prefix search for typeahead (lower(full_name))
CREATE INDEX IF NOT EXISTS idx_players_full_name_lower
    ON topshot.players (lower(full_name) text_pattern_ops);

COMMENT ON INDEX topshot.idx_players_full_name_lower IS
    'text_pattern_ops opclass enables prefix LIKE for typeahead — e.g. lower(full_name) LIKE ''leb%''.';

-- =============================================================================
-- sets — series + tier filters
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sets_series_number
    ON topshot.sets (series_number);
CREATE INDEX IF NOT EXISTS idx_sets_tier
    ON topshot.sets (set_tier_name);

-- =============================================================================
-- market_caps — time series
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_marketcaps_date
    ON topshot.market_caps (date DESC);
CREATE INDEX IF NOT EXISTS idx_marketcaps_edition
    ON topshot.market_caps (edition_id, date DESC);

COMMENT ON INDEX topshot.idx_marketcaps_edition IS
    'Composite for per-edition time-series chart queries (one edition, last N days).';

-- =============================================================================
-- packs / drops
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_packs_drop_id
    ON topshot.packs (drop_id);
CREATE INDEX IF NOT EXISTS idx_packs_status
    ON topshot.packs (pack_status);
CREATE INDEX IF NOT EXISTS idx_packs_started_at
    ON topshot.packs (started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_packs_tier
    ON topshot.packs (pack_tier_name);

CREATE INDEX IF NOT EXISTS idx_drops_started_at
    ON topshot.drops (started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_drops_is_active
    ON topshot.drops (is_active)
    WHERE is_active = true;

-- =============================================================================
-- team_history — for relocations/renames
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_team_history_team_id
    ON topshot.team_history (team_id);

-- =============================================================================
-- etl_runs — operator dashboards
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_etl_runs_started_at
    ON topshot.etl_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_etl_runs_status
    ON topshot.etl_runs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_etl_runs_table
    ON topshot.etl_runs (table_name, started_at DESC);
