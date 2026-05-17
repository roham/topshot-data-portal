"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ParallelMcapRow } from "@/lib/supabase/queries/market-cap-landing";

const palette = [
  "#94a3b8", // Base — neutral
  "#fbbf24", // Explosion
  "#f87171", // Torn
  "#60a5fa", // Vortex
  "#34d399", // Rippled
  "#a78bfa", // Coded
  "#fb7185", // Halftone
  "#22d3ee", // Bubbled
  "#fdba74", // Diced
  "#c084fc", // Bit
  "#67e8f9", // Vibe
  "#86efac", // Astra
  "#fcd34d", // Diamond
  "#fca5a5", // Voltage
  "#bef264", // Livewire
  "#f9a8d4", // Championship
  "#fdba74", // Club Collection
  "#7dd3fc", // Blockchain
  "#a3e635", // Hardcourt
  "#f0abfc", // Hexwave
  "#fde047", // Jukebox
  "#a5b4fc", // Galactic
  "#f472b6", // Omega
];

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
          width={130}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10 }}
          interval={0}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            const eds = (payload as unknown as { editions?: number })?.editions;
            return [fmtUSD(Number(value)), eds != null ? `${eds} editions` : "Market cap"];
          }}
        />
        <Bar dataKey="mcap" radius={[0, 2, 2, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
