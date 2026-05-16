// Incremental sync — runs every 15 minutes from GH Actions.
// Pulls rows where cursor_field > last_cursor (with overlap window) and upserts.
// Skips static-ish tables if last_run is within their staleHours window.

import { CONFIG } from "./etl-config.mjs";
import { sbAdmin } from "./lib/sb-client.mjs";
import {
  writeCursor,
  writeHeartbeat,
  tryAdvisoryLock,
  releaseAdvisoryLock,
  logRun,
} from "./lib/etl-helpers.mjs";
import { syncTable, resolveIncrementalCursor, shouldSkipForFreshness } from "./lib/sync.mjs";

async function main() {
  const started = Date.now();
  const sb = sbAdmin();
  const summary = {};

  logRun({ phase: "incremental_start", at: new Date().toISOString() });

  for (const tableKey of CONFIG.syncOrder) {
    const lockKey = `topshot_etl_cursor_${tableKey}`;
    if (!(await tryAdvisoryLock(sb, lockKey))) {
      logRun({ phase: "skip_locked", table: tableKey });
      summary[tableKey] = { skipped: "locked" };
      continue;
    }

    try {
      if (await shouldSkipForFreshness(sb, tableKey)) {
        logRun({ phase: "skip_fresh", table: tableKey });
        summary[tableKey] = { skipped: "fresh" };
        continue;
      }

      const cursor = await resolveIncrementalCursor(sb, tableKey);
      try {
        const r = await syncTable(sb, tableKey, cursor, null);
        summary[tableKey] = {
          rowsPulled: r.rowsPulled,
          rowsUpserted: r.rowsUpserted,
          durationMs: r.durationMs,
        };
      } catch (err) {
        await writeCursor(sb, tableKey, {
          last_error: (err?.message || err?.error || JSON.stringify(err)).slice(0, 1000),
        });
        summary[tableKey] = { error: (err?.message || err?.error || JSON.stringify(err)) };
        throw err;
      }
    } finally {
      await releaseAdvisoryLock(sb, lockKey);
    }
  }

  const totalDuration = Date.now() - started;
  await writeHeartbeat(sb, {
    last_run_duration_ms: totalDuration,
    tables_synced_count: Object.values(summary).filter((s) => !s.skipped && !s.error).length,
  });

  logRun({
    phase: "incremental_done",
    durationMs: totalDuration,
    summary,
  });
}

main().catch((err) => {
  logRun({ phase: "incremental_fatal", error: (err?.message || err?.error || JSON.stringify(err)), stack: err?.stack });
  process.exit(1);
});
