"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { SetMcapRow } from "@/lib/supabase/queries/market-cap-landing";
import { colorForSeries } from "@/lib/chart-palette";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function TopSetsChart({ rows }: { rows: SetMcapRow[] }) {
  const data = rows.map((r) => ({
    name:
      r.set_name && r.series_number != null
        ? `${r.set_name} · S${r.series_number}`
        : r.set_name ?? "Unknown",
    mcap: r.total_mcap,
    color: colorForSeries(r.series_number),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={fmtUSD}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          stroke="var(--text-faint)"
          tick={{ fontSize: 9 }}
          interval={0}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value) => [fmtUSD(Number(value)), "Market cap"]}
        />
        <Bar dataKey="mcap" radius={[0, 2, 2, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
          <LabelList
            dataKey="mcap"
            position="right"
            formatter={(v) => fmtUSD(Number(v))}
            style={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
