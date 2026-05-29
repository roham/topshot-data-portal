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

// `currency` plots the real dollar basket market cap (basket_mcap_usd) instead
// of the normalized index. Dollars are the native, comparable unit for a
// market-cap page — an index rebases to 100 per window, so the same data shows
// a different shape at 30D vs 6M and the value is abstract. Index mode is kept
// for legacy index pages that still want the normalized line.
export function TS50IndexChart({
  series,
  currency = false,
}: {
  series: TS50SeriesPoint[];
  currency?: boolean;
}) {
  if (series.length < 2) {
    return (
      <div className="flex items-center justify-center h-[320px] p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">
          {series.length === 0 ? "No snapshots in window." : `1 snapshot in window — need ≥ 2 to plot.`}
        </p>
      </div>
    );
  }

  const data = series.map((p) => ({
    date: fmtDate(p.date),
    rawDate: p.date,
    value: currency ? p.basket_mcap_usd : p.index_value,
    index_value: p.index_value,
    basket_mcap: p.basket_mcap_usd,
  }));

  // Find y-axis bounds with some padding
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const padding = Math.max((maxV - minV) * 0.1, currency ? maxV * 0.02 : 0.5);

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
          tickFormatter={(v) => (currency ? fmtCompact(v) : v.toFixed(1))}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={currency ? 52 : 42}
        />
        {!currency && (
          <ReferenceLine y={100} stroke="var(--border-subtle)" strokeDasharray="2 4" />
        )}
        <Tooltip
          // V9 VIZ-002 — TradingView hover-crosshair signature. Cursor is a
          // prominent vertical line (not the recharts default fill); activeDot
          // marks the locked-y read; tooltip body shows the two values
          // (index + basket) compactly. Pairs across Grail + Rookies + every
          // legacy index that uses this chart primitive.
          cursor={{
            stroke: "var(--text-faint)",
            strokeWidth: 1,
            strokeDasharray: "2 4",
          }}
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
          labelStyle={{
            color: "var(--text-faint)",
            fontSize: 10,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
          itemStyle={{
            padding: "1px 0",
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            if (currency) {
              return [fmtCompact(Number(value)), "Market cap"];
            }
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
          dataKey="value"
          stroke="#14b8a6"
          strokeWidth={2}
          fill="url(#ts50Gradient)"
          activeDot={{
            r: 4,
            fill: "#14b8a6",
            stroke: "var(--surface-1)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
