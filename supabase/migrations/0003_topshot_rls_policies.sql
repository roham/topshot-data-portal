-- 0003_topshot_rls_policies.sql
-- Row Level Security for the topshot schema.
--
-- Posture:
--   - anon: SELECT-only on every table (portal is public-read open data)
--   - authenticated: SELECT-only (no write privileges for end-users)
--   - service_role: full ALL (ETL cron writes; bypasses RLS by default but we
--                   keep an explicit policy for auditability)
--
-- NO writes from browser. The ETL service is the sole writer.
--
-- Apply after 0005.
--
-- Rollback: each policy can be dropped; or `DROP SCHEMA topshot CASCADE` removes all.

-- =============================================================================
-- 1. Enable RLS on every topshot.* table
-- =============================================================================
DO $$
DECLARE
    t text;
    topshot_tables text[] := ARRAY[
        'teams',
        'team_history',
        'players',
        'plays',
        'sets',
        'editions',
        'moments',
        'transactions',
        'market_caps',
        'packs',
        'drops',
        'series',
        'play_categories',
        'play_types',
        'positions',
        'seasons',
        'play_statuses',
        'etl_runs'
    ];
BEGIN
    FOREACH t IN ARRAY topshot_tables
    LOOP
        EXECUTE format('ALTER TABLE topshot.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE topshot.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- =============================================================================
-- 2. Grant schema USAGE so anon/authenticated can resolve names
-- =============================================================================
GRANT USAGE ON SCHEMA topshot TO anon, authenticated, service_role;

-- =============================================================================
-- 3. Read policies — anon + authenticated get SELECT on all tables
--    Write policies — service_role gets ALL (explicit, even though RLS-bypass
--    is the default for service_role; declared for documentation)
-- =============================================================================
DO $$
DECLARE
    t text;
    public_read_tables text[] := ARRAY[
        'teams',
        'team_history',
        'players',
        'plays',
        'sets',
        'editions',
        'moments',
        'transactions',
        'market_caps',
        'packs',
        'drops',
        'series',
        'play_categories',
        'play_types',
        'positions',
        'seasons',
        'play_statuses'
    ];
BEGIN
    FOREACH t IN ARRAY public_read_tables
    LOOP
        -- anon + authenticated read
        EXECUTE format(
            'CREATE POLICY "%I_anon_read" ON topshot.%I FOR SELECT TO anon USING (true);',
            t, t
        );
        EXECUTE format(
            'CREATE POLICY "%I_authenticated_read" ON topshot.%I FOR SELECT TO authenticated USING (true);',
            t, t
        );

        -- service_role write (explicit ALL — documents who can write)
        EXECUTE format(
            'CREATE POLICY "%I_service_role_all" ON topshot.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
            t, t
        );

        -- Grant select + grant all to service_role
        EXECUTE format('GRANT SELECT ON topshot.%I TO anon, authenticated', t);
        EXECUTE format('GRANT ALL ON topshot.%I TO service_role', t);
    END LOOP;
END $$;

-- =============================================================================
-- 4. etl_runs — service_role-only (don't leak ETL telemetry to the public API)
-- =============================================================================
CREATE POLICY "etl_runs_service_role_all" ON topshot.etl_runs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No anon/authenticated policy on etl_runs — intentional. ETL audit table is
-- internal-only; surface aggregate health via a curated view if needed later.

GRANT ALL ON topshot.etl_runs TO service_role;

-- =============================================================================
-- 5. Default privileges for future tables added in this schema by service_role
--    (so subsequent migrations don't have to re-grant)
-- =============================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA topshot
    GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA topshot
    GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA topshot
    GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA topshot
    GRANT ALL ON SEQUENCES TO service_role;

-- =============================================================================
-- 6. Revoke anything dangerous from PUBLIC (defense-in-depth)
-- =============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA topshot FROM PUBLIC;
REVOKE ALL ON SCHEMA topshot FROM PUBLIC;
