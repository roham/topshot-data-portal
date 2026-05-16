-- ETL operational tables for topshot BQ→Supabase pipeline.
-- Migrations 0004-0008 created the data schema; this adds cursor + heartbeat.

-- _etl_cursors: one row per source table. Tracks high-watermark for incremental sync.
CREATE TABLE IF NOT EXISTS topshot._etl_cursors (
  table_name        TEXT PRIMARY KEY,
  last_cursor_at    TIMESTAMPTZ,
  last_row_count    BIGINT,
  last_run_at       TIMESTAMPTZ DEFAULT NOW(),
  last_error        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE topshot._etl_cursors IS
  'High-watermark cursor per source table for BQ→Supabase incremental sync.';
COMMENT ON COLUMN topshot._etl_cursors.last_cursor_at IS
  'MAX(row_updated_at) of the last successful sync; next run picks up here minus overlap window.';
COMMENT ON COLUMN topshot._etl_cursors.last_error IS
  'Last error message if the most recent run failed; cleared on success.';

-- _etl_heartbeat: single-row table updated on every successful run.
CREATE TABLE IF NOT EXISTS topshot._etl_heartbeat (
  id                       SMALLINT PRIMARY KEY DEFAULT 1,
  last_success_at          TIMESTAMPTZ DEFAULT NOW(),
  last_run_duration_ms     BIGINT,
  tables_synced_count      INTEGER,
  CONSTRAINT one_row_only CHECK (id = 1)
);

COMMENT ON TABLE topshot._etl_heartbeat IS
  'Single-row heartbeat. Stale row = ETL pipeline is dead. Monitor last_success_at.';

INSERT INTO topshot._etl_heartbeat (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- Helper RPC: refresh all materialized views CONCURRENTLY (no read blocking).
-- The MV definitions live in 0005_topshot_materialized_views.sql; if any new
-- MV gets added, add it to this function body.
CREATE OR REPLACE FUNCTION topshot.refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = topshot, public
AS $$
DECLARE
  mv RECORD;
BEGIN
  FOR mv IN
    SELECT matviewname
      FROM pg_matviews
     WHERE schemaname = 'topshot'
  LOOP
    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.%I', mv.matviewname);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION topshot.refresh_all_materialized_views IS
  'Refresh every MV in topshot schema CONCURRENTLY. Called after each ETL tick.';

-- RPC wrappers for advisory locks (used by ETL scripts to coordinate runs).
-- Service-role can call these directly; this just provides typed param names.
CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(key BIGINT)
RETURNS boolean
LANGUAGE sql
AS $$ SELECT pg_try_advisory_lock(key); $$;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(key BIGINT)
RETURNS boolean
LANGUAGE sql
AS $$ SELECT pg_advisory_unlock(key); $$;

-- RLS: _etl_cursors and _etl_heartbeat are operational; service-role only.
-- Anon / authenticated should see _etl_heartbeat for status UI.
ALTER TABLE topshot._etl_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE topshot._etl_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heartbeat_public_read" ON topshot._etl_heartbeat
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- _etl_cursors: service-role only (default — no policies grants nothing to others).
