// /state-of-the-market — surface "B" of the redesign (research/design-sprints/
// 05-redesign-vision-handover.md). Museum-grade macro backdrop: a featured
// market index, the Market Map (every player a tile), and tier-segmented
// activity. Pro-trading terminal, not a spreadsheet.
//
// Build order (handover §"Open threads"): hero → market map → activity.
// Hard rule (handover §"voice/craft"): NO meta-commentary on the canvas —
// analyst voice only. Section heads + tight legends, no rationale.
//
// Interactivity is URL-param driven (matches /market-cap): ?w= window drives the
// featured index series, ?idx= re-features an index from the rail, ?tier= filters
// the activity sales feed. Each section sits in a <Suspense> keyed on its inputs.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  getMarketIndices,
  parseIndexKey,
  type MarketIndexKey,
} from "@/lib/state-of-market/indices";
import {
  getActivitySales,
  getMovesByPlayerIds,
  windowToMoverWindow,
} from "@/lib/state-of-market/activity";
import { getPlayerMovers } from "@/lib/supabase/queries/player-movers";
import { getPlayersMarketCap } from "@/lib/supabase/queries/players-marketcap";

import { Num } from "@/components/primitives/Num";
import { MarketTicker, type TickerItem } from "@/components/state-of-market/MarketTicker";
import { IndexHeroChart } from "@/components/state-of-market/IndexHeroChart";
import { IndexRail } from "@/components/state-of-market/IndexRail";
import { MarketMap } from "@/components/state-of-market/MarketMap";
import { MarketActivity } from "@/components/state-of-market/MarketActivity";
import {
  HeroSkeleton,
  MapSkeleton,
  ActivitySkeleton,
} from "@/components/state-of-market/skeletons";
import {
  parseTimeWindow,
  windowToDays,
  type TimeWindow,
} from "@/components/global/window-types";

export const metadata: Metadata = {
  title: "State of the Market · TS·PORTAL",
  description:
    "The macro backdrop for NBA Top Shot — a featured market index, the Market Map of every player sized by cap and colored by 30-day move, and live market activity.",
};

export const revalidate = 300;
export const maxDuration = 60;

type SP = { w?: string; idx?: string; tier?: string };

// Pills shown in the hero. Subset of the full window taxonomy.
const HERO_WINDOWS: TimeWindow[] = ["7d", "30d", "90d", "1y", "all"];

function buildHref(sp: SP, override: Partial<SP>): string {
  const next = new URLSearchParams();
  const merged = { ...sp, ...override };
  if (merged.w) next.set("w", merged.w);
  if (merged.idx) next.set("idx", merged.idx);
  if (merged.tier) next.set("tier", merged.tier);
  const qs = next.toString();
  return qs ? `/state-of-the-market?${qs}` : "/state-of-the-market";
}

function SectionHead({ title, legend }: { title: string; legend: string }) {
  return (
    <div className="mb-[14px] mt-[34px] flex items-baseline justify-between gap-4">
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      <p className="max-w-[520px] text-right text-[11.5px] text-[var(--text-faint)]">{legend}</p>
    </div>
  );
}

// ── Ticker (live layer thread) ───────────────────────────────────────────────
async function TickerSection() {
  const sales = await getActivitySales("7d", 16);
  const items: TickerItem[] = sales.map((s) => ({
    id: s.transaction_id,
    actor: s.buyer_safe_name ?? s.seller_safe_name,
    side: "bought" as const,
    label: [s.player_name ?? s.play_name, s.serial_number != null ? `#${s.serial_number}` : null]
      .filter(Boolean)
      .join(" "),
    priceUsd: s.gross_amount_usd,
  }));
  return <MarketTicker items={items} />;
}

// ── Hero: featured index + switcher rail ─────────────────────────────────────
async function HeroSection({ sp, featured }: { sp: SP; featured: MarketIndexKey }) {
  const { window } = parseTimeWindow(sp.w);
  const cards = await getMarketIndices(windowToDays(window));
  const active = cards.find((c) => c.key === featured) ?? cards[0];

  return (
    <div className="py-[26px]">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--up)] shadow-[0_0_8px_var(--up)]" />
            <span className="font-mono text-[13px] font-semibold tracking-[0.12em] text-[#2dd4bf]">
              {active.name} INDEX
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              featured
            </span>
          </div>
          <div className="text-[58px] font-bold leading-none tracking-tight tabular-nums">
            <Num value={active.basket_mcap_usd} format="usdCompact" />
          </div>
          <div className="mt-2.5 font-mono text-[15px]">
            <Num value={active.pct_change} format="deltaPct" colorize precision={1} />
            <span className="ml-2 text-[var(--text-faint)]">· {window.toUpperCase()}</span>
          </div>
          <div className="mt-3.5 text-[12px] leading-relaxed text-[var(--text-dim)]">
            {active.sublabel}
            {active.is_thin && (
              <span className="text-[var(--text-faint)]"> · thin history — last marks lead</span>
            )}
          </div>
          <div className="mt-5 inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
            {HERO_WINDOWS.map((w) => {
              const on = w === window;
              return (
                <Link
                  key={w}
                  href={buildHref(sp, { w })}
                  scroll={false}
                  className={`rounded-md px-[9px] py-[5px] font-mono text-[11px] transition-colors ${
                    on
                      ? "bg-[#2dd4bf]/15 font-semibold text-[#2dd4bf]"
                      : "text-[var(--text-dim)] hover:text-[var(--text)]"
                  }`}
                >
                  {w.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(45,212,191,0.05),rgba(45,212,191,0))] px-3.5 pb-1.5 pt-4">
          <div className="mb-1 px-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            {active.name} basket market cap · {window.toUpperCase()}
          </div>
          <IndexHeroChart series={active.series} />
        </div>
      </div>

      <IndexRail cards={cards} featured={active.key} />
    </div>
  );
}

// ── Map ──────────────────────────────────────────────────────────────────────
async function MapSection({ window }: { window: TimeWindow }) {
  const mw = windowToMoverWindow(window);
  const { rows } = await getPlayersMarketCap();
  // Each tile's OWN move over the active mover window, keyed by player_id.
  const topIds = rows.filter((r) => r.market_cap_usd > 0).slice(0, 40).map((r) => r.player_id);
  const moves = await getMovesByPlayerIds(topIds, mw);
  return <MarketMap rows={rows} moves={moves} />;
}

// ── Activity ─────────────────────────────────────────────────────────────────
async function ActivitySection({ window }: { window: TimeWindow }) {
  const mw = windowToMoverWindow(window);
  const [sales, movers] = await Promise.all([
    getActivitySales(window, 40),
    getPlayerMovers(mw),
  ]);
  return (
    <MarketActivity
      sales={sales}
      gainers={movers.gainers.slice(0, 5)}
      losers={movers.losers.slice(0, 5)}
      moverWindowDays={mw}
      salesWindowLabel={window.toUpperCase()}
    />
  );
}

export default async function StateOfMarketPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { window } = parseTimeWindow(sp.w);
  const featured = parseIndexKey(sp.idx);
  const moverDays = windowToMoverWindow(window);

  return (
    <>
      <Suspense fallback={<div className="h-[33px] border-b border-[var(--border-subtle)]" />}>
        <TickerSection />
      </Suspense>

      <main className="mx-auto max-w-[1500px] px-[22px] pb-16">
        <h1 className="pt-5 text-[20px] font-semibold tracking-tight">State of the Market</h1>

        <Suspense key={`hero-${window}-${featured}`} fallback={<HeroSkeleton />}>
          <HeroSection sp={sp} featured={featured} />
        </Suspense>

        <SectionHead
          title="The Market Map"
          legend={`Each tile a player · sized by market cap · colored by ${moverDays}-day move`}
        />
        <Suspense key={`map-${window}`} fallback={<MapSkeleton />}>
          <MapSection window={window} />
        </Suspense>

        <SectionHead
          title="Market Activity"
          legend="Specific sales left, biggest cap moves right"
        />
        <Suspense key={`act-${window}`} fallback={<ActivitySkeleton />}>
          <ActivitySection window={window} />
        </Suspense>
      </main>
    </>
  );
}
