"use client";

// SupplyCurveChart — cumulative moment supply over time, stacked so the three
// bands sum to "ever minted":  Live (circulating-unlocked) + Locked + Burned.
// The top edge is total ever minted (the growth curve); the gray Burned band is
// the deflation since burns began; the amber Locked band is locked supply.
// Governing spec: specs/001-supply-timeline/spec.md (FR-4)
//
// Glassnode convention: supply removed/immobilized sits visually above the
// liquid float, so circulating (green) reads as the base.

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { useMemo } from "react";
import type { SupplyMonth } from "@/lib/supabase/queries/supply-timeline";

const COLOR = {
  live: "#5eead4", // teal — liquid circulating supply
  locked: "#f59e0b", // amber — locked (immobilized)
  burned: "#6b7280", // gray — removed from circulation
};

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function fmtFull(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtMonth(month: string): string {
  // YYYY-MM-DD → "Jan ’21"
  const [y, m] = month.split("-");
  const mon = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m)];
  return `${mon} ’${y.slice(2)}`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
}

interface ChartPoint {
  month: string;
  live: number;
  locked: number;
  burned: number;
  total: number;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-strong)] rounded px-3 py-2 text-[11px] font-mono">
      <div className="text-[var(--text-faint)] text-[10px] mb-1">{fmtMonth(p.month)}</div>
      <Row label="Ever minted" value={p.total} color="var(--text)" bold />
      <Row label="Live (circulating)" value={p.live} color={COLOR.live} />
      <Row label="Locked" value={p.locked} color={COLOR.locked} />
      <Row label="Burned" value={p.burned} color={COLOR.burned} />
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5" style={{ color }}>
        {!bold && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className={`tabular-nums ${bold ? "font-semibold text-[var(--text)]" : "text-[var(--text-dim)]"}`}>
        {fmtFull(value)}
      </span>
    </div>
  );
}

export function SupplyCurveChart({
  monthly,
  firstBurnMonth,
  lockLaunchMonth,
  height = 380,
}: {
  monthly: SupplyMonth[];
  firstBurnMonth?: string | null;
  lockLaunchMonth?: string | null;
  height?: number;
}) {
  const data = useMemo<ChartPoint[]>(
    () =>
      monthly.map((m) => ({
        month: m.month,
        live: m.circulating - m.netLocked, // liquid float
        locked: m.netLocked,
        burned: m.cumBurned,
        total: m.cumMinted,
      })),
    [monthly],
  );

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">Supply timeline unavailable — ETL has not populated yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          {Object.entries(COLOR).map(([k, c]) => (
            <linearGradient key={k} id={`supply-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c} stopOpacity={0.55} />
              <stop offset="95%" stopColor={c} stopOpacity={0.08} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          minTickGap={48}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          tickFormatter={fmtCompact}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={44}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        />
        {firstBurnMonth && (
          <ReferenceLine
            x={firstBurnMonth}
            stroke={COLOR.burned}
            strokeDasharray="3 3"
            strokeOpacity={0.7}
            label={{ value: "deflation", position: "insideTopLeft", fill: "var(--text-faint)", fontSize: 9 }}
          />
        )}
        {lockLaunchMonth && (
          <ReferenceLine
            x={lockLaunchMonth}
            stroke={COLOR.locked}
            strokeDasharray="3 3"
            strokeOpacity={0.7}
            label={{ value: "locking", position: "insideTopRight", fill: "var(--text-faint)", fontSize: 9 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="live"
          stackId="s"
          name="Live"
          stroke={COLOR.live}
          strokeWidth={1}
          fill={`url(#supply-live)`}
        />
        <Area
          type="monotone"
          dataKey="locked"
          stackId="s"
          name="Locked"
          stroke={COLOR.locked}
          strokeWidth={1}
          fill={`url(#supply-locked)`}
        />
        <Area
          type="monotone"
          dataKey="burned"
          stackId="s"
          name="Burned"
          stroke={COLOR.burned}
          strokeWidth={1}
          fill={`url(#supply-burned)`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
