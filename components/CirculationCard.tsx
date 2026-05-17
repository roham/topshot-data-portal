// CirculationCard — OTM-parity circulation breakdown for a moment's edition.
//
// Renders six buckets (Owned / Listings / Owned-locked / In a Pack /
// Locker Room / Burned) as an inline labeled stats strip + a donut chart,
// matching the OTM compact horizontal stats strip described in:
//   research/features/moment-detail-circulation.md §2 (Comparables).
//
// Cross-domain: Glassnode's ordered-cohort-bands-summing-to-total principle
// (Pillar 3 learning bank).
//
// Viz kind: stacked-bar-or-donut (Pillar 1 vocabulary).
//
// No time-window filter — this is a current-state snapshot. Edition context
// is already implicit in the route; no URL filter state required (per §2b).
//
// "use client" required for Recharts PieChart (browser-only).

"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { EditionCirculation, CirculationBucket } from "@/lib/supabase/queries/moment-detail";
import { EmptyState } from "@/components/primitives/EmptyState";

// Glassnode ordered-segment palette: most liquid at top, removed from
// circulation at bottom. Muted to match Bloomberg-density dark-slate brand.
const BUCKET_COLORS: Record<string, string> = {
  owned:        "#22c55e",  // green  — actively owned, unlisted
  listings:     "#3b82f6",  // blue   — live market depth
  "owned-locked": "#f59e0b", // amber  — owned but locked
  "in-pack":    "#a855f7",  // purple — unreleased (0 currently, shown honestly)
  "locker-room":"#f97316",  // orange — unclaimed
  burned:       "#6b7280",  // gray   — removed from circulation
};

interface Props {
  circulation: EditionCirculation | null;
  editionCirculationCount?: number | null; // from edition.circulationCount for reconciliation
}

export function CirculationCard({ circulation, editionCirculationCount }: Props) {
  if (!circulation) {
    return (
      <EmptyState
        title="Circulation data unavailable"
        body="Edition ID could not be resolved from this moment's flowId."
      />
    );
  }

  const { buckets, dbTotal, editionId } = circulation;

  // Subtitle: reconciliation annotation (Pillar 5 §4 + §2b)
  const subtitle =
    editionCirculationCount != null && editionCirculationCount !== dbTotal
      ? `DB total: ${dbTotal.toLocaleString("en-US")} · edition declared: ${editionCirculationCount.toLocaleString("en-US")}`
      : `${dbTotal.toLocaleString("en-US")} moments · edition ${editionId.slice(0, 8)}`;

  // Donut data: order Owned → Listings → Owned-locked → In a Pack → Locker Room → Burned
  const pieData = buckets.map((b) => ({
    name: b.label,
    value: b.count,
    slug: b.slug,
  }));

  return (
    <div data-testid="circ-card">
      {/* Subtitle bar (reconciliation / confidence label) — normal case, not uppercase */}
      <div className="px-3 pt-1 pb-2 text-[10px] text-[var(--text-faint)] font-mono tracking-wide">
        {subtitle}
      </div>

      {/* Two-column layout: stats strip left, donut right */}
      <div className="flex flex-col sm:flex-row gap-0">
        {/* ── Stats strip (OTM-style inline labeled cells) ── */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 divide-[var(--border-subtle)]">
          {buckets.map((b) => (
            <BucketCell key={b.slug} bucket={b} color={BUCKET_COLORS[b.slug] ?? "#6b7280"} />
          ))}
        </div>

        {/* ── Donut chart (Glassnode cohort-bands summing to total) ── */}
        <div
          className="w-full sm:w-[200px] h-[160px] flex-shrink-0"
          data-testid="circ-donut"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="80%"
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.slug}
                    fill={BUCKET_COLORS[entry.slug] ?? "#6b7280"}
                    opacity={entry.value === 0 ? 0.2 : 0.85}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  borderRadius: 4,
                }}
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value ?? 0);
                  const bucket = buckets.find((b) => b.label === String(name));
                  const pct = bucket ? bucket.pct.toFixed(1) : "0.0";
                  return [`${n.toLocaleString("en-US")} (${pct}%)`, String(name)];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Single bucket cell — OTM style: uppercase label, bold %, count in parens.
function BucketCell({
  bucket,
  color,
}: {
  bucket: CirculationBucket;
  color: string;
}) {
  return (
    <div
      data-testid={`circ-${bucket.slug}`}
      className="flex flex-col gap-0.5 px-3 py-2.5 border-r border-[var(--border-subtle)] last:border-r-0"
    >
      {/* Color swatch + label */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color, opacity: bucket.count === 0 ? 0.3 : 1 }}
        />
        <span className="text-[9px] font-mono tracking-wider uppercase text-[var(--text-faint)]">
          {bucket.label}
        </span>
      </div>
      {/* Bold percentage */}
      <span className="text-[16px] leading-none font-semibold tnum text-[var(--text)]">
        {bucket.pct.toFixed(1)}%
      </span>
      {/* Absolute count in parens at smaller weight */}
      <span className="text-[10px] text-[var(--text-dim)] tnum">
        ({bucket.count.toLocaleString("en-US")})
      </span>
    </div>
  );
}
