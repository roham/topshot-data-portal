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

  logRun({ phase: "backfill_start", start: startIso, end: endIso, tables });

  const totals = {};
  for (const tableKey of tables) {
    const lockKey = `topshot_etl_cursor_${tableKey}`;
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
  logRun({ phase: "backfill_fatal", error: String(err), stack: err?.stack });
  process.exit(1);
});
