// Pure helpers shared by the supabase query layer.
// No I/O — unit-tested in helpers.test.ts.

import type { TimeWindow } from "@/components/global/window-types";

// ─── Market summary ────────────────────────────────────────────────────────
export type MarketView =
  | "mv_market_summary_24h"
  | "mv_market_summary_7d"
  | "mv_market_summary_30d"
  | "mv_market_summary_90d"
  | "mv_market_summary_1y"
  | "mv_market_summary_all_time";

export function windowToMarketView(w: TimeWindow): MarketView {
  switch (w) {
    case "24h": return "mv_market_summary_24h";
    case "7d":  return "mv_market_summary_7d";
    case "30d": return "mv_market_summary_30d";
    case "90d": return "mv_market_summary_90d";
    case "1y":  return "mv_market_summary_1y";
    case "all": return "mv_market_summary_all_time";
  }
}

// ─── Player volume ─────────────────────────────────────────────────────────
export type PlayerView =
  | "mv_player_24h_volume"
  | "mv_player_7d_volume"
  | "mv_player_30d_volume"
  | "mv_player_90d_volume"
  | "mv_player_1y_volume"
  | "mv_player_all_time_volume";

export function windowToPlayerView(w: TimeWindow): PlayerView {
  switch (w) {
    case "24h": return "mv_player_24h_volume";
    case "7d":  return "mv_player_7d_volume";
    case "30d": return "mv_player_30d_volume";
    case "90d": return "mv_player_90d_volume";
    case "1y":  return "mv_player_1y_volume";
    case "all": return "mv_player_all_time_volume";
  }
}

// Legacy alias for the older 3-window helper; callers should migrate to
// windowToPlayerView. Kept exported (and aliased to the new fn) so this
// rename is non-breaking for any importer we missed.
export const windowToPlayerVolumeView = windowToPlayerView;
export type PlayerVolumeView = PlayerView;

// ─── Largest sales ─────────────────────────────────────────────────────────
// The largest-sales MV family has no 90d variant — 90d collapses to 30d.
export type LargestSalesView =
  | "mv_largest_sales_24h"
  | "mv_largest_sales_7d"
  | "mv_largest_sales_30d"
  | "mv_largest_sales_1y"
  | "mv_largest_sales_all_time";

export function windowToLargestSalesView(w: TimeWindow): LargestSalesView {
  switch (w) {
    case "24h": return "mv_largest_sales_24h";
    case "7d":  return "mv_largest_sales_7d";
    case "30d":
    case "90d": return "mv_largest_sales_30d";
    case "1y":  return "mv_largest_sales_1y";
    case "all": return "mv_largest_sales_all_time";
  }
}

// ─── Edition activity ──────────────────────────────────────────────────────
// Edition-activity MVs also have no 90d variant — 90d collapses to 30d.
export type EditionActivityView =
  | "mv_edition_24h_activity"
  | "mv_edition_7d_activity"
  | "mv_edition_30d_activity"
  | "mv_edition_1y_activity"
  | "mv_edition_all_time_activity";

export function windowToEditionActivityView(w: TimeWindow): EditionActivityView {
  switch (w) {
    case "24h": return "mv_edition_24h_activity";
    case "7d":  return "mv_edition_7d_activity";
    case "30d":
    case "90d": return "mv_edition_30d_activity";
    case "1y":  return "mv_edition_1y_activity";
    case "all": return "mv_edition_all_time_activity";
  }
}

// ─── Window parsing + labeling ─────────────────────────────────────────────
const VALID_WINDOWS: ReadonlyArray<TimeWindow> = [
  "24h", "7d", "30d", "90d", "1y", "all",
];

// Defaults to "30d" to match DEFAULT_WINDOW in components/global/window-types.ts —
// so the nav-highlighted tab (30d on first load) matches the Supabase strip.
export function parseWindow(
  raw: string | string[] | undefined,
  defaultWindow: TimeWindow = "30d",
): TimeWindow {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (VALID_WINDOWS as readonly string[]).includes(v ?? "")
    ? (v as TimeWindow)
    : defaultWindow;
}

// Human-readable label used in section headers ("Market · 7d · Supabase").
export function windowLabel(w: TimeWindow): string {
  return w === "all" ? "all-time" : w;
}

// ─── Freshness bucketing ───────────────────────────────────────────────────
export type FreshnessBucket = "green" | "yellow" | "red";

export interface FreshnessReading {
  bucket: FreshnessBucket;
  minutesAgo: number | null;
}

// Bucket = green <30m, yellow <60m, red >=60m or null.
export function freshnessBucket(
  lastSuccessAt: Date | null,
  now: Date = new Date(),
): FreshnessReading {
  if (!lastSuccessAt) return { bucket: "red", minutesAgo: null };
  const minutesAgo = Math.floor(
    (now.getTime() - lastSuccessAt.getTime()) / 60_000,
  );
  if (minutesAgo < 30) return { bucket: "green", minutesAgo };
  if (minutesAgo < 60) return { bucket: "yellow", minutesAgo };
  return { bucket: "red", minutesAgo };
}

// Δ% with guarded divide. Returns null when prior is missing/0 or now is null —
// caller renders honest-absence rather than 0.00%.
export function computeDeltaPct(
  now: number | null | undefined,
  prior: number | null | undefined,
): number | null {
  if (now == null || prior == null) return null;
  if (!isFinite(now) || !isFinite(prior)) return null;
  if (prior === 0) return null;
  return ((now - prior) / prior) * 100;
}
