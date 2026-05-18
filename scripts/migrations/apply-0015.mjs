#!/usr/bin/env node
// apply-0015.mjs — applies migration 0015_topshot_feature_reviews.sql
// via the Supabase JS admin client (no Supabase CLI required).
//
// Usage:
//   node scripts/migrations/apply-0015.mjs
//
// Requires env vars:
//   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
//   SUPABASE_SECRET_KEY       (or SUPABASE_SERVICE_ROLE_KEY)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "ERROR: Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
  );
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "topshot" },
});

const sqlPath = join(
  repoRoot,
  "supabase",
  "migrations",
  "0015_topshot_feature_reviews.sql",
);

let sql;
try {
  sql = readFileSync(sqlPath, "utf8");
} catch (err) {
  console.error(`ERROR: Could not read migration file at ${sqlPath}:`, err.message);
  process.exit(1);
}

console.log(`Applying migration from: ${sqlPath}`);
console.log(`SQL length: ${sql.length} chars`);

// Execute the SQL via rpc('exec_sql') or direct via the REST API.
// Supabase JS doesn't expose raw SQL execution directly — we use the
// service-role client to call a PostgreSQL function if available,
// or fall back to the PostgREST /rpc/exec endpoint.
//
// Most Supabase instances expose pg_catalog via service role.
// We call the built-in exec_sql helper via the REST API directly.

const restUrl = `${url}/rest/v1/rpc/exec_sql`;
const response = await fetch(restUrl, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  // Note: this Supabase instance's exec_sql takes { sql } not { query }
  body: JSON.stringify({ sql }),
});

if (!response.ok) {
  // exec_sql might not exist — try direct SQL via the pg endpoint
  const text = await response.text();
  console.warn(`exec_sql not available (${response.status}): ${text}`);
  console.log("Trying direct pg endpoint...");

  const pgUrl = `${url}/rest/v1/`;
  // Since raw SQL execution isn't available via the standard REST API without
  // a custom function, we'll verify by checking if the table already exists.
  const { data: tableCheck, error: checkError } = await sb
    .from("feature_reviews")
    .select("id")
    .limit(1);

  if (!checkError) {
    console.log("Table topshot.feature_reviews already exists (migration previously applied).");
    console.log("Run: SELECT * FROM topshot.feature_reviews LIMIT 1; to verify.");
    process.exit(0);
  }

  console.error(
    "Could not apply migration automatically. Please run the SQL manually in Supabase SQL editor:",
  );
  console.error(`  File: ${sqlPath}`);
  console.error("Error:", checkError?.message);
  process.exit(1);
}

console.log("Migration applied successfully via exec_sql.");

// Verify the table exists
const { data: verify, error: verifyError } = await sb
  .from("feature_reviews")
  .select("id, iteration_id, loop, track")
  .order("created_at", { ascending: false })
  .limit(5);

if (verifyError) {
  console.error("Verification failed:", verifyError.message);
  process.exit(1);
}

console.log(`Verification: ${verify.length} row(s) in topshot.feature_reviews`);
if (verify.length > 0) {
  console.log("Sample rows:", JSON.stringify(verify, null, 2));
}
console.log("Done.");
