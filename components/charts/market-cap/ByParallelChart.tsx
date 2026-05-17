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
import type { ParallelMcapRow } from "@/lib/supabase/queries/market-cap-landing";
import { colorForParallel } from "@/lib/chart-palette";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function ByParallelChart({ rows }: { rows: ParallelMcapRow[] }) {
  const data = rows.slice(0, 23).map((r) => ({
    name: r.parallel_name,
    mcap: r.total_mcap,
    editions: r.edition_count,
    color:
      r.total_mcap > 0
        ? colorForParallel(r.parallel_id ?? null)
        : "var(--border-subtle)", // empty parallels render as subtle outline ghosts
    isEmpty: r.total_mcap === 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 50, left: 4, bottom: 4 }}
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
          width={130}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fill: "var(--text-dim)" }}
          interval={0}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            const p = payload as unknown as { editions?: number; isEmpty?: boolean };
            if (p?.isEmpty) return ["—", "Sibling-edition ETL pending"];
            return [fmtUSD(Number(value)), p?.editions != null ? `${p.editions} editions` : "Market cap"];
          }}
        />
        <Bar dataKey="mcap" radius={[0, 2, 2, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} fillOpacity={d.isEmpty ? 0.3 : 1} />
          ))}
          <LabelList
            dataKey="mcap"
            position="right"
            formatter={(v) => {
              const n = Number(v);
              if (!n) return "(pending fill)";
              return fmtUSD(n);
            }}
            style={{ fill: "var(--text-faint)", fontSize: 9, fontFamily: "var(--font-mono)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
