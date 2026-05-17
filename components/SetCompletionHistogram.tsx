// SetCompletionHistogram — OTM-parity set completion bar chart.
//
// Renders the six completion-level buckets from mv_set_completion_distribution
// as a Recharts BarChart, ordered highest-completion-first so the rarity of
// full completion is scannable at a glance.
//
// Primary comparable: OTM "Completion | Count" right-rail (each discrete
// completion level as its own row, exact owner count visible immediately).
//
// Cross-domain: PSA Set Registry pop-report — each quality grade is a discrete
// bar with exact count, ordered best-to-worst, making scarcity gradient legible
// without aggregation math.
//
// Viz kind: histogram-bar (Pillar 1 vocabulary).
//
// No time-window filter — this is a current-state snapshot. set_id is already
// encoded in the route param, so URL state is satisfied.
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
  Cell,
} from "recharts";
import { EmptyState } from "@/components/primitives/EmptyState";

// Descending-completion order — this is the canonical display order.
// Matches the sort in app/set/[id]/page.tsx so the data arrives pre-sorted.
const BUCKET_ORDER = [
  "100% (complete)",
  "75-99%",
  "50-74%",
  "25-49%",
  "10-24%",
  "<10%",
];

// Bar color: accent for full completion, progressively dimmer for lower buckets.
// Mirrors PSA pop-report: the "10" bar is obviously different from the "7" bar.
const BUCKET_COLORS: Record<string, string> = {
  "100% (complete)": "var(--accent)",   // bright accent — the rarest tier
  "75-99%":          "#6366f1",          // indigo
  "50-74%":          "#3b82f6",          // blue
  "25-49%":          "#22d3ee",          // cyan
  "10-24%":          "#64748b",          // slate
  "<10%":            "#334155",          // dark slate — the mass of partial holders
};

interface CompletionBucket {
  bucket: string;
  owner_count: number;
  total_editions_in_set: number | null;
}

interface Props {
  data: CompletionBucket[];
}

// Short label for XAxis ticks — keeps the chart readable at 360px width.
function shortLabel(bucket: string): string {
  if (bucket === "100% (complete)") return "100%";
  return bucket;
}

// Custom tooltip: shows bucket label + exact owner count (PSA pop-report style).
function HistogramTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { bucket: string } }>;
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
        {row.bucket}
      </div>
      <div style={{ color: "var(--text)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {value.toLocaleString("en-US")} owners
      </div>
    </div>
  );
}

export function SetCompletionHistogram({ data }: Props) {
  // Filter out 'N/A' buckets (total_editions = 0 edge case) and unknown buckets.
  const validBuckets = data.filter((b) => BUCKET_ORDER.includes(b.bucket));

  if (validBuckets.length === 0) {
    return (
      <EmptyState
        title="No completion data"
        body="MV mv_set_completion_distribution returned no rows for this set. Backfill may still be running."
      />
    );
  }

  // Ensure pre-sorted order (defensive — page.tsx already sorts, but belt+suspenders).
  const sorted = [...validBuckets].sort(
    (a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket),
  );

  const chartData = sorted.map((b) => ({
    bucket: b.bucket,
    label: shortLabel(b.bucket),
    owner_count: Number(b.owner_count),
  }));

  return (
    <div data-testid="completion-histogram" className="px-3 pb-3">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 4, left: 0, bottom: 4 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            label={{
              value: "Owners",
              angle: -90,
              position: "insideLeft",
              offset: 12,
              style: { fontSize: 10, fill: "var(--text-faint)", fontFamily: "monospace" },
            }}
            tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}K`
                : String(v)
            }
          />
          <Tooltip
            content={<HistogramTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="owner_count"
            isAnimationActive={false}
            radius={[3, 3, 0, 0]}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={BUCKET_COLORS[entry.bucket] ?? "var(--accent)"}
                opacity={0.85}
              />
            ))}
            {/* Bar value label — exact count above each bar (OTM right-rail pattern) */}
            <LabelList
              dataKey="owner_count"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => {
                const n = typeof v === "number" ? v : Number(v ?? 0);
                return n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
              }}
              style={{ fontSize: 9, fill: "var(--text-faint)", fontFamily: "monospace" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
