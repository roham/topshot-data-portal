"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { RealizedMonth } from "@/lib/supabase/queries/realized-economics";

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function RealizedTrendChart({ rows }: { rows: RealizedMonth[] }) {
  const data = rows.map((r) => ({
    month: r.month.slice(0, 7),
    gmv: r.gmv,
    median: r.median_usd,
  }));
  if (data.length < 2) {
    return (
      <div className="flex h-[340px] items-center justify-center text-[12px] text-[var(--text-dim)]">
        No realized-economics data yet (materialized view not populated).
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, left: 6, bottom: 4 }}>
        <defs>
          <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} minTickGap={20} />
        <YAxis yAxisId="gmv" tickFormatter={fmtUSD} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} width={52} />
        <YAxis yAxisId="med" orientation="right" tickFormatter={(v) => `$${v}`} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} width={40} />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 11 }}
          formatter={(value, name) =>
            name === "GMV" ? [fmtUSD(Number(value)), "GMV"] : [`$${Number(value)}`, "Median sale"]
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area yAxisId="gmv" type="monotone" dataKey="gmv" name="GMV" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#gmvGrad)" />
        <Line yAxisId="med" type="monotone" dataKey="median" name="Median sale" stroke="#f5b14b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
