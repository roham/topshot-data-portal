-- V9 ITER-7 — supply-breakdown MV, with extended timeout for initial build.
-- Subsequent REFRESH MATERIALIZED VIEW CONCURRENTLY runs incrementally and is fast.

SET statement_timeout = '15min';
SET lock_timeout = '5min';

DROP MATERIALIZED VIEW IF EXISTS topshot.mv_edition_supply_breakdown CASCADE;

CREATE MATERIALIZED VIEW topshot.mv_edition_supply_breakdown AS
SELECT
  edition_id,
  COUNT(*) FILTER (
    WHERE moment_status = 'MINTED' AND burned_at IS NULL
  )::int AS active_count,
  COUNT(*) FILTER (
    WHERE moment_status = 'LOCKED' AND burned_at IS NULL
  )::int AS locked_count,
  COUNT(*) FILTER (
    WHERE burned_at IS NOT NULL
  )::int AS burned_count,
  COUNT(*) FILTER (
    WHERE burned_at IS NULL
  )::int AS in_circulation_count,
  COUNT(*)::int AS total_count,
  NOW() AS computed_at
FROM topshot.moments
GROUP BY edition_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_edition_supply_breakdown_pk
  ON topshot.mv_edition_supply_breakdown(edition_id);

GRANT SELECT ON topshot.mv_edition_supply_breakdown TO anon, authenticated, service_role;
