// import-fandom-ownership.mjs — bulk-mirror ownership + collector identity from fandom-v3 → topshot
//
// Source: /Users/ro/dapper/claude-conversations/dapperlabs-v2-i/fandom-v3/data/*.json
//   - serialsSampled[]: { flowId, serial, ownerFlowAddress } — moment→address mapping
//   - owners[]: { flowAddress, username, dapperID, profileImageUrl, topshotScore, type, holdings } — collector identity
//
// Destinations:
//   - topshot.collectors (UPSERT)
//   - topshot.moments.owner_flow_address (UPDATE WHERE moment_flow_id=...)
//
// Run: node --env-file=/Users/ro/dapper/topshot-data-portal/.env.local /tmp/import-fandom-ownership.mjs

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const FANDOM_DATA_DIR = "/Users/ro/dapper/claude-conversations/dapperlabs-v2-i/fandom-v3/data";

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  { db: { schema: "topshot" }, auth: { persistSession: false } },
);

// 1. Walk every data/*.json
console.log("Step 1: scanning fandom-v3 data files...");
const files = fs.readdirSync(FANDOM_DATA_DIR).filter((f) => /^\d+\.json$/.test(f));
console.log(`  ${files.length} player files`);

// Moment ownership: moment_flow_id → owner_flow_address
const momentOwnership = new Map();
// Collector identity: flow_address → { username, dapperID, profileImageUrl, topshotScore, type, holdings (max across files) }
const collectors = new Map();

let invalidFlow = 0;
let totalSerialsScanned = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(FANDOM_DATA_DIR, file), "utf8");
  const data = JSON.parse(raw);

  // Moment ownership from serialsSampled
  for (const ed of data.editions || []) {
    for (const s of ed.serialsSampled || []) {
      totalSerialsScanned++;
      const flowId = s.flowId != null ? String(s.flowId) : null;
      const owner = s.ownerFlowAddress;
      if (!flowId || !owner || !/^[a-f0-9]{16}$/i.test(owner)) {
        invalidFlow++;
        continue;
      }
      momentOwnership.set(flowId, owner.toLowerCase());
    }
  }

  // Collector identity from owners[]
  for (const o of data.owners || []) {
    const addr = o.flowAddress?.toLowerCase();
    if (!addr || !/^[a-f0-9]{16}$/.test(addr)) continue;
    const existing = collectors.get(addr);
    const candidate = {
      flow_address: addr,
      username: o.username || null,
      dapper_id: o.dapperID || null,
      profile_image_url: o.profileImageUrl || null,
      topshot_score: o.topshotScore != null ? Math.floor(Number(o.topshotScore)) : null,
      type: o.type === "nc" ? "nc" : "user",
      first_seen_holdings: o.holdings ?? 0,
    };
    if (!existing) {
      collectors.set(addr, candidate);
    } else {
      // Merge: prefer non-null username, larger holdings count
      if (!existing.username && candidate.username) existing.username = candidate.username;
      if (!existing.dapper_id && candidate.dapper_id) existing.dapper_id = candidate.dapper_id;
      if (!existing.profile_image_url && candidate.profile_image_url) existing.profile_image_url = candidate.profile_image_url;
      if (existing.topshot_score == null && candidate.topshot_score != null) existing.topshot_score = candidate.topshot_score;
      if ((candidate.first_seen_holdings ?? 0) > (existing.first_seen_holdings ?? 0)) {
        existing.first_seen_holdings = candidate.first_seen_holdings;
      }
    }
  }
}

console.log(`Scanned ${totalSerialsScanned} serials. Invalid skipped: ${invalidFlow}.`);
console.log(`Unique moment ownership pairs: ${momentOwnership.size}`);
console.log(`Unique collectors: ${collectors.size}`);
const namedCollectors = [...collectors.values()].filter((c) => c.username).length;
console.log(`  with username (Dapper custodial): ${namedCollectors}`);
console.log(`  non-custodial (no username): ${collectors.size - namedCollectors}`);

// 2. Upsert collectors in batches of 500
console.log("\nStep 2: upserting collectors...");
const collectorRows = [...collectors.values()];
const BATCH = 500;
let upserted = 0;
for (let i = 0; i < collectorRows.length; i += BATCH) {
  const chunk = collectorRows.slice(i, i + BATCH);
  const { error } = await sb.from("collectors").upsert(chunk, { onConflict: "flow_address" });
  if (error) {
    console.error(`  batch ${i}/${collectorRows.length} failed: ${error.message}`);
    // If schema cache miss, wait + retry once
    if (error.message?.includes("schema cache") || error.message?.includes("relation") || error.code === "PGRST205") {
      console.log("  schema cache miss — sleeping 10s + retry");
      await new Promise((r) => setTimeout(r, 10000));
      const retry = await sb.from("collectors").upsert(chunk, { onConflict: "flow_address" });
      if (retry.error) {
        console.error("  retry failed:", retry.error.message);
        continue;
      }
    } else {
      continue;
    }
  }
  upserted += chunk.length;
  if ((i / BATCH) % 10 === 0) console.log(`  ${upserted}/${collectorRows.length} collectors upserted`);
}
console.log(`Done: ${upserted} collectors upserted.`);

// 3. Update moments.owner_flow_address. Group by owner_flow_address (one PATCH per owner with IN list)
console.log("\nStep 3: updating moments.owner_flow_address...");
const byOwner = new Map();
for (const [flowId, owner] of momentOwnership) {
  if (!byOwner.has(owner)) byOwner.set(owner, []);
  byOwner.get(owner).push(flowId);
}
console.log(`  ${byOwner.size} distinct owners across moments`);

let totalUpdated = 0;
let totalAttempted = 0;
let ownersDone = 0;
const owners = [...byOwner.entries()];

const CONCURRENCY = 20;
const CHUNK_FLOW_IDS = 100; // PostgREST IN-list cap

async function updateOwner(owner, flowIds) {
  let updatedForOwner = 0;
  for (let i = 0; i < flowIds.length; i += CHUNK_FLOW_IDS) {
    const chunk = flowIds.slice(i, i + CHUNK_FLOW_IDS);
    totalAttempted += chunk.length;
    const { data, error } = await sb
      .from("moments")
      .update({ owner_flow_address: owner })
      .in("moment_flow_id", chunk)
      .select("moment_id");
    if (error) {
      // skip chunk on error; log first failures only
      if (totalAttempted < 5000) console.warn(`  ${owner.slice(0, 8)}.. chunk fail: ${error.message?.slice(0, 80)}`);
      continue;
    }
    updatedForOwner += data?.length ?? 0;
  }
  return updatedForOwner;
}

let nextIdx = 0;
async function worker() {
  while (nextIdx < owners.length) {
    const idx = nextIdx++;
    const [owner, flowIds] = owners[idx];
    const n = await updateOwner(owner, flowIds);
    totalUpdated += n;
    ownersDone++;
    if (ownersDone % 500 === 0 || ownersDone === owners.length) {
      console.log(`  [${ownersDone}/${owners.length} owners] ${totalUpdated} rows updated`);
    }
  }
}
await Promise.all(Array(CONCURRENCY).fill(null).map(worker));

console.log("\n=== DONE ===");
console.log(`Source pairs: ${momentOwnership.size}`);
console.log(`Update attempts: ${totalAttempted}`);
console.log(`Rows actually updated: ${totalUpdated}`);

// 4. Post-verify
const { count: postOwner } = await sb.from("moments").select("*", { count: "exact", head: true }).not("owner_flow_address", "is", null);
const { count: postTotal } = await sb.from("moments").select("*", { count: "exact", head: true });
console.log(`\nFinal moments.owner_flow_address coverage: ${postOwner} / ${postTotal} = ${((postOwner / postTotal) * 100).toFixed(1)}%`);

const { count: collectorTotal } = await sb.from("collectors").select("*", { count: "exact", head: true });
const { count: collectorNamed } = await sb.from("collectors").select("*", { count: "exact", head: true }).not("username", "is", null);
console.log(`topshot.collectors total: ${collectorTotal}, with username: ${collectorNamed}`);
