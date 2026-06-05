"use client";

// DeflationChart — JUST the deflation story: cumulative burned + cumulative
// locked, both rising. Stacked so the top edge = total moments removed from or
// immobilized out of liquid circulation over time. Up-only by nature: burns are
// permanent (strictly monotonic); net-locked is effectively monotonic (ends at
// its all-time peak). Governing spec: specs/001-supply-timeline/spec.md (FR-4)

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
  burned: "#9ca3af", // gray — permanently removed
  locked: "#f59e0b", // amber — locked / immobilized
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
  const [y, m] = month.split("-");
  const mon = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m)];
  return `${mon} ’${y.slice(2)}`;
}

interface ChartPoint {
  month: string;
  burned: number; // cumulative burned
  locked: number; // cumulative net-locked
  removed: number; // burned + locked
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
}

function ChartTooltip({ active, payload, totalMinted }: TooltipProps & { totalMinted: number }) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  const pctRemoved = totalMinted ? ((p.removed / totalMinted) * 100).toFixed(1) : "—";
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-strong)] rounded px-3 py-2 text-[11px] font-mono min-w-[200px]">
      <div className="text-[var(--text-faint)] text-[10px] mb-1">{fmtMonth(p.month)}</div>
      <Row label="Burned (cum)" value={p.burned} color={COLOR.burned} />
      <Row label="Locked (cum)" value={p.locked} color={COLOR.locked} />
      <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
        <Row label={`Out of circulation`} value={p.removed} color="var(--text)" bold />
        <div className="flex items-center justify-end text-[10px] text-[var(--text-faint)]">
          {pctRemoved}% of ever-minted
        </div>
      </div>
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

export function DeflationChart({
  monthly,
  totalMinted,
  firstBurnMonth,
  height = 360,
}: {
  monthly: SupplyMonth[];
  totalMinted: number;
  firstBurnMonth?: string | null;
  height?: number;
}) {
  const data = useMemo<ChartPoint[]>(
    () =>
      monthly.map((m) => ({
        month: m.month,
        burned: m.cumBurned,
        locked: m.netLocked,
        removed: m.cumBurned + m.netLocked,
      })),
    [monthly],
  );

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">Deflation timeline unavailable.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="defl-burned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLOR.burned} stopOpacity={0.5} />
            <stop offset="95%" stopColor={COLOR.burned} stopOpacity={0.06} />
          </linearGradient>
          <linearGradient id="defl-locked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLOR.locked} stopOpacity={0.55} />
            <stop offset="95%" stopColor={COLOR.locked} stopOpacity={0.08} />
          </linearGradient>
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
        <Tooltip content={<ChartTooltip totalMinted={totalMinted} />} />
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
            label={{ value: "deflation begins", position: "insideTopLeft", fill: "var(--text-faint)", fontSize: 9 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="burned"
          stackId="d"
          name="Burned (cumulative)"
          stroke={COLOR.burned}
          strokeWidth={1.5}
          fill="url(#defl-burned)"
        />
        <Area
          type="monotone"
          dataKey="locked"
          stackId="d"
          name="Locked (cumulative)"
          stroke={COLOR.locked}
          strokeWidth={1.5}
          fill="url(#defl-locked)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
