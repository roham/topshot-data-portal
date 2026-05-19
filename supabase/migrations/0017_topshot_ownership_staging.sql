-- 0017_topshot_ownership_staging.sql — staging table for bulk ownership backfill
--
-- Used by scripts/bq-pull-ownership-streaming.mjs to land all 35M ownership rows
-- without OOM, then run a single UPDATE FROM JOIN to apply to topshot.moments.
--
-- Truncatable. Re-populated each backfill. Not a long-term storage table.

CREATE TABLE IF NOT EXISTS topshot.ownership_staging (
  moment_flow_id text NOT NULL,
  owner_flow_address text NOT NULL
);

CREATE INDEX IF NOT EXISTS ownership_staging_moment_flow_idx
  ON topshot.ownership_staging (moment_flow_id);

-- RPC to truncate from supabase-js (no raw SQL exposure needed)
CREATE OR REPLACE FUNCTION topshot.truncate_ownership_staging()
RETURNS void AS $$
BEGIN
  TRUNCATE TABLE topshot.ownership_staging;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION topshot.truncate_ownership_staging() TO service_role;

NOTIFY pgrst, 'reload schema';
