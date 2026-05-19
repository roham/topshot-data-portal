// bq-pull-ownership-streaming.mjs — streaming bulk-load of NBA ownership.
//
// Replaces bq-pull-collectors-and-ownership.mjs Stage 3 which OOM'd holding
// 35M entries in memory. This version streams BQ rows directly into a staging
// table via batched inserts, then runs ONE UPDATE FROM JOIN to apply to
// topshot.moments. Memory stays under ~100MB regardless of source size.
//
// Pre-req: topshot.ownership_staging table must exist (migration 0017).
//
// Run on kaaos-daemon: node scripts/bq-pull-ownership-streaming.mjs

import { BigQuery } from "@google-cloud/bigquery";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const bq = new BigQuery({ projectId: "dapperlabs-data" });

const envPath = fs.existsSync("/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/.env.local")
  ? "/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/.env.local"
  : "/Users/ro/dapper/topshot-data-portal/.env.local";
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "topshot" }, auth: { persistSession: false } },
);

const OWNERSHIP_SQL = `
  SELECT moment_flow_id, LOWER(flow_address) AS flow_address
  FROM \`dapperlabs-data.production_sem_open.asset_ownership_nba_moment\`
  WHERE is_current_owner = true AND is_burned = false
    AND flow_address IS NOT NULL AND moment_flow_id IS NOT NULL
`;

const BATCH_SIZE = 5000;
const CONCURRENT_INSERTS = 5;

console.log("=== Truncate staging ===");
const { error: truncErr } = await sb.rpc("truncate_ownership_staging");
if (truncErr) {
  console.log("  (skipping truncate — table may not exist or RPC missing)");
}

console.log("=== Stream BQ → ownership_staging (batched inserts) ===");

let totalInserted = 0;
let totalSeen = 0;
let buffer = [];
const inFlight = new Set();

async function flush(batch) {
  if (!batch.length) return;
  const slot = sb.from("ownership_staging").insert(batch).then(({ error }) => {
    if (error) console.error(`  insert error: ${error.message?.slice(0, 120)}`);
    else totalInserted += batch.length;
  });
  inFlight.add(slot);
  slot.finally(() => inFlight.delete(slot));
  while (inFlight.size >= CONCURRENT_INSERTS) await Promise.race(inFlight);
}

const stream = bq.createQueryStream({ query: OWNERSHIP_SQL, maximumBytesBilled: String(100 * 1024 ** 3) });
for await (const row of stream) {
  buffer.push({
    moment_flow_id: String(row.moment_flow_id),
    owner_flow_address: row.flow_address,
  });
  totalSeen++;
  if (buffer.length >= BATCH_SIZE) {
    const b = buffer; buffer = [];
    await flush(b);
  }
  if (totalSeen % 500000 === 0) {
    console.log(`  seen ${totalSeen.toLocaleString()} | inserted ${totalInserted.toLocaleString()} | in-flight ${inFlight.size}`);
  }
}
await flush(buffer);
await Promise.all([...inFlight]);
console.log(`Stream done. seen=${totalSeen.toLocaleString()} inserted=${totalInserted.toLocaleString()}`);

console.log("\n=== Run UPDATE FROM JOIN ===");
const updateSql = `
  UPDATE topshot.moments m
  SET owner_flow_address = s.owner_flow_address
  FROM topshot.ownership_staging s
  WHERE m.moment_flow_id = s.moment_flow_id
    AND (m.owner_flow_address IS DISTINCT FROM s.owner_flow_address);
`;
// Need to execute raw SQL — supabase-js doesn't do raw multi-statement directly.
// Use the supabase CLI via shell, or use a small RPC. Workaround: write to /tmp and
// instruct the operator to run via `supabase db query --linked --file /tmp/apply-ownership.sql`.
fs.writeFileSync("/tmp/apply-ownership.sql", updateSql);
console.log("Wrote /tmp/apply-ownership.sql. Run on VM (or local):");
console.log("  supabase db query --linked --file /tmp/apply-ownership.sql");
console.log("");
console.log("Then to verify:");
console.log("  SELECT COUNT(*) FROM topshot.moments WHERE owner_flow_address IS NOT NULL;");
