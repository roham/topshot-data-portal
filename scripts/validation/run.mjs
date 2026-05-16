#!/usr/bin/env node
// scripts/validation/run.mjs
//
// Continuous data-quality validation suite. Runs the battery of checks defined
// in ./checks.mjs comparing Supabase MV output to BQ ground truth, then writes
// one row per check to topshot._validation_runs.
//
// Required env:
//   SUPABASE_URL                   — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY      — service-role key (writes _validation_runs)
//   GOOGLE_APPLICATION_CREDENTIALS — BQ SA JSON path, OR gcloud ADC (local)
//   BQ_PROJECT_ID                  — defaults to dapperlabs-data
//
// Exit code: 0 on success (regardless of pass/fail tally; the runner is the
// reporter, not the gate). Non-zero only when the runner itself crashes —
// per-check failures are recorded and reported, not raised.

import { BigQuery } from "@google-cloud/bigquery";
import { CHECKS, checkPasses } from "./checks.mjs";

const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID ?? "dapperlabs-data";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[validation] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)",
  );
  process.exit(2);
}

const bq = new BigQuery({ projectId: BQ_PROJECT_ID });

// exec_sql RPC for arbitrary Postgres reads/writes. We use it for both check
// SQL (read MVs) and write-back (INSERT into _validation_runs). The supabase-js
// from() interface doesn't expose ad-hoc SQL with parameterized JSONB cleanly,
// so we stay on the RPC throughout.
//
// IMPORTANT: the server-side exec_sql() function inspects `lower(trim(sql))`
// to dispatch between SELECT and non-SELECT shapes — and Postgres `trim()`
// only strips spaces (not newlines/tabs). So we MUST collapse leading
// whitespace client-side, or a multi-line SELECT gets misclassified as DDL
// and returns {ok:true,rows_affected:N} instead of the row array.
async function execSql(sql, returnFmt = "json") {
  const cleanSql = sql.replace(/^\s+/, "").trimEnd();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: cleanSql }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`exec_sql failed (${res.status}): ${txt}`);
  }
  if (returnFmt === "raw") return res;
  const body = await res.json();
  // exec_sql signals a per-statement error inside the 200 envelope:
  //   {"error":"...","sqlstate":"..."}
  if (body && !Array.isArray(body) && body.error) {
    throw new Error(`SQL error [${body.sqlstate}]: ${body.error}`);
  }
  return body;
}

async function runBqQuery(sql) {
  const [rows] = await bq.query({ query: sql, useLegacySql: false });
  return rows.map(normalizeBqRow);
}

// Normalize BQ row: BigQueryTimestamp / Numeric / Date all expose `.value`.
function normalizeBqRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) out[k] = null;
    else if (typeof v === "object" && "value" in v) out[k] = v.value;
    else out[k] = v;
  }
  return out;
}

function asNumericForDb(v) {
  if (v == null) return "NULL";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "NULL"; // Infinity / NaN — store as null
    return String(v);
  }
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "NULL";
}

function asJsonbForDb(v) {
  // Single-quote-escape for embedded literal SQL. Postgres uses '' to escape single quotes.
  const json = JSON.stringify(v ?? null);
  const escaped = json.replace(/'/g, "''");
  return `'${escaped}'::jsonb`;
}

function asTextForDb(s) {
  if (s == null) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function runOneCheck(check) {
  const t0 = Date.now();
  const result = {
    check: check.name,
    metric: check.metric,
    threshold: check.threshold,
    passed: false,
    metricValue: null,
    bqValue: null,
    sbValue: null,
    notes: null,
    error: null,
    durationMs: 0,
  };

  try {
    const [bqRows, sbRows] = await Promise.all([
      runBqQuery(check.bqSql),
      execSql(check.sbSql),
    ]);
    if (!Array.isArray(sbRows)) {
      throw new Error(`Supabase exec_sql returned non-array: ${JSON.stringify(sbRows).slice(0, 200)}`);
    }
    const { metricValue, bqValue, sbValue, notes } = check.compute(bqRows, sbRows);
    result.metricValue = metricValue;
    result.bqValue = bqValue;
    result.sbValue = sbValue;
    result.notes = notes ?? null;
    result.passed = checkPasses(check, metricValue);
  } catch (e) {
    result.error = (e && e.message) ? e.message : String(e);
    result.notes = `error: ${result.error}`;
    result.passed = false;
  } finally {
    result.durationMs = Date.now() - t0;
  }
  return result;
}

async function persistResult(check, r) {
  // Single-row INSERT — small batch overhead is negligible at 8 checks/run.
  const sql = `
    INSERT INTO topshot._validation_runs
      (check_name, ran_at, bq_value, sb_value, metric, metric_value, threshold, passed, notes)
    VALUES
      (${asTextForDb(check.name)},
       NOW(),
       ${asJsonbForDb(r.bqValue)},
       ${asJsonbForDb(r.sbValue)},
       ${asTextForDb(check.metric)},
       ${asNumericForDb(r.metricValue)},
       ${asNumericForDb(check.threshold)},
       ${r.passed ? "TRUE" : "FALSE"},
       ${asTextForDb(r.notes)})
  `;
  await execSql(sql);
}

function fmtMetricValue(v) {
  if (v == null) return "n/a";
  if (typeof v !== "number") v = Number(v);
  if (!Number.isFinite(v)) return "∞";
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function printTable(results) {
  const w = {
    check: Math.max(5, ...results.map((r) => r.check.length)),
    metric: 12,
    value: 10,
    threshold: 10,
    status: 6,
  };
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  const sep =
    "+" + "-".repeat(w.check + 2) +
    "+" + "-".repeat(w.metric + 2) +
    "+" + "-".repeat(w.value + 2) +
    "+" + "-".repeat(w.threshold + 2) +
    "+" + "-".repeat(w.status + 2) +
    "+";
  console.log(sep);
  console.log(
    "| " + pad("check", w.check) +
    " | " + pad("metric", w.metric) +
    " | " + pad("value", w.value) +
    " | " + pad("threshold", w.threshold) +
    " | " + pad("status", w.status) + " |",
  );
  console.log(sep);
  for (const r of results) {
    console.log(
      "| " + pad(r.check, w.check) +
      " | " + pad(r.metric, w.metric) +
      " | " + pad(fmtMetricValue(r.metricValue), w.value) +
      " | " + pad(fmtMetricValue(r.threshold), w.threshold) +
      " | " + pad(r.passed ? "PASS" : "FAIL", w.status) + " |",
    );
    if (r.error) {
      console.log(`|   ERROR: ${r.error.slice(0, 200)}`);
    } else if (r.notes) {
      console.log(`|   note: ${r.notes.slice(0, 200)}`);
    }
  }
  console.log(sep);
}

async function main() {
  const t0 = Date.now();
  console.log(`[validation] starting battery — ${CHECKS.length} checks, ts=${new Date().toISOString()}`);

  // Sanity probe — confirm exec_sql is reachable before launching the battery.
  try {
    await execSql("SELECT 1");
  } catch (e) {
    console.error(`[validation] exec_sql unreachable: ${e.message}`);
    process.exit(2);
  }

  const results = [];
  for (const check of CHECKS) {
    const r = await runOneCheck(check);
    results.push(r);
    try {
      await persistResult(check, r);
    } catch (e) {
      // Persist failure shouldn't crash the runner — flag in console only.
      console.error(`[validation] persist failed for ${check.name}: ${e.message}`);
      r.persistError = e.message;
    }
  }

  printTable(results);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const errored = results.filter((r) => r.error).length;
  console.log(`[validation] complete — ${passed} passed, ${failed} failed (${errored} errors). duration=${Date.now() - t0}ms`);

  // Emit a single-line JSON summary for the GH Action to consume.
  const summary = {
    ts: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    errored,
    durationMs: Date.now() - t0,
    failingChecks: results.filter((r) => !r.passed).map((r) => r.check),
  };
  console.log("SUMMARY: " + JSON.stringify(summary));

  // Always exit 0 — the validation runner is the reporter, not the gate.
  // GH Actions consumes SUMMARY for job-level reporting.
  process.exit(0);
}

main().catch((e) => {
  console.error("[validation] fatal:", e);
  process.exit(1);
});
