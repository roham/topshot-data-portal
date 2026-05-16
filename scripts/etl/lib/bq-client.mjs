// BigQuery client w/ named-params, retries, scan budget enforcement.
// NEVER interpolate values into SQL — always pass via params.

import { BigQuery } from "@google-cloud/bigquery";
import { CONFIG } from "../etl-config.mjs";
import { retryWithBackoff } from "./etl-helpers.mjs";

let _bq = null;
function client() {
  if (_bq) return _bq;
  _bq = new BigQuery({
    projectId: CONFIG.bqProjectId,
    // GOOGLE_APPLICATION_CREDENTIALS env var resolves auth automatically.
  });
  return _bq;
}

// Run a parameterized query and return all rows. Enforces max scan budget.
// Throws on any single query that would scan > CONFIG.bqMaxBytesBilled.
export async function runQuery(sql, params = {}) {
  const bq = client();

  // 1) Dry-run to estimate scan bytes; reject if over budget.
  const dryRun = await retryWithBackoff(
    async () => {
      const [job] = await bq.createQueryJob({
        query: sql,
        params,
        dryRun: true,
        useLegacySql: false,
      });
      return job;
    },
    { maxAttempts: CONFIG.retryMax, baseMs: CONFIG.retryBaseMs },
  );
  const bytes = Number(dryRun.metadata?.statistics?.query?.totalBytesProcessed ?? 0);
  if (bytes > CONFIG.bqMaxBytesBilled) {
    throw new Error(
      `BQ scan budget exceeded: ${bytes} bytes > ${CONFIG.bqMaxBytesBilled} cap. SQL: ${sql.slice(0, 200)}`,
    );
  }

  // 2) Real query with maximum_bytes_billed safety guard.
  return retryWithBackoff(
    async () => {
      const [rows] = await bq.query({
        query: sql,
        params,
        useLegacySql: false,
        maximumBytesBilled: String(CONFIG.bqMaxBytesBilled),
      });
      return { rows, scanBytes: bytes };
    },
    { maxAttempts: CONFIG.retryMax, baseMs: CONFIG.retryBaseMs },
  );
}

// For very large pulls (backfill weekly chunks), stream rows page by page so we
// don't OOM. Yields arrays of rows of `pageSize`.
export async function* streamQuery(sql, params = {}, pageSize = CONFIG.bqPageSize) {
  const bq = client();

  // Pre-flight scan budget check
  const [dryRun] = await bq.createQueryJob({
    query: sql,
    params,
    dryRun: true,
    useLegacySql: false,
  });
  const bytes = Number(dryRun.metadata?.statistics?.query?.totalBytesProcessed ?? 0);
  if (bytes > CONFIG.bqMaxBytesBilled) {
    throw new Error(
      `BQ scan budget exceeded for stream: ${bytes} bytes. SQL: ${sql.slice(0, 200)}`,
    );
  }

  const [job] = await bq.createQueryJob({
    query: sql,
    params,
    useLegacySql: false,
    maximumBytesBilled: String(CONFIG.bqMaxBytesBilled),
  });

  let pageToken = undefined;
  do {
    const [rows, nextQuery] = await job.getQueryResults({
      maxResults: pageSize,
      pageToken,
      autoPaginate: false,
    });
    if (rows.length > 0) yield rows;
    pageToken = nextQuery?.pageToken;
  } while (pageToken);
}

// Convert BQ TIMESTAMP scalars (which deserialize as objects with .value)
// to a plain ISO string. Idempotent on plain strings.
export function bqTsToIso(ts) {
  if (ts == null) return null;
  if (typeof ts === "string") return new Date(ts).toISOString();
  if (typeof ts === "object" && "value" in ts) return new Date(ts.value).toISOString();
  return new Date(ts).toISOString();
}

// Normalize an entire BQ row: convert all BigQueryTimestamp / BigQueryDate / BigQueryNumeric
// to JSON-friendly primitives.
export function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) {
      out[k] = null;
    } else if (typeof v === "object" && "value" in v) {
      out[k] = v.value; // BQ Date, Timestamp, Numeric all expose .value
    } else {
      out[k] = v;
    }
  }
  return out;
}
