"use client";

// RebasedSupplyLines — three cumulative lines, all starting from zero at the
// window's start: minted, burned, locked. Answers "how much has been minted /
// burned / locked SINCE <date>", independent of the all-time level.
// Governing spec: specs/001-supply-timeline/spec.md (FR-4)

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import type { SupplyMonth } from "@/lib/supabase/queries/supply-timeline";

const COLOR = {
  minted: "#5eead4", // teal
  burned: "#9ca3af", // gray
  locked: "#f59e0b", // amber
};

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function fmtMonth(month: string): string {
  const [y, m] = month.split("-");
  const mon = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m)];
  return `${mon} ’${y.slice(2)}`;
}

interface Point {
  month: string;
  minted: number;
  burned: number;
  locked: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Point }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-strong)] rounded px-3 py-2 text-[11px] font-mono min-w-[180px]">
      <div className="text-[var(--text-faint)] text-[10px] mb-1">{fmtMonth(p.month)}</div>
      <Row label="Minted" value={p.minted} color={COLOR.minted} />
      <Row label="Burned" value={p.burned} color={COLOR.burned} />
      <Row label="Locked" value={p.locked} color={COLOR.locked} />
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5" style={{ color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular-nums text-[var(--text)]">{value.toLocaleString("en-US")}</span>
    </div>
  );
}

export function RebasedSupplyLines({ monthly, height = 460 }: { monthly: SupplyMonth[]; height?: number }) {
  const data = useMemo<Point[]>(
    () =>
      monthly.map((m) => ({
        month: m.month,
        minted: m.cumMinted,
        burned: m.cumBurned,
        locked: m.netLocked,
      })),
    [monthly],
  );

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">No data in range.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          minTickGap={40}
          stroke="var(--text-faint)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          tickFormatter={fmtCompact}
          stroke="var(--text-faint)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="top"
          height={30}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
        />
        <Line type="monotone" dataKey="minted" name="Minted" stroke={COLOR.minted} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="burned" name="Burned" stroke={COLOR.burned} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="locked" name="Locked" stroke={COLOR.locked} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
