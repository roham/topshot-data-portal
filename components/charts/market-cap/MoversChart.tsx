"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { MoverRow } from "@/lib/supabase/queries/market-cap-landing";
import { DIRECTION_COLOR } from "@/lib/chart-palette";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function MoversChart({
  gainers,
  losers,
}: {
  gainers: MoverRow[];
  losers: MoverRow[];
}) {
  // Combine into single chart: losers on left (negative), gainers on right (positive)
  const data = [
    ...losers
      .slice()
      .reverse()
      .map((m) => ({
        name: m.player_name,
        pct: m.pct_change,
        latest: m.latest_mcap,
        color: DIRECTION_COLOR.down,
      })),
    ...gainers.map((m) => ({
      name: m.player_name,
      pct: m.pct_change,
      latest: m.latest_mcap,
      color: DIRECTION_COLOR.up,
    })),
  ];

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">
          Mcap movement window thin. Day-over-day deltas pending more daily
          ETL snapshots.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={fmtPct}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
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
            const latest = (payload as unknown as { latest?: number })?.latest ?? 0;
            return [`${fmtPct(Number(value))} (now ${fmtUSD(latest)})`, "Change"];
          }}
        />
        <ReferenceLine x={0} stroke="var(--border-subtle)" />
        <Bar dataKey="pct" radius={[2, 2, 2, 2]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
