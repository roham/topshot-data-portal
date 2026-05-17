// Client component. Renders the moment price-history chart with time-tabs
// that ACTUALLY change the SQL window via Nuqs `?h=` param. The server side
// reads the param and feeds a different time-bounded WHERE clause to
// getMomentHistory.

"use client";

import { useQueryState, parseAsStringEnum } from "nuqs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Suspense } from "react";

const WINDOWS = ["1d", "7d", "1m", "3m", "ytd", "all"] as const;
type Window = (typeof WINDOWS)[number];
const LABELS: Record<Window, string> = {
  "1d": "1D",
  "7d": "7D",
  "1m": "1M",
  "3m": "3M",
  ytd: "YTD",
  all: "ALL",
};

export interface PricePoint {
  ts: string;
  price_usd: number;
}

interface Props {
  data: PricePoint[];
  // The active window the server selected. The tabs update the `?h=` URL param;
  // Next.js re-renders the page server-side with new data because the page
  // declares `searchParams` as input.
  active: Window;
}

export function MomentPriceHistory({ data, active }: Props) {
  return (
    <Suspense fallback={<Chart data={data} />}>
      <Inner data={data} active={active} />
    </Suspense>
  );
}

function Inner({ data, active }: Props) {
  // `currentW` drives the tab's visual active state immediately on click
  // (client-side nuqs state), without waiting for the server RSC re-render.
  // This gives TradingView-style tab responsiveness: the tab highlights the
  // moment the user clicks, even if the chart data is still in flight.
  // The chart DATA itself still comes from `data` (server-fetched for the
  // window reflected in the URL), so a brief visual gap between tab state
  // and chart content is acceptable and honest.
  //
  // `active` (server prop) is kept as the canonical initial value and is used
  // to initialise nuqs — nuqs reads `?h=` from the URL on mount so they agree.
  const [currentW, setW] = useQueryState(
    "h",
    parseAsStringEnum<Window>([...WINDOWS])
      .withDefault("1m")
      .withOptions({ history: "replace", shallow: false }),
  );
  // Fall back to server prop if nuqs hasn't hydrated yet (SSR).
  const displayW = currentW ?? active;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-3 pt-3">
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">
          window
        </span>
        <div
          className="inline-flex items-center bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded overflow-hidden"
          role="radiogroup"
          aria-label="History window"
          data-testid="price-history-tabs"
        >
          {WINDOWS.map((w) => {
            // Use the nuqs state (client-side) so the tab reflects the click
            // immediately, rather than waiting for the server RSC round-trip.
            const isActive = w === displayW;
            return (
              <button
                key={w}
                role="radio"
                aria-checked={isActive}
                data-testid={`price-tab-${w}`}
                onClick={() => void setW(w)}
                className={
                  "px-2 py-1 text-[10px] tracking-data-label font-mono transition-colors " +
                  (isActive
                    ? "bg-[var(--surface-3)] text-[var(--text)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]")
                }
              >
                {LABELS[w]}
              </button>
            );
          })}
        </div>
        <span
          className="ml-auto text-[10px] text-[var(--text-faint)] font-mono"
          data-testid="price-history-window-label"
        >
          {data.length} sales · {displayW === "all" ? "all time" : LABELS[displayW]}
        </span>
      </div>
      <Chart data={data} />
    </div>
  );
}

function Chart({ data }: { data: PricePoint[] }) {
  if (data.length === 0) {
    return (
      <div
        className="px-3 pb-3 text-[11px] text-[var(--text-faint)]"
        data-testid="price-history-empty"
      >
        No transactions for this moment in the selected window.
      </div>
    );
  }
  return (
    <div className="h-[280px] w-full px-3 pb-3" data-testid="price-history-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.map((p) => ({
            ts: p.ts,
            price: p.price_usd,
            label: new Date(p.ts).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          }))}
          margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-faint)" }}
            stroke="var(--border-subtle)"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-faint)" }}
            stroke="var(--border-subtle)"
            tickFormatter={(v) => {
              const n = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(n)) return "—";
              return `$${n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0)}`;
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
              fontSize: 11,
              borderRadius: 4,
            }}
            labelStyle={{ color: "var(--text-dim)" }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v);
              return [
                Number.isFinite(n) ? `$${n.toLocaleString()}` : "—",
                "price",
              ];
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--accent)"
            strokeWidth={1.5}
            dot={{ r: 2, fill: "var(--accent)" }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
