// Targeted moments backfill — pulls only the moments that have been
// transacted (i.e. show up in the BQ transaction view). For making the MV
// JOIN work, this is the strict superset of what we need. ~16.5M referenced
// moments vs 52M total table.
//
// Strategy:
//   1) Query BQ for distinct moment_ids referenced in NBA Top Shot transactions
//      (optionally scoped to a recent window).
//   2) For each chunk of moment_ids, pull the matching moments rows.
//   3) Upsert to Supabase.
//
// This complements the chronological bq-backfill-parallel.mjs by fast-pathing
// the data needed for MV correctness.
//
// Usage:
//   ETL_BACKFILL_TX_WINDOW=24h node scripts/etl/bq-backfill-moments-by-tx.mjs
//   ETL_BACKFILL_TX_WINDOW=7d  node scripts/etl/bq-backfill-moments-by-tx.mjs
//   ETL_BACKFILL_TX_WINDOW=all node scripts/etl/bq-backfill-moments-by-tx.mjs

import { CONFIG } from "./etl-config.mjs";
import { sbAdmin } from "./lib/sb-client.mjs";
import {
  loadSupabaseColumns,
  pii_filter,
  upsertChunk,
  logRun,
} from "./lib/etl-helpers.mjs";
import { streamQuery, normalizeRow } from "./lib/bq-client.mjs";

const WINDOW_TO_SQL = {
  "24h": "TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)",
  "7d": "TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)",
  "30d": "TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)",
  "1y": "TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)",
  "all": null,
};

async function main() {
  const windowKey = process.env.ETL_BACKFILL_TX_WINDOW ?? "24h";
  if (!(windowKey in WINDOW_TO_SQL)) {
    throw new Error(`unknown window ${windowKey}; use one of ${Object.keys(WINDOW_TO_SQL).join(",")}`);
  }
  const sb = sbAdmin();
  sb._columnsByTable = await loadSupabaseColumns(sb, ["moments"]);
  logRun({ phase: "tx_backfill_start", window: windowKey });

  // Step 1: get distinct moment_ids from BQ transactions within window.
  const ts = WINDOW_TO_SQL[windowKey];
  const idsSql = `
    SELECT DISTINCT product_specific_asset_id AS moment_id
    FROM \`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.transaction\`
    WHERE client_safe_name = 'nba_top_shot'
      AND transaction_state_id = 'SUCCEEDED'
      AND product_specific_asset_id IS NOT NULL
      ${ts ? `AND updated_at >= ${ts}` : ""}
  `.trim();
  const ids = new Set();
  for await (const page of streamQuery(idsSql, {}, 50000)) {
    for (const row of page) {
      const norm = normalizeRow(row);
      if (norm.moment_id) ids.add(norm.moment_id);
    }
  }
  const idList = [...ids];
  logRun({ phase: "tx_backfill_ids", count: idList.length });

  // Step 2: pull moments in batches of N ids.
  const batchSize = 10000;
  const moments = CONFIG.tables.moments;
  const fqn = `\`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.${moments.bq}\``;
  let totalPulled = 0;
  let totalUpserted = 0;

  for (let i = 0; i < idList.length; i += batchSize) {
    const slice = idList.slice(i, i + batchSize);
    const sql = `
      SELECT *
      FROM ${fqn}
      WHERE moment_id IN UNNEST(@ids)
    `.trim();
    let batchPulled = 0;
    let batchUpserted = 0;
    let batch = [];
    for await (const page of streamQuery(sql, { ids: slice }, 10000)) {
      for (const raw of page) {
        const normalized = normalizeRow(raw);
        const filtered = pii_filter(normalized, "moments");
        if (!filtered.moment_id) continue;
        batch.push(filtered);
        batchPulled++;
        if (batch.length >= CONFIG.chunkRows) {
          const n = await upsertChunk(sb, "moments", batch, moments.pk);
          batchUpserted += n;
          batch = [];
        }
      }
    }
    if (batch.length) {
      const n = await upsertChunk(sb, "moments", batch, moments.pk);
      batchUpserted += n;
    }
    totalPulled += batchPulled;
    totalUpserted += batchUpserted;
    logRun({
      phase: "tx_backfill_progress",
      ids_done: Math.min(i + batchSize, idList.length),
      ids_total: idList.length,
      batch_pulled: batchPulled,
      total_pulled: totalPulled,
    });
  }

  logRun({ phase: "tx_backfill_done", totalPulled, totalUpserted });
}

main().catch((err) => {
  const msg = err?.message ?? err?.error ?? err?.code ?? JSON.stringify(err);
  logRun({ phase: "tx_backfill_fatal", error: msg, stack: err?.stack });
  process.exit(1);
});
