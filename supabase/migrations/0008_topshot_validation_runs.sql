-- 0008_topshot_validation_runs.sql
-- Continuous data-quality validation: comparison runs between Supabase MVs
-- and BQ ground truth. One row per check, per run. The cron loop (every 30
-- min) writes a batch on every execution; the admin dashboard reads the
-- latest-per-check view.

CREATE TABLE IF NOT EXISTS topshot._validation_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name    TEXT NOT NULL,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bq_value      JSONB,
  sb_value      JSONB,
  metric        TEXT NOT NULL CHECK (metric IN ('spearman','pct_delta','abs_delta','ratio')),
  metric_value  NUMERIC,
  threshold     NUMERIC,
  passed        BOOLEAN NOT NULL,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_check_ran_at
  ON topshot._validation_runs (check_name, ran_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_runs_ran_at
  ON topshot._validation_runs (ran_at DESC);

COMMENT ON TABLE topshot._validation_runs IS
  'One row per (check_name, ran_at). Compares Supabase MV output to BQ ground truth. Powers /admin/data-quality.';
COMMENT ON COLUMN topshot._validation_runs.metric IS
  'Comparison metric kind: spearman (rank correlation), pct_delta (|sb-bq|/bq), abs_delta (|sb-bq|), ratio (sb/bq).';
COMMENT ON COLUMN topshot._validation_runs.metric_value IS
  'Computed metric. Comparison to threshold depends on metric kind — caller embeds the right comparator (>= for spearman/ratio; <= for deltas).';

-- Latest-per-check view; the dashboard reads from this so it never has to
-- DISTINCT-ON manually.
CREATE OR REPLACE VIEW topshot.v_validation_latest AS
SELECT DISTINCT ON (check_name)
  id,
  check_name,
  ran_at,
  bq_value,
  sb_value,
  metric,
  metric_value,
  threshold,
  passed,
  notes
FROM topshot._validation_runs
ORDER BY check_name, ran_at DESC;

COMMENT ON VIEW topshot.v_validation_latest IS
  'Most-recent run per check_name. Backs /admin/data-quality dashboard.';

-- RLS: dashboard is anon-readable; only service-role writes.
ALTER TABLE topshot._validation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS validation_runs_public_read ON topshot._validation_runs;
CREATE POLICY validation_runs_public_read
  ON topshot._validation_runs
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON topshot._validation_runs TO anon, authenticated;
GRANT SELECT ON topshot.v_validation_latest TO anon, authenticated;
GRANT ALL ON topshot._validation_runs TO service_role;
