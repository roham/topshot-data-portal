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
  // shallow: false — instructs nuqs to call router.replace() instead of only
  // history.replaceState(). router.replace() triggers a Next.js App Router
  // navigation which causes the server component (page.tsx) to re-render with
  // the new ?h= searchParam, fetching new getMomentHistory data for the window.
  // Without shallow:false, nuqs only updates the URL bar and the server never
  // sees the new param — the chart stays frozen on the initial server render.
  // Options are chained via .withOptions() on the parser (nuqs v2 API).
  const [_w, setW] = useQueryState(
    "h",
    parseAsStringEnum<Window>([...WINDOWS]).withDefault("all").withOptions({ shallow: false }),
  );
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
        >
          {WINDOWS.map((w) => {
            const isActive = w === active;
            return (
              <button
                key={w}
                role="radio"
                aria-checked={isActive}
                data-testid={`price-history-tab-${w}`}
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
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">
          {data.length} sales · {active === "all" ? "all time" : LABELS[active]}
        </span>
      </div>
      <Chart data={data} />
    </div>
  );
}

function Chart({ data }: { data: PricePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="px-3 pb-3 text-[11px] text-[var(--text-faint)]">
        No transactions for this moment in the selected window.
      </div>
    );
  }
  return (
    <div className="h-[280px] w-full px-3 pb-3">
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
