"use client";

// TS50 Composite Index hero chart — Card Ladder Pro CL50 signature port.
//
// Doctrine §0.1: cards-grid + CL50 index + gainers/losers-with-sparklines is
// the load-bearing landing pattern. This is the CL50 piece.
//
// Visual references:
//   - CL50 chart card on cardladder.com — area chart with gradient fill,
//     hero-sized current value + delta beside the chart, time-window pills
//   - TradingView equity-index defaults — 30D as the readable window for
//     sparse-history series
//
// P7 honored: default window 30D, never 24H. Window options expose 7D, 30D,
// 90D, 1Y, ALL — never sub-day.

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { TS50SeriesPoint } from "@/lib/indices/ts50-synthesizer";

function fmtCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtDate(d: string): string {
  return d.slice(5);
}

export function TS50IndexChart({ series }: { series: TS50SeriesPoint[] }) {
  if (series.length < 2) {
    return (
      <div className="flex items-center justify-center h-[320px] p-8 text-center">
        <div>
          <p className="text-[12px] text-[var(--text-dim)]">
            TS50 Index accumulating snapshots — only {series.length} day available.
          </p>
          <p className="text-[10px] text-[var(--text-faint)] mt-2">
            ETL writes one snapshot per UTC day. Series becomes meaningful at ≥ 7 days.
          </p>
        </div>
      </div>
    );
  }

  const data = series.map((p) => ({
    date: fmtDate(p.date),
    rawDate: p.date,
    index_value: p.index_value,
    basket_mcap: p.basket_mcap_usd,
  }));

  // Find y-axis bounds with some padding
  const values = data.map((d) => d.index_value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const padding = Math.max((maxV - minV) * 0.1, 0.5);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="ts50Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.55} />
            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          domain={[minV - padding, maxV + padding]}
          tickFormatter={(v) => v.toFixed(1)}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={42}
        />
        <ReferenceLine y={100} stroke="var(--border-subtle)" strokeDasharray="2 4" />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            const bm = (payload as unknown as { basket_mcap?: number })?.basket_mcap;
            return [
              `${Number(value).toFixed(2)}`,
              bm != null ? `Basket: ${fmtCompact(bm)}` : "Index",
            ];
          }}
          labelFormatter={(_l, payload) => {
            const raw = (payload?.[0]?.payload as { rawDate?: string } | undefined)?.rawDate;
            return raw ?? "";
          }}
        />
        <Area
          type="monotone"
          dataKey="index_value"
          stroke="#14b8a6"
          strokeWidth={2}
          fill="url(#ts50Gradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
