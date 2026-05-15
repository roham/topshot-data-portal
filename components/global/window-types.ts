// Server-safe pure helpers + types for the TimeWindow infra.
// This module has NO React / client-only code so it can be imported from
// both server components and the client hook in useTimeWindow.ts.

export const TIME_WINDOWS = ["24h", "7d", "30d", "1y", "all"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

// Iter-16: default flipped 24h → 30d. Card Ladder index pages default 90D
// and TradingView screener defaults Performance·1Y — at marketplace rate
// ~35tx/h × 720h ≈ 25k rows over 30d vs ~840 over 24h. Pro Trader signal
// lives in the longer windows. Surfaces that want "live" (e.g. /feed)
// pass `defaultWindow="24h"`.
export const DEFAULT_WINDOW: TimeWindow = "30d";

export interface WindowSpec {
  label: string;
  /** Milliseconds from now back; `null` means "all time". */
  ms: number | null;
}

export const WINDOW_SPECS: Record<TimeWindow, WindowSpec> = {
  "24h": { label: "24H", ms: 24 * 60 * 60 * 1000 },
  "7d":  { label: "7D",  ms: 7 * 24 * 60 * 60 * 1000 },
  "30d": { label: "30D", ms: 30 * 24 * 60 * 60 * 1000 },
  "1y":  { label: "1Y",  ms: 365 * 24 * 60 * 60 * 1000 },
  "all": { label: "ALL", ms: null },
};

/**
 * Pure helper for server components / route handlers. Parses the `w` search
 * param without React state.
 */
export function parseTimeWindow(
  raw: string | string[] | undefined,
  defaultWindow: TimeWindow = DEFAULT_WINDOW,
): { window: TimeWindow; spec: WindowSpec } {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const win = (TIME_WINDOWS as readonly string[]).includes(v ?? "") ? (v as TimeWindow) : defaultWindow;
  return { window: win, spec: WINDOW_SPECS[win] };
}

/**
 * Map TimeWindow → snapshot Cadence. Used by server components to route
 * the window selection to the correct accumulator tier.
 */
export function windowToCadence(w: TimeWindow): "day" | "week" | "month" | "market" | null {
  switch (w) {
    case "24h": return "day";
    case "7d":  return "week";
    case "30d": return "month";
    case "1y":  return "month"; // 1y aggregate not yet built — falls through to month
    case "all": return "month";
    default:    return null;
  }
}
