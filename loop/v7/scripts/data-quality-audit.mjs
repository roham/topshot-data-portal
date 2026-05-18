// Comprehensive data quality audit across all topshot.* tables.
// Per Roham 2026-05-17 21:00Z: "deep dive into the data and ensure that we
// have clear and accurate historical data going back at least two years
// for everything around low ask and average sale market cap. That's the
// first step. Ensure data quality, and it includes ownership data as well."

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "topshot" }, auth: { persistSession: false } },
);

const checks = [];
const TWO_YEARS_AGO = new Date(Date.now() - 365 * 2 * 86_400_000).toISOString().slice(0, 10);

async function probe(label, fn) {
  try {
    const start = Date.now();
    const result = await fn();
    const elapsed = Date.now() - start;
    console.log(`[${label}] ${elapsed}ms`);
    console.log(JSON.stringify(result, null, 2));
    console.log();
    checks.push({ label, result, elapsed });
  } catch (e) {
    console.log(`[${label}] EXCEPTION: ${e.message}`);
    checks.push({ label, error: e.message });
  }
}

async function singleCount(query) {
  const { count, error } = query;
  if (error) throw error;
  return count;
}

// ── 1. CORE TABLE ROW COUNTS ────────────────────────────────────────────
await probe("01-row-counts", async () => {
  const tables = [
    "players", "teams", "sets", "plays", "editions",
    "moments", "transactions", "market_caps", "packs", "drops",
    "parallel_types",
  ];
  const counts = {};
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true });
    counts[t] = count;
  }
  return counts;
});

// ── 2. MARKET_CAPS — time range + completeness ──────────────────────────
await probe("02-market_caps-time-range", async () => {
  const { data: earliest } = await sb.from("market_caps").select("date").order("date", { ascending: true }).limit(1).maybeSingle();
  const { data: latest } = await sb.from("market_caps").select("date").order("date", { ascending: false }).limit(1).maybeSingle();
  const { count: distinctDates } = await sb.from("market_caps").select("date", { count: "exact", head: true });
  return {
    earliest: earliest?.date,
    latest: latest?.date,
    covers_two_years: earliest?.date && earliest.date <= TWO_YEARS_AGO,
    target_earliest_for_two_years: TWO_YEARS_AGO,
    total_rows_lower_bound: distinctDates,
  };
});

// ── 3. TRANSACTIONS — time range, completeness, name coverage ─────────────
await probe("03-transactions-time-range", async () => {
  const { data: earliest } = await sb.from("transactions").select("completed_at").not("completed_at", "is", null).order("completed_at", { ascending: true }).limit(1).maybeSingle();
  const { data: latest } = await sb.from("transactions").select("completed_at").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1).maybeSingle();
  return {
    earliest: earliest?.completed_at?.slice(0, 10),
    latest: latest?.completed_at?.slice(0, 10),
    covers_two_years: earliest?.completed_at && earliest.completed_at.slice(0, 10) <= TWO_YEARS_AGO,
    target_earliest_for_two_years: TWO_YEARS_AGO,
  };
});

await probe("04-transactions-name-coverage", async () => {
  const { count: total } = await sb.from("transactions").select("*", { count: "exact", head: true });
  const { count: withBuyer } = await sb.from("transactions").select("*", { count: "exact", head: true }).not("buyer_safe_name", "is", null);
  const { count: withSeller } = await sb.from("transactions").select("*", { count: "exact", head: true }).not("seller_safe_name", "is", null);
  const { count: withMoment } = await sb.from("transactions").select("*", { count: "exact", head: true }).not("moment_id", "is", null);
  const { count: withGross } = await sb.from("transactions").select("*", { count: "exact", head: true }).not("gross_amount_usd", "is", null);
  const { count: succeeded } = await sb.from("transactions").select("*", { count: "exact", head: true }).eq("transaction_state_id", "SUCCEEDED");
  return {
    total,
    succeeded,
    pct_succeeded: total > 0 ? Math.round((succeeded / total) * 1000) / 10 : 0,
    with_buyer_safe_name: withBuyer,
    pct_buyer_safe_name: total > 0 ? Math.round((withBuyer / total) * 1000) / 10 : 0,
    with_seller_safe_name: withSeller,
    pct_seller_safe_name: total > 0 ? Math.round((withSeller / total) * 1000) / 10 : 0,
    with_moment_id: withMoment,
    with_gross_amount: withGross,
  };
});

// ── 5. MOMENTS — ownership + lifecycle coverage ────────────────────────
await probe("05-moments-coverage", async () => {
  const { count: total } = await sb.from("moments").select("*", { count: "exact", head: true });
  const { count: withOwner } = await sb.from("moments").select("*", { count: "exact", head: true }).not("owner_flow_address", "is", null);
  const { count: withEdition } = await sb.from("moments").select("*", { count: "exact", head: true }).not("edition_id", "is", null);
  const { count: withSubedition } = await sb.from("moments").select("*", { count: "exact", head: true }).not("subedition_id", "is", null);
  const { count: withSerial } = await sb.from("moments").select("*", { count: "exact", head: true }).not("serial_number", "is", null);
  const { count: withListingPrice } = await sb.from("moments").select("*", { count: "exact", head: true }).not("listing_price_usd", "is", null).gt("listing_price_usd", 0);
  const { count: withStatus } = await sb.from("moments").select("*", { count: "exact", head: true }).not("moment_status", "is", null);
  return {
    total,
    with_owner_flow_address: withOwner,
    pct_owner: total > 0 ? Math.round((withOwner / total) * 1000) / 10 : 0,
    with_edition_id: withEdition,
    with_subedition_id: withSubedition,
    with_serial_number: withSerial,
    with_listing_price_usd: withListingPrice,
    with_moment_status: withStatus,
  };
});

// ── 6. EDITIONS — joins + parallel coverage ─────────────────────────────
await probe("06-editions-coverage", async () => {
  const { count: total } = await sb.from("editions").select("*", { count: "exact", head: true });
  const { count: withPlayer } = await sb.from("editions").select("*", { count: "exact", head: true }).not("player_id", "is", null);
  const { count: withSet } = await sb.from("editions").select("*", { count: "exact", head: true }).not("set_id", "is", null);
  const { count: withPlay } = await sb.from("editions").select("*", { count: "exact", head: true }).not("play_id", "is", null);
  const { count: withTier } = await sb.from("editions").select("*", { count: "exact", head: true }).not("tier_name", "is", null);
  const { count: withParallel } = await sb.from("editions").select("*", { count: "exact", head: true }).not("parallel_id", "is", null);
  return {
    total,
    with_player_id: withPlayer,
    with_set_id: withSet,
    with_play_id: withPlay,
    with_tier_name: withTier,
    with_parallel_id: withParallel,
  };
});

// ── 7. PLAYERS / TEAMS / SETS / PLAYS — quick coverage ─────────────────
await probe("07-reference-tables-coverage", async () => {
  const out = {};
  for (const [t, cols] of [
    ["players", ["full_name", "last_known_team_id"]],
    ["teams", ["full_name"]],
    ["sets", ["set_name", "series_number"]],
    ["plays", ["play_name", "play_id"]],
  ]) {
    const { count: total } = await sb.from(t).select("*", { count: "exact", head: true });
    out[t] = { total };
    for (const col of cols) {
      const { count } = await sb.from(t).select("*", { count: "exact", head: true }).not(col, "is", null);
      out[t][`with_${col}`] = count;
    }
  }
  return out;
});

// ── 8. ETL CURSORS state — last successful run per table ────────────────
await probe("08-etl-cursors", async () => {
  const { data } = await sb.from("_etl_cursors").select("table_name, last_cursor_at, last_row_count, last_run_at, last_error");
  return data;
});

// ── 9. MARKET_CAPS daily completeness check (sample dates) ──────────────
await probe("09-market_caps-daily-completeness", async () => {
  // Are there gaps in the date series?
  const sampledDates = [
    "2024-01-01", "2024-04-01", "2024-07-01", "2024-10-01",
    "2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01",
    "2026-01-01", "2026-03-01", "2026-05-01", "2026-05-15",
  ];
  const out = {};
  for (const d of sampledDates) {
    const { count } = await sb.from("market_caps").select("*", { count: "exact", head: true }).eq("date", d).not("market_cap", "is", null).gt("market_cap", 0);
    out[d] = count;
  }
  return out;
});

// ── 10. TRANSACTIONS monthly count (signal for time-distribution) ─────
await probe("10-transactions-monthly-distribution", async () => {
  // Sample one date per quarter and check tx volume
  const probeMonths = [
    "2024-05-01", "2024-08-01", "2024-11-01",
    "2025-02-01", "2025-05-01", "2025-08-01", "2025-11-01",
    "2026-02-01", "2026-05-01",
  ];
  const out = {};
  for (const start of probeMonths) {
    const startDate = new Date(start);
    const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);
    const { count } = await sb.from("transactions").select("*", { count: "exact", head: true })
      .eq("transaction_state_id", "SUCCEEDED")
      .gte("completed_at", startDate.toISOString())
      .lt("completed_at", endDate.toISOString());
    out[`${start.slice(0,7)} (one month)`] = count;
  }
  return out;
});

console.log("\n=== AUDIT COMPLETE ===");
console.log(`Total checks: ${checks.length}`);
console.log(`Two-year target threshold: ${TWO_YEARS_AGO}`);
