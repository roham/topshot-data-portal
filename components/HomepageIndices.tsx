// V4-iter-2 — homepage indices block.
//
// Composes: multi-series chart (interactive window tabs) → 6-card sparkline
// row → <aside> (Window leaders + methodology) → 3 captioned honest-absence
// sections. Restores h-c-era's set-canonical surface as DOM order 1 per
// directive D004.
//
// h-c-era required DOM markers (binding contract):
//   ≥6 <svg>   — 6 set-card sparklines (+1 chart svg)
//   ≥6 <a href="/set/...">  — 6 set-card click-throughs
//   ≥1 <aside> — Window leaders + methodology callout
//   section headers verbatim: "Indices", "Window leaders", "On the chart"

import Link from "next/link";
import { SparkLine } from "@/components/SparkLine";
import { MultiSeriesChart } from "@/components/MultiSeriesChart";
import {
  windowLeaders,
  type FeaturedSetIndex,
} from "@/lib/indices/featured-sets";

interface HomepageIndicesProps {
  series30d: FeaturedSetIndex[];
  series7d: FeaturedSetIndex[];
  series24h: FeaturedSetIndex[];
  daySnapshotDepth: number;
  warmingCompleteISO: string | null;
}

function fmtPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

export function HomepageIndices({
  series30d,
  series7d,
  series24h,
  daySnapshotDepth,
  warmingCompleteISO,
}: HomepageIndicesProps) {
  const leaders = windowLeaders(series30d, 3);

  return (
    <section data-block="homepage-indices" className="space-y-6">
      {/* Section header — verbatim h-c-era */}
      <header className="flex items-baseline gap-3 pt-2 pb-1 px-1">
        <h2
          id="indices-header"
          className="text-[13px] font-semibold tracking-section-header"
        >
          Indices
        </h2>
        <span className="text-[10px] text-[var(--text-faint)] font-mono">
          6 featured sets · base-100 normalized · 30d default
        </span>
      </header>

      {/* Chart + aside grid on desktop; stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        <div>
          <MultiSeriesChart
            series30d={series30d}
            series7d={series7d}
            series24h={series24h}
            daySnapshotDepth={daySnapshotDepth}
            warmingCompleteISO={warmingCompleteISO}
          />

          {/* 6-card row — 1440px horizontal; 2x3 grid on 375px */}
          <div
            data-indices-cards="featured-sets"
            className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
          >
            {series30d.map((idx) => {
              const hasData = idx.normalized.length >= 2;
              return (
                <Link
                  key={idx.setUuid}
                  href={`/set/${idx.setUuid}`}
                  className="block border border-[var(--border-faint,#222)] rounded-sm p-2 hover:border-[var(--text-faint)] transition-colors"
                  data-set-card
                >
                  <div className="flex items-baseline justify-between gap-1 mb-1">
                    <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                      {idx.setName}
                    </span>
                    <span
                      className="text-[10px] font-mono tabular-nums"
                      style={{
                        color: hasData
                          ? idx.deltaPct > 0
                            ? "var(--up)"
                            : idx.deltaPct < 0
                              ? "var(--down)"
                              : "var(--text-faint)"
                          : "var(--text-faint)",
                      }}
                    >
                      {hasData ? fmtPct(idx.deltaPct) : "—"}
                    </span>
                  </div>
                  {hasData ? (
                    <SparkLine
                      data={idx.normalized}
                      width={140}
                      height={48}
                      strokeWidth={2}
                    />
                  ) : (
                    <svg
                      width={140}
                      height={48}
                      viewBox="0 0 140 48"
                      aria-hidden="true"
                      data-spark-empty
                    >
                      <line
                        x1={0}
                        y1={24}
                        x2={140}
                        y2={24}
                        stroke="var(--text-faint)"
                        strokeDasharray="2 2"
                        strokeWidth={1}
                      />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Window leaders sidebar */}
        <aside
          aria-labelledby="window-leaders-header"
          className="border-l border-[var(--border-faint,#222)] lg:pl-4 pt-2 lg:pt-0"
        >
          <h3
            id="window-leaders-header"
            className="text-[12px] font-semibold tracking-section-header mb-2"
          >
            Window leaders
          </h3>
          {leaders.length ? (
            <ol className="space-y-1.5 text-[11px] font-mono">
              {leaders.map((l, i) => (
                <li
                  key={l.setUuid}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span className="text-[var(--text-faint)] tabular-nums">
                    {i + 1}.
                  </span>
                  <Link
                    href={`/set/${l.setUuid}`}
                    className="flex-1 truncate text-[var(--text-primary)] hover:underline"
                  >
                    {l.setName}
                  </Link>
                  <span
                    className="tabular-nums"
                    style={{
                      color:
                        l.deltaPct > 0
                          ? "var(--up)"
                          : l.deltaPct < 0
                            ? "var(--down)"
                            : "var(--text-faint)",
                    }}
                  >
                    {fmtPct(l.deltaPct)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] italic text-[var(--text-faint)]">
              Awaiting first usable 30d series across featured sets.
            </p>
          )}

          {/* Methodology callout */}
          <div className="mt-4 pt-3 border-t border-[var(--border-faint,#222)]">
            <h4
              id="on-the-chart-header"
              className="text-[11px] font-semibold tracking-section-header mb-1"
            >
              On the chart
            </h4>
            <p className="text-[10px] italic text-[var(--text-faint)] leading-snug max-w-[60ch]">
              Indices computed from getSetPriceHistory; window leaders rank by
              Δ% across the 6 featured sets. Tier / team / series synthesizers
              ship in iter-3+.
            </p>
          </div>
        </aside>
      </div>

      {/* 3 honest-absence sections */}
      <div className="space-y-4 pt-2">
        <section
          data-indices-absence-section
          data-dim="per-tier"
          className="border-l-2 border-[var(--border-faint,#2a2a2a)] pl-3 py-3"
        >
          <h3 className="text-[13px] font-semibold tracking-section-header text-[var(--text-primary)]">
            Per-tier indices
          </h3>
          <p className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]">
            Index synthesizer ships in iter-3+; current state intentionally
            absent rather than fabricated. (parent: D004; child:
            D004-child-tier-synthesizer)
          </p>
        </section>
        <section
          data-indices-absence-section
          data-dim="per-team"
          className="border-l-2 border-[var(--border-faint,#2a2a2a)] pl-3 py-3"
        >
          <h3 className="text-[13px] font-semibold tracking-section-header text-[var(--text-primary)]">
            Per-team indices
          </h3>
          <p className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]">
            Index synthesizer ships in iter-3+; current state intentionally
            absent rather than fabricated. (parent: D004; child:
            D004-child-team-synthesizer)
          </p>
        </section>
        <section
          data-indices-absence-section
          data-dim="per-series"
          className="border-l-2 border-[var(--border-faint,#2a2a2a)] pl-3 py-3"
        >
          <h3 className="text-[13px] font-semibold tracking-section-header text-[var(--text-primary)]">
            Per-series indices
          </h3>
          <p className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]">
            Index synthesizer ships in iter-3+; current state intentionally
            absent rather than fabricated. (parent: D004; child:
            D004-child-series-synthesizer)
          </p>
        </section>
      </div>
    </section>
  );
}
