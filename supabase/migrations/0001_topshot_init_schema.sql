-- 0001_topshot_init_schema.sql
-- Bootstrap schemas for the NBA Top Shot Data Portal Supabase project.
--
-- Source of truth: dapperlabs-data.production_sem_open.* (BigQuery).
-- Hydration: GitHub Action cron ETL — incremental upsert by `row_updated_at` cursor.
-- Audience: public-read via Supabase publishable key (portal is open data).
-- PII filtering applied at ETL time: country/province/IP/internal classification dropped.
--
-- Three schemas:
--   topshot     — market data, public-read via PostgREST (Data API)
--   etl         — plumbing (cursors, heartbeat, SECURITY DEFINER refresh fn). Hidden from anon.
--   user_state  — reserved for future Auth-protected features (watchlists, alerts, saved searches).
--                 Created empty; tables added when those features ship.
--
-- Apply via Supabase CLI from the topshot-data-portal repo root:
--   supabase db push
-- Or via Supabase MCP:
--   apply_migration with version '0001' and the body of this file.
--
-- Rollback:
--   DROP SCHEMA topshot CASCADE; DROP SCHEMA etl CASCADE; DROP SCHEMA user_state CASCADE;
-- Destructive but isolated — does not touch Supabase-managed schemas (auth, storage, etc.).

CREATE SCHEMA IF NOT EXISTS topshot;

COMMENT ON SCHEMA topshot IS
    'NBA Top Shot data portal — mirror of dapperlabs-data.production_sem_open with PII filtered out. Hydrated from BigQuery via scheduled ETL. Public-read via Data API.';

-- Plumbing: cursors, heartbeat, MV refresh functions. Anonymous/authenticated roles must not see this.
CREATE SCHEMA IF NOT EXISTS etl;

COMMENT ON SCHEMA etl IS
    'ETL plumbing for the topshot schema — cursor state, heartbeat, SECURITY DEFINER refresh functions. Restricted to service_role. Not exposed to anon/authenticated.';

-- Reserved for future Auth-protected user features (watchlists, alerts, snipers, saved searches).
-- Empty at init; tables added by later migrations when user-facing features ship.
CREATE SCHEMA IF NOT EXISTS user_state;

COMMENT ON SCHEMA user_state IS
    'Auth-protected per-user state — watchlists, alerts, saved searches. Tables added when user-facing features ship. Each table will have RLS keyed on auth.uid().';

-- Restrict etl from anonymous and authenticated roles. service_role only.
REVOKE ALL ON SCHEMA etl FROM PUBLIC;
REVOKE ALL ON SCHEMA etl FROM anon, authenticated;
GRANT USAGE ON SCHEMA etl TO service_role;

-- user_state stays accessible to authenticated; RLS on each table will enforce per-user scoping.
REVOKE ALL ON SCHEMA user_state FROM PUBLIC;
REVOKE ALL ON SCHEMA user_state FROM anon;
GRANT USAGE ON SCHEMA user_state TO authenticated, service_role;
