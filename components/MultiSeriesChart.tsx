"use client";
// V4-iter-2 — multi-series chart: 6 overlaid base-100 normalized lines for
// the h-c-era featured-set indices. Pure inline SVG, no chart deps.
//
// Spec/design:
//  - 30d default, 24h | 7d | 30d tab bar (11px mono, underline-active)
//  - Y-axis hidden; 4 X-axis tick labels (day-29 / day-15 / day-7 / today)
//  - 1.5px stroke (subordinate to 2px set-card sparklines per hierarchy table)
//  - 24h warming UI: when day-snapshot depth <12 AND tab=24h, the chart
//    is greyed (opacity 0.4) and a `data-warming-caption` overlays the
//    bottom-center with the verbatim warming text.

import { useState } from "react";
import type { FeaturedSetIndex } from "@/lib/indices/featured-sets";

interface MultiSeriesChartProps {
  /** 30d series (always-honest per Researcher §5a/§7). */
  series30d: FeaturedSetIndex[];
  series7d: FeaturedSetIndex[];
  series24h: FeaturedSetIndex[];
  /** Day-snapshot accumulator depth (`.snapshots/day/` length). */
  daySnapshotDepth: number;
  /** ISO timestamp at which 24h becomes fully populated (first-snap + 12d). */
  warmingCompleteISO: string | null;
}

type WindowKey = "24h" | "7d" | "30d";

const WINDOW_THRESHOLD = 12; // 24h-warming readiness gate per V4-iter-1 spec L26-32.

export function MultiSeriesChart({
  series30d,
  series7d,
  series24h,
  daySnapshotDepth,
  warmingCompleteISO,
}: MultiSeriesChartProps) {
  const [window, setWindow] = useState<WindowKey>("30d");

  const active =
    window === "24h" ? series24h : window === "7d" ? series7d : series30d;

  const isWarming = window === "24h" && daySnapshotDepth < WINDOW_THRESHOLD;

  // Dimensions — match design.md hierarchy table for 1440px desktop.
  const VB_W = 1200;
  const VB_H = 240;
  const PAD_X = 16;
  const PAD_Y = 24;
  const innerW = VB_W - PAD_X * 2;
  const innerH = VB_H - PAD_Y * 2;

  // Normalized 0..100% domain — set min/max from all series' normalized values.
  const allValues = active.flatMap((s) => s.normalized);
  const yMin = allValues.length ? Math.min(...allValues, 100) : 80;
  const yMax = allValues.length ? Math.max(...allValues, 100) : 120;
  const yPad = (yMax - yMin) * 0.1 || 5;
  const domMin = yMin - yPad;
  const domMax = yMax + yPad;
  const ySpan = domMax - domMin || 1;

  // X labels — 4 ticks distributed across the active series.
  const sample = active.find((s) => s.points.length >= 2) ?? null;
  const sampleLen = sample?.points.length ?? 0;
  const xLabels: Array<{ x: number; label: string }> = [];
  if (sampleLen >= 2) {
    const ticks =
      window === "24h"
        ? ["−24h", "−18h", "−6h", "now"]
        : window === "7d"
          ? ["day-7", "day-5", "day-2", "today"]
          : ["day-29", "day-15", "day-7", "today"];
    const xPos = [0, 0.333, 0.667, 1];
    xPos.forEach((p, i) => {
      xLabels.push({
        x: PAD_X + innerW * p,
        label: ticks[i],
      });
    });
  }

  function pathFor(idx: FeaturedSetIndex): string {
    if (idx.normalized.length < 2) return "";
    const stepX = innerW / (idx.normalized.length - 1);
    const pts = idx.normalized.map((v, i) => {
      const x = PAD_X + i * stepX;
      const y = PAD_Y + innerH - ((v - domMin) / ySpan) * innerH;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M${pts[0]} L${pts.slice(1).join(" L")}`;
  }

  const tabs: WindowKey[] = ["24h", "7d", "30d"];

  return (
    <div
      data-indices-chart="featured-sets-multiseries"
      className="w-full"
    >
      {/* Window selector tab bar */}
      <div
        data-window-selector
        role="tablist"
        aria-label="Chart window"
        className="flex items-center gap-4 mb-2 px-1 text-[11px] font-mono"
      >
        {tabs.map((t) => {
          const isActive = t === window;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              data-window={t}
              data-active={isActive ? "true" : "false"}
              onClick={() => setWindow(t)}
              className={
                "tracking-data-label transition-colors " +
                (isActive
                  ? "text-[var(--text-primary)] underline underline-offset-4"
                  : "text-[var(--text-faint)] hover:text-[var(--text-primary)]")
              }
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          width="100%"
          height={240}
          className="block"
          style={{ opacity: isWarming ? 0.4 : 1 }}
          aria-label="Featured-set indices — base-100 normalized"
        >
          {/* baseline ref at y=100 */}
          <line
            x1={PAD_X}
            y1={PAD_Y + innerH - ((100 - domMin) / ySpan) * innerH}
            x2={PAD_X + innerW}
            y2={PAD_Y + innerH - ((100 - domMin) / ySpan) * innerH}
            stroke="var(--border-faint, #2a2a2a)"
            strokeWidth={0.5}
            strokeDasharray="2 3"
          />
          {/* x-axis ticks */}
          {xLabels.map((t) => (
            <text
              key={t.label}
              x={t.x}
              y={VB_H - 4}
              fontSize={10}
              fill="var(--text-faint)"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {t.label}
            </text>
          ))}
          {/* 6 overlaid series */}
          {active.map((s) => (
            <path
              key={s.setUuid}
              d={pathFor(s)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              data-set-uuid={s.setUuid}
            />
          ))}
        </svg>

        {/* 24h warming caption (only when 24h tab + depth <12) */}
        {isWarming ? (
          <div
            data-warming-caption
            className="absolute left-0 right-0 bottom-2 text-center text-[11px] italic text-[var(--text-faint)] font-mono px-4"
          >
            24h window accumulator warming — first populated{" "}
            {warmingCompleteISO ?? "<pending first day-snapshot>"}
          </div>
        ) : null}
      </div>

      {/* Legend — 10px faint per design.md hierarchy table */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1 text-[10px] text-[var(--text-faint)] font-mono">
        {active.map((s) => (
          <span key={s.setUuid} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-2 h-[2px]"
              style={{ background: s.color }}
            />
            {s.setName}
          </span>
        ))}
      </div>
    </div>
  );
}
