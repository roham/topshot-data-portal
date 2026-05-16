-- 0002_topshot_init_tables.sql
-- NBA Top Shot Data Portal — core tables.
--
-- Mirror of dapperlabs-data.production_sem_open.* with:
--   - PII columns dropped (country/province/IP/buyer_type_id/seller_type_id/buyer_is_guest)
--   - owner_user_id renamed to owner_flow_address (it's the public on-chain identifier)
--   - inserted_at / updated_at audit columns on every table
--
-- Type choices:
--   - TEXT for IDs (BQ exposes them as STRING; preserves leading zeros, hex, etc.)
--   - NUMERIC for money (avoid FLOAT rounding)
--   - TIMESTAMPTZ for all temporal columns
--   - Soft FKs (no ON DELETE CASCADE) — ETL upserts, never deletes
--
-- Apply after 0004.
--
-- Rollback:
--   Each table can be dropped individually, or the whole schema:
--   DROP SCHEMA topshot CASCADE;

-- =============================================================================
-- Helper: shared `updated_at` trigger function (reuses topshot schema)
-- =============================================================================
CREATE OR REPLACE FUNCTION topshot.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION topshot.set_updated_at() IS
    'BEFORE UPDATE trigger function. Bumps updated_at on every row mutation.';

-- =============================================================================
-- teams — current + historical team metadata
-- =============================================================================
CREATE TABLE topshot.teams (
    team_id                 text PRIMARY KEY,
    league                  text,
    team_name               text,
    team_alternate_name     text,
    team_safe_name          text,
    inserted_at             timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER teams_updated_at
    BEFORE UPDATE ON topshot.teams
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.teams IS
    'NBA teams (current roster). Source: asset_nba_team. team_id is stable across renames.';
COMMENT ON COLUMN topshot.teams.team_safe_name IS
    'Big Query safe name — stable URL-friendly slug for the team.';

-- =============================================================================
-- team_history — historical team naming (renames, relocations)
-- =============================================================================
CREATE TABLE topshot.team_history (
    team_id             text NOT NULL,
    full_name           text NOT NULL,
    alternate_name      text,
    current_full_name   text,
    safe_name           text,
    league              text,
    first_year          integer,
    last_year           integer,
    is_current_name     boolean,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, full_name)
);

CREATE TRIGGER team_history_updated_at
    BEFORE UPDATE ON topshot.team_history
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.team_history IS
    'Historical team names. A single team_id may have multiple rows across rename eras (e.g., Charlotte Bobcats → Hornets). Source: asset_nba_team_history.';

-- =============================================================================
-- players — player metadata
-- =============================================================================
CREATE TABLE topshot.players (
    player_id                       text PRIMARY KEY,
    full_name                       text,
    first_name                      text,
    last_name                       text,
    league                          text,
    last_known_team_id              text REFERENCES topshot.teams(team_id),
    last_known_team_full_name       text,
    last_known_primary_position     text,
    draft_year                      text,
    draft_round                     text,
    draft_selection                 text,
    draft_team_team_id              text REFERENCES topshot.teams(team_id),
    draft_team_full_name            text,
    birthplace                      text,
    birthdate                       timestamptz,
    date_of_first_play              timestamptz,
    date_of_last_play               timestamptz,
    first_minted_moment_date        timestamptz,
    last_minted_moment_date         timestamptz,
    inserted_at                     timestamptz NOT NULL DEFAULT now(),
    updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER players_updated_at
    BEFORE UPDATE ON topshot.players
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.players IS
    'Player metadata. Source: asset_nba_player. Includes draft history and Top Shot mint span dates.';
COMMENT ON COLUMN topshot.players.first_minted_moment_date IS
    'Date of the earliest Top Shot Moment minted of this player. Useful for "rookie card" / "first appearance" ranking.';

-- =============================================================================
-- plays — the underlying moment-of-action (one play may have many editions/moments)
-- =============================================================================
CREATE TABLE topshot.plays (
    play_id                             text PRIMARY KEY,
    play_name                           text,
    play_focus                          text,
    play_category                       text,
    play_type                           text,
    play_status                         text
        CHECK (play_status IS NULL OR play_status IN ('RECEIVED','APPROVED','PUBLISHED','REJECTED')),
    version                             text,
    date_of_play                        timestamptz,
    league                              text,
    season_code                         text,
    season_name                         text,
    description                         text,
    short_description                   text,
    override_headline                   text,
    player_id                           text REFERENCES topshot.players(player_id),
    player_name                         text,
    player_first_name                   text,
    player_last_name                    text,
    player_last_known_team_id           text REFERENCES topshot.teams(team_id),
    player_last_known_current_team_name text,
    jersey_number_at_moment             text,
    primary_position_at_moment          text,
    team_at_moment_team_id              text REFERENCES topshot.teams(team_id),
    team_at_moment_historical_name      text,
    team_at_moment_current_name         text,
    home_team_team_id                   text REFERENCES topshot.teams(team_id),
    home_team_historical_name           text,
    home_team_current_name              text,
    away_team_team_id                   text REFERENCES topshot.teams(team_id),
    away_team_historical_name           text,
    away_team_current_name              text,
    home_team_score                     integer,
    away_team_score                     integer,
    key_stats                           text[],
    image_urls                          text[],
    video_urls                          jsonb,
    inserted_at                         timestamptz NOT NULL DEFAULT now(),
    updated_at                          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER plays_updated_at
    BEFORE UPDATE ON topshot.plays
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.plays IS
    'Source highlight-play record. One play may back many editions (Common + Rare + Legendary parallels). Source: asset_nba_play.';
COMMENT ON COLUMN topshot.plays.play_status IS
    'Lifecycle status from data team. PUBLISHED = live in app.';
COMMENT ON COLUMN topshot.plays.video_urls IS
    'BQ REPEATED RECORD<url, video_length_miliseconds>. Stored as jsonb array of objects.';
COMMENT ON COLUMN topshot.plays.key_stats IS
    'Stat lines from the play (BQ REPEATED STRING).';

-- =============================================================================
-- sets — collections of editions (Series 1, 2, ..., 5 + Anthology, etc.)
-- =============================================================================
CREATE TABLE topshot.sets (
    set_id              text PRIMARY KEY,
    set_name            text,
    set_flow_id         text,
    series_number       integer,
    series_name         text,
    version             text,
    primary_league      text,
    secondary_league    text,
    leagues             text[],
    description         text,
    is_locked           boolean,
    is_minted           boolean,
    is_hidden           boolean,
    set_tier_id         text,
    set_tier_name       text,
    set_rarity          integer,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER sets_updated_at
    BEFORE UPDATE ON topshot.sets
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.sets IS
    'Top Shot Sets (e.g. "Base Set", "Metallic Gold LE", "Anthology"). Source: asset_nba_set.';
COMMENT ON COLUMN topshot.sets.set_tier_name IS
    'Tier label of the set itself (distinct from per-edition tier). Examples: Common, Fandom, Rare, Legendary, Ultimate, Anthology.';

-- =============================================================================
-- editions — (set x play) instances; the "card" SKU before serial assignment
-- =============================================================================
CREATE TABLE topshot.editions (
    edition_id                          text PRIMARY KEY,
    edition_name                        text,
    set_id                              text REFERENCES topshot.sets(set_id),
    play_id                             text REFERENCES topshot.plays(play_id),
    series_name                         text,
    description                         text,
    short_description                   text,
    mint_count                          integer,
    play_focus                          text,
    league                              text,
    player_id                           text REFERENCES topshot.players(player_id),
    player_name                         text,
    team_at_moment_team_id              text REFERENCES topshot.teams(team_id),
    team_at_moment_historical_name      text,
    team_at_moment_current_name         text,
    tier_id                             text,
    tier_name                           text
        CHECK (tier_name IS NULL OR tier_name IN ('Common','Fandom','Rare','Legendary','Ultimate','Anthology')),
    rarity                              integer,
    image_urls                          text[],
    video_urls                          jsonb,
    inserted_at                         timestamptz NOT NULL DEFAULT now(),
    updated_at                          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER editions_updated_at
    BEFORE UPDATE ON topshot.editions
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.editions IS
    'Edition = (set, play) pair. The minted-card SKU. Each edition has 1..N moments (individual serials). Source: asset_nba_edition.';
COMMENT ON COLUMN topshot.editions.mint_count IS
    'Circulation count (max serial number). Source field is mint_count.';
COMMENT ON COLUMN topshot.editions.tier_name IS
    'Edition tier. CHECK constraint mirrors live BQ distinct values as of 2026-05-15.';

-- =============================================================================
-- moments — individual Top Shot Moments (NFTs); one per serial number
-- =============================================================================
CREATE TABLE topshot.moments (
    moment_id               text PRIMARY KEY,
    moment_name             text,
    moment_flow_id          text,
    edition_id              text REFERENCES topshot.editions(edition_id),
    subedition_id           text,
    edition_name            text,
    serial_number           integer,
    owner_flow_address      text,
    top_shot_score          numeric,
    moment_status           text
        CHECK (moment_status IS NULL OR moment_status IN ('MINTED','LISTED','LOCKED','BURNED','IN_PACK','LOCKER_ROOM','UNLOCKED')),
    released_at             timestamptz,
    locked_at               timestamptz,
    lock_expires_at         timestamptz,
    unlocked_at             timestamptz,
    burned_at               timestamptz,
    listed_at               timestamptz,
    listing_price_usd       numeric,
    set_id                  text REFERENCES topshot.sets(set_id),
    set_name                text,
    play_id                 text REFERENCES topshot.plays(play_id),
    play_name               text,
    pack_id                 text,
    pack_name               text,
    pack_listing_id         text,
    description             text,
    short_description       text,
    series_name             text,
    league                  text,
    last_updated_at         timestamptz,
    inserted_at             timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER moments_updated_at
    BEFORE UPDATE ON topshot.moments
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.moments IS
    'Individual NFT moments. moment_id is the Dapper-internal id; moment_flow_id is the on-chain id. owner_flow_address is the public Flow chain owner — explicitly the public on-chain identifier (renamed from BQ owner_user_id for clarity).';
COMMENT ON COLUMN topshot.moments.owner_flow_address IS
    'Public Flow blockchain owner address. Same as BQ owner_user_id but renamed for explicitness — this value is observable on-chain.';
COMMENT ON COLUMN topshot.moments.moment_status IS
    'Lifecycle status. Live BQ distinct values (2026-05-15): MINTED, LOCKED, BURNED. LISTED/IN_PACK/LOCKER_ROOM/UNLOCKED reserved for derived states the ETL may compute.';
COMMENT ON COLUMN topshot.moments.top_shot_score IS
    'TS Score — Dapper-published serial-quality score (lower serial / matching jersey number / first-mint bonus).';
COMMENT ON COLUMN topshot.moments.listing_price_usd IS
    'Active listing price in USD. NULL = not currently listed.';
COMMENT ON COLUMN topshot.moments.last_updated_at IS
    'Source-system last update (BQ updated_at). Distinct from `updated_at`, which tracks Supabase row mutation.';

-- =============================================================================
-- transactions — peer-to-peer + primary + pack sales involving moments
-- =============================================================================
CREATE TABLE topshot.transactions (
    transaction_id                  text PRIMARY KEY,
    moment_id                       text REFERENCES topshot.moments(moment_id),
    asset_type_id                   text,
    transaction_type_id             text
        CHECK (transaction_type_id IS NULL OR transaction_type_id IN ('P2P','OFFER','DIRECT','TICKET','GIFT','AIR')),
    transaction_state_id            text
        CHECK (transaction_state_id IS NULL OR transaction_state_id IN ('SUCCEEDED','PENDING','CANCELLED','FAILED','UNKNOWN','UNMAPPED')),
    platform                        text,
    buyer_safe_name                 text,
    seller_safe_name                text,
    client_marketplace_id           text,
    client_marketplace_safe_name    text,
    amount                          numeric,
    currency                        text,
    gross_amount_usd                numeric,
    net_amount_usd                  numeric,
    list_price_usd                  numeric,
    discount_amount_usd             numeric,
    discount_type                   text,
    promo_code                      text,
    is_preorder                     boolean,
    has_payment                     boolean,
    payment_type                    text,
    completed_at                    timestamptz,
    offer_created_at                timestamptz,
    source_updated_at               timestamptz,
    row_updated_at                  timestamptz,
    inserted_at                     timestamptz NOT NULL DEFAULT now(),
    updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON topshot.transactions
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.transactions IS
    'Transactions involving NBA Top Shot moments (P2P, OFFER, DIRECT primary, pack purchases as filtered by ETL). Source: transaction filtered to asset_type_id=MOMENT. PII (country/province/buyer_id/seller_id/buyer_type_id/buyer_is_guest) dropped at ETL time.';
COMMENT ON COLUMN topshot.transactions.transaction_type_id IS
    'P2P=peer-to-peer secondary, OFFER=collector offer accepted, DIRECT=primary sale, TICKET=ticketed drop entry, GIFT=user-to-user transfer, AIR=airdrop.';
COMMENT ON COLUMN topshot.transactions.transaction_state_id IS
    'Terminal: SUCCEEDED, CANCELLED, FAILED. Non-terminal: PENDING, UNKNOWN, UNMAPPED. ETL only ingests SUCCEEDED for revenue analytics by default (other states available for forensics).';
COMMENT ON COLUMN topshot.transactions.buyer_safe_name IS
    'Public TS username of buyer. Already public on Top Shot site. Internal buyer_id NOT mirrored here.';
COMMENT ON COLUMN topshot.transactions.seller_safe_name IS
    'Public TS username of seller. Already public on Top Shot site. Internal seller_id NOT mirrored here.';
COMMENT ON COLUMN topshot.transactions.source_updated_at IS
    'Source-system last update — when the transaction last changed in the backend (BQ updated_at).';
COMMENT ON COLUMN topshot.transactions.row_updated_at IS
    'Data-platform ETL cursor — when the row last changed in BQ (BQ row_updated_at). USE THIS as the incremental ETL high-watermark.';
COMMENT ON COLUMN topshot.transactions.client_marketplace_safe_name IS
    'Distinguishes marketplaces (e.g. Top Shot proper vs Gaia vs Flunks). Use for marketplace-volume breakdowns.';

-- =============================================================================
-- market_caps — daily per-edition market-cap rollup from BQ
-- =============================================================================
CREATE TABLE topshot.market_caps (
    date                            date NOT NULL,
    edition_id                      text NOT NULL REFERENCES topshot.editions(edition_id),
    num_moments_in_circulation      integer,
    lowest_ask_price                numeric,
    highest_offer_price             numeric,
    market_cap                      numeric,
    inserted_at                     timestamptz NOT NULL DEFAULT now(),
    updated_at                      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (date, edition_id)
);

CREATE TRIGGER market_caps_updated_at
    BEFORE UPDATE ON topshot.market_caps
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.market_caps IS
    'Daily per-edition market-cap snapshot. Source: asset_nba_market_caps. PK (date, edition_id).';
COMMENT ON COLUMN topshot.market_caps.market_cap IS
    'Aggregate market cap for this edition on this date (typically circulation * lowest_ask).';

-- =============================================================================
-- packs — pack SKUs
-- =============================================================================
CREATE TABLE topshot.packs (
    pack_id                 text PRIMARY KEY,
    pack_listing_id         text,
    pack_flow_id            text,
    drop_id                 text,
    reservation_id          text,
    version                 text,
    pack_name               text,
    description             text,
    image_url               text,
    is_starter_pack         boolean,
    is_reward               boolean,
    max_order_quantity      integer,
    moments_per_pack        integer,
    total_packs             integer,
    total_moments           integer,
    pack_status             text
        CHECK (pack_status IS NULL OR pack_status IN ('SEALED','OPENED')),
    opened_at               timestamptz,
    fulfillment_tx_hash     text,
    is_preorder             boolean,
    price                   numeric,
    currency                text,
    leagues                 text[],
    primary_league          text,
    secondary_league        text,
    gated_criteria          text,
    sale_type               text,
    pack_tier_id            text,
    pack_tier_name          text,
    pack_rarity             integer,
    started_at              timestamptz,
    expired_at              timestamptz,
    container_pack_id       text,
    is_container            boolean,
    inserted_at             timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER packs_updated_at
    BEFORE UPDATE ON topshot.packs
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.packs IS
    'Top Shot packs (SKU level). Source: asset_nba_pack. Linked to drops via drop_id and to moments via pack_id on moments table.';

-- =============================================================================
-- drops — pack drops (the marketing/sales event)
-- =============================================================================
CREATE TABLE topshot.drops (
    drop_id                 text PRIMARY KEY,
    started_at              timestamptz,
    expired_at              timestamptz,
    drop_duration_type      text,
    is_active               boolean,
    has_preorders           boolean,
    total_pack_listings     integer,
    total_packs             integer,
    total_moments           integer,
    percent_reserved_packs  numeric,
    is_queued               boolean,
    inserted_at             timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER drops_updated_at
    BEFORE UPDATE ON topshot.drops
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.drops IS
    'Drop events (the marketing window during which packs are sold). Source: asset_nba_drop.';

-- =============================================================================
-- series — lightweight series lookup
-- =============================================================================
CREATE TABLE topshot.series (
    series_number       integer PRIMARY KEY,
    series_name         text,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER series_updated_at
    BEFORE UPDATE ON topshot.series
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.series IS
    'Top Shot series (e.g. Series 1, 2, 3, 4). Source: asset_nba_series.';

-- =============================================================================
-- play_categories — lookup
-- =============================================================================
CREATE TABLE topshot.play_categories (
    play_category       text PRIMARY KEY,
    play_category_name  text,
    play_types          text[],
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER play_categories_updated_at
    BEFORE UPDATE ON topshot.play_categories
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.play_categories IS
    'Play category lookup (e.g. Handles, Jams). Source: asset_nba_play_category.';

-- =============================================================================
-- play_types — lookup
-- =============================================================================
CREATE TABLE topshot.play_types (
    play_type           text PRIMARY KEY,
    play_type_name      text,
    play_category       text REFERENCES topshot.play_categories(play_category),
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER play_types_updated_at
    BEFORE UPDATE ON topshot.play_types
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.play_types IS
    'Play type lookup (e.g. Block, Steal, Three-Pointer). Source: asset_nba_play_type.';

-- =============================================================================
-- positions — lookup
-- =============================================================================
CREATE TABLE topshot.positions (
    position            text PRIMARY KEY,
    position_name       text,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER positions_updated_at
    BEFORE UPDATE ON topshot.positions
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.positions IS
    'Player position lookup (PG, SG, SF, PF, C, etc.). Source: asset_nba_position.';

-- =============================================================================
-- seasons — lookup
-- =============================================================================
CREATE TABLE topshot.seasons (
    season_code         text PRIMARY KEY,
    season_name         text,
    league              text,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER seasons_updated_at
    BEFORE UPDATE ON topshot.seasons
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.seasons IS
    'Season lookup (e.g. 2020-21, 2021-22). Source: asset_nba_season.';

-- =============================================================================
-- play_statuses — lookup
-- =============================================================================
CREATE TABLE topshot.play_statuses (
    play_status         text PRIMARY KEY,
    play_status_code    integer,
    play_status_name    text,
    description         text,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER play_statuses_updated_at
    BEFORE UPDATE ON topshot.play_statuses
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.play_statuses IS
    'Play lifecycle status lookup. Source: asset_nba_play_status.';

-- =============================================================================
-- etl_runs — audit log for the ETL cron itself
-- =============================================================================
CREATE TABLE topshot.etl_runs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          timestamptz NOT NULL DEFAULT now(),
    finished_at         timestamptz,
    status              text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','succeeded','failed','partial')),
    table_name          text,
    rows_upserted       bigint,
    rows_failed         bigint,
    high_watermark      timestamptz,
    error_message       text,
    notes               text,
    inserted_at         timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER etl_runs_updated_at
    BEFORE UPDATE ON topshot.etl_runs
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.etl_runs IS
    'Audit log per ETL cron invocation. One row per (run, target_table). high_watermark stores the row_updated_at value processed up to, used as the next run cursor.';
