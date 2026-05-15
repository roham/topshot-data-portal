// V4-iter-2 / V4-iter-3 — homepage indices block.
//
// V4-iter-2 composes: multi-series chart (interactive window tabs) →
// 6-card sparkline row → <aside> (Window leaders + methodology) →
// 3 honest-absence sections.
//
// V4-iter-3 replaces the 3 honest-absence sections with 3 populated rows
// of sparkline cards (tier, team, series) — DOM-position-stable swap-in
// per the iter-2 child-directive specification. Aside methodology is
// extended with the weighting-algorithm disclosure (sales-count → floor
// substitution; Fandom + S7/S8 deferral).
//
// h-c-era required DOM markers (binding contract):
//   ≥6 <svg>   — featured-set sparklines + 21 new tier/team/series sparks (≥28 total)
//   ≥6 <a href="/set/...">  — featured-set click-throughs
//   ≥1 <aside> — Window leaders + methodology callout
//   section headers verbatim: "Indices", "Window leaders", "On the chart"
// V4-iter-3 markers:
//   [data-indices-row="tier"|"team"|"series"]
//   [data-tier-card] (×5) / [data-team-card] (×≤10) / [data-series-card] (×6)
//   a[href^="/tier/"] / a[href^="/team/"] / a[href^="/series/"]

import Link from "next/link";
import { SparkLine } from "@/components/SparkLine";
import { MultiSeriesChart } from "@/components/MultiSeriesChart";
import {
  windowLeaders,
  type FeaturedSetIndex,
} from "@/lib/indices/featured-sets";
import type { TierIndex, TierName, TeamIndex, SeriesIndex } from "@/lib/indices/types";

// V4-iter-4 — snapshot wrappers per spec acceptance 8 (null routes through
// honest-absence fallback).
export interface IndexSnapshotPayload<T> {
  indices: T[];
  computedAt: string;
}

interface HomepageIndicesProps {
  series30d: FeaturedSetIndex[];
  series7d: FeaturedSetIndex[];
  series24h: FeaturedSetIndex[];
  daySnapshotDepth: number;
  warmingCompleteISO: string | null;
  tiers: IndexSnapshotPayload<TierIndex> | null;
  teams: IndexSnapshotPayload<TeamIndex> | null;
  series: IndexSnapshotPayload<SeriesIndex> | null;
}

function fmtPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

// V4-iter-3 tier palette per design.md §"Tier color palette" (binding).
const TIER_PALETTE: Record<TierName, { fill: string; chipBorder: string }> = {
  Common: { fill: "#3A3A40", chipBorder: "#A0A0A8" },
  Rare: { fill: "#1F2F4A", chipBorder: "#3B82F6" },
  Legendary: { fill: "#4A3820", chipBorder: "#F59E0B" },
  Anthology: { fill: "#3A2A3A", chipBorder: "#C084FC" },
  Ultimate: { fill: "#4A1F1F", chipBorder: "#EF4444" },
};

const ROW_HEADER_CLS =
  "text-[13px] font-semibold tracking-section-header text-[var(--text-primary)]";
const FOOTER_CLS =
  "mt-1 text-[10px] italic text-[var(--text-faint)] leading-snug";

function ChipDelta({ value, border }: { value: number | null; border?: string }) {
  const hasData = value != null && Number.isFinite(value);
  const color = !hasData
    ? "var(--text-faint)"
    : (value as number) > 0
      ? "var(--up)"
      : (value as number) < 0
        ? "var(--down)"
        : "var(--text-faint)";
  return (
    <span
      className="text-[10px] font-mono tabular-nums px-1 py-0.5 rounded-sm"
      style={{
        color,
        border: border ? `1px solid ${border}` : "1px solid transparent",
      }}
    >
      {hasData ? fmtPct(value as number) : "—"}
    </span>
  );
}

function SparkOrPlaceholder({ data }: { data: number[] }) {
  if (data.length >= 2) {
    return <SparkLine data={data} width={140} height={48} strokeWidth={2} />;
  }
  return (
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
  );
}

export function HomepageIndices({
  series30d,
  series7d,
  series24h,
  daySnapshotDepth,
  warmingCompleteISO,
  tiers,
  teams,
  series,
}: HomepageIndicesProps) {
  const leaders = windowLeaders(series30d, 3);

  // V4-iter-4 — snapshot timestamps drive the methodology caption (spec
  // acceptance 5 verbatim) and the 4h stale-banner.
  const computedAts = [tiers?.computedAt, teams?.computedAt, series?.computedAt]
    .filter((s): s is string => typeof s === "string");
  const newestComputedAtISO = computedAts.length
    ? computedAts.slice().sort().reverse()[0]
    : null;
  const oldestComputedAtMs = computedAts.length
    ? Math.min(...computedAts.map((s) => Date.parse(s)).filter(Number.isFinite))
    : null;
  const nowMs = Date.now();
  const isStale =
    oldestComputedAtMs != null && nowMs - oldestComputedAtMs > 4 * 3_600_000;
  const staleHours = isStale && oldestComputedAtMs != null
    ? Math.floor((nowMs - oldestComputedAtMs) / 3_600_000)
    : 0;

  const tierList = tiers?.indices ?? null;
  const teamList = teams?.indices ?? null;
  const seriesList = series?.indices ?? null;

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

          {/* Methodology callout — extended in V4-iter-3 with weighting disclosure */}
          <div className="mt-4 pt-3 border-t border-[var(--border-faint,#222)]">
            <h4
              id="on-the-chart-header"
              className="text-[11px] font-semibold tracking-section-header mb-1"
            >
              On the chart
            </h4>
            <p className="text-[10px] italic text-[var(--text-faint)] leading-snug max-w-[60ch]">
              Indices computed from getSetPriceHistory; window leaders rank by
              Δ% across the 6 featured sets.
            </p>
            <p className="mt-2 text-[10px] italic text-[var(--text-faint)] leading-snug max-w-[60ch]">
              Tier and series indices are floor-weighted (circulation × current
              floor) across contributing sets; sales-count weighting deferred
              until per-set sales-count endpoint surfaces. Team indices are
              30d-$-volume-weighted. Fandom tier (22 sets) and Series 7 + 8 are
              not currently rendered; queued for a future iter.
            </p>
            {/* V4-iter-4 — spec acceptance 5 verbatim caption. */}
            {newestComputedAtISO ? (
              <p
                data-indices-as-of
                className="mt-2 text-[10px] italic text-[var(--text-faint)] leading-snug max-w-[60ch]"
              >
                Indices as of {newestComputedAtISO} · refreshed every 2 hours via build-time precompute
              </p>
            ) : null}
            {isStale ? (
              <p
                data-indices-stale-banner
                className="mt-2 text-[10px] font-mono text-[var(--down)] leading-snug max-w-[60ch]"
              >
                Indices last updated {staleHours} hours ago — cron may have stalled
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* V4-iter-3 / V4-iter-4 — Per-tier indices row */}
      <section
        data-indices-row="tier"
        className="border-l-2 border-[var(--border-faint,#2a2a2a)] pl-3 py-3"
      >
        <h3 className={ROW_HEADER_CLS}>Per-tier indices</h3>
        {tierList == null ? (
          <p
            data-indices-pending
            className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]"
          >
            Indices snapshot pending — first populated within 2h of next cron run.
          </p>
        ) : (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {tierList.map((t) => {
            const palette = TIER_PALETTE[t.tier];
            const sufficient = t.contributingSetCount >= 3;
            return (
              <Link
                key={t.tier}
                href={`/tier/${t.tier.toLowerCase()}`}
                data-tier-card
                className="block rounded-sm p-2 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: palette.fill,
                  border: `1px solid ${palette.chipBorder}33`,
                }}
              >
                <div className="flex items-baseline justify-between gap-1 mb-1">
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                    {t.tier}
                  </span>
                  <ChipDelta
                    value={sufficient ? t.deltaPct : null}
                    border={palette.chipBorder}
                  />
                </div>
                {sufficient ? (
                  <SparkOrPlaceholder data={t.normalized} />
                ) : (
                  <SparkOrPlaceholder data={[]} />
                )}
                <p className={FOOTER_CLS}>
                  {sufficient
                    ? `Floor-weighted index across ${t.contributingSetCount} sets in ${t.tier}`
                    : `Synthesis insufficient — ${t.contributingSetCount} sets in ${t.tier} have <30d price-history depth`}
                </p>
              </Link>
            );
          })}
        </div>
        )}
      </section>

      {/* V4-iter-3 / V4-iter-4 — Per-team indices row */}
      <section
        data-indices-row="team"
        className="border-l-2 border-[var(--border-faint,#2a2a2a)] pl-3 py-3"
      >
        <h3 className={ROW_HEADER_CLS}>Per-team indices</h3>
        {teamList == null ? (
          <p
            data-indices-pending
            className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]"
          >
            Indices snapshot pending — first populated within 2h of next cron run.
          </p>
        ) : teamList.length === 0 ? (
          <p className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]">
            Team indices unavailable — 30d transaction scan returned no
            classifiable rows. Honest-absent until the next revalidation.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {teamList.map((t) => {
              const aboveFloor = t.salesCount >= 100;
              const sufficient = aboveFloor && t.contributingSetCount >= 1;
              return (
                <Link
                  key={t.slug}
                  href={`/team/${t.slug}`}
                  data-team-card
                  className="block border border-[var(--border-faint,#222)] rounded-sm p-2 hover:border-[var(--text-faint)] transition-colors"
                  style={{ backgroundColor: "var(--surface-1, #131316)" }}
                >
                  <div className="flex items-baseline justify-between gap-1 mb-1">
                    <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                      {t.team}
                    </span>
                    <ChipDelta value={sufficient ? t.deltaPct : null} />
                  </div>
                  {sufficient ? (
                    <SparkOrPlaceholder data={t.normalized} />
                  ) : (
                    <SparkOrPlaceholder data={[]} />
                  )}
                  <p className={FOOTER_CLS}>
                    {!aboveFloor
                      ? `Below threshold — ${t.salesCount} sales in 30d; minimum 100 required for index inclusion`
                      : `Volume-weighted index across ${t.contributingSetCount} sets, top-10 by 30d $ volume`}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* V4-iter-3 / V4-iter-4 — Per-series indices row */}
      <section
        data-indices-row="series"
        className="border-l-2 border-[var(--border-faint,#2a2a2a)] pl-3 py-3"
      >
        <h3 className={ROW_HEADER_CLS}>Per-series indices</h3>
        {seriesList == null ? (
          <p
            data-indices-pending
            className="mt-1 text-[11px] italic text-[var(--text-faint)] leading-relaxed max-w-[65ch]"
          >
            Indices snapshot pending — first populated within 2h of next cron run.
          </p>
        ) : (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {seriesList.map((s) => {
            const sufficient = s.contributingSetCount >= 1;
            return (
              <Link
                key={s.series}
                href={`/series/${s.series}`}
                data-series-card
                className="block border border-[var(--border-faint,#222)] rounded-sm p-2 hover:border-[var(--text-faint)] transition-colors"
                style={{ backgroundColor: "var(--surface-1, #131316)" }}
              >
                <div className="flex items-baseline justify-between gap-1 mb-1">
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                    Series {s.series}
                  </span>
                  <ChipDelta value={sufficient ? s.deltaPct : null} />
                </div>
                {sufficient ? (
                  <SparkOrPlaceholder data={s.normalized} />
                ) : (
                  <SparkOrPlaceholder data={[]} />
                )}
                <p className={FOOTER_CLS}>
                  {sufficient
                    ? `Floor-weighted index across ${s.contributingSetCount} sets in Series ${s.series}`
                    : `Series ${s.series} has no active 30d trading — honest-absent`}
                </p>
              </Link>
            );
          })}
        </div>
        )}
      </section>
    </section>
  );
}
