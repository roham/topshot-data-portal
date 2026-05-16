// Parallel historical backfill — splits the date range across N child processes,
// each running the existing bq-backfill-historical.mjs over a contiguous slice.
//
// Workers are independent (no shared cursor) — each slice has fixed start+end
// and idempotency is guaranteed by ON CONFLICT DO UPDATE in upsertChunk.
//
// Usage:
//   ETL_BACKFILL_START=2025-05-16 ETL_BACKFILL_END=2026-05-16 \
//   ETL_BACKFILL_WORKERS=4 \
//     node scripts/etl/bq-backfill-parallel.mjs --tables=transactions,moments
//
// Worker logs land in /tmp/backfill-worker-N.log (stdout) and /tmp/backfill-worker-N.err (stderr).
// Main process tails each worker's last status line and surfaces a summary at the end.

import { spawn } from "node:child_process";
import { createWriteStream, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { partitionRange } from "./lib/etl-helpers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORICAL = path.join(__dirname, "bq-backfill-historical.mjs");

function parseArgs() {
  const tables = process.argv.find((a) => a.startsWith("--tables="));
  return {
    tablesArg: tables ?? null,
    start: process.env.ETL_BACKFILL_START,
    end: process.env.ETL_BACKFILL_END ?? new Date().toISOString(),
    workers: Number(process.env.ETL_BACKFILL_WORKERS ?? 4),
  };
}

function spawnWorker(idx, slice, tablesArg) {
  const logPath = `/tmp/backfill-worker-${idx}.log`;
  const errPath = `/tmp/backfill-worker-${idx}.err`;
  const log = createWriteStream(logPath, { flags: "w" });
  const err = createWriteStream(errPath, { flags: "w" });
  const args = [HISTORICAL];
  if (tablesArg) args.push(tablesArg);

  const env = {
    ...process.env,
    ETL_BACKFILL_START: slice.start,
    ETL_BACKFILL_END: slice.end,
    // Workers should not contend on the same advisory lock — namespace per worker.
    ETL_WORKER_ID: String(idx),
  };

  const child = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log);
  child.stderr.pipe(err);

  return new Promise((resolve) => {
    child.on("exit", (code) => {
      resolve({ idx, slice, code, logPath, errPath });
    });
  });
}

function tailSummary(logPath) {
  if (!existsSync(logPath)) return { last: null };
  const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
  // Walk backwards for the backfill_done line.
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.phase === "backfill_done") return { last: obj };
    } catch { /* not JSON */ }
  }
  // Fallback: just return last line parsed.
  try {
    return { last: JSON.parse(lines[lines.length - 1]) };
  } catch {
    return { last: lines[lines.length - 1] };
  }
}

async function main() {
  const { tablesArg, start, end, workers } = parseArgs();
  if (!start) throw new Error("ETL_BACKFILL_START required (YYYY-MM-DD)");

  const startIso = start.includes("T") ? start : `${start}T00:00:00Z`;
  const endIso = end.includes("T") ? end : `${end}T00:00:00Z`;
  const slices = partitionRange(startIso, endIso, workers);

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    phase: "parallel_backfill_start",
    workers,
    tables: tablesArg ?? "all",
    slices,
  }));

  const startedMs = Date.now();
  const results = await Promise.all(slices.map((slice, i) => spawnWorker(i, slice, tablesArg)));
  const durationMs = Date.now() - startedMs;

  const summaries = results.map((r) => ({
    worker: r.idx,
    slice: r.slice,
    exitCode: r.code,
    logPath: r.logPath,
    errPath: r.errPath,
    tail: tailSummary(r.logPath).last,
  }));

  // Aggregate row counts by table across workers.
  const totals = {};
  for (const s of summaries) {
    if (s.tail && typeof s.tail === "object" && s.tail.totals) {
      for (const [tbl, t] of Object.entries(s.tail.totals)) {
        if (!totals[tbl]) totals[tbl] = { pulled: 0, upserted: 0, scan: 0 };
        totals[tbl].pulled += t.pulled ?? 0;
        totals[tbl].upserted += t.upserted ?? 0;
        totals[tbl].scan += t.scan ?? 0;
      }
    }
  }

  const anyFailed = summaries.some((s) => s.exitCode !== 0);
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    phase: "parallel_backfill_done",
    durationMs,
    anyFailed,
    totals,
    workers: summaries,
  }));

  if (anyFailed) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    phase: "parallel_backfill_fatal",
    error: String(err),
    stack: err?.stack,
  }));
  process.exit(1);
});
