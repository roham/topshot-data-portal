// IndexTimeWindowPills — segmented control for zooming the index hero's
// time range. Server-component-friendly: each pill is a <Link> that
// updates the `iw=` query param on the current path. Re-render is
// next.js-server-driven, no client JS needed for the swap.
//
// `iw` (index-window) is namespaced so it doesn't clash with the global
// `?w=` used by the homepage volume strip. Six bubbles per the
// 2026-05-19 Roham steer: 30D / 90D / 6M / 1Y / 2Y / ALL.

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TimeWindow } from "@/components/global/window-types";
import { WINDOW_SPECS } from "@/components/global/window-types";

// The set of windows shown on index hero pills. Sub-day windows aren't
// meaningful for daily-grain market_caps; we start at 30D.
const INDEX_WINDOWS: TimeWindow[] = ["30d", "90d", "6m", "1y", "2y", "all"];

export interface IndexTimeWindowPillsProps {
  /** Current path the pills navigate within (e.g. "/" or "/indices/grail"). */
  basePath: string;
  /** Other query params to preserve on the page (besides `iw`). */
  preserveQuery?: Record<string, string | undefined>;
  /** Active window. */
  active: TimeWindow;
}

export function IndexTimeWindowPills({
  basePath,
  preserveQuery,
  active,
}: IndexTimeWindowPillsProps) {
  function hrefFor(w: TimeWindow): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserveQuery ?? {})) {
      if (v) params.set(k, v);
    }
    params.set("iw", w);
    return `${basePath}?${params.toString()}`;
  }
  return (
    <div
      className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded overflow-hidden"
      role="radiogroup"
      aria-label="Index time window"
    >
      {INDEX_WINDOWS.map((w) => {
        const isActive = w === active;
        return (
          <Link
            key={w}
            href={hrefFor(w)}
            role="radio"
            aria-checked={isActive}
            scroll={false}
            className={cn(
              "px-2 py-1 text-[10px] tracking-data-label font-mono transition-colors",
              isActive
                ? "bg-[var(--surface-3)] text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
            )}
          >
            {WINDOW_SPECS[w].label}
          </Link>
        );
      })}
    </div>
  );
}
