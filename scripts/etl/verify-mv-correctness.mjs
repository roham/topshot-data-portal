// Spot-check Supabase MV correctness vs BQ ground truth.
// Run after a moments backfill + bq-refresh-mvs.mjs.
//
// Compares top-20 24h players by total volume:
//   Supabase: SELECT FROM topshot.mv_player_24h_volume
//   BQ:       SUM(gross_amount_usd) GROUP BY player_id from the transaction view
//
// Reports Spearman rank correlation.

import { sbAdmin } from "./lib/sb-client.mjs";
import { BigQuery } from "@google-cloud/bigquery";
import { CONFIG } from "./etl-config.mjs";

function spearman(rankA, rankB) {
  // rankA, rankB: Map<id, rank>. Compute correlation over the intersection.
  // Re-rank inside the overlap (ranks 1..n) before Spearman; otherwise an item
  // ranked 19 in A and 3 in B but absent from the other list inflates d^2.
  const overlap = [...rankA.keys()].filter((id) => rankB.has(id));
  if (overlap.length < 3) return null; // too few to be meaningful
  const aSorted = [...overlap].sort((x, y) => rankA.get(x) - rankA.get(y));
  const bSorted = [...overlap].sort((x, y) => rankB.get(x) - rankB.get(y));
  const aLocal = new Map(aSorted.map((id, i) => [id, i + 1]));
  const bLocal = new Map(bSorted.map((id, i) => [id, i + 1]));
  const n = overlap.length;
  let sumD2 = 0;
  for (const id of overlap) {
    const d = aLocal.get(id) - bLocal.get(id);
    sumD2 += d * d;
  }
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

async function main() {
  const sb = sbAdmin();

  const { data: sbRows, error: sbErr } = await sb
    .schema("topshot")
    .from("mv_player_24h_volume")
    .select("player_id, player_name, total_volume_usd, tx_count")
    .order("total_volume_usd", { ascending: false })
    .limit(20);
  if (sbErr) throw sbErr;

  const bq = new BigQuery({ projectId: CONFIG.bqProjectId });
  const [bqRows] = await bq.query({
    useLegacySql: false,
    query: `
      SELECT
        e.player_id,
        ANY_VALUE(e.player_name) AS player_name,
        COUNT(t.id) AS tx_count,
        SUM(t.gross_amount_usd) AS total_volume_usd
      FROM \`dapperlabs-data.production_sem_open.transaction\` t
      JOIN \`dapperlabs-data.production_sem_open.asset_nba_moment\` m
        ON m.moment_id = t.product_specific_asset_id
      JOIN \`dapperlabs-data.production_sem_open.asset_nba_edition\` e
        ON e.edition_id = m.edition_id
      WHERE t.client_safe_name = 'nba_top_shot'
        AND t.transaction_state_id = 'SUCCEEDED'
        AND t.updated_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND DATE(t.updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
      GROUP BY e.player_id
      ORDER BY total_volume_usd DESC
      LIMIT 20
    `,
  });

  const sbRanks = new Map();
  sbRows.forEach((r, i) => sbRanks.set(r.player_id, i + 1));
  const bqRanks = new Map();
  bqRows.forEach((r, i) => bqRanks.set(r.player_id, i + 1));

  const rho = spearman(sbRanks, bqRanks);

  console.log("=== Supabase MV top-20 (24h) ===");
  sbRows.forEach((r, i) => console.log(`${i + 1}. ${r.player_name}  $${Number(r.total_volume_usd).toFixed(0)} (${r.tx_count} tx)`));
  console.log();
  console.log("=== BQ ground-truth top-20 (24h) ===");
  bqRows.forEach((r, i) => console.log(`${i + 1}. ${r.player_name}  $${Number(r.total_volume_usd).toFixed(0)} (${r.tx_count} tx)`));
  console.log();
  console.log("Overlap:", [...sbRanks.keys()].filter((id) => bqRanks.has(id)).length, "of 20");
  console.log("Spearman rank correlation:", rho?.toFixed(3) ?? "n/a");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
