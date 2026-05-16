// Refresh Supabase materialized views after each sync tick.
// Calls the SQL function topshot.refresh_all_materialized_views() which the
// migrations agent created (refreshes mv_player_24h_volume etc CONCURRENTLY).

import { sbAdmin } from "./lib/sb-client.mjs";
import { logRun } from "./lib/etl-helpers.mjs";

async function main() {
  const started = Date.now();
  const sb = sbAdmin();
  logRun({ phase: "refresh_mvs_start" });
  const { error } = await sb.rpc("refresh_all_materialized_views", {}, { schema: "topshot" });
  if (error) {
    logRun({ phase: "refresh_mvs_error", error: String(error) });
    throw error;
  }
  logRun({ phase: "refresh_mvs_done", durationMs: Date.now() - started });
}

main().catch((err) => {
  logRun({ phase: "refresh_mvs_fatal", error: String(err) });
  process.exit(1);
});
