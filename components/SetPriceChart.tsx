"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";

interface Point {
  ts: number; // unix ms
  price: number; // dollars
}

interface SetPriceChartProps {
  data: Point[];
  height?: number;
  setName: string;
}

function formatPrice(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  if (v >= 100) return `$${v.toFixed(0)}`;
  if (v >= 10) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload?: Point }>;
}

function ChartTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--bg-elev)] border border-[var(--border-strong)] rounded px-2.5 py-1.5 text-xs font-mono">
      <div className="text-[var(--text-faint)] text-[10px]">{formatFullDate(p.ts)}</div>
      <div className="text-[var(--text)] tabular-nums font-semibold mt-0.5">{formatPrice(p.price)}</div>
    </div>
  );
}

export function SetPriceChart({ data, height = 220, setName }: SetPriceChartProps) {
  const summary = useMemo(() => {
    if (data.length === 0) return null;
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const delta = last - first;
    const pct = first > 0 ? (delta / first) * 100 : 0;
    const up = delta >= 0;
    const high = Math.max(...data.map((d) => d.price));
    const low = Math.min(...data.map((d) => d.price));
    return { first, last, delta, pct, up, high, low };
  }, [data]);

  if (!data.length) {
    return (
      <div
        className="border border-[var(--border)] rounded p-4 text-xs text-[var(--text-faint)] font-mono"
        style={{ minHeight: height }}
      >
        No historical price data exposed for this set by the public Top Shot API at this time. Per-set series populate
        for sets with active resale; older or low-volume sets sometimes return empty.
      </div>
    );
  }

  const color = summary?.up ? "var(--up)" : "var(--down)";
  const gradientId = `setPriceGradient-${summary?.up ? "up" : "down"}`;

  return (
    <div className="border border-[var(--border)] rounded p-4 bg-[var(--bg-card)]">
      <div className="flex items-baseline justify-between mb-3 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] font-mono">
            Set VWAP · last 30 days
          </div>
          <div className="text-xl font-semibold tabular-nums font-mono mt-0.5">
            {summary ? formatPrice(summary.last) : "—"}
            {summary && (
              <span className={`ml-3 text-sm ${summary.up ? "text-[var(--up)]" : "text-[var(--down)]"}`}>
                {summary.up ? "+" : ""}
                {summary.delta.toFixed(2)}{" "}
                <span className="text-[var(--text-faint)]">
                  ({summary.pct >= 0 ? "+" : ""}
                  {summary.pct.toFixed(1)}%)
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="text-[10px] text-[var(--text-faint)] font-mono">
          <span className="block">high {summary ? formatPrice(summary.high) : "—"}</span>
          <span className="block">low {summary ? formatPrice(summary.low) : "—"}</span>
        </div>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              stroke="var(--border-strong)"
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
              stroke="var(--border-strong)"
              width={50}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "2 3" }} />
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} />
            {summary && (
              <ReferenceLine y={summary.first} stroke="var(--border-strong)" strokeDasharray="3 3" strokeOpacity={0.6} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-[var(--text-faint)] font-mono mt-2 leading-snug">
        Set-level VWAP from <code className="text-[var(--text-dim)]">getSetPriceHistory</code>. Sample times are
        irregular (server determines the cadence). Not per-edition — for per-edition history the snapshot accumulator
        warms in from launch. {setName ? `Source: ${setName}.` : ""}
      </div>
    </div>
  );
}
