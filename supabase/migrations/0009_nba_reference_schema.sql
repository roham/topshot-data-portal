-- 0009_nba_reference_schema.sql
-- NBA Reference encyclopedia — second schema in this Supabase project (alongside topshot).
--
-- INTERNAL USE ONLY — non-commercial. NOT exposed via the public PostgREST surface.
-- No Sportradar data. No Second Spectrum tracking data. No commercial-API columns.
-- See docs/nba-reference/risks.md for the contractual line we cannot cross.
--
-- Conventions mirrored from 0002_topshot_init_tables.sql:
--   - schema-qualified DDL
--   - TEXT for source-system string IDs and Wikidata Q-numbers
--   - BIGINT for NBA-stats numeric IDs (e.g. 2544 = LeBron) where the upstream value is integer
--   - NUMERIC for shot coords, vote shares, salaries
--   - TIMESTAMPTZ for every temporal column
--   - inserted_at / updated_at audit columns + BEFORE UPDATE trigger
--   - Soft FKs (no ON DELETE CASCADE) — ETL upserts, never deletes
--   - CHECK constraints inline where the enum is bounded
--
-- Apply via Supabase CLI from the topshot-data-portal repo root:
--   supabase db push
-- Or via Supabase MCP apply_migration.
--
-- =============================================================================
-- DOWN block (rollback)
-- =============================================================================
-- BEGIN;
-- DROP SCHEMA IF EXISTS nba_reference CASCADE;
-- COMMIT;
-- =============================================================================

BEGIN;

-- =============================================================================
-- Schema
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS nba_reference;

COMMENT ON SCHEMA nba_reference IS
    'NBA encyclopedia substrate — players/teams/games/plays/awards/draft/transactions/injuries/L2M/narratives plus a Wikidata Q-number entity-resolution spine and a Top Shot moment-join bridge. INTERNAL USE ONLY. No Sportradar data, no Second Spectrum tracking, no NBA Official Media Data. Hydrated by Lanes A/B/D/E/F under /Users/ro/dapper/nba-encyclopedia/.';

-- Restrict from anon/authenticated until a curated public surface is approved.
REVOKE ALL ON SCHEMA nba_reference FROM PUBLIC;
REVOKE ALL ON SCHEMA nba_reference FROM anon, authenticated;
GRANT USAGE ON SCHEMA nba_reference TO service_role;
-- USAGE for authenticated is granted in a future migration on a per-table basis
-- (and intentionally NOT granted to anon).

-- =============================================================================
-- Trigger function — mirrors topshot.set_updated_at(), local to this schema
-- so a CASCADE drop on nba_reference removes its plumbing cleanly.
-- =============================================================================
CREATE OR REPLACE FUNCTION nba_reference.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION nba_reference.set_updated_at() IS
    'BEFORE UPDATE trigger function. Bumps updated_at on every row mutation. Mirrors topshot.set_updated_at().';

-- =============================================================================
-- nba_qnumber_index — entity-resolution spine
-- One row per "real entity" (player, coach, team, arena). Wikidata Q-number is
-- the universal key; every other source-system identifier is a column.
-- Lane B (Wikidata SPARQL) is the primary owner; other lanes write only their
-- own ID column via partial upserts.
-- =============================================================================
CREATE TABLE nba_reference.nba_qnumber_index (
    qid                         text PRIMARY KEY
        CHECK (qid ~ '^Q[0-9]+$'),
    entity_type                 text NOT NULL
        CHECK (entity_type IN ('player','coach','referee','team','franchise','arena','league','award','season')),
    canonical_label             text,
    bbref_slug                  text,
    nba_stats_id                bigint,
    espn_id                     bigint,
    wikipedia_en_title          text,
    backpicks_id                text,
    cleaning_the_glass_id       text,
    pbpstats_id                 text,
    sportsdataio_id             text,
    -- Top Shot bridge: only set for entities that have a Top Shot counterpart.
    -- Strictly soft FK across schemas — Postgres can't enforce it cleanly when
    -- topshot is hydrated independently; ETL validates.
    top_shot_player_id          text,
    top_shot_team_id            text,
    notes                       text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_qnumber_index_updated_at
    BEFORE UPDATE ON nba_reference.nba_qnumber_index
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_qnumber_index IS
    'Entity-resolution spine. One row per real-world entity, keyed on Wikidata Q-number. Every other table that references a player/team should FK to qid here, not to source-system IDs directly. Lane B (Wikidata SPARQL) is the primary owner.';
COMMENT ON COLUMN nba_reference.nba_qnumber_index.top_shot_player_id IS
    'Soft cross-schema reference into topshot.players.player_id. Validated by Lane F, not enforced by Postgres FK.';
COMMENT ON COLUMN nba_reference.nba_qnumber_index.nba_stats_id IS
    'stats.nba.com numeric player/team id (e.g. 2544 = LeBron, 1610612747 = Lakers). bigint because upstream value is integer.';

-- =============================================================================
-- nba_seasons — by league era
-- BAA 1946-49, NBA 1949+, ABA 1967-76, WNBA 1997+, G-League (NBA D-League 2001-17, G-League 2017+).
-- =============================================================================
CREATE TABLE nba_reference.nba_seasons (
    season_id                   text PRIMARY KEY,
    league                      text NOT NULL
        CHECK (league IN ('BAA','NBA','ABA','WNBA','NBL','G_LEAGUE','D_LEAGUE')),
    season_year_start           integer NOT NULL,
    season_year_end             integer NOT NULL,
    season_label                text NOT NULL,
    regular_season_start        date,
    regular_season_end          date,
    playoffs_start              date,
    playoffs_end                date,
    finals_winner_qid           text REFERENCES nba_reference.nba_qnumber_index(qid),
    finals_loser_qid            text REFERENCES nba_reference.nba_qnumber_index(qid),
    finals_mvp_qid              text REFERENCES nba_reference.nba_qnumber_index(qid),
    notes                       text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    CHECK (season_year_end IN (season_year_start, season_year_start + 1))
);
CREATE TRIGGER nba_seasons_updated_at
    BEFORE UPDATE ON nba_reference.nba_seasons
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_seasons IS
    'One row per (league, season). season_id format: "<league>_<YYYY-YY>" (e.g. NBA_2024-25, BAA_1946-47).';

-- =============================================================================
-- nba_teams — franchise + current/historical team identity
-- =============================================================================
CREATE TABLE nba_reference.nba_teams (
    team_id                     text PRIMARY KEY,
    qid                         text REFERENCES nba_reference.nba_qnumber_index(qid),
    franchise_qid               text REFERENCES nba_reference.nba_qnumber_index(qid),
    league                      text NOT NULL
        CHECK (league IN ('BAA','NBA','ABA','WNBA','NBL','G_LEAGUE','D_LEAGUE')),
    nba_stats_team_id           bigint,
    bbref_slug                  text,
    current_name                text,
    historical_name             text,
    abbreviation                text,
    city                        text,
    state_province              text,
    country                     text,
    arena_qid                   text REFERENCES nba_reference.nba_qnumber_index(qid),
    arena_name                  text,
    first_season_id             text REFERENCES nba_reference.nba_seasons(season_id),
    last_season_id              text REFERENCES nba_reference.nba_seasons(season_id),
    is_active                   boolean NOT NULL DEFAULT true,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_teams_updated_at
    BEFORE UPDATE ON nba_reference.nba_teams
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_teams IS
    'Team-in-era identity. Each rename/relocation produces a new row; franchise_qid stays constant across the chain (e.g. Charlotte Hornets 1988-2002, New Orleans Hornets 2002-13, New Orleans Pelicans 2013+ share franchise_qid).';

-- =============================================================================
-- nba_team_history — franchise relocation/rename chain (denormalized for query)
-- =============================================================================
CREATE TABLE nba_reference.nba_team_history (
    franchise_qid               text NOT NULL REFERENCES nba_reference.nba_qnumber_index(qid),
    team_id                     text NOT NULL REFERENCES nba_reference.nba_teams(team_id),
    name                        text NOT NULL,
    city                        text,
    first_season_year_start     integer NOT NULL,
    last_season_year_start      integer,
    relocation_from_city        text,
    rename_reason               text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (franchise_qid, first_season_year_start)
);
CREATE TRIGGER nba_team_history_updated_at
    BEFORE UPDATE ON nba_reference.nba_team_history
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_team_history IS
    'Chronological franchise chain. Lookup by franchise_qid yields ordered name/city eras.';

-- =============================================================================
-- nba_players — biographical
-- =============================================================================
CREATE TABLE nba_reference.nba_players (
    player_id                   text PRIMARY KEY,
    qid                         text NOT NULL REFERENCES nba_reference.nba_qnumber_index(qid),
    nba_stats_player_id         bigint,
    bbref_slug                  text,
    espn_player_id              bigint,
    full_name                   text NOT NULL,
    first_name                  text,
    last_name                   text,
    common_name                 text,
    birth_date                  date,
    death_date                  date,
    birthplace_city             text,
    birthplace_country          text,
    height_cm                   numeric(5,1),
    height_in                   numeric(5,1),
    weight_kg                   numeric(5,1),
    weight_lb                   numeric(5,1),
    handedness                  text
        CHECK (handedness IS NULL OR handedness IN ('left','right','ambidextrous','unknown')),
    primary_position            text
        CHECK (primary_position IS NULL OR primary_position IN ('PG','SG','SF','PF','C','G','F','G-F','F-G','F-C','C-F')),
    positions                   text[],
    debut_date                  date,
    final_game_date             date,
    draft_qid                   text,
    is_hall_of_fame             boolean NOT NULL DEFAULT false,
    hof_class_year              integer,
    notes                       text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_players_updated_at
    BEFORE UPDATE ON nba_reference.nba_players
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_players IS
    'Player biography. qid is the universal join key; nba_stats_player_id / bbref_slug / espn_player_id are source-system identifiers used by individual ETL lanes.';
COMMENT ON COLUMN nba_reference.nba_players.player_id IS
    'Encyclopedia-internal player id. Format: "p_" || lowercase bbref_slug when available, otherwise "p_q" || qid stripped of Q-prefix.';

-- =============================================================================
-- nba_games — every game 1946-present
-- =============================================================================
CREATE TABLE nba_reference.nba_games (
    game_id                     text PRIMARY KEY,
    nba_stats_game_id           text,
    bbref_game_id               text,
    season_id                   text REFERENCES nba_reference.nba_seasons(season_id),
    game_date                   date NOT NULL,
    tip_off_at                  timestamptz,
    game_type                   text NOT NULL
        CHECK (game_type IN ('preseason','regular','play_in','playoffs','all_star','finals')),
    playoff_round               text
        CHECK (playoff_round IS NULL OR playoff_round IN ('first','conf_semis','conf_finals','finals')),
    home_team_id                text NOT NULL REFERENCES nba_reference.nba_teams(team_id),
    away_team_id                text NOT NULL REFERENCES nba_reference.nba_teams(team_id),
    home_score                  integer,
    away_score                  integer,
    venue_qid                   text REFERENCES nba_reference.nba_qnumber_index(qid),
    venue_name                  text,
    attendance                  integer,
    duration_minutes            integer,
    overtime_periods            integer NOT NULL DEFAULT 0,
    -- Officials: arrays of qid; positional [crew_chief, ref1, ref2]
    official_qids               text[],
    -- Betting line at tip — sourced from public archives (SportsbookReviewsOnline / The Odds API).
    -- This is independent reference data, NOT downstream from any league-licensed feed.
    closing_spread              numeric(5,2),
    closing_total               numeric(5,2),
    closing_home_ml             integer,
    closing_away_ml             integer,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_games_updated_at
    BEFORE UPDATE ON nba_reference.nba_games
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_games IS
    'One row per game. game_id format: "g_<season_year_start>_<bbref_game_id>" when bbref_game_id is known, else "g_<season_year_start>_<nba_stats_game_id>".';
COMMENT ON COLUMN nba_reference.nba_games.closing_spread IS
    'Closing point spread (home perspective; negative = home favored). Source: SportsbookReviewsOnline historical archive or The Odds API. NEVER Sportradar.';

-- =============================================================================
-- nba_plays — possession-level PBP 1996-present
-- Pre-1996 PBP does not exist in any public dataset. Do not synthesize it here.
-- =============================================================================
CREATE TABLE nba_reference.nba_plays (
    play_id                     text PRIMARY KEY,
    game_id                     text NOT NULL REFERENCES nba_reference.nba_games(game_id),
    event_num                   integer NOT NULL,
    period                      integer NOT NULL
        CHECK (period BETWEEN 1 AND 12),
    clock_seconds_remaining     numeric(5,2),
    wall_clock_at               timestamptz,
    action                      text NOT NULL,
    action_subtype              text,
    description                 text,
    primary_player_qid          text REFERENCES nba_reference.nba_qnumber_index(qid),
    secondary_player_qid        text REFERENCES nba_reference.nba_qnumber_index(qid),
    tertiary_player_qid         text REFERENCES nba_reference.nba_qnumber_index(qid),
    team_id                     text REFERENCES nba_reference.nba_teams(team_id),
    home_score_after            integer,
    away_score_after            integer,
    shot_x                      numeric(6,2),
    shot_y                      numeric(6,2),
    shot_distance_ft            numeric(5,2),
    shot_made                   boolean,
    shot_value                  integer
        CHECK (shot_value IS NULL OR shot_value IN (1,2,3)),
    shot_zone                   text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (game_id, event_num)
);
CREATE TRIGGER nba_plays_updated_at
    BEFORE UPDATE ON nba_reference.nba_plays
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_plays IS
    'Possession-level play-by-play 1996-present. Source: stats.nba.com PBP v1-v3 via swar/nba_api and shufinskiy/nba_data archives. NO Sportradar data. Coordinates in NBA stats native units (origin at hoop).';

-- =============================================================================
-- nba_shots — view alias over nba_plays where shot_value IS NOT NULL
-- Defined as a regular VIEW (not MV) — the underlying table indexes already
-- cover the access path. If query volume justifies a MV later, promote it.
-- =============================================================================
CREATE VIEW nba_reference.nba_shots AS
SELECT
    play_id,
    game_id,
    event_num,
    period,
    clock_seconds_remaining,
    primary_player_qid          AS shooter_qid,
    secondary_player_qid        AS assist_player_qid,
    team_id,
    shot_x,
    shot_y,
    shot_distance_ft,
    shot_made,
    shot_value,
    shot_zone,
    home_score_after,
    away_score_after
FROM nba_reference.nba_plays
WHERE shot_value IS NOT NULL;

COMMENT ON VIEW nba_reference.nba_shots IS
    'Shot chart projection over nba_plays. Filter is shot_value IS NOT NULL (shot attempts only).';

-- =============================================================================
-- nba_lineups — 5-man lineup tracking 1996-present, pbpstats-derived
-- =============================================================================
CREATE TABLE nba_reference.nba_lineups (
    lineup_id                   text PRIMARY KEY,
    game_id                     text NOT NULL REFERENCES nba_reference.nba_games(game_id),
    team_id                     text NOT NULL REFERENCES nba_reference.nba_teams(team_id),
    period                      integer NOT NULL,
    stint_start_event_num       integer NOT NULL,
    stint_end_event_num         integer NOT NULL,
    seconds_played              numeric(7,2),
    -- Always exactly 5 qids — enforced by CHECK on cardinality
    player_qids                 text[] NOT NULL
        CHECK (array_length(player_qids, 1) = 5),
    points_scored               integer,
    points_allowed              integer,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_lineups_updated_at
    BEFORE UPDATE ON nba_reference.nba_lineups
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_lineups IS
    'Per-stint 5-man lineup tracking 1996-present. Source: dblackrun/pbpstats reconstruction from stats.nba.com PBP.';

-- =============================================================================
-- nba_awards — MVP / DPOY / ROY / All-NBA / All-Star with vote shares
-- =============================================================================
CREATE TABLE nba_reference.nba_awards (
    award_id                    text PRIMARY KEY,
    season_id                   text REFERENCES nba_reference.nba_seasons(season_id),
    award_type                  text NOT NULL
        CHECK (award_type IN (
            'MVP','DPOY','ROY','SMOY','MIP','COY','EXEC_OY','FINALS_MVP',
            'ALL_NBA_1','ALL_NBA_2','ALL_NBA_3',
            'ALL_DEFENSIVE_1','ALL_DEFENSIVE_2',
            'ALL_ROOKIE_1','ALL_ROOKIE_2',
            'ALL_STAR','ALL_STAR_MVP',
            'HOF','SCORING_TITLE','ASSIST_TITLE','REBOUND_TITLE','STEAL_TITLE','BLOCK_TITLE',
            'CITIZENSHIP','TWYMAN_STOKES','HUSTLE','CLUTCH'
        )),
    recipient_qid               text NOT NULL REFERENCES nba_reference.nba_qnumber_index(qid),
    team_id                     text REFERENCES nba_reference.nba_teams(team_id),
    vote_share                  numeric(6,4),
    first_place_votes           integer,
    total_points                numeric(8,2),
    rank                        integer,
    notes                       text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_awards_updated_at
    BEFORE UPDATE ON nba_reference.nba_awards
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_awards IS
    'Award assignments + vote shares. One row per (award_type, season, recipient).';

-- =============================================================================
-- nba_draft — every pick 1947-present
-- =============================================================================
CREATE TABLE nba_reference.nba_draft (
    draft_pick_id               text PRIMARY KEY,
    draft_year                  integer NOT NULL,
    round_number                integer NOT NULL,
    pick_in_round               integer NOT NULL,
    overall_pick                integer NOT NULL,
    drafted_player_qid          text REFERENCES nba_reference.nba_qnumber_index(qid),
    drafted_player_name         text,
    drafting_team_id            text REFERENCES nba_reference.nba_teams(team_id),
    drafting_franchise_qid      text REFERENCES nba_reference.nba_qnumber_index(qid),
    college_or_pre_nba          text,
    is_territorial_pick         boolean NOT NULL DEFAULT false,
    is_undrafted_signee         boolean NOT NULL DEFAULT false,
    notes                       text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (draft_year, overall_pick)
);
CREATE TRIGGER nba_draft_updated_at
    BEFORE UPDATE ON nba_reference.nba_draft
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_draft IS
    'Draft picks 1947-present. drafting_team_id is the team-in-era; drafting_franchise_qid is the persistent franchise.';

-- =============================================================================
-- nba_transactions — trades/signings/waives/suspensions 1976-present
-- Source: ProSportsTransactions.com via rsforbes/pro_sports_transactions.
-- =============================================================================
CREATE TABLE nba_reference.nba_transactions (
    transaction_id              text PRIMARY KEY,
    transaction_date            date NOT NULL,
    transaction_type            text NOT NULL
        CHECK (transaction_type IN (
            'trade','signing','waive','release','suspension','injury_list',
            'gleague_assignment','gleague_recall','retirement','draft_pick','contract_extension'
        )),
    primary_player_qid          text REFERENCES nba_reference.nba_qnumber_index(qid),
    from_team_id                text REFERENCES nba_reference.nba_teams(team_id),
    to_team_id                  text REFERENCES nba_reference.nba_teams(team_id),
    -- For multi-team trades the full participant list lives in a side table
    -- (nba_transaction_legs); this row captures the canonical headline.
    description                 text,
    source_url                  text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_transactions_updated_at
    BEFORE UPDATE ON nba_reference.nba_transactions
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

CREATE TABLE nba_reference.nba_transaction_legs (
    transaction_id              text NOT NULL REFERENCES nba_reference.nba_transactions(transaction_id),
    leg_idx                     integer NOT NULL,
    direction                   text NOT NULL
        CHECK (direction IN ('to','from')),
    team_id                     text REFERENCES nba_reference.nba_teams(team_id),
    player_qid                  text REFERENCES nba_reference.nba_qnumber_index(qid),
    asset_description           text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (transaction_id, leg_idx)
);
CREATE TRIGGER nba_transaction_legs_updated_at
    BEFORE UPDATE ON nba_reference.nba_transaction_legs
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_transactions IS
    'Transactions 1976-present (ABA-NBA merger forward). Source: ProSportsTransactions.com.';
COMMENT ON TABLE nba_reference.nba_transaction_legs IS
    'Per-asset legs of a transaction. Captures three-team trades, draft-pick swaps, conditional picks.';

-- =============================================================================
-- nba_injuries — daily injury report archive 2021-present
-- Source: NBA-published PDFs at ak-static.cms.nba.com.
-- =============================================================================
CREATE TABLE nba_reference.nba_injuries (
    injury_report_id            text PRIMARY KEY,
    report_published_at         timestamptz NOT NULL,
    report_for_date             date NOT NULL,
    player_qid                  text REFERENCES nba_reference.nba_qnumber_index(qid),
    team_id                     text REFERENCES nba_reference.nba_teams(team_id),
    game_id                     text REFERENCES nba_reference.nba_games(game_id),
    status                      text
        CHECK (status IS NULL OR status IN ('available','probable','questionable','doubtful','out','two_way','g_league')),
    reason                      text,
    body_part                   text,
    pdf_source_url              text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_injuries_updated_at
    BEFORE UPDATE ON nba_reference.nba_injuries
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_injuries IS
    'Daily NBA Injury Report rows 2021-present. PDF parser: mxufc29/nbainjuries.';

-- =============================================================================
-- nba_l2m_reports — Last-Two-Minute officiating reports 2015-present
-- Source: atlhawksfanatic/L2M (PDF + JSON).
-- =============================================================================
CREATE TABLE nba_reference.nba_l2m_reports (
    l2m_call_id                 text PRIMARY KEY,
    game_id                     text REFERENCES nba_reference.nba_games(game_id),
    report_published_at         timestamptz,
    period                      integer NOT NULL,
    clock_seconds_remaining     numeric(5,2),
    call_type                   text,
    decision                    text
        CHECK (decision IS NULL OR decision IN ('CC','CNC','IC','INC'))
        -- CC = Correct Call, CNC = Correct Non-Call, IC = Incorrect Call, INC = Incorrect Non-Call
    ,
    committing_player_qid       text REFERENCES nba_reference.nba_qnumber_index(qid),
    disadvantaged_player_qid    text REFERENCES nba_reference.nba_qnumber_index(qid),
    comment                     text,
    pdf_source_url              text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_l2m_reports_updated_at
    BEFORE UPDATE ON nba_reference.nba_l2m_reports
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_l2m_reports IS
    'NBA Last Two Minute officiating reports 2015-present. Pre-Feb 2019 PDFs, post-Feb 2019 JSON.';

-- =============================================================================
-- nba_narratives — text corpus rows
-- Wikipedia page snapshots, podcast transcript chunks, book excerpts.
-- Entity-linked back to players/teams/games via the *_qid columns.
-- =============================================================================
CREATE TABLE nba_reference.nba_narratives (
    narrative_id                text PRIMARY KEY,
    source_type                 text NOT NULL
        CHECK (source_type IN ('wikipedia','wikidata_note','podcast_transcript','book_excerpt','article','reddit_thread','youtube_caption')),
    source_url                  text,
    source_title                text,
    source_published_at         timestamptz,
    snapshot_at                 timestamptz NOT NULL DEFAULT now(),
    chunk_idx                   integer NOT NULL DEFAULT 0,
    chunk_text                  text NOT NULL,
    token_count                 integer,
    -- Entity linkage — multi-valued so a single chunk can mention many entities.
    linked_player_qids          text[],
    linked_team_qids            text[],
    linked_game_ids             text[],
    linked_season_ids           text[],
    -- Provenance flags for legal/audit posture.
    license                     text
        CHECK (license IN ('CC0','CC_BY_SA_4.0','CC_BY_4.0','fair_use_internal','licensed','unknown')),
    -- AI-training-allowed flag — explicit per source row to enforce internal-use boundary.
    ai_training_allowed         boolean NOT NULL DEFAULT false,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_narratives_updated_at
    BEFORE UPDATE ON nba_reference.nba_narratives
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_narratives IS
    'Text corpus chunks with entity links. license + ai_training_allowed flags enforce internal-use boundary — Basketball-Reference ToS explicitly forbids GenAI training so any BR-sourced row is NOT permitted in this table.';
COMMENT ON COLUMN nba_reference.nba_narratives.ai_training_allowed IS
    'true ONLY for sources where the license permits AI training (CC0, CC-BY-SA Wikipedia). Defaults to false so ETL must explicitly affirm permission.';

-- =============================================================================
-- nba_top_shot_moments_join — bridge table to topshot.moments
-- Lane F populates. Soft cross-schema FK (validated by ETL, not Postgres).
-- =============================================================================
CREATE TABLE nba_reference.nba_top_shot_moments_join (
    top_shot_moment_id          text PRIMARY KEY,
    top_shot_play_id            text,
    -- Targets in this schema:
    game_id                     text REFERENCES nba_reference.nba_games(game_id),
    play_id                     text REFERENCES nba_reference.nba_plays(play_id),
    player_qid                  text REFERENCES nba_reference.nba_qnumber_index(qid),
    match_confidence            numeric(4,3) NOT NULL
        CHECK (match_confidence BETWEEN 0 AND 1),
    match_method                text NOT NULL
        CHECK (match_method IN ('exact_video','description_nlp','play_metadata','manual','unmatched')),
    match_evidence              jsonb,
    matched_at                  timestamptz NOT NULL DEFAULT now(),
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER nba_top_shot_moments_join_updated_at
    BEFORE UPDATE ON nba_reference.nba_top_shot_moments_join
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.nba_top_shot_moments_join IS
    'Bridge from topshot.moments.moment_id (and topshot.plays.play_id) to nba_reference.{nba_games,nba_plays}. Populated by Lane F. Cross-schema reference to topshot.moments is intentionally soft — ETL validates because topshot is hydrated by an independent pipeline.';

-- =============================================================================
-- ETL plumbing (parallel to topshot._etl_cursors / topshot._etl_heartbeat)
-- =============================================================================
CREATE TABLE nba_reference._etl_cursors (
    table_name                  text PRIMARY KEY,
    last_cursor_at              timestamptz,
    last_row_count              bigint,
    last_run_at                 timestamptz DEFAULT now(),
    last_error                  text,
    created_at                  timestamptz DEFAULT now()
);

COMMENT ON TABLE nba_reference._etl_cursors IS
    'Per-table ETL cursor. Mirrors topshot._etl_cursors. Service-role only.';

CREATE TABLE nba_reference._etl_heartbeat (
    id                          smallint PRIMARY KEY DEFAULT 1,
    last_success_at             timestamptz DEFAULT now(),
    last_run_duration_ms        bigint,
    tables_synced_count         integer,
    CONSTRAINT one_row_only CHECK (id = 1)
);

INSERT INTO nba_reference._etl_heartbeat (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE nba_reference._etl_heartbeat IS
    'Single-row heartbeat. Stale = pipeline is dead.';

-- =============================================================================
-- etl_runs — per-run audit log (mirrors topshot.etl_runs)
-- =============================================================================
CREATE TABLE nba_reference.etl_runs (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at                  timestamptz NOT NULL DEFAULT now(),
    finished_at                 timestamptz,
    status                      text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','succeeded','failed','partial')),
    lane                        text
        CHECK (lane IS NULL OR lane IN ('A','B','C','D','E','F','manual')),
    table_name                  text,
    rows_upserted               bigint,
    rows_failed                 bigint,
    high_watermark              timestamptz,
    error_message               text,
    notes                       text,
    inserted_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER etl_runs_updated_at
    BEFORE UPDATE ON nba_reference.etl_runs
    FOR EACH ROW EXECUTE FUNCTION nba_reference.set_updated_at();

COMMENT ON TABLE nba_reference.etl_runs IS
    'Audit log per ETL run. lane column tags which staging lane (A/B/D/E/F/manual) produced the rows.';

-- =============================================================================
-- RLS posture (table-level enable; per-role read policies live in a follow-up
-- migration once a curated public-read surface is approved).
-- =============================================================================
DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY[
        'nba_qnumber_index','nba_seasons','nba_teams','nba_team_history','nba_players',
        'nba_games','nba_plays','nba_lineups','nba_awards','nba_draft',
        'nba_transactions','nba_transaction_legs','nba_injuries','nba_l2m_reports',
        'nba_narratives','nba_top_shot_moments_join',
        '_etl_cursors','_etl_heartbeat','etl_runs'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure
    LOOP
        EXECUTE format('ALTER TABLE nba_reference.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE nba_reference.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Default policy: NO anon access, NO authenticated access until a future
-- migration grants them per-table. Service-role bypasses RLS by default but we
-- declare an explicit ALL policy for auditability.
DO $$
DECLARE
    t text;
    tables_for_service_write text[] := ARRAY[
        'nba_qnumber_index','nba_seasons','nba_teams','nba_team_history','nba_players',
        'nba_games','nba_plays','nba_lineups','nba_awards','nba_draft',
        'nba_transactions','nba_transaction_legs','nba_injuries','nba_l2m_reports',
        'nba_narratives','nba_top_shot_moments_join',
        '_etl_cursors','_etl_heartbeat','etl_runs'
    ];
BEGIN
    FOREACH t IN ARRAY tables_for_service_write
    LOOP
        EXECUTE format(
            'CREATE POLICY "%I_service_role_all" ON nba_reference.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
            t, t
        );
        EXECUTE format('GRANT ALL ON nba_reference.%I TO service_role', t);
    END LOOP;
END $$;

-- Defense-in-depth: revoke PUBLIC just in case any prior step granted it.
REVOKE ALL ON ALL TABLES IN SCHEMA nba_reference FROM PUBLIC;
REVOKE ALL ON SCHEMA nba_reference FROM PUBLIC;

-- =============================================================================
-- Indexes (compact set; expand in a follow-up migration if needed)
-- =============================================================================

-- nba_qnumber_index — every source-system identifier is a lookup vector.
CREATE INDEX IF NOT EXISTS idx_qi_bbref_slug          ON nba_reference.nba_qnumber_index (bbref_slug);
CREATE INDEX IF NOT EXISTS idx_qi_nba_stats_id        ON nba_reference.nba_qnumber_index (nba_stats_id);
CREATE INDEX IF NOT EXISTS idx_qi_espn_id             ON nba_reference.nba_qnumber_index (espn_id);
CREATE INDEX IF NOT EXISTS idx_qi_wikipedia_title     ON nba_reference.nba_qnumber_index (wikipedia_en_title);
CREATE INDEX IF NOT EXISTS idx_qi_top_shot_player_id  ON nba_reference.nba_qnumber_index (top_shot_player_id) WHERE top_shot_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qi_entity_type         ON nba_reference.nba_qnumber_index (entity_type);

-- nba_players
CREATE INDEX IF NOT EXISTS idx_players_qid            ON nba_reference.nba_players (qid);
CREATE INDEX IF NOT EXISTS idx_players_bbref_slug     ON nba_reference.nba_players (bbref_slug);
CREATE INDEX IF NOT EXISTS idx_players_nba_stats_id   ON nba_reference.nba_players (nba_stats_player_id);
CREATE INDEX IF NOT EXISTS idx_players_birth_date     ON nba_reference.nba_players (birth_date);
CREATE INDEX IF NOT EXISTS idx_players_hof            ON nba_reference.nba_players (is_hall_of_fame) WHERE is_hall_of_fame = true;

-- nba_teams
CREATE INDEX IF NOT EXISTS idx_teams_franchise_qid    ON nba_reference.nba_teams (franchise_qid);
CREATE INDEX IF NOT EXISTS idx_teams_league_active    ON nba_reference.nba_teams (league, is_active);

-- nba_games — hot-path: by date, by season, by team
CREATE INDEX IF NOT EXISTS idx_games_game_date        ON nba_reference.nba_games (game_date DESC);
CREATE INDEX IF NOT EXISTS idx_games_season_id        ON nba_reference.nba_games (season_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team        ON nba_reference.nba_games (home_team_id, game_date);
CREATE INDEX IF NOT EXISTS idx_games_away_team        ON nba_reference.nba_games (away_team_id, game_date);
CREATE INDEX IF NOT EXISTS idx_games_type             ON nba_reference.nba_games (game_type);

-- nba_plays — by game (covered by UNIQUE), by player, by shot status
CREATE INDEX IF NOT EXISTS idx_plays_game_event       ON nba_reference.nba_plays (game_id, event_num);
CREATE INDEX IF NOT EXISTS idx_plays_primary_player   ON nba_reference.nba_plays (primary_player_qid);
CREATE INDEX IF NOT EXISTS idx_plays_team             ON nba_reference.nba_plays (team_id);
CREATE INDEX IF NOT EXISTS idx_plays_shot_made        ON nba_reference.nba_plays (shot_made) WHERE shot_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plays_action           ON nba_reference.nba_plays (action);

-- nba_awards
CREATE INDEX IF NOT EXISTS idx_awards_recipient_type  ON nba_reference.nba_awards (recipient_qid, award_type);
CREATE INDEX IF NOT EXISTS idx_awards_season_type     ON nba_reference.nba_awards (season_id, award_type);

-- nba_draft
CREATE INDEX IF NOT EXISTS idx_draft_year_overall    ON nba_reference.nba_draft (draft_year, overall_pick);
CREATE INDEX IF NOT EXISTS idx_draft_team            ON nba_reference.nba_draft (drafting_team_id);
CREATE INDEX IF NOT EXISTS idx_draft_player          ON nba_reference.nba_draft (drafted_player_qid);

-- nba_transactions
CREATE INDEX IF NOT EXISTS idx_tx_date               ON nba_reference.nba_transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_player             ON nba_reference.nba_transactions (primary_player_qid);
CREATE INDEX IF NOT EXISTS idx_tx_type               ON nba_reference.nba_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_tx_legs_player        ON nba_reference.nba_transaction_legs (player_qid);

-- nba_injuries
CREATE INDEX IF NOT EXISTS idx_injury_for_date       ON nba_reference.nba_injuries (report_for_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_player         ON nba_reference.nba_injuries (player_qid);

-- nba_l2m
CREATE INDEX IF NOT EXISTS idx_l2m_game              ON nba_reference.nba_l2m_reports (game_id);
CREATE INDEX IF NOT EXISTS idx_l2m_decision          ON nba_reference.nba_l2m_reports (decision);

-- nba_narratives — GIN on linked-entity arrays (entity-graph lookups)
CREATE INDEX IF NOT EXISTS idx_narr_source_type       ON nba_reference.nba_narratives (source_type);
CREATE INDEX IF NOT EXISTS idx_narr_published_at      ON nba_reference.nba_narratives (source_published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_narr_players_gin       ON nba_reference.nba_narratives USING GIN (linked_player_qids);
CREATE INDEX IF NOT EXISTS idx_narr_teams_gin         ON nba_reference.nba_narratives USING GIN (linked_team_qids);
CREATE INDEX IF NOT EXISTS idx_narr_games_gin         ON nba_reference.nba_narratives USING GIN (linked_game_ids);
CREATE INDEX IF NOT EXISTS idx_narr_ai_training       ON nba_reference.nba_narratives (ai_training_allowed) WHERE ai_training_allowed = true;

-- nba_top_shot_moments_join
CREATE INDEX IF NOT EXISTS idx_ts_join_game           ON nba_reference.nba_top_shot_moments_join (game_id);
CREATE INDEX IF NOT EXISTS idx_ts_join_play           ON nba_reference.nba_top_shot_moments_join (play_id);
CREATE INDEX IF NOT EXISTS idx_ts_join_player         ON nba_reference.nba_top_shot_moments_join (player_qid);
CREATE INDEX IF NOT EXISTS idx_ts_join_method         ON nba_reference.nba_top_shot_moments_join (match_method);
CREATE INDEX IF NOT EXISTS idx_ts_join_top_shot_play  ON nba_reference.nba_top_shot_moments_join (top_shot_play_id);

COMMIT;
