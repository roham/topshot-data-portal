"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MarketIndexPoint } from "@/lib/state-of-market/indices";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function IndexHeroChart({ series }: { series: MarketIndexPoint[] }) {
  const data = series.map((p) => ({ date: p.date.slice(5), mcap: p.mcap }));

  if (data.length < 2) {
    return (
      <div className="flex h-[250px] items-center justify-center p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">
          {data.length === 0
            ? "No snapshots in window yet."
            : "1 snapshot in window — need ≥ 2 to plot."}
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="somHeroGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.42} />
            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={fmtUSD}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value) => [fmtUSD(Number(value)), "Basket cap"]}
        />
        <Area
          type="monotone"
          dataKey="mcap"
          stroke="#2dd4bf"
          strokeWidth={2.5}
          fill="url(#somHeroGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
