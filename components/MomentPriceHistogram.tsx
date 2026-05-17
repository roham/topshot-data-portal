// MomentPriceHistogram — OTM-parity price-bucket sale histogram on the moment
// detail page.
//
// Positioned below the price-history line chart, above the circulation block —
// matching OTM's layout (research/features/moment-detail-histogram.md §2).
//
// Primary comparable: OTM moment detail price-bucket histogram (x = $ bucket,
//   y = sale count; bars color-coded recency; inherits the active time window).
//
// Cross-domain comparables:
//   1. Polymarket order ladder — bar height = quantity at that price point,
//      making price-cluster concentration scannable at a glance.
//   2. Glassnode price-bucket supply — auto-sizing bucket width to the asset's
//      price range (~15–25 meaningful bars regardless of asset price).
//
// Viz kind: histogram-bar (Pillar 1 vocabulary).
//
// URL state: inherited from the parent page's ?h= parameter (the same
//   historyWindow that drives MomentPriceHistory). No additional filter needed.
//
// Confidence layer: sale count in the Card subtitle ("N sales · this edition · Xw").
//   EmptyState when count = 0 (honest absence per Pillar 5 §2).
//
// "use client" required: Recharts BarChart is browser-only.

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { EmptyState } from "@/components/primitives/EmptyState";
import type { MomentHistoryWindow } from "@/lib/supabase/queries/moment-detail";

// ── Bucket-width auto-sizing (Glassnode pattern) ──────────────────────────
//
// Choose the smallest clean denomination that produces ~15–25 bars.
// Clean denominations: $1, $5, $10, $25, $50, $100, $250, $500.
// Formula: smallest value ≥ ceil(range / 20).
const DENOMINATIONS = [1, 5, 10, 25, 50, 100, 250, 500] as const;

function computeBucketWidth(prices: number[]): number {
  if (prices.length === 0) return 1;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  if (range <= 0) return 1;
  const target = Math.ceil(range / 20);
  return DENOMINATIONS.find((d) => d >= target) ?? 500;
}

// ── Bucket grouping ───────────────────────────────────────────────────────

interface BucketDatum {
  label: string;   // e.g. "$7" — lower bound of the bucket (OTM style)
  bucketLow: number;
  count: number;   // sale count in this bucket (Polymarket: bar height = quantity)
}

function pricesToBuckets(prices: number[], bucketWidth: number): BucketDatum[] {
  const counts = new Map<number, number>();
  for (const p of prices) {
    const low = Math.floor(p / bucketWidth) * bucketWidth;
    counts.set(low, (counts.get(low) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([low, count]) => ({
      label: `$${low}`,
      bucketLow: low,
      count,
    }));
}

// ── Window → display label ────────────────────────────────────────────────

const WINDOW_LABELS: Record<MomentHistoryWindow, string> = {
  "1d": "1D",
  "7d": "7D",
  "1m": "1M",
  "3m": "3M",
  ytd:  "YTD",
  all:  "all time",
};

// ── Custom tooltip (Polymarket style: bucket label + exact count) ─────────

function HistogramTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: BucketDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: row } = payload[0];
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 4,
        padding: "6px 10px",
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      <div style={{ color: "var(--text-dim)", marginBottom: 2 }}>
        {row.label}
      </div>
      <div
        style={{
          color: "var(--text)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value.toLocaleString("en-US")} sales
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  prices: number[];
  window: MomentHistoryWindow;
}

export function MomentPriceHistogram({ prices, window }: Props) {
  // Honest absence (Pillar 5 §2): EmptyState, not a blank chart area.
  if (prices.length === 0) {
    return (
      <div data-testid="price-histogram">
        <EmptyState
          title="No sale data for this window"
          body={`No completed transactions for this edition in the ${WINDOW_LABELS[window]} window. Source: topshot.transactions filtered by edition_id via moments!inner.`}
        />
      </div>
    );
  }

  const bucketWidth = computeBucketWidth(prices);
  const buckets = pricesToBuckets(prices, bucketWidth);

  return (
    <div data-testid="price-histogram" className="px-3 pb-3">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={buckets}
          margin={{ top: 16, right: 4, left: 0, bottom: 4 }}
          barCategoryGap="15%"
        >
          <XAxis
            dataKey="label"
            tick={{
              fontSize: 10,
              fill: "var(--text-faint)",
              fontFamily: "monospace",
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            label={{
              value: "Sales",
              angle: -90,
              position: "insideLeft",
              offset: 12,
              style: {
                fontSize: 10,
                fill: "var(--text-faint)",
                fontFamily: "monospace",
              },
            }}
            tick={{
              fontSize: 10,
              fill: "var(--text-faint)",
              fontFamily: "monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            content={<HistogramTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            opacity={0.85}
            isAnimationActive={false}
            radius={[3, 3, 0, 0]}
          >
            {/* Value label above each bar — honest count per Pillar 5 §4 */}
            <LabelList
              dataKey="count"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => {
                const n = typeof v === "number" ? v : Number(v ?? 0);
                return n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
              }}
              style={{
                fontSize: 9,
                fill: "var(--text-faint)",
                fontFamily: "monospace",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
