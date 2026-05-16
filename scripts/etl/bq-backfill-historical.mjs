// Historical backfill — pulls all data from BQ into Supabase in weekly chunks.
// Idempotent (ON CONFLICT upserts). Resumable via topshot._etl_cursors.
//
// Usage:
//   ETL_BACKFILL_START=2018-01-01 ETL_BACKFILL_END=2026-05-15 \
//     node scripts/etl/bq-backfill-historical.mjs
//
// Optional: --tables=transactions,moments (default = all in CONFIG.syncOrder)

import { CONFIG } from "./etl-config.mjs";
import { sbAdmin } from "./lib/sb-client.mjs";
import {
  chunkInterval,
  writeCursor,
  writeHeartbeat,
  tryAdvisoryLock,
  releaseAdvisoryLock,
  logRun,
  loadSupabaseColumns,
} from "./lib/etl-helpers.mjs";
import { syncTable } from "./lib/sync.mjs";

function parseTablesArg() {
  const arg = process.argv.find((a) => a.startsWith("--tables="));
  if (!arg) return CONFIG.syncOrder;
  const requested = arg.slice("--tables=".length).split(",").map((s) => s.trim());
  // Preserve CONFIG.syncOrder for FK safety
  return CONFIG.syncOrder.filter((t) => requested.includes(t));
}

async function main() {
  const start = process.env.ETL_BACKFILL_START;
  const end = process.env.ETL_BACKFILL_END ?? new Date().toISOString();
  if (!start) throw new Error("ETL_BACKFILL_START required (YYYY-MM-DD)");

  const startIso = start.includes("T") ? start : `${start}T00:00:00Z`;
  const endIso = end.includes("T") ? end : `${end}T00:00:00Z`;

  const sb = sbAdmin();
  const tables = parseTablesArg();

  // Resolve Supabase column allowlist once — eliminates per-chunk self-heal retries.
  const targetTables = tables.map((k) => CONFIG.tables[k].sb);
  sb._columnsByTable = await loadSupabaseColumns(sb, targetTables);

  logRun({ phase: "backfill_start", start: startIso, end: endIso, tables });
  logRun({
    phase: "preresolve_columns",
    tables: [...sb._columnsByTable.entries()].map(([t, s]) => ({ table: t, cols: s.size })),
  });

  const totals = {};
  for (const tableKey of tables) {
    // In parallel-driver mode (ETL_WORKER_ID set), each worker owns a disjoint
    // slice — advisory lock would deadlock all but one. Namespace by worker id.
    const workerId = process.env.ETL_WORKER_ID;
    const lockKey = workerId != null
      ? `topshot_etl_cursor_${tableKey}_w${workerId}`
      : `topshot_etl_cursor_${tableKey}`;
    if (!(await tryAdvisoryLock(sb, lockKey))) {
      logRun({ phase: "skip_locked", table: tableKey });
      continue;
    }

    let pulled = 0;
    let upserted = 0;
    let scan = 0;
    try {
      // Small / static tables: one shot, no chunking needed.
      const t = CONFIG.tables[tableKey];
      if (["players", "teams", "sets", "plays", "drops"].includes(tableKey)) {
        const r = await syncTable(sb, tableKey, "2018-01-01T00:00:00Z", null);
        pulled += r.rowsPulled;
        upserted += r.rowsUpserted;
        scan += r.scanBytes;
      } else {
        // Large/append-heavy: chunked. Per-table override via backfillChunkDays (default 7).
        const chunkDays = t.backfillChunkDays ?? 7;
        for (const chunk of chunkInterval(startIso, endIso, chunkDays)) {
          try {
            const r = await syncTable(sb, tableKey, chunk.start, chunk.end);
            pulled += r.rowsPulled;
            upserted += r.rowsUpserted;
            scan += r.scanBytes;
          } catch (err) {
            await writeCursor(sb, tableKey, {
              last_cursor_at: chunk.start,
              last_error: String(err).slice(0, 1000),
            });
            throw new Error(`backfill failed for ${tableKey} chunk ${chunk.start}: ${err}`);
          }
        }
      }
      totals[tableKey] = { pulled, upserted, scan };
    } finally {
      await releaseAdvisoryLock(sb, lockKey);
    }
  }

  await writeHeartbeat(sb, {
    last_run_duration_ms: 0, // backfill doesn't update heartbeat duration
    tables_synced_count: Object.keys(totals).length,
  });

  logRun({ phase: "backfill_done", totals });
}

main().catch((err) => {
  // Supabase errors are POJOs (not Error instances) and stringify to "[object Object]".
  const msg = err?.message ?? err?.error ?? err?.code ?? JSON.stringify(err);
  logRun({ phase: "backfill_fatal", error: msg, stack: err?.stack });
  process.exit(1);
});
