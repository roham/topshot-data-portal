-- 0010_nba_reference_mvs.sql
-- Materialized views over nba_reference for fast Pantheon-agent lookups.
--
-- Design notes:
--   * Five MVs cover the highest-traffic agent surface areas.
--   * Each MV has a UNIQUE index so REFRESH MATERIALIZED VIEW CONCURRENTLY works.
--   * A SECURITY DEFINER refresh function exists so the ETL can refresh from
--     service-role without owning the views.
--   * GRANTs are service-role only — anon/authenticated cannot read.
--
-- DOWN (rollback):
--   DROP FUNCTION IF EXISTS nba_reference.refresh_all_materialized_views();
--   DROP MATERIALIZED VIEW IF EXISTS nba_reference.mv_top_shot_join_summary CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS nba_reference.mv_l2m_decision_rollup CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS nba_reference.mv_player_career_arcs CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS nba_reference.mv_narrative_entity_links CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS nba_reference.mv_qid_resolution CASCADE;

BEGIN;

-- =============================================================================
-- mv_qid_resolution — every Q-number with all its source-system identifiers,
-- merged from nba_qnumber_index + nba_players + nba_teams.
-- Pantheon agents query this when they have ANY id and need the others.
-- =============================================================================
CREATE MATERIALIZED VIEW nba_reference.mv_qid_resolution AS
SELECT
    qi.qid,
    qi.entity_type,
    qi.canonical_label,
    COALESCE(p.full_name, t.current_name, qi.canonical_label) AS display_name,
    qi.bbref_slug,
    qi.nba_stats_id,
    qi.espn_id,
    qi.wikipedia_en_title,
    qi.top_shot_player_id,
    qi.top_shot_team_id,
    p.player_id,
    p.is_hall_of_fame,
    t.team_id,
    t.abbreviation AS team_abbreviation,
    t.is_active AS team_is_active
FROM nba_reference.nba_qnumber_index qi
LEFT JOIN nba_reference.nba_players p ON p.qid = qi.qid
LEFT JOIN nba_reference.nba_teams t ON t.qid = qi.qid
WITH NO DATA;

CREATE UNIQUE INDEX mv_qid_resolution_pk ON nba_reference.mv_qid_resolution (qid);
CREATE INDEX mv_qid_resolution_nba_stats ON nba_reference.mv_qid_resolution (nba_stats_id) WHERE nba_stats_id IS NOT NULL;
CREATE INDEX mv_qid_resolution_bbref ON nba_reference.mv_qid_resolution (bbref_slug) WHERE bbref_slug IS NOT NULL;
CREATE INDEX mv_qid_resolution_top_shot ON nba_reference.mv_qid_resolution (top_shot_player_id) WHERE top_shot_player_id IS NOT NULL;

COMMENT ON MATERIALIZED VIEW nba_reference.mv_qid_resolution IS
    'One row per qid joining nba_players + nba_teams + nba_qnumber_index. Hot path for agent id-translation queries.';

-- =============================================================================
-- mv_narrative_entity_links — narratives expanded one-row-per-linked-player so
-- agent retrieval can SELECT narratives WHERE linked_player_qid = $1 cheaply.
-- =============================================================================
CREATE MATERIALIZED VIEW nba_reference.mv_narrative_entity_links AS
SELECT
    n.narrative_id,
    n.source_type,
    n.source_url,
    n.source_title,
    n.chunk_idx,
    n.token_count,
    n.license,
    n.ai_training_allowed,
    qid AS linked_player_qid
FROM nba_reference.nba_narratives n,
     LATERAL unnest(COALESCE(n.linked_player_qids, ARRAY[]::text[])) AS qid
WHERE n.ai_training_allowed = true
WITH NO DATA;

-- Composite unique allows concurrent refresh
CREATE UNIQUE INDEX mv_narrative_links_pk ON nba_reference.mv_narrative_entity_links (narrative_id, linked_player_qid);
CREATE INDEX mv_narrative_links_qid ON nba_reference.mv_narrative_entity_links (linked_player_qid);
CREATE INDEX mv_narrative_links_source ON nba_reference.mv_narrative_entity_links (source_type);

COMMENT ON MATERIALIZED VIEW nba_reference.mv_narrative_entity_links IS
    'Exploded narrative -> linked_player_qid edges. Filter ai_training_allowed = true. Hot path for agent narrative retrieval by player.';

-- =============================================================================
-- mv_player_career_arcs — per-player summary used by every chat-style query
-- ("how good is X?"). Awards count + HOF + career era boundaries.
-- =============================================================================
CREATE MATERIALIZED VIEW nba_reference.mv_player_career_arcs AS
SELECT
    p.qid,
    p.player_id,
    p.full_name,
    p.birth_date,
    p.death_date,
    p.primary_position,
    p.is_hall_of_fame,
    p.hof_class_year,
    p.debut_date,
    p.final_game_date,
    (SELECT count(*) FROM nba_reference.nba_awards a
       WHERE a.recipient_qid = p.qid AND a.award_type = 'MVP')         AS mvp_count,
    (SELECT count(*) FROM nba_reference.nba_awards a
       WHERE a.recipient_qid = p.qid AND a.award_type = 'FINALS_MVP')  AS finals_mvp_count,
    (SELECT count(*) FROM nba_reference.nba_awards a
       WHERE a.recipient_qid = p.qid AND a.award_type = 'ALL_STAR')    AS all_star_selections,
    (SELECT count(*) FROM nba_reference.nba_awards a
       WHERE a.recipient_qid = p.qid AND a.award_type LIKE 'ALL_NBA_%') AS all_nba_selections,
    (SELECT count(*) FROM nba_reference.nba_awards a
       WHERE a.recipient_qid = p.qid)                                  AS total_awards
FROM nba_reference.nba_players p
WITH NO DATA;

CREATE UNIQUE INDEX mv_career_arcs_pk ON nba_reference.mv_player_career_arcs (qid);
CREATE INDEX mv_career_arcs_hof ON nba_reference.mv_player_career_arcs (is_hall_of_fame) WHERE is_hall_of_fame = true;
CREATE INDEX mv_career_arcs_mvp ON nba_reference.mv_player_career_arcs (mvp_count) WHERE mvp_count > 0;

COMMENT ON MATERIALIZED VIEW nba_reference.mv_player_career_arcs IS
    'Per-player career summary stats. Hot path for "tell me about player X" agent queries.';

-- =============================================================================
-- mv_l2m_decision_rollup — per-game L2M call distribution + correctness rate
-- =============================================================================
CREATE MATERIALIZED VIEW nba_reference.mv_l2m_decision_rollup AS
SELECT
    l.game_id,
    count(*)                                                          AS total_calls,
    count(*) FILTER (WHERE l.decision = 'CC')                         AS correct_calls,
    count(*) FILTER (WHERE l.decision = 'CNC')                        AS correct_noncalls,
    count(*) FILTER (WHERE l.decision = 'IC')                         AS incorrect_calls,
    count(*) FILTER (WHERE l.decision = 'INC')                        AS incorrect_noncalls,
    -- correct = CC+CNC over total decided
    CASE WHEN count(*) FILTER (WHERE l.decision IS NOT NULL) = 0 THEN NULL
         ELSE round(
            (count(*) FILTER (WHERE l.decision IN ('CC','CNC')))::numeric
            / nullif(count(*) FILTER (WHERE l.decision IS NOT NULL), 0)::numeric,
            4)
    END                                                               AS accuracy_rate,
    max(l.report_published_at)                                        AS last_published_at
FROM nba_reference.nba_l2m_reports l
WHERE l.game_id IS NOT NULL
GROUP BY l.game_id
WITH NO DATA;

CREATE UNIQUE INDEX mv_l2m_rollup_pk ON nba_reference.mv_l2m_decision_rollup (game_id);
CREATE INDEX mv_l2m_rollup_acc ON nba_reference.mv_l2m_decision_rollup (accuracy_rate);

COMMENT ON MATERIALIZED VIEW nba_reference.mv_l2m_decision_rollup IS
    'Per-game L2M call accuracy rollup. Hot path for "was the officiating bad in game X" agent queries.';

-- =============================================================================
-- mv_top_shot_join_summary — moment-join rollup keyed by match_method + player
-- so the Top Shot product team can answer "what % of moments are resolved".
-- =============================================================================
CREATE MATERIALIZED VIEW nba_reference.mv_top_shot_join_summary AS
SELECT
    j.match_method,
    j.player_qid,
    count(*)                                            AS moment_count,
    count(*) FILTER (WHERE j.match_confidence >= 0.9)   AS high_conf_count,
    count(*) FILTER (WHERE j.match_confidence < 0.5)    AS low_conf_count,
    avg(j.match_confidence)                             AS avg_confidence,
    max(j.matched_at)                                   AS last_matched_at
FROM nba_reference.nba_top_shot_moments_join j
GROUP BY j.match_method, j.player_qid
WITH NO DATA;

-- Note: player_qid may be NULL; UNIQUE on (method, COALESCE(qid,'__NULL__'))
CREATE UNIQUE INDEX mv_top_shot_join_pk
    ON nba_reference.mv_top_shot_join_summary (match_method, (COALESCE(player_qid, '__NULL__')));
CREATE INDEX mv_top_shot_join_method ON nba_reference.mv_top_shot_join_summary (match_method);

COMMENT ON MATERIALIZED VIEW nba_reference.mv_top_shot_join_summary IS
    'Moment-join rollup by (match_method, player_qid). Hot path for product metrics on Lane F coverage.';

-- =============================================================================
-- Refresh function — SECURITY DEFINER so service-role can trigger refreshes.
-- =============================================================================
CREATE OR REPLACE FUNCTION nba_reference.refresh_all_materialized_views()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = nba_reference, public
AS $$
DECLARE
    t0 timestamptz := clock_timestamp();
    out jsonb := '{}'::jsonb;
BEGIN
    -- First refresh non-concurrently if MVs are empty; otherwise CONCURRENTLY
    REFRESH MATERIALIZED VIEW nba_reference.mv_qid_resolution;
    REFRESH MATERIALIZED VIEW nba_reference.mv_narrative_entity_links;
    REFRESH MATERIALIZED VIEW nba_reference.mv_player_career_arcs;
    REFRESH MATERIALIZED VIEW nba_reference.mv_l2m_decision_rollup;
    REFRESH MATERIALIZED VIEW nba_reference.mv_top_shot_join_summary;
    out := jsonb_build_object(
        'ok', true,
        'duration_ms', round(extract(epoch from (clock_timestamp() - t0)) * 1000)::int
    );
    UPDATE nba_reference._etl_heartbeat
       SET last_success_at = now(),
           last_run_duration_ms = round(extract(epoch from (clock_timestamp() - t0)) * 1000)::bigint,
           tables_synced_count = 5
     WHERE id = 1;
    RETURN out;
END $$;

COMMENT ON FUNCTION nba_reference.refresh_all_materialized_views() IS
    'Refreshes all five nba_reference MVs and bumps _etl_heartbeat. Call after every successful ETL tick.';

-- Grants — service_role only.
DO $$
DECLARE
    mv text;
    mvs text[] := ARRAY['mv_qid_resolution','mv_narrative_entity_links','mv_player_career_arcs','mv_l2m_decision_rollup','mv_top_shot_join_summary'];
BEGIN
    FOREACH mv IN ARRAY mvs LOOP
        EXECUTE format('REVOKE ALL ON nba_reference.%I FROM PUBLIC', mv);
        EXECUTE format('REVOKE ALL ON nba_reference.%I FROM anon, authenticated', mv);
        EXECUTE format('GRANT SELECT ON nba_reference.%I TO service_role', mv);
    END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION nba_reference.refresh_all_materialized_views() TO service_role;

COMMIT;
