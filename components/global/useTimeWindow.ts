"use client";

import { useQueryState, parseAsStringEnum } from "nuqs";

// Global TimeWindow — the single source of truth for "what does 'recent'
// mean on this page." URL-encoded via nuqs as `?w=24h|7d|30d|1y|all`.
// Default `24h`. Every surface that filters by time consumes this hook.

export const TIME_WINDOWS = ["24h", "7d", "30d", "1y", "all"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

const parser = parseAsStringEnum<TimeWindow>([...TIME_WINDOWS]).withDefault("24h");

/**
 * Read + write the active time window via the URL.
 * Use this in any client component that needs windowed data.
 * Server components can read `searchParams.w` directly and pass into helpers.
 */
export function useTimeWindow(): [TimeWindow, (next: TimeWindow) => void] {
  const [value, setValue] = useQueryState("w", parser);
  return [value, (next) => void setValue(next)];
}

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
 * param without React state. Returns the same WindowSpec shape.
 */
export function parseTimeWindow(raw: string | string[] | undefined): { window: TimeWindow; spec: WindowSpec } {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const win = (TIME_WINDOWS as readonly string[]).includes(v ?? "") ? (v as TimeWindow) : "24h";
  return { window: win, spec: WINDOW_SPECS[win] };
}
