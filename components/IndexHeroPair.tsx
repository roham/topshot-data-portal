// IndexHeroPair — side-by-side Grail + Rookies index hero on the homepage.
//
// Per the 2026-05-19 senior-designer IA pass: the homepage leads with TWO
// canonical baskets so the Pro Trader sees both the blue-chip market and the
// rookie market at first paint. Each pane is a compact mini-hero:
//   · Index value (40px tabular)
//   · % change over series
//   · Basket mcap
//   · Recharts area-chart
//
// Reuses TS50IndexChart for the chart primitive (identical shape across all
// baskets); per-index hero owns the KPI rail + methodology footer.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TS50IndexChart } from "@/components/TS50IndexChart";
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
  isThin: boolean;
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
  isThin,
  emptyReason,
}: MiniHeroProps) {
  if (series.length === 0) {
    return (
      <Card title={title} subtitle={subtitle} methodology={methodology} variant="inset">
        <div className="p-6 text-[12px] text-[var(--text-dim)]">
          {emptyReason ??
            `${title} hasn't accumulated enough snapshots yet. ETL writes one snapshot per UTC day; the index becomes meaningful at ≥ 7 days.`}
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
          className="text-[11px] text-[var(--accent)] hover:underline font-mono"
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
              <span className="text-[var(--text-faint)] ml-2">over {daysOfHistory}d</span>
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
          {isThin && (
            <p className="text-[10px] text-[var(--text-faint)] font-mono leading-relaxed">
              Series still thin — 1 snapshot/UTC day. Representative at ≥ 7 days.
            </p>
          )}
        </div>
        <div className="min-w-0">
          <TS50IndexChart series={seriesForChart} />
        </div>
      </div>
    </Card>
  );
}

export async function IndexHeroPair({ lookbackDays = 30 }: { lookbackDays?: number }) {
  // Parallel fetch — both indices independent.
  const [grail, rookies] = await Promise.all([
    getGrailIndex(lookbackDays).catch((err) => {
      console.error("[index-hero-pair] grail fetch error", err);
      return null;
    }),
    getRookiesIndex(lookbackDays).catch((err) => {
      console.error("[index-hero-pair] rookies fetch error", err);
      return null;
    }),
  ]);

  const grailResult: GrailIndexResult | null = grail;
  const rookiesResult: RookiesIndexResult | null = rookies;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <MiniHero
        slug="grail"
        title="Grail Index"
        subtitle={`Blue-chip basket · ${grailResult?.days_of_history ?? 0}d history${grailResult?.as_of_date ? ` · as of ${grailResult.as_of_date}` : ""}`}
        methodology="V1 basket: top 50 editions by current market cap among the two scarcest tiers (Legendary + Ultimate). Value-weighted, daily-grain, carry-forward on ETL gaps. Refines to the 184-edition Vaultopolis-sourced list when the (set_id, play_id) join lands."
        latestValue={grailResult?.latest_index_value ?? 100}
        pctChange={grailResult?.series_pct_change ?? 0}
        basketMcap={grailResult?.basket_mcap_total_usd ?? 0}
        daysOfHistory={grailResult?.days_of_history ?? 0}
        series={grailResult?.series ?? []}
        isThin={grailResult?.is_thin ?? true}
      />
      <MiniHero
        slug="rookies"
        title="Rookies Index"
        subtitle={`Draft class ${rookiesResult?.draft_year_used ?? "—"} · ${rookiesResult?.days_of_history ?? 0}d history${rookiesResult?.as_of_date ? ` · as of ${rookiesResult.as_of_date}` : ""}`}
        methodology={`V1 basket: top 30 editions by current market cap among players in the rookie cohort (draft_year ${rookiesResult?.draft_year_used ?? "—"}). Value-weighted, daily-grain, carry-forward on ETL gaps.`}
        latestValue={rookiesResult?.latest_index_value ?? 100}
        pctChange={rookiesResult?.series_pct_change ?? 0}
        basketMcap={rookiesResult?.basket_mcap_total_usd ?? 0}
        daysOfHistory={rookiesResult?.days_of_history ?? 0}
        series={rookiesResult?.series ?? []}
        isThin={rookiesResult?.is_thin ?? true}
        emptyReason={
          rookiesResult && rookiesResult.draft_year_used === null
            ? "No editions found for current/recent rookie draft classes (2025, 2024). Likely an ETL gap on the players.draft_year column."
            : undefined
        }
      />
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
