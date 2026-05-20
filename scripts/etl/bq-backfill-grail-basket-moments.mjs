// Targeted moments backfill for the Grail basket editions.
//
// Why: the Grail synthesizer surfaces supply-flavor gaps via
// topshot.mv_edition_supply_breakdown (V9 iter-7). Investigating, we found
// some basket editions have far fewer moments in our DB than in BQ
// (e.g., LeBron Holo Icon S3 Legendary: 6 in our DB, 69 in BQ).
// This closes that gap by pulling ALL moments for the Grail basket
// edition_ids — NOT just transacted ones (the existing
// bq-backfill-moments-by-tx.mjs only catches moments that have been
// transacted, missing locked-since-mint moments that never traded).
//
// Strategy:
//   1) Parse Grail basket CSV → unique edition_ids (~166).
//   2) Per-edition BQ count vs Supabase count → identify gaps.
//   3) For each gap-edition, pull ALL its moments from BQ, upsert.
//   4) Refresh mv_edition_supply_breakdown via psql.
//   5) Report before/after.
//
// Usage:
//   node scripts/etl/bq-backfill-grail-basket-moments.mjs
//   (optional flags: --dry-run, --refresh-mv-only)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { CONFIG } from "./etl-config.mjs";
import { sbAdmin } from "./lib/sb-client.mjs";
import {
  loadSupabaseColumns,
  pii_filter,
  upsertChunk,
  logRun,
} from "./lib/etl-helpers.mjs";
import { streamQuery, normalizeRow } from "./lib/bq-client.mjs";

const CSV_PATH = resolve(
  process.cwd(),
  "research/data-schema/grail-225-with-edition-ids-2026-05-19.csv",
);

function parseBasketEditionIds() {
  const text = readFileSync(CSV_PATH, "utf-8");
  const lines = text.split("\n").slice(1);
  const ids = new Set();
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const editionId = cols[5]?.trim();
    if (!editionId || !editionId.includes("+")) continue;
    ids.add(editionId);
  }
  return Array.from(ids);
}

async function bqCountsByEdition(editionIds) {
  const fqn = `\`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.asset_nba_moment\``;
  const sql = `
    SELECT edition_id, COUNT(*) AS n
    FROM ${fqn}
    WHERE edition_id IN UNNEST(@ids)
    GROUP BY edition_id
  `.trim();
  const out = new Map();
  for await (const page of streamQuery(sql, { ids: editionIds }, 10000)) {
    for (const row of page) {
      const norm = normalizeRow(row);
      if (norm.edition_id) out.set(norm.edition_id, Number(norm.n) || 0);
    }
  }
  return out;
}

async function sbCountsByEdition(sb, editionIds) {
  const out = new Map();
  for (const eid of editionIds) {
    const { count, error } = await sb
      .from("moments")
      .select("*", { count: "exact", head: true })
      .eq("edition_id", eid);
    if (error) {
      logRun({ phase: "grail_backfill_sb_count_error", edition_id: eid, error: error.message });
      continue;
    }
    out.set(eid, count ?? 0);
  }
  return out;
}

async function pullMomentsForEdition(sb, editionId) {
  const fqn = `\`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.asset_nba_moment\``;
  const sql = `
    SELECT *
    FROM ${fqn}
    WHERE edition_id = @eid
  `.trim();
  const moments = CONFIG.tables.moments;
  let pulled = 0;
  let upserted = 0;
  let batch = [];
  for await (const page of streamQuery(sql, { eid: editionId }, 5000)) {
    for (const raw of page) {
      const normalized = normalizeRow(raw);
      const filtered = pii_filter(normalized, "moments");
      if (!filtered.moment_id) continue;
      batch.push(filtered);
      pulled++;
      if (batch.length >= CONFIG.chunkRows) {
        upserted += await upsertChunk(sb, "moments", batch, moments.pk);
        batch = [];
      }
    }
  }
  if (batch.length) {
    upserted += await upsertChunk(sb, "moments", batch, moments.pk);
  }
  return { pulled, upserted };
}

function refreshMV() {
  // execFileSync with array args — no shell interpretation, no injection vector.
  // SUPABASE_DB_URL passed as a single argv element to psql -d.
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    logRun({ phase: "grail_backfill_skip_mv_refresh", reason: "SUPABASE_DB_URL absent" });
    return;
  }
  try {
    execFileSync(
      "psql",
      [
        url,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        "SET statement_timeout='15min'; REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_supply_breakdown;",
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
  } catch (err) {
    logRun({ phase: "grail_backfill_mv_refresh_failed", error: err.message });
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const refreshMvOnly = process.argv.includes("--refresh-mv-only");

  if (refreshMvOnly) {
    refreshMV();
    return;
  }

  const sb = sbAdmin();
  sb._columnsByTable = await loadSupabaseColumns(sb, ["moments"]);

  const editionIds = parseBasketEditionIds();
  logRun({ phase: "grail_backfill_start", basket_size: editionIds.length, dry_run: dryRun });

  const bqCounts = await bqCountsByEdition(editionIds);
  const sbCounts = await sbCountsByEdition(sb, editionIds);

  const gaps = [];
  let bqTotal = 0;
  let sbTotal = 0;
  for (const eid of editionIds) {
    const b = bqCounts.get(eid) ?? 0;
    const s = sbCounts.get(eid) ?? 0;
    bqTotal += b;
    sbTotal += s;
    if (b > s) gaps.push({ edition_id: eid, bq: b, sb: s, gap: b - s });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  logRun({
    phase: "grail_backfill_gap_summary",
    basket_size: editionIds.length,
    bq_total_moments: bqTotal,
    sb_total_moments: sbTotal,
    overall_gap: bqTotal - sbTotal,
    edition_gap_count: gaps.length,
    top_gaps: gaps.slice(0, 10).map((g) => ({
      edition_id: g.edition_id.slice(0, 40) + "...",
      bq: g.bq,
      sb: g.sb,
      gap: g.gap,
    })),
  });

  if (dryRun) {
    logRun({ phase: "grail_backfill_dry_run_complete" });
    return;
  }

  let totalPulled = 0;
  let totalUpserted = 0;
  for (let i = 0; i < gaps.length; i++) {
    const g = gaps[i];
    const { pulled, upserted } = await pullMomentsForEdition(sb, g.edition_id);
    totalPulled += pulled;
    totalUpserted += upserted;
    logRun({
      phase: "grail_backfill_edition_done",
      done: i + 1,
      of: gaps.length,
      edition_id: g.edition_id,
      bq_count: g.bq,
      sb_was: g.sb,
      pulled,
      upserted,
    });
  }

  refreshMV();

  const sbCountsAfter = await sbCountsByEdition(sb, editionIds);
  let sbTotalAfter = 0;
  for (const eid of editionIds) sbTotalAfter += sbCountsAfter.get(eid) ?? 0;

  logRun({
    phase: "grail_backfill_done",
    total_pulled: totalPulled,
    total_upserted: totalUpserted,
    sb_total_before: sbTotal,
    sb_total_after: sbTotalAfter,
    delta: sbTotalAfter - sbTotal,
    still_short_of_bq: bqTotal - sbTotalAfter,
  });
}

main().catch((err) => {
  const msg = err?.message ?? err?.error ?? err?.code ?? JSON.stringify(err);
  logRun({ phase: "grail_backfill_fatal", error: msg, stack: err?.stack });
  process.exit(1);
});
