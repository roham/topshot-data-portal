#!/usr/bin/env node
// bq-pull-ownership-to-csv.mjs
//
// Stream BigQuery `dapperlabs-data.production_sem_open.asset_ownership_nba_moment`
// to a local CSV at /tmp/ownership.csv. Low-memory (streaming, ~50MB heap regardless
// of source size). Result is loaded into Supabase via psql \COPY in a follow-up step.
//
// Architecture rationale (per task ledger b0689b8b §1 + V7 handover §6):
//   - Previous attempts died at 35M rows in-memory-Map (OOM) or PostgREST bulk-PATCH
//     (schema-cache thrash under concurrent writers).
//   - Server-side COPY into `topshot.ownership_staging` then a single UPDATE FROM JOIN
//     is the only path that scales without resource contention.
//
// PII shape gate (Task Ledger Step 0.6 — FM3 guard, baked in NOT bolted on):
//   - Every Nth row (default 100,000), check the sampled `flow_address` against the
//     Flow-address regex `^[a-f0-9]{16}$` (16 hex chars, no `0x` prefix per import-fandom).
//   - If ANY sampled value matches a known OAuth shape (`auth0|`, `google-oauth2|`,
//     `apple|`), ABORT with non-zero exit. Refuse to silently write PII as ownership.
//   - Last session's PII incident wrote 4.45M OAuth IDs to `owner_flow_address`. This
//     gate exists so it can't happen again — when Roham challenged "are u sure" I
//     doubled down; this is the gate that exists outside my judgment.
//
// Run:
//   cd /Users/ro/dapper/topshot-data-portal
//   node --max-old-space-size=2048 --env-file=.env.local scripts/bq-pull-ownership-to-csv.mjs
//
// Output:
//   /tmp/ownership.csv — CSV with header line "moment_flow_id,owner_flow_address" + ~29.6M rows
//
// Single-writer Supabase contract (Task Ledger Step 0.3):
//   - This script does NOT touch Supabase. CSV-to-DB happens in a separate step via psql.
//   - No lockfile required for this script; only the psql \COPY + UPDATE FROM JOIN need
//     the single-writer guarantee.

import { BigQuery } from "@google-cloud/bigquery";
import { createWriteStream, existsSync, statSync } from "node:fs";
import { unlink } from "node:fs/promises";

const OUTPUT_PATH = "/tmp/ownership.csv";
const PII_SAMPLE_INTERVAL = 100_000;
const PROGRESS_INTERVAL = 1_000_000;

const OAUTH_PREFIXES = ["auth0|", "google-oauth2|", "apple|", "github|", "facebook|"];
const FLOW_HEX_RE = /^[a-f0-9]{16}$/i;

function shapeCheck(addr, rowIndex) {
  if (typeof addr !== "string" || addr.length === 0) {
    throw new Error(`PII gate: row ${rowIndex}: flow_address is not a string (${typeof addr} = ${JSON.stringify(addr)?.slice(0, 80)})`);
  }
  for (const px of OAUTH_PREFIXES) {
    if (addr.startsWith(px)) {
      throw new Error(`PII gate: row ${rowIndex}: OAuth-shape detected (prefix "${px}"). Source data is contaminated; refusing to write PII as ownership. Sample: ${addr.slice(0, 60)}`);
    }
  }
  if (!FLOW_HEX_RE.test(addr)) {
    throw new Error(`PII gate: row ${rowIndex}: flow_address does not match Flow-hex shape ^[a-f0-9]{16}$. Sample: ${JSON.stringify(addr).slice(0, 80)}`);
  }
}

async function main() {
  if (existsSync(OUTPUT_PATH)) {
    const sz = statSync(OUTPUT_PATH).size;
    console.log(`[pre-flight] removing stale ${OUTPUT_PATH} (${sz} bytes)`);
    await unlink(OUTPUT_PATH);
  }

  const bq = new BigQuery({ projectId: "dapperlabs-data" });

  // Probe scan size first to confirm sane bytes-billed envelope.
  console.log("[probe] dry-run to estimate scan size...");
  const dry = await bq.createQueryJob({
    query: `
      SELECT moment_flow_id, LOWER(flow_address) AS flow_address
        FROM \`dapperlabs-data.production_sem_open.asset_ownership_nba_moment\`
       WHERE is_current_owner = true
         AND is_burned       = false
         AND flow_address    IS NOT NULL
         AND moment_flow_id  IS NOT NULL
    `,
    dryRun: true,
    useLegacySql: false,
  });
  const bytes = Number(dry[0].metadata?.statistics?.totalBytesProcessed ?? 0);
  const gb = (bytes / 1024 ** 3).toFixed(2);
  console.log(`[probe] estimated scan: ${gb} GB (${bytes.toLocaleString()} bytes)`);
  if (bytes > 100 * 1024 ** 3) {
    throw new Error(`[probe] scan exceeds 100GB cap (${gb}GB). Aborting before paid run.`);
  }

  // PII pre-flight: sample 20 rows from BQ source before the full stream begins.
  console.log("[pre-flight] PII shape gate: sampling 20 rows from BQ source...");
  const [sample] = await bq.query({
    query: `
      SELECT LOWER(flow_address) AS flow_address
        FROM \`dapperlabs-data.production_sem_open.asset_ownership_nba_moment\`
       WHERE is_current_owner = true
         AND is_burned       = false
         AND flow_address    IS NOT NULL
       LIMIT 20
    `,
    useLegacySql: false,
  });
  for (let i = 0; i < sample.length; i++) {
    shapeCheck(sample[i].flow_address, i);
  }
  console.log(`[pre-flight] PII gate PASS — 20/20 rows are Flow-hex shape ^[a-f0-9]{16}$`);

  // Full streaming pull
  console.log("[stream] starting full pull → CSV...");
  const out = createWriteStream(OUTPUT_PATH);
  out.write("moment_flow_id,owner_flow_address\n");

  const stream = bq.createQueryStream({
    query: `
      SELECT moment_flow_id, LOWER(flow_address) AS flow_address
        FROM \`dapperlabs-data.production_sem_open.asset_ownership_nba_moment\`
       WHERE is_current_owner = true
         AND is_burned       = false
         AND flow_address    IS NOT NULL
         AND moment_flow_id  IS NOT NULL
    `,
    maximumBytesBilled: String(100 * 1024 ** 3),
    useLegacySql: false,
  });

  let count = 0;
  let lastLog = Date.now();
  for await (const row of stream) {
    count++;
    if (count % PII_SAMPLE_INTERVAL === 0) {
      shapeCheck(row.flow_address, count);
    }
    // CSV-escape not needed: moment_flow_id is int-shaped, flow_address is hex-only
    if (!out.write(`${row.moment_flow_id},${row.flow_address}\n`)) {
      await new Promise((resolve) => out.once("drain", resolve));
    }
    if (count % PROGRESS_INTERVAL === 0) {
      const now = Date.now();
      const elapsed = (now - lastLog) / 1000;
      const rate = Math.round(PROGRESS_INTERVAL / elapsed);
      console.log(`[stream] wrote ${count.toLocaleString()} rows (${rate.toLocaleString()} rows/s)`);
      lastLog = now;
    }
  }

  await new Promise((resolve) => out.end(resolve));
  console.log(`[done] wrote ${count.toLocaleString()} rows to ${OUTPUT_PATH}`);

  // Verification — final size + tail
  const fsz = statSync(OUTPUT_PATH).size;
  console.log(`[verify] CSV size: ${(fsz / 1024 ** 2).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
