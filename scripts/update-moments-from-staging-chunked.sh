#!/usr/bin/env bash
# update-moments-from-staging-chunked.sh
#
# If the all-at-once UPDATE FROM JOIN in load-ownership-csv.sh times out
# against a degraded Supabase cluster, run this instead. It chunks the UPDATE
# by `moment_flow_id` range — Postgres can plan each range as an index-scan
# bounded query rather than a full hash-join.
#
# Single-writer Supabase contract: refuses to run without the lockfile.
#
# Run:
#   bash scripts/update-moments-from-staging-chunked.sh
#
# Estimated runtime on degraded cluster: 8-15 min for the full pass (10 chunks).

set -euo pipefail

LOCK=/tmp/topshot-bulk-writer.lock
if [ ! -f "$LOCK" ]; then
  echo "FATAL: single-writer lock missing at $LOCK — refusing to run."
  echo "       (touch the file if you intentionally have exclusive access)"
  exit 1
fi

cd "$(dirname "$0")/.."
PGURL=$(grep "^SUPABASE_DB_URL=" .env.local | sed 's/^SUPABASE_DB_URL=//')

echo "[chunked-update] start at $(date)"

echo "[chunked-update] adding btree index on staging.moment_flow_id (idempotent)..."
psql "$PGURL" --set=statement_timeout=300000 <<'SQL'
SET statement_timeout = '5min';
CREATE INDEX IF NOT EXISTS idx_ownership_staging_mfid ON topshot.ownership_staging (moment_flow_id);
ANALYZE topshot.ownership_staging;
SQL

echo "[chunked-update] running 10 ranged UPDATEs over moment_flow_id space..."
for lo in 0 6000000 12000000 18000000 24000000 30000000 36000000 42000000 48000000 54000000; do
  hi=$((lo + 6000000))
  echo "[chunked-update] range [$lo, $hi) at $(date)"
  psql "$PGURL" --set=statement_timeout=600000 <<SQL
SET statement_timeout = '10min';
\\timing on
UPDATE topshot.moments m
   SET owner_flow_address = s.owner_flow_address
  FROM topshot.ownership_staging s
 WHERE m.moment_flow_id = s.moment_flow_id
   AND s.moment_flow_id::bigint >= $lo
   AND s.moment_flow_id::bigint <  $hi;
SQL
done

echo "[chunked-update] verify — sample + breakdown:"
psql "$PGURL" --set=statement_timeout=120000 <<'SQL'
SET statement_timeout = '2min';
SELECT moment_flow_id, owner_flow_address
  FROM topshot.moments
 WHERE owner_flow_address IS NOT NULL
 LIMIT 10;
SELECT
  COUNT(*)                                                         AS total_moments,
  COUNT(owner_flow_address)                                        AS moments_with_owner,
  COUNT(*) FILTER (WHERE owner_flow_address ~ '^[a-f0-9]{16}$')    AS flow_hex_real,
  COUNT(*) FILTER (WHERE owner_flow_address LIKE 'auth0|%')        AS oauth_auth0,
  COUNT(*) FILTER (WHERE owner_flow_address LIKE 'google-oauth2|%') AS oauth_google,
  COUNT(*) FILTER (WHERE owner_flow_address LIKE 'apple|%')        AS oauth_apple
FROM topshot.moments;
SQL

rm -f "$LOCK"
echo "[chunked-update] DONE at $(date) — lock released"
