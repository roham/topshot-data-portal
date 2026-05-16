// Pure helpers shared by the supabase query layer.
// No I/O — unit-tested in helpers.test.ts.

import type { TimeWindow } from "@/components/global/window-types";

export type PlayerVolumeView =
  | "mv_player_24h_volume"
  | "mv_player_7d_volume"
  | "mv_player_30d_volume";

// Map portal-wide TimeWindow → the canonical per-player volume MV.
// 1y / all collapse to 30d until a 365d MV exists; consumers can disclose
// the collapse in caption text.
export function windowToPlayerVolumeView(w: TimeWindow): PlayerVolumeView {
  switch (w) {
    case "24h":
      return "mv_player_24h_volume";
    case "7d":
      return "mv_player_7d_volume";
    case "30d":
    case "1y":
    case "all":
      return "mv_player_30d_volume";
  }
}

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
