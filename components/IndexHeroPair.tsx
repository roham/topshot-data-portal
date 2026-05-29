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
import { parseRookieYear } from "@/lib/indices/rookie-years";
import { RookieYearSelect } from "@/components/RookieYearSelect";
import type { TS50SeriesPoint } from "@/lib/indices/ts50-synthesizer";
import type { ReactNode } from "react";

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
  /** Optional control (e.g. year filter) rendered in the pane header. */
  controls?: ReactNode;
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
  controls,
}: MiniHeroProps) {
  if (series.length === 0) {
    return (
      <Card
        title={title}
        subtitle={subtitle}
        methodology={methodology}
        variant="inset"
        right={controls}
      >
        <div className="p-6 text-[12px] text-[var(--text-dim)]">
          {emptyReason ?? `${title} basket has no matching market-cap rows yet.`}
        </div>
      </Card>
    );
  }

  // TS50IndexChart accepts TS50SeriesPoint shape; ours is structurally identical.
  const seriesForChart: TS50SeriesPoint[] = series;

  // Dollar-based % change over the window (first vs last non-zero basket mcap).
  // We show the real $ basket, not the normalized index — the index rebases to
  // 100 per window so its shape/value isn't comparable across windows, and here
  // it was manufacturing moves the dollars don't show.
  const firstUsd = series.find((p) => p.basket_mcap_usd > 0)?.basket_mcap_usd ?? 0;
  const lastUsd = [...series].reverse().find((p) => p.basket_mcap_usd > 0)?.basket_mcap_usd ?? 0;
  const pctDollar = firstUsd > 0 ? ((lastUsd - firstUsd) / firstUsd) * 100 : 0;

  return (
    <Card
      title={title}
      subtitle={subtitle}
      methodology={methodology}
      variant="inset"
      right={
        <div className="flex items-center gap-2">
          {controls}
          <Link
            href={`/indices/${slug}`}
            className="text-[11px] text-[var(--accent)] hover:underline font-mono whitespace-nowrap"
          >
            basket →
          </Link>
        </div>
      }
    >
      <div className="grid lg:grid-cols-[200px_1fr] gap-4 p-3">
        <div className="space-y-3 lg:border-r lg:border-[var(--border-subtle)] lg:pr-4">
          <div>
            <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
              Basket market cap
            </div>
            <div className="text-[30px] leading-none font-semibold tabular-nums tracking-tight">
              <Num value={basketMcap} format="usdCompact" />
            </div>
            <div className={`text-[12px] mt-1 font-mono tabular-nums ${deltaColor(pctDollar)}`}>
              <Num value={pctDollar} format="deltaPct" colorize={false} />
              <span className="text-[var(--text-faint)] ml-2">{daysOfHistory}d</span>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <TS50IndexChart series={seriesForChart} currency />
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
      subtitle={`Vaultopolis ${result?.basket_resolved_size ?? 0} of 225 on-chain${result?.as_of_date ? ` · ${result.as_of_date}` : ""}`}
      methodology={`GRAIL Litepaper v1.2 (May 2026, libruary.com): top 225 NBA Top Shot editions ranked by asp_180d. Authoritative source = on-chain contract A.3a54ff5b392d115b.GRAILExchangeV2 (Flow account 0x3a54ff5b392d115b, 0 active keys = immutable). The contract whitelist keys at TRIPLE granularity: (setID, playID, subeditionID). On-chain count breakdown (2026-05-20): 220 (setID, playID) pairs, of which 4 carry multiple subedition variants → 9 extra triples → 225 total editions (216 pairs allow-all + 4 pairs × 2-3 specific subeditions). Our edition_id in topshot.editions is keyed at (set_uuid+play_uuid) only — missing the subedition_id dimension — which is why our matched CSV collapses 184 valid Vaultopolis rows to ${result?.basket_target_size ?? 0} unique edition_ids. Subedition_id IS populated in topshot.moments (values 1-22 observed); the dimension just doesn't propagate to editions/market_caps. Filed as V9 iter-10 refactor. Verified post-backfill: LeBron Cosmic Legendary (active=30 vs Vaultopolis 31; total=49 = Vaultopolis 49), LeBron Holo Icon S3 Legendary (active=23 vs Vaultopolis 22; in_circ=67 vs Vaultopolis 68). Value-weighted: w_i = mcap_i / Σ mcap_j, normalized 100 = series start. Editions missing on date d carry forward last known value.`}
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
  draftYear,
}: {
  activeWindow: TimeWindow;
  draftYear: string;
}) {
  const lookbackDays = windowToDays(activeWindow);
  const result: RookiesIndexResult | null = await getRookiesIndex(lookbackDays, draftYear).catch((err) => {
    console.error("[rookies-mini-hero] fetch error", err);
    return null;
  });
  return (
    <MiniHero
      slug="rookies"
      title="ROOKIES"
      controls={<RookieYearSelect />}
      subtitle={`Draft class ${result?.draft_year_used ?? draftYear}${result?.as_of_date ? ` · ${result.as_of_date}` : ""}`}
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
            ? `No market-cap-bearing editions matched the ${draftYear} draft class.`
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
  rookieYearRaw,
}: {
  /** Raw `w` searchParam value from the page (the global time window). */
  windowRaw?: string | string[];
  /** Raw `ry` searchParam value — the selected rookie draft year. */
  rookieYearRaw?: string | string[];
}) {
  const { window: activeWindow } = parseTimeWindow(windowRaw, "30d");
  const draftYear = parseRookieYear(rookieYearRaw);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Suspense fallback={<MiniHeroSkeleton />}>
        <GrailMiniHero activeWindow={activeWindow} />
      </Suspense>
      <Suspense key={draftYear} fallback={<MiniHeroSkeleton />}>
        <RookiesMiniHero activeWindow={activeWindow} draftYear={draftYear} />
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
