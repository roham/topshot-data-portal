// ChartCard — the load-bearing primitive for the graph-first landing.
// Per doctrine v1.1 §P2 (graphs first, density on drill):
//   - Chart is the dominant element (top, large)
//   - Tight title + optional sub-label
//   - One-line caption BELOW the chart
//   - "View details →" link in the bottom-right
//
// Comparable: Polymarket card (each card a probability sparkline as hero);
// Card Ladder Pro mover card (sparkline + one-line stat + link).

import Link from "next/link";
import type { ReactNode } from "react";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  asOf?: string;
  /** The chart area — should be the dominant visual. Pass a Recharts/visx tree. */
  children: ReactNode;
  /** One-line caption summarizing what the chart shows (max ~120 chars). */
  caption: string;
  /** Optional methodology note (small, secondary). */
  methodology?: string;
  /** Link target for the "View details →" drill-down. Use "#" for v1 placeholder. */
  href: string;
  /** When true, card spans full grid width. Otherwise half-width (md+). */
  wide?: boolean;
  /** Optional right-aligned chip in the header (e.g., a tier chip, parallel chip). */
  headerRight?: ReactNode;
  /** Test id for judge journeys. */
  testId?: string;
}

export function ChartCard({
  title,
  subtitle,
  asOf,
  children,
  caption,
  methodology,
  href,
  wide,
  headerRight,
  testId,
}: ChartCardProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] flex flex-col ${
        wide ? "col-span-1 md:col-span-2" : ""
      }`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2 border-b border-[var(--border-subtle)]/50">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text)] truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          {asOf && (
            <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">
              as of {asOf}
            </span>
          )}
        </div>
      </div>

      {/* Chart area — dominant */}
      <div className="flex-1 px-2 pt-3 pb-1 min-h-[260px]" data-testid={testId ? `${testId}-chart` : undefined}>
        {children}
      </div>

      {/* Caption + drill-down link */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--text-dim)] leading-snug flex-1">
          {caption}
        </p>
        {href.startsWith("#") ? (
          <span className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase whitespace-nowrap shrink-0">
            Drill-down pending
          </span>
        ) : (
          <Link
            href={href}
            className="text-[11px] text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
          >
            View details →
          </Link>
        )}
      </div>

      {methodology && (
        <div className="px-4 pb-3">
          <p className="text-[9px] text-[var(--text-faint)] tracking-data-label leading-snug">
            {methodology}
          </p>
        </div>
      )}
    </div>
  );
}
