// IndexHeroPair — side-by-side Grail + Rookies index hero on the homepage.
//
// Per the 2026-05-19 senior-designer IA pass: the homepage leads with TWO
// canonical baskets so the Pro Trader sees both the blue-chip market and the
// rookie market at first paint. Each pane is a compact mini-hero:
//   · Index value (32px tabular)
//   · % change over series
//   · Basket mcap
//   · Recharts area-chart
//
// Reuses TS50IndexChart for the chart primitive (identical shape across all
// baskets); per-index hero owns the KPI rail + methodology footer.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TS50IndexChart } from "@/components/TS50IndexChart";
import {
  parseTimeWindow,
  windowToDays,
  type TimeWindow,
} from "@/components/global/window-types";
import { getGrailIndex, type GrailIndexResult } from "@/lib/indices/grail-synthesizer";
import { getRookiesIndex, type RookiesIndexResult } from "@/lib/indices/rookies-synthesizer";
import type { TS50SeriesPoint } from "@/lib/indices/ts50-synthesizer";

function deltaColor(pct: number): string {
  if (pct > 0) return "text-[var(--up)]";
  if (pct < 0) return "text-[var(--down)]";
  return "text-[var(--text-dim)]";
}

interface MiniHeroProps {
  slug: "grail" | "rookies";
  title: string;
  subtitle: string;
  methodology: string;
  latestValue: number;
  pctChange: number;
  basketMcap: number;
  daysOfHistory: number;
  series: { date: string; index_value: number; basket_mcap_usd: number }[];
  emptyReason?: string;
}

function MiniHero({
  slug,
  title,
  subtitle,
  methodology,
  latestValue,
  pctChange,
  basketMcap,
  daysOfHistory,
  series,
  emptyReason,
}: MiniHeroProps) {
  if (series.length === 0) {
    return (
      <Card title={title} subtitle={subtitle} methodology={methodology} variant="inset">
        <div className="p-6 text-[12px] text-[var(--text-dim)]">
          {emptyReason ?? `${title} basket has no matching market-cap rows yet.`}
        </div>
      </Card>
    );
  }

  // TS50IndexChart accepts TS50SeriesPoint shape; ours is structurally identical.
  const seriesForChart: TS50SeriesPoint[] = series;

  return (
    <Card
      title={title}
      subtitle={subtitle}
      methodology={methodology}
      variant="inset"
      right={
        <Link
          href={`/indices/${slug}`}
          className="text-[11px] text-[var(--accent)] hover:underline font-mono whitespace-nowrap"
        >
          basket →
        </Link>
      }
    >
      <div className="grid lg:grid-cols-[200px_1fr] gap-4 p-3">
        <div className="space-y-3 lg:border-r lg:border-[var(--border-subtle)] lg:pr-4">
          <div>
            <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
              Index
            </div>
            <div className="text-[32px] leading-none font-semibold tabular-nums tracking-tight">
              {latestValue.toFixed(2)}
            </div>
            <div className={`text-[12px] mt-1 font-mono tabular-nums ${deltaColor(pctChange)}`}>
              <Num value={pctChange} format="deltaPct" colorize={false} />
              <span className="text-[var(--text-faint)] ml-2">{daysOfHistory}d</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
              Basket mcap
            </div>
            <div className="text-[16px] leading-none font-semibold tabular-nums">
              <Num value={basketMcap} format="usdCompact" />
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <TS50IndexChart series={seriesForChart} />
        </div>
      </div>
    </Card>
  );
}

// PERF: streamed per-MiniHero rather than Promise.all-blocked. Rookies (~4s
// cold) no longer waits for Grail (~25s cold on 1Y). Each panel renders the
// moment its synthesizer resolves.
async function GrailMiniHero({
  activeWindow,
}: {
  activeWindow: TimeWindow;
}) {
  const lookbackDays = windowToDays(activeWindow);
  const result: GrailIndexResult | null = await getGrailIndex(lookbackDays).catch((err) => {
    console.error("[grail-mini-hero] fetch error", err);
    return null;
  });
  return (
    <MiniHero
      slug="grail"
      title="GRAIL"
      subtitle={`Vaultopolis ${result?.basket_resolved_size ?? 0} of ${result?.basket_canonical_count ?? 0}${result?.as_of_date ? ` · ${result.as_of_date}` : ""}`}
      methodology={`Vaultopolis-canonical Grail list (Apr 2026 ASP, ${result?.basket_canonical_count ?? 225} ranked entries). ${result?.basket_matched_count ?? 0} of ${result?.basket_canonical_count ?? 0} entries match a compound edition_id; ${(result?.basket_matched_count ?? 0) - (result?.basket_target_size ?? 0)} collapsed because Vaultopolis lists each edition at TWO supply tiers (free-float + total mint) with different ASPs — our market_caps table is single-flavor (one mcap per edition per date), so the collision is forced by data shape, not chosen. ${(result?.basket_canonical_count ?? 0) - (result?.basket_matched_count ?? 0)} unmatched (recent rookies + specific veteran parallels — our moments ingest from BQ has gaps for some editions). Value-weighted: w_i = mcap_i / Σ mcap_j, normalized 100 = series start. Snapshot-vs-snapshot, no smoothing. Editions missing on date d carry forward last known value. Supply-flavor instrumentation: topshot.mv_edition_supply_breakdown (V9 iter-7) — methodology lock pending before consumption.`}
      latestValue={result?.latest_index_value ?? 100}
      pctChange={result?.series_pct_change ?? 0}
      basketMcap={result?.basket_mcap_total_usd ?? 0}
      daysOfHistory={result?.days_of_history ?? 0}
      series={result?.series ?? []}
      emptyReason={result === null ? "Grail index temporarily unavailable." : undefined}
    />
  );
}

async function RookiesMiniHero({
  activeWindow,
}: {
  activeWindow: TimeWindow;
}) {
  const lookbackDays = windowToDays(activeWindow);
  const result: RookiesIndexResult | null = await getRookiesIndex(lookbackDays).catch((err) => {
    console.error("[rookies-mini-hero] fetch error", err);
    return null;
  });
  return (
    <MiniHero
      slug="rookies"
      title="ROOKIES"
      subtitle={`Draft class ${result?.draft_year_used ?? "—"}${result?.as_of_date ? ` · ${result.as_of_date}` : ""}`}
      methodology={`Top editions by market cap, current draft class (${result?.draft_year_used ?? "—"}). Value-weighted. Multi-line per-rookie chart lands as the canonical view; aggregate index shown here.`}
      latestValue={result?.latest_index_value ?? 100}
      pctChange={result?.series_pct_change ?? 0}
      basketMcap={result?.basket_mcap_total_usd ?? 0}
      daysOfHistory={result?.days_of_history ?? 0}
      series={result?.series ?? []}
      emptyReason={
        result === null
          ? "Rookies index temporarily unavailable."
          : result.draft_year_used === null
            ? "No editions matched for current rookie draft classes (2025, 2024)."
            : undefined
      }
    />
  );
}

function MiniHeroSkeleton() {
  return (
    <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--surface-1)]/30 p-6">
      <div className="h-4 w-32 bg-[var(--surface-2)] rounded animate-pulse mb-3" />
      <div className="h-3 w-52 bg-[var(--surface-2)]/60 rounded animate-pulse mb-6" />
      <div className="grid lg:grid-cols-[200px_1fr] gap-4">
        <div className="space-y-3">
          <div className="h-10 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
          <div className="h-6 w-24 bg-[var(--surface-2)]/60 rounded animate-pulse" />
        </div>
        <div className="h-[240px] bg-[var(--surface-2)]/40 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function IndexHeroPair({
  windowRaw,
}: {
  /** Raw `w` searchParam value from the page (the global time window). */
  windowRaw?: string | string[];
}) {
  const { window: activeWindow } = parseTimeWindow(windowRaw, "30d");
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Suspense fallback={<MiniHeroSkeleton />}>
        <GrailMiniHero activeWindow={activeWindow} />
      </Suspense>
      <Suspense fallback={<MiniHeroSkeleton />}>
        <RookiesMiniHero activeWindow={activeWindow} />
      </Suspense>
    </div>
  );
}

export function IndexHeroPairSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="border border-[var(--border-subtle)] rounded-md bg-[var(--surface-1)]/30 p-6"
        >
          <div className="h-4 w-32 bg-[var(--surface-2)] rounded animate-pulse mb-3" />
          <div className="h-3 w-52 bg-[var(--surface-2)]/60 rounded animate-pulse mb-6" />
          <div className="grid lg:grid-cols-[200px_1fr] gap-4">
            <div className="space-y-3">
              <div className="h-10 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-6 w-24 bg-[var(--surface-2)]/60 rounded animate-pulse" />
            </div>
            <div className="h-[240px] bg-[var(--surface-2)]/40 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
