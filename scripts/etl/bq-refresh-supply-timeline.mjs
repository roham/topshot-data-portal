// bq-refresh-supply-timeline.mjs — populate topshot.supply_timeline + supply_snapshot.
// Governing spec: specs/001-supply-timeline/spec.md  (FR-2)
//
// Aggregates the FULL moment supply history IN BigQuery
// (dapperlabs-data.production_sem_open.asset_nba_moment, ~52.2M rows) and upserts
// the small rolled-up result into Supabase. The Supabase topshot.moments mirror is
// partial (~8.6M) and CANNOT produce the true curve — this is why the aggregate is
// computed at source.
//
// Mint = NFT creation = BQ created_at (100% populated; released_at is the later
// release-to-collector event and is NULL for ~5M moments → wrong for a mint curve).
// Burn = burned_at. Lock events = locked_at (gross). Net-locked = status LOCKED.
//
// Idempotent: upserts on PK, safe to re-run. Cron-friendly.
//
// Usage:
//   node scripts/etl/bq-refresh-supply-timeline.mjs [--spanner <count>]
//
// Auth: BigQuery via GOOGLE_APPLICATION_CREDENTIALS (CI) or ADC (local).
//       Supabase via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { runQuery } from "./lib/bq-client.mjs";
import { sbAdmin } from "./lib/sb-client.mjs";
import { CONFIG } from "./etl-config.mjs";

const SRC = `\`${CONFIG.bqProjectId}.${CONFIG.bqDataset}.asset_nba_moment\``;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const spannerCount = arg("--spanner") ? Number(arg("--spanner")) : null;

  console.log(`[supply-timeline] aggregating ${SRC} …`);

  // ── 1. Monthly facts: minted / burned / lock inflow / lock outflow
  //   lock_exits = unlock events (unlocked_at) + moments burned while still locked
  //   (locked_at set, unlocked_at null, burned_at set). Splitting lock flow into
  //   inflow/outflow lets the page draw a NET-locked curve that reconciles exactly
  //   to status LOCKED (see spec §Definitions; verified against asset_nba_moment).
  const monthlySql = `
    WITH mint AS (
      SELECT DATE_TRUNC(DATE(created_at), MONTH) AS month, COUNT(*) AS n
      FROM ${SRC} WHERE created_at IS NOT NULL GROUP BY month),
    burn AS (
      SELECT DATE_TRUNC(DATE(burned_at), MONTH) AS month, COUNT(*) AS n
      FROM ${SRC} WHERE burned_at IS NOT NULL GROUP BY month),
    lock AS (
      SELECT DATE_TRUNC(DATE(locked_at), MONTH) AS month, COUNT(*) AS n
      FROM ${SRC} WHERE locked_at IS NOT NULL GROUP BY month),
    exits AS (
      SELECT month, SUM(n) AS n FROM (
        SELECT DATE_TRUNC(DATE(unlocked_at), MONTH) AS month, COUNT(*) AS n
        FROM ${SRC} WHERE unlocked_at IS NOT NULL GROUP BY month
        UNION ALL
        SELECT DATE_TRUNC(DATE(burned_at), MONTH) AS month, COUNT(*) AS n
        FROM ${SRC}
        WHERE locked_at IS NOT NULL AND unlocked_at IS NULL AND burned_at IS NOT NULL
        GROUP BY month
      ) GROUP BY month)
    SELECT
      FORMAT_DATE('%Y-%m-%d', COALESCE(mint.month, burn.month, lock.month, exits.month)) AS month,
      IFNULL(mint.n, 0) AS minted,
      IFNULL(burn.n, 0) AS burned,
      IFNULL(lock.n, 0) AS lock_events,
      IFNULL(exits.n, 0) AS lock_exits
    FROM mint
    FULL JOIN burn USING (month)
    FULL JOIN lock USING (month)
    FULL JOIN exits USING (month)
    ORDER BY month`;

  const { rows: monthly } = await runQuery(monthlySql);
  console.log(`[supply-timeline] ${monthly.length} monthly rows`);

  // ── 2. Snapshot: status partition + meta
  const snapSql = `
    SELECT
      COUNT(*) AS total_minted,
      COUNTIF(moment_status = 'BURNED') AS total_burned,
      COUNTIF(moment_status = 'LOCKED') AS currently_locked,
      COUNTIF(moment_status = 'MINTED') AS currently_minted,
      FORMAT_DATE('%Y-%m-%d', DATE_TRUNC(DATE(MIN(created_at)), MONTH)) AS first_mint_month,
      FORMAT_DATE('%Y-%m-%d', DATE_TRUNC(DATE(MIN(burned_at)), MONTH)) AS first_burn_month,
      FORMAT_DATE('%Y-%m-%d', DATE_TRUNC(DATE(MIN(locked_at)), MONTH)) AS lock_launch_month
    FROM ${SRC}`;

  const { rows: snapRows } = await runQuery(snapSql);
  const [snap] = snapRows;
  const totalMinted = Number(snap.total_minted);
  const totalBurned = Number(snap.total_burned);
  const currentlyLocked = Number(snap.currently_locked);
  const currentlyMinted = Number(snap.currently_minted);
  const circulating = totalMinted - totalBurned;

  // Reconciliation guard: status must partition the table exactly.
  const partition = totalBurned + currentlyLocked + currentlyMinted;
  if (partition !== totalMinted) {
    console.warn(
      `[supply-timeline] WARN status partition ${partition} != total ${totalMinted} ` +
        `(diff ${totalMinted - partition}) — statuses beyond BURNED/LOCKED/MINTED present.`,
    );
  }

  console.log(
    `[supply-timeline] minted=${totalMinted} burned=${totalBurned} ` +
      `locked=${currentlyLocked} live=${currentlyMinted} circulating=${circulating}`,
  );

  // ── 3. Upsert into Supabase (client default schema = topshot)
  const sb = sbAdmin();

  // Preserve the out-of-band Spanner anchor across refreshes that don't pass
  // --spanner (e.g. the daily CI cron). Only overwrite when explicitly given.
  let spannerToWrite = spannerCount;
  if (spannerToWrite == null) {
    const { data: prev } = await sb
      .from("supply_snapshot")
      .select("spanner_reported_count")
      .eq("singleton_id", 1)
      .maybeSingle();
    spannerToWrite = prev?.spanner_reported_count ?? null;
  }

  // Replace timeline wholesale (small table, avoids stale months lingering).
  const { error: delErr } = await sb
    .from("supply_timeline")
    .delete()
    .neq("month", "1900-01-01");
  if (delErr) throw new Error(`timeline clear failed: ${delErr.message}`);

  const rows = monthly.map((r) => ({
    month: r.month,
    minted: Number(r.minted),
    burned: Number(r.burned),
    lock_events: Number(r.lock_events),
    lock_exits: Number(r.lock_exits),
  }));
  const { error: tlErr } = await sb.from("supply_timeline").upsert(rows, { onConflict: "month" });
  if (tlErr) throw new Error(`timeline upsert failed: ${tlErr.message}`);

  const { error: snapErr } = await sb.from("supply_snapshot").upsert(
    {
      singleton_id: 1,
      total_minted: totalMinted,
      total_burned: totalBurned,
      currently_locked: currentlyLocked,
      currently_minted: currentlyMinted,
      circulating,
      first_mint_month: snap.first_mint_month,
      first_burn_month: snap.first_burn_month,
      lock_launch_month: snap.lock_launch_month,
      spanner_reported_count: spannerToWrite,
      bq_total_rows: totalMinted,
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: "singleton_id" },
  );
  if (snapErr) throw new Error(`snapshot upsert failed: ${snapErr.message}`);

  console.log(`[supply-timeline] done — ${rows.length} months + snapshot written.`);
}

main().catch((e) => {
  console.error("[supply-timeline] FAILED:", e.message);
  process.exit(1);
});
