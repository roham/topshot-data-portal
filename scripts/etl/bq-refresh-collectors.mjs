// bq-refresh-collectors.mjs — populate topshot.collectors (flow_address → username)
// from BigQuery user_nba_top_shot. This is collector IDENTITY: it turns hex flow
// addresses into real Top Shot usernames across the portal (/u/, holders,
// leaderboards, appreciation stories).
//
// Public fields ONLY: flow_address + username (both public on the Top Shot site).
// dapper_id and the PII-bearing `user` table are deliberately NOT touched.
//
// Idempotent upsert on flow_address. Streams + batches to stay within limits.
//
// Usage: node scripts/etl/bq-refresh-collectors.mjs
// Auth: BigQuery via GOOGLE_APPLICATION_CREDENTIALS / ADC; Supabase via service role.

import { streamQuery } from "./lib/bq-client.mjs";
import { sbAdmin } from "./lib/sb-client.mjs";
import { CONFIG } from "./etl-config.mjs";

const SRC = `\`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.user_nba_top_shot\``;
const BATCH = 1000;

async function main() {
  const sb = sbAdmin();
  const sql = `
    SELECT flow_address, ANY_VALUE(username) AS username
    FROM ${SRC}
    WHERE flow_address IS NOT NULL AND username IS NOT NULL
    GROUP BY flow_address`;

  let buffer = [];
  let written = 0;
  const flush = async () => {
    if (buffer.length === 0) return;
    const { error } = await sb.from("collectors").upsert(buffer, { onConflict: "flow_address" });
    if (error) throw new Error(`collectors upsert failed: ${error.message}`);
    written += buffer.length;
    if (written % 50000 < BATCH) console.log(`[collectors] ${written} upserted…`);
    buffer = [];
  };

  console.log(`[collectors] streaming ${SRC} …`);
  for await (const page of streamQuery(sql, {}, 10000)) {
    for (const r of page) {
      buffer.push({
        flow_address: String(r.flow_address),
        username: r.username == null ? null : String(r.username),
        type: "user",
        last_observed_at: new Date().toISOString(),
      });
      if (buffer.length >= BATCH) await flush();
    }
  }
  await flush();
  console.log(`[collectors] done — ${written} collectors upserted.`);
}

main().catch((e) => {
  console.error("[collectors] FAILED:", e.message);
  process.exit(1);
});
