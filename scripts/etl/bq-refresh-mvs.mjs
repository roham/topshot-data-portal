// Refresh Supabase materialized views after each sync tick.
// Refreshes each MV individually via PostgREST exec_sql so each stays under
// the PostgREST statement timeout (~60s). Batch refresh via the etl helper
// would exceed PostgREST's limit; only individual refreshes fit.

import { sbAdmin } from "./lib/sb-client.mjs";
import { logRun } from "./lib/etl-helpers.mjs";

const MVS = [
  "mv_market_summary_24h",
  "mv_market_summary_7d",
  "mv_market_summary_30d",
  "mv_market_summary_90d",
  "mv_market_summary_1y",
  "mv_market_summary_all_time",
  "mv_largest_sales_24h",
  "mv_largest_sales_7d",
  "mv_largest_sales_30d",
  "mv_largest_sales_1y",
  "mv_largest_sales_all_time",
  "mv_player_24h_volume",
  "mv_player_7d_volume",
  "mv_player_30d_volume",
  "mv_player_90d_volume",
  "mv_player_1y_volume",
  "mv_player_all_time_volume",
  "mv_edition_24h_activity",
  "mv_edition_7d_activity",
  "mv_edition_30d_activity",
  "mv_edition_1y_activity",
  "mv_edition_all_time_activity",
  "mv_set_24h_activity",
  "mv_set_completion_distribution",
  "mv_player_market_cap",
];

async function main() {
  const started = Date.now();
  const sb = sbAdmin();
  logRun({ phase: "refresh_mvs_start", count: MVS.length });
  const results = [];
  for (const mv of MVS) {
    const t0 = Date.now();
    const { error } = await sb
      .schema("public")
      .rpc("exec_sql", {
        sql: `REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.${mv}`,
      });
    const dt = Date.now() - t0;
    if (error) {
      logRun({ phase: "refresh_mv_error", mv, durationMs: dt, error: error.message ?? String(error) });
      results.push({ mv, ok: false, durationMs: dt });
      // Keep going — one MV failing shouldn't block the rest.
      continue;
    }
    logRun({ phase: "refresh_mv_ok", mv, durationMs: dt });
    results.push({ mv, ok: true, durationMs: dt });
  }
  const failed = results.filter((r) => !r.ok).length;
  logRun({
    phase: "refresh_mvs_done",
    durationMs: Date.now() - started,
    ok: results.length - failed,
    failed,
  });
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  const msg = err?.message ?? err?.error ?? err?.code ?? JSON.stringify(err);
  logRun({ phase: "refresh_mvs_fatal", error: msg, stack: err?.stack });
  process.exit(1);
});
