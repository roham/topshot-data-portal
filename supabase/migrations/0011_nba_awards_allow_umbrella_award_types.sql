-- 0011_nba_awards_allow_umbrella_award_types.sql
-- Extend nba_awards.award_type CHECK constraint to allow umbrella tier-less
-- values ALL_NBA and ALL_DEFENSIVE.
--
-- Background:
--   The 10_nba_awards_all.sparql query returns the umbrella Wikidata awards
--   (Q674359 "All-NBA Team", Q1465181 "NBA All-Defensive Team") rather than
--   the tiered subclasses. We don't have tier (_1/_2/_3) data on the row, so
--   the loader emits the umbrella value verbatim.
--
--   Production already has the extended constraint applied directly (cleanup
--   2026-05-16); this migration codifies that change so the schema source-of-
--   truth no longer drifts from live. The DROP-then-ADD pattern is idempotent:
--   if production already matches the new value set, the recreate is a no-op
--   in shape.
--
-- Apply:
--   supabase db push
--   -- or via Supabase MCP apply_migration
--
-- =============================================================================
-- DOWN (rollback)
-- =============================================================================
-- BEGIN;
-- ALTER TABLE nba_reference.nba_awards
--     DROP CONSTRAINT IF EXISTS nba_awards_award_type_check;
-- ALTER TABLE nba_reference.nba_awards
--     ADD CONSTRAINT nba_awards_award_type_check CHECK (award_type IN (
--         'MVP','DPOY','ROY','SMOY','MIP','COY','EXEC_OY','FINALS_MVP',
--         'ALL_NBA_1','ALL_NBA_2','ALL_NBA_3',
--         'ALL_DEFENSIVE_1','ALL_DEFENSIVE_2',
--         'ALL_ROOKIE_1','ALL_ROOKIE_2',
--         'ALL_STAR','ALL_STAR_MVP',
--         'HOF','SCORING_TITLE','ASSIST_TITLE','REBOUND_TITLE','STEAL_TITLE','BLOCK_TITLE',
--         'CITIZENSHIP','TWYMAN_STOKES','HUSTLE','CLUTCH'
--     ));
-- COMMIT;
-- =============================================================================

BEGIN;

-- Idempotent: drop the existing check (any name) then recreate with the
-- extended value set. Production already matches the new shape; this is a
-- no-op there but brings the schema source-of-truth in sync.
ALTER TABLE nba_reference.nba_awards
    DROP CONSTRAINT IF EXISTS nba_awards_award_type_check;

ALTER TABLE nba_reference.nba_awards
    ADD CONSTRAINT nba_awards_award_type_check CHECK (award_type IN (
        'MVP','DPOY','ROY','SMOY','MIP','COY','EXEC_OY','FINALS_MVP',
        'ALL_NBA','ALL_NBA_1','ALL_NBA_2','ALL_NBA_3',
        'ALL_DEFENSIVE','ALL_DEFENSIVE_1','ALL_DEFENSIVE_2',
        'ALL_ROOKIE_1','ALL_ROOKIE_2',
        'ALL_STAR','ALL_STAR_MVP',
        'HOF','SCORING_TITLE','ASSIST_TITLE','REBOUND_TITLE','STEAL_TITLE','BLOCK_TITLE',
        'CITIZENSHIP','TWYMAN_STOKES','HUSTLE','CLUTCH'
    ));

COMMENT ON CONSTRAINT nba_awards_award_type_check ON nba_reference.nba_awards IS
    'Allow-list of award_type enum values. ALL_NBA / ALL_DEFENSIVE are umbrella terms used when the Wikidata source row does not carry tier (_1/_2/_3) information; the tiered variants remain valid for sources that do.';

COMMIT;
