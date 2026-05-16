// Per-table sync logic — shared by historical backfill and incremental cron.
// Each table follows the same shape:
//   1) build SQL with cursor + partition prune
//   2) stream rows
//   3) PII-filter per row
//   4) chunked upsert to Supabase with ON CONFLICT
//   5) update cursor row on success

import { CONFIG } from "../etl-config.mjs";
import { streamQuery, normalizeRow } from "./bq-client.mjs";
import {
  pii_filter,
  upsertChunk,
  readCursor,
  writeCursor,
  logRun,
} from "./etl-helpers.mjs";

// Build the parameterized SELECT for a given table + cursor window.
// For `transactions`, applies partition prune on DATE(updated_at) and client filter.
function buildSql(tableKey, cursorStart, cursorEnd, cursorOverride) {
  const t = CONFIG.tables[tableKey];
  const fqn = `\`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.${t.bq}\``;
  const cursorField = cursorOverride ?? t.cursor;
  const filters = [];
  const params = {};

  // Always prune by the cursor field
  if (t.cursor === "date") {
    // market_caps: DATE cursor
    filters.push(`\`${cursorField}\` >= @cursor_start`);
    params.cursor_start = cursorStart.slice(0, 10); // YYYY-MM-DD
    if (cursorEnd) {
      filters.push(`\`${cursorField}\` < @cursor_end`);
      params.cursor_end = cursorEnd.slice(0, 10);
    }
  } else {
    filters.push(`\`${cursorField}\` >= @cursor_start`);
    params.cursor_start = cursorStart;
    if (cursorEnd) {
      filters.push(`\`${cursorField}\` < @cursor_end`);
      params.cursor_end = cursorEnd;
    }
  }

  // Partition prune (transactions view only — others are small enough)
  if (t.partitionField) {
    filters.push(
      `DATE(\`${t.partitionField}\`) >= DATE_SUB(DATE(@cursor_start), INTERVAL 2 DAY)`,
    );
    if (cursorEnd) {
      filters.push(
        `DATE(\`${t.partitionField}\`) <= DATE_ADD(DATE(@cursor_end), INTERVAL 1 DAY)`,
      );
    }
  }

  // Static client filter
  if (t.filter) filters.push(t.filter);

  const sql = `
    SELECT *
    FROM ${fqn}
    WHERE ${filters.join(" AND ")}
    ORDER BY \`${cursorField}\` ASC
  `.trim();

  return { sql, params };
}

// Sync one table from cursorStart up to cursorEnd (or "now" if null).
// Returns {rowsPulled, rowsUpserted, scanBytes, cursorAfter, durationMs}.
//
// In parallel-backfill workers (ETL_WORKER_ID set), we honor t.backfillCursor
// when present — for tables like `moments` where the incremental cursor
// (row_updated_at = pipeline timestamp) returns zero rows for historical
// windows, we fall back to the row's actual updated_at field.
export async function syncTable(sb, tableKey, cursorStart, cursorEnd) {
  const t = CONFIG.tables[tableKey];
  const sbTable = t.sb;
  const allowlistKey = sbTable; // allowlists keyed by Supabase table name
  const conflictCols = t.pk;
  const useBackfillCursor = process.env.ETL_WORKER_ID != null && t.backfillCursor;
  const cursorField = useBackfillCursor ? t.backfillCursor : t.cursor;

  const started = Date.now();
  const { sql, params } = buildSql(tableKey, cursorStart, cursorEnd, useBackfillCursor ? cursorField : undefined);

  let rowsPulled = 0;
  let rowsUpserted = 0;
  let scanBytes = 0;
  let maxCursor = null;
  let batch = [];

  const flushBatch = async () => {
    if (!batch.length) return;
    let filtered = batch.map((r) => pii_filter(r, allowlistKey));
    // Drop rows with any null PK column — these can't be upserted.
    const pkCols = Array.isArray(conflictCols) ? conflictCols : conflictCols.split(",");
    const before = filtered.length;
    filtered = filtered.filter((r) => pkCols.every((c) => r[c.trim()] != null));
    const skipped = before - filtered.length;
    if (skipped) logRun({ phase: "skip_null_pk", table: sbTable, count: skipped });
    // BQ→Supabase column renames for transactions:
    //   id                          → transaction_id  (PK)
    //   product_specific_asset_id   → moment_id       (FK to moments)
    //   updated_at                  → source_updated_at  (Supabase has its own auto-managed updated_at trigger)
    if (sbTable === "transactions") {
      for (const r of filtered) {
        if ("id" in r) { r.transaction_id = r.id; delete r.id; }
        if ("product_specific_asset_id" in r) { r.moment_id = r.product_specific_asset_id; delete r.product_specific_asset_id; }
        if ("updated_at" in r) { r.source_updated_at = r.updated_at; delete r.updated_at; }
      }
    }
    // Normalize BQ double-underscore typos to Supabase single-underscore names.
    // Currently known: plays.away_team__historical_name -> away_team_historical_name.
    if (sbTable === "plays") {
      for (const r of filtered) {
        if ("away_team__historical_name" in r) {
          r.away_team_historical_name = r.away_team__historical_name;
          delete r.away_team__historical_name;
        }
      }
    }
    const n = await upsertChunk(
      sb,
      sbTable,
      filtered,
      sbTable === "transactions" ? "transaction_id" : conflictCols,
    );
    rowsUpserted += n;
    batch = [];
  };

  for await (const page of streamQuery(sql, params, CONFIG.bqPageSize)) {
    for (const raw of page) {
      const normalized = normalizeRow(raw);
      const cv = normalized[cursorField];
      if (cv != null) {
        if (maxCursor == null || String(cv) > String(maxCursor)) maxCursor = cv;
      }
      batch.push(normalized);
      rowsPulled++;
      if (batch.length >= CONFIG.chunkRows) await flushBatch();
    }
  }
  await flushBatch();

  // Advance cursor — to the max we saw, OR to cursorEnd if provided & nothing new.
  let cursorAfter = maxCursor ?? cursorEnd ?? cursorStart;
  if (cursorField === "date" && typeof cursorAfter === "string") {
    cursorAfter = cursorAfter.slice(0, 10);
  }

  // Parallel-driver workers own disjoint slices but the cursor row is shared.
  // If multiple workers raced to write it, the highest slice would lose to the
  // earliest. Skip the cursor write in worker mode; the incremental cron will
  // resync the tail safely.
  if (process.env.ETL_WORKER_ID == null) {
    await writeCursor(sb, tableKey, {
      last_cursor_at:
        cursorField === "date"
          ? `${String(cursorAfter).slice(0, 10)}T00:00:00Z`
          : new Date(cursorAfter).toISOString(),
      last_row_count: rowsPulled,
      last_error: null,
    });
  }

  const durationMs = Date.now() - started;
  logRun({
    table: tableKey,
    rowsPulled,
    rowsUpserted,
    scanBytes,
    cursorBefore: cursorStart,
    cursorAfter,
    durationMs,
  });

  return { rowsPulled, rowsUpserted, scanBytes, cursorAfter, durationMs };
}

// Resolve the cursor window for an incremental sync: pick up where we left off,
// minus overlap minutes for late-arriving rows.
export async function resolveIncrementalCursor(sb, tableKey) {
  const t = CONFIG.tables[tableKey];
  const cursor = await readCursor(sb, tableKey);

  // First run ever — start from epoch-ish (or 30 days ago for transactions to limit blast)
  if (!cursor || !cursor.last_cursor_at) {
    if (t.cursor === "date") return "2018-01-01";
    return "2018-01-01T00:00:00Z";
  }

  const last = new Date(cursor.last_cursor_at);
  // Apply overlap window for late-arrivers
  const overlapMs = CONFIG.cursorOverlapMinutes * 60 * 1000;
  const adjusted = new Date(last.getTime() - overlapMs);

  if (t.cursor === "date") return adjusted.toISOString().slice(0, 10);
  return adjusted.toISOString();
}

// Should we skip this table on a given incremental tick? (staleHours throttle)
export async function shouldSkipForFreshness(sb, tableKey) {
  const t = CONFIG.tables[tableKey];
  if (!t.staleHours) return false;
  const cursor = await readCursor(sb, tableKey);
  if (!cursor || !cursor.last_run_at) return false;
  // Require a SUCCESSFUL prior sync, not just an attempt. Without this, a failed
  // first run sets last_run_at and poisons freshness for 24h with zero rows.
  if (!cursor.last_cursor_at) return false;
  if (cursor.last_error) return false;
  const ageHours = (Date.now() - new Date(cursor.last_run_at).getTime()) / 3_600_000;
  return ageHours < t.staleHours;
}
