// PlayersHero — V9 iter-1 / POLISH-001.
//
// Surface the /players directory on the homepage as a labeled entity in first
// viewport. NOT a card-shape "Browse" tab — a directly-rendered ranked list
// with team-color accent + 7d sparkline + market cap + 30d delta per row.
//
// Sits ABOVE the existing Grail+Rookies IndexHeroPair on /.
//
// Comparable primary: PSA Set Registry canonical entity-sidebar (top players
//   visible in first viewport, ranked, clickable to detail pages).
// Comparable cross-domain: Wikipedia infobox top-stats — eight rows of dense
//   labeled fact in the header position of an entity page.
// Signature move: entity-list-as-homepage-prominence reusing existing primitives
//   (no new chart-canvas, no new sparkline component).
// Doctrine quote: "Pillar 4 — Best-In-Class Taxonomy + Browse: the Player layer
//   of Series→Set→Edition→Moment must have prominence on the homepage, not
//   just navigation."
// Why this quote applies: this component adds the Player entity layer as a
//   first-viewport prominence surface, directly enacting the Pillar-4
//   prominence requirement for the Player taxonomy.

import Link from "next/link";
import { Suspense } from "react";
import { Sparkline } from "@/components/primitives/Sparkline";
import { Num } from "@/components/primitives/Num";
import { getPlayersMarketCap } from "@/lib/supabase/queries/players-marketcap";
import {
  colorsForTeamFullName,
  teamFullNameToAbbr,
} from "@/lib/nba-team-colors";

const TOP_N = 8;

async function PlayersHeroInner() {
  const { rows, as_of_date } = await getPlayersMarketCap();
  if (!rows.length) {
    // Honest absence per Pillar 5 — show the methodology link, not apologetic copy.
    return (
      <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
        <header className="flex items-baseline gap-3 mb-2">
          <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)]">
            Players
          </h2>
          <span className="text-[11px] text-[var(--text-faint)] tnum">
            directory empty
          </span>
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

  const top = rows.slice(0, TOP_N);

  return (
    <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
      <header className="flex items-baseline gap-3 mb-2">
        <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)]">
          Players
        </h2>
        <span className="text-[11px] text-[var(--text-faint)] tnum">
          top {TOP_N} by market cap
          {as_of_date ? ` · ${as_of_date}` : ""}
        </span>
        <Link
          href="/players"
          className="ml-auto text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] tracking-data-label"
        >
          all players →
        </Link>
      </header>
      <ul role="list" className="divide-y divide-[var(--border-subtle)]">
        {top.map((p) => {
          const colors = colorsForTeamFullName(p.team_name);
          const abbr = teamFullNameToAbbr(p.team_name);
          const accent = colors?.primary ?? "var(--border-subtle)";
          return (
            <li key={p.player_id}>
              <Link
                href={`/player/${p.player_id}`}
                className="grid grid-cols-[3px_1fr_56px_minmax(72px,auto)_minmax(64px,auto)_72px] items-center gap-3 py-1.5 px-1 hover:bg-[var(--surface-2)]/40 transition-colors rounded-sm"
              >
                <span
                  aria-hidden
                  className="self-stretch w-[3px] rounded-sm"
                  style={{ backgroundColor: accent }}
                />
                <span className="font-mono text-[13px] text-[var(--text)] truncate">
                  {p.player_name ?? p.player_id}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-data-label text-[var(--text-faint)] truncate">
                  {abbr ?? p.team_name ?? "—"}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-right text-[var(--text)]">
                  <Num value={p.market_cap_usd} format="usdCompact" />
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right">
                  <Num value={p.delta_pct_30d} format="deltaPct" colorize />
                </span>
                <span className="flex justify-end">
                  <Sparkline data={p.sparkline} width={72} height={18} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PlayersHeroSkeleton() {
  return (
    <section className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3">
      <header className="flex items-baseline gap-3 mb-2">
        <div className="h-4 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
        <div className="h-3 w-44 bg-[var(--surface-2)]/60 rounded animate-pulse" />
        <div className="ml-auto h-3 w-20 bg-[var(--surface-2)]/60 rounded animate-pulse" />
      </header>
      <ul role="list" className="divide-y divide-[var(--border-subtle)]">
        {Array.from({ length: TOP_N }).map((_, i) => (
          <li key={i}>
            <div className="grid grid-cols-[3px_1fr_56px_minmax(72px,auto)_minmax(64px,auto)_72px] items-center gap-3 py-1.5 px-1">
              <span className="self-stretch w-[3px] rounded-sm bg-[var(--surface-2)]/40" />
              <div className="h-3.5 w-32 bg-[var(--surface-2)]/60 rounded animate-pulse" />
              <div className="h-3 w-10 bg-[var(--surface-2)]/40 rounded animate-pulse" />
              <div className="h-3.5 w-16 bg-[var(--surface-2)]/60 rounded animate-pulse ml-auto" />
              <div className="h-3 w-12 bg-[var(--surface-2)]/40 rounded animate-pulse ml-auto" />
              <div className="h-[18px] w-[72px] bg-[var(--surface-2)]/40 rounded animate-pulse ml-auto" />
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
