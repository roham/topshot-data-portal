// PlayersHero — V9 iter-4 / VIZ-001 (upgrade from iter-1 list shape).
//
// Surface the /players directory on the homepage as a chart-canvas hero.
// One line per top-6 player by market cap, normalized to 7-day baseline=100,
// color-coded by team primary. Hover-crosshair shows all 6 values at the
// hovered day. Legend below the chart: 6 rows with team-color square + name +
// team abbr + market cap + 30d delta, each clickable to /player/[id].
//
// Sits ABOVE the existing Grail+Rookies IndexHeroPair on /.
//
// Comparable primary: Polymarket multi-line outcomes chart (one line per
//   outcome, color-coded, hover-crosshair reads all values at locked-y).
// Comparable cross-domain: TradingView hover-crosshair with locked-y read
//   (VIZ-002 signature; applied here at multi-line scale).
// Signature move: chart-canvas hero with chrome down a font size + multi-line
//   stratification + team-color encoding.
// Doctrine quote: "Pillar 1 — Data Visualization Is The Brand. Hover-crosshair
//   with locked-y read is the TradingView signature this product must adopt."
// Why this quote applies: this component IS the chart-canvas Pillar-1 calls
//   for. The list-shape iter-1 ship was a discoverability bridge; iter-4
//   completes it by replacing the list with the visualization itself.

import Link from "next/link";
import { Suspense } from "react";
import { Num } from "@/components/primitives/Num";
import {
  PlayersHeroChart,
  type PlayersHeroSeries,
} from "@/components/PlayersHeroChart";
import {
  getPlayersMarketCap,
  type PlayerMarketCapRow,
} from "@/lib/supabase/queries/players-marketcap";
import {
  colorsForTeamFullName,
  teamFullNameToAbbr,
} from "@/lib/nba-team-colors";

const TOP_N = 6;
const CHART_HEIGHT = 200;

interface NormalizedSeries {
  player_id: string;
  player_name: string;
  team_abbr: string | null;
  color: string;
  values: Array<{ day: number; normalized: number; raw: number }>;
  market_cap_usd: number;
  delta_pct_30d: number | null;
}

function normalize(p: PlayerMarketCapRow): NormalizedSeries | null {
  if (!p.sparkline || p.sparkline.length < 2) return null;
  const base = p.sparkline[0];
  if (!base || base <= 0) return null;
  const colors = colorsForTeamFullName(p.team_name);
  return {
    player_id: p.player_id,
    player_name: p.player_name ?? p.player_id,
    team_abbr: teamFullNameToAbbr(p.team_name) ?? null,
    // Fall back to the Top Shot accent if no team match.
    color: colors?.primary ?? "var(--accent)",
    values: p.sparkline.map((v, day) => ({
      day,
      normalized: (v / base) * 100,
      raw: v,
    })),
    market_cap_usd: p.market_cap_usd,
    delta_pct_30d: p.delta_pct_30d,
  };
}

async function PlayersHeroInner() {
  const { rows, as_of_date } = await getPlayersMarketCap();
  if (!rows.length) {
    return (
      <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
        <header className="flex items-baseline gap-3 mb-2">
          <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)]">
            Players
          </h2>
          <span className="text-[11px] text-[var(--text-faint)] tnum">directory empty</span>
          <Link
            href="/methodology"
            className="ml-auto text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] tracking-data-label"
          >
            methodology →
          </Link>
        </header>
      </section>
    );
  }

  const series = rows
    .slice(0, TOP_N * 2) // bring some slack — skip rows with too-short sparklines
    .map(normalize)
    .filter((s): s is NormalizedSeries => s !== null)
    .slice(0, TOP_N);

  if (series.length < 2) {
    return (
      <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
        <header className="flex items-baseline gap-3 mb-2">
          <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)]">
            Players
          </h2>
          <span className="text-[11px] text-[var(--text-faint)] tnum">
            insufficient sparkline data for chart-canvas
          </span>
          <Link
            href="/players"
            className="ml-auto text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] tracking-data-label"
          >
            all players →
          </Link>
        </header>
      </section>
    );
  }

  // Build merged dataset: rows of { day, [player_id]: normalized, ... }
  const dayCount = series[0].values.length;
  const merged = Array.from({ length: dayCount }).map((_, day) => {
    const row: Record<string, number> = { day };
    for (const s of series) row[s.player_id] = s.values[day]?.normalized ?? 100;
    return row;
  });

  return (
    <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
      <header className="flex items-baseline gap-3 mb-2">
        <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)]">
          Players
        </h2>
        <span className="text-[11px] text-[var(--text-faint)] tnum">
          top {TOP_N} by market cap · 7d normalized (base=100)
          {as_of_date ? ` · ${as_of_date}` : ""}
        </span>
        <Link
          href="/players"
          className="ml-auto text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] tracking-data-label"
        >
          all players →
        </Link>
      </header>

      {/* Chart canvas — Polymarket dominant-chart shape (client component) */}
      <PlayersHeroChart
        series={series.map<PlayersHeroSeries>((s) => ({
          player_id: s.player_id,
          player_name: s.player_name,
          color: s.color,
        }))}
        merged={merged}
        height={CHART_HEIGHT}
      />

      {/* Legend — clickable rows */}
      <ul role="list" className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5">
        {series.map((s) => (
          <li key={s.player_id}>
            <Link
              href={`/player/${s.player_id}`}
              className="grid grid-cols-[10px_1fr_36px_minmax(72px,auto)_minmax(56px,auto)] items-center gap-2 py-1 px-1 hover:bg-[var(--surface-2)]/40 rounded-sm transition-colors"
            >
              <span
                aria-hidden
                className="w-[10px] h-[10px] rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-mono text-[12px] text-[var(--text)] truncate">
                {s.player_name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-data-label text-[var(--text-faint)] truncate">
                {s.team_abbr ?? "—"}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-right text-[var(--text)]">
                <Num value={s.market_cap_usd} format="usdCompact" />
              </span>
              <span className="font-mono text-[11px] tabular-nums text-right">
                <Num value={s.delta_pct_30d} format="deltaPct" colorize />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlayersHeroSkeleton() {
  return (
    <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
      <header className="flex items-baseline gap-3 mb-2">
        <div className="h-4 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
        <div className="h-3 w-60 bg-[var(--surface-2)]/60 rounded animate-pulse" />
        <div className="ml-auto h-3 w-20 bg-[var(--surface-2)]/60 rounded animate-pulse" />
      </header>
      <div className="bg-[var(--surface-2)]/30 rounded animate-pulse" style={{ height: CHART_HEIGHT }} />
      <ul role="list" className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5">
        {Array.from({ length: TOP_N }).map((_, i) => (
          <li key={i}>
            <div className="grid grid-cols-[10px_1fr_36px_minmax(72px,auto)_minmax(56px,auto)] items-center gap-2 py-1 px-1">
              <span className="w-[10px] h-[10px] rounded-sm bg-[var(--surface-2)]/60" />
              <div className="h-3 w-24 bg-[var(--surface-2)]/60 rounded animate-pulse" />
              <div className="h-3 w-8 bg-[var(--surface-2)]/40 rounded animate-pulse" />
              <div className="h-3 w-12 bg-[var(--surface-2)]/60 rounded animate-pulse ml-auto" />
              <div className="h-3 w-10 bg-[var(--surface-2)]/40 rounded animate-pulse ml-auto" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlayersHero() {
  return (
    <Suspense fallback={<PlayersHeroSkeleton />}>
      <PlayersHeroInner />
    </Suspense>
  );
}
