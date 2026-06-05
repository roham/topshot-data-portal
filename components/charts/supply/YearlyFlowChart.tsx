"use client";

// YearlyFlowChart — minted vs burned per calendar year. The literal answer to
// "year by year, how it grew and how moments were removed." Minted bars go up
// (teal), burned bars are the removal (gray). Net supply added per year = the
// gap. Governing spec: specs/001-supply-timeline/spec.md (FR-4, FR-5)

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import type { SupplyYear } from "@/lib/supabase/queries/supply-timeline";

const COLOR = {
  minted: "#5eead4", // teal — supply created
  burned: "#9ca3af", // gray — supply removed
};

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

function fmtFull(n: number): string {
  return n.toLocaleString("en-US");
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: SupplyYear }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]?.payload) return null;
  const y = payload[0].payload;
  const net = y.minted - y.burned;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-strong)] rounded px-3 py-2 text-[11px] font-mono min-w-[180px]">
      <div className="text-[var(--text-faint)] text-[10px] mb-1">{y.year}</div>
      <Row label="Minted" value={y.minted} color={COLOR.minted} />
      <Row label="Burned" value={y.burned} color={COLOR.burned} />
      <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
        <Row label="Net added" value={net} color={net >= 0 ? "var(--up)" : "var(--down)"} />
        <Row label="Total by year-end" value={y.cumMintedEnd} color="var(--text-dim)" />
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ color }}>{label}</span>
      <span className="tabular-nums text-[var(--text)]">{fmtFull(value)}</span>
    </div>
  );
}

export function YearlyFlowChart({ yearly, height = 300 }: { yearly: SupplyYear[]; height?: number }) {
  const data = useMemo(() => yearly, [yearly]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">No yearly supply data.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barGap={2}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="year"
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          tickFormatter={fmtCompact}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={44}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)", opacity: 0.4 }} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        />
        <Bar dataKey="minted" name="Minted" fill={COLOR.minted} radius={[2, 2, 0, 0]} />
        <Bar dataKey="burned" name="Burned" fill={COLOR.burned} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
