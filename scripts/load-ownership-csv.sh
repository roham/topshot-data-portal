#!/usr/bin/env bash
# load-ownership-csv.sh
#
# Once /tmp/ownership.csv is fully written by scripts/bq-pull-ownership-to-csv.mjs,
# this script does the three-step DB load:
#   1) TRUNCATE topshot.ownership_staging
#   2) \COPY CSV into ownership_staging
#   3) UPDATE topshot.moments via JOIN to ownership_staging
#   4) Verify: 20-row sample of moments.owner_flow_address — all Flow-hex
#
# Single-writer Supabase contract: this script REQUIRES the lockfile to be present.
# It refuses to run if /tmp/topshot-bulk-writer.lock is missing.
#
# Run:
#   bash scripts/load-ownership-csv.sh
#
# Cluster note: Supabase is currently resource-exhausted per dashboard banner.
# We extend statement_timeout to 30 min on the session for the UPDATE FROM JOIN.

set -euo pipefail

LOCK=/tmp/topshot-bulk-writer.lock
CSV=/tmp/ownership.csv

if [ ! -f "$LOCK" ]; then
  echo "FATAL: single-writer lock missing at $LOCK — refusing to run."
  exit 1
fi
if [ ! -s "$CSV" ]; then
  echo "FATAL: CSV missing or empty at $CSV"
  exit 1
fi

CSV_LINES=$(wc -l < "$CSV")
CSV_DATA_ROWS=$((CSV_LINES - 1))
CSV_SIZE_MB=$(du -m "$CSV" | cut -f1)
echo "[pre-flight] CSV: ${CSV_DATA_ROWS} data rows, ${CSV_SIZE_MB} MB"

cd "$(dirname "$0")/.."
PGURL=$(grep "^SUPABASE_DB_URL=" .env.local | sed 's/^SUPABASE_DB_URL=//')

echo "[step 1] TRUNCATE staging..."
psql "$PGURL" -c "TRUNCATE topshot.ownership_staging;"

echo "[step 2] \\COPY CSV → ownership_staging..."
time psql "$PGURL" -c "\\COPY topshot.ownership_staging(moment_flow_id, owner_flow_address) FROM '$CSV' WITH (FORMAT csv, HEADER true)"

echo "[step 2 verify] row count in staging:"
psql "$PGURL" -c "SELECT COUNT(*) AS staging_rows FROM topshot.ownership_staging;"

echo "[step 3] UPDATE topshot.moments via JOIN — this is the bulk write..."
psql "$PGURL" --set=statement_timeout=1800000 <<SQL
SET statement_timeout = '30min';
\\timing on
UPDATE topshot.moments m
   SET owner_flow_address = s.owner_flow_address
  FROM topshot.ownership_staging s
 WHERE m.moment_flow_id = s.moment_flow_id;
SQL

echo "[step 4] verify — sample 20 owner_flow_address values + shape stats:"
psql "$PGURL" --set=statement_timeout=120000 <<'SQL'
\timing on
SET statement_timeout = '120s';
SELECT moment_flow_id, owner_flow_address
  FROM topshot.moments
 WHERE owner_flow_address IS NOT NULL
 LIMIT 20;
SQL

echo "[done] release single-writer lock"
rm -f "$LOCK"
