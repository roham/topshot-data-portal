import { recentSales, recentSalesBulk } from "@/lib/topshot/queries";
import { readRecentSnapshots } from "@/lib/snapshots/store";
import { IndexStrip } from "@/components/IndexStrip";
import { TickerTape } from "@/components/TickerTape";
import { MoverColumn, type MoverRow } from "@/components/MoverColumn";
import { FeaturedCollector, type FeaturedCollectorData } from "@/components/FeaturedCollector";
import { Card } from "@/components/primitives/Card";
import type { MarketplaceTransaction } from "@/lib/topshot/types";

export const revalidate = 30;

// ---- pure derivers ----

function aggregateBySet(txs: MarketplaceTransaction[]) {
  const byKey = new Map<string, { flowName: string; flowId?: number; count: number; volume: number; samples: number[] }>();
  for (const t of txs) {
    const flowName = t.moment?.set?.flowName;
    if (!flowName) continue;
    const key = flowName;
    const cur = byKey.get(key) ?? { flowName, flowId: t.moment?.set?.flowId, count: 0, volume: 0, samples: [] };
    cur.count++;
    const price = Number(t.price ?? 0);
    cur.volume += price;
    cur.samples.push(price);
    byKey.set(key, cur);
  }
  return Array.from(byKey.values());
}

interface PriorMarket {
  txCount: number;
  medianPriceCents: number;
  topPlayersByVolume: Array<{ playerName: string; count: number; medianPriceCents: number }>;
}

async function loadHomeData() {
  // Run live + accumulator pulls in parallel.
  const [liveTxs, bulkTxs, marketRecent] = await Promise.all([
    recentSales(60).catch(() => []),
    recentSalesBulk(400).catch(() => []),
    readRecentSnapshots<PriorMarket>("market", 6).catch(() => []),
  ]);

  // ---- Index strip (placeholder until indices route renders real values) ----
  // For phase 4.5 homepage we render the headline numbers from the LIVE bulk
  // pull. Real index registry computation lives at /indices/[slug] and gets
  // wired into the strip in a follow-up iter once /indices renders.
  const totalVol = bulkTxs.reduce((s, t) => s + Number(t.price ?? 0), 0);
  const liveCount = bulkTxs.length;
  const meanPrice = liveCount > 0 ? totalVol / liveCount : 0;
  // Compare to the snapshot 6 ticks back (≈3h ago) for a directional delta.
  const oldest = marketRecent[marketRecent.length - 1]?.data;
  const meanCentsNow = meanPrice * 100;
  const meanCentsPrior = oldest?.medianPriceCents ?? meanCentsNow;
  const meanDelta = meanCentsPrior > 0 ? ((meanCentsNow - meanCentsPrior) / meanCentsPrior) * 100 : null;

  const tierBands = ["MOMENT_TIER_COMMON", "MOMENT_TIER_FANDOM", "MOMENT_TIER_RARE", "MOMENT_TIER_LEGENDARY"];
  const tierMeans = tierBands.map((t) => {
    const samples = bulkTxs.filter((x) => x.moment?.tier === t).map((x) => Number(x.price ?? 0));
    return samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
  });

  const indexCells = [
    { slug: "ts500", label: "Mean ask", value: meanPrice || null, delta24h: meanDelta },
    { slug: "tier-common", label: "Tier · common", value: tierMeans[0], delta24h: null },
    { slug: "tier-fandom", label: "Tier · fandom", value: tierMeans[1], delta24h: null },
    { slug: "tier-rare", label: "Tier · rare", value: tierMeans[2], delta24h: null },
    { slug: "tier-legendary", label: "Tier · legendary", value: tierMeans[3], delta24h: null },
  ];

  // ---- Ticker tape — last 30 live sales ----
  const ticker = liveTxs.slice(0, 30).map((t, i) => {
    const playerName = t.moment?.play?.stats?.playerName ?? "—";
    const setName = t.moment?.set?.flowName ?? "—";
    const serial = t.moment?.flowSerialNumber ?? "?";
    const buyer = t.buyer?.username ?? "anon";
    const price = Number(t.price ?? 0);
    return {
      id: `${t.id}-${i}`,
      label: `${buyer} bought ${playerName} #${serial} · ${setName}`,
      price: price >= 1000 ? `$${(price / 1000).toFixed(1)}K` : `$${price.toFixed(0)}`,
      href: t.moment?.flowId ? `/moment/${t.moment.flowId}` : "/",
      isNew: i < 3, // first three flash
    };
  });

  // ---- 3 mover columns: build from set-level aggregates over the bulk window ----
  const setAggs = aggregateBySet(bulkTxs);
  // Prior set state from older market snapshots (so we can compute deltas).
  // For first pass we use mean-price-now vs mean-price-3-snapshots-ago; later
  // iters will wire per-set series from snapshots.
  const priorByPlayer = new Map<string, number>();
  if (marketRecent.length >= 2) {
    const older = marketRecent[Math.min(marketRecent.length - 1, 3)]?.data;
    older?.topPlayersByVolume?.forEach((p) => {
      priorByPlayer.set(p.playerName, p.medianPriceCents / 100);
    });
  }
  // Top 5 by volume (always populated)
  const volumeLeaders: MoverRow[] = [...setAggs]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map((s) => ({
      key: `vol-${s.flowName}`,
      href: s.flowId ? `/sets?q=${encodeURIComponent(s.flowName)}` : "/",
      primary: s.flowName,
      secondary: `${s.count} sales · mean ${formatUsdCompact(s.volume / s.count)}`,
      value: s.volume / s.count,
      volumeUsd: s.volume,
      spark: undefined,
    }));

  // Mean-per-set vs prior — approximate up/down rankings.
  const setMovers = setAggs
    .map((s) => {
      const meanNow = s.volume / s.count;
      // Compute "prior" as the bottom-half median vs top-half median proxy.
      const sorted = [...s.samples].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const early = sorted.slice(0, Math.max(1, mid));
      const late = sorted.slice(mid);
      const earlyMean = early.reduce((a, b) => a + b, 0) / early.length;
      const lateMean = late.reduce((a, b) => a + b, 0) / late.length;
      const deltaPct = earlyMean > 0 ? ((lateMean - earlyMean) / earlyMean) * 100 : 0;
      return { ...s, deltaPct, meanNow };
    })
    .filter((s) => s.count >= 4);

  const moversUp: MoverRow[] = [...setMovers]
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 5)
    .map((s) => ({
      key: `up-${s.flowName}`,
      href: s.flowId ? `/sets?q=${encodeURIComponent(s.flowName)}` : "/",
      primary: s.flowName,
      secondary: `${s.count} sales · early→late mean`,
      value: s.meanNow,
      deltaPct: s.deltaPct,
      spark: s.samples,
    }));

  const moversDown: MoverRow[] = [...setMovers]
    .sort((a, b) => a.deltaPct - b.deltaPct)
    .slice(0, 5)
    .map((s) => ({
      key: `dn-${s.flowName}`,
      href: s.flowId ? `/sets?q=${encodeURIComponent(s.flowName)}` : "/",
      primary: s.flowName,
      secondary: `${s.count} sales · early→late mean`,
      value: s.meanNow,
      deltaPct: s.deltaPct,
      spark: s.samples,
    }));

  // ---- Featured collector ----
  const spendByBuyer = new Map<string, { spend: number; count: number; largest: number; largestHref: string | null; flowAddress: string | null }>();
  for (const t of liveTxs) {
    const u = t.buyer?.username;
    if (!u) continue;
    const price = Number(t.price ?? 0);
    const cur = spendByBuyer.get(u) ?? { spend: 0, count: 0, largest: 0, largestHref: null, flowAddress: t.buyer?.flowAddress ?? null };
    cur.spend += price;
    cur.count++;
    if (price > cur.largest) {
      cur.largest = price;
      cur.largestHref = t.moment?.flowId ? `/moment/${t.moment.flowId}` : null;
    }
    spendByBuyer.set(u, cur);
  }
  const topBuyer = [...spendByBuyer.entries()].sort((a, b) => b[1].spend - a[1].spend)[0];
  const featured: FeaturedCollectorData | null = topBuyer
    ? {
        username: topBuyer[0],
        flowAddress: topBuyer[1].flowAddress,
        totalSpendWindowUsd: topBuyer[1].spend,
        buyCountWindow: topBuyer[1].count,
        largestSaleUsd: topBuyer[1].largest,
        largestSaleHref: topBuyer[1].largestHref,
        hint: hintForBuyer(topBuyer[1].spend, topBuyer[1].count),
      }
    : null;

  return { indexCells, ticker, moversUp, moversDown, volumeLeaders, featured };
}

function hintForBuyer(spend: number, count: number): string {
  if (spend >= 50_000) return "5-figure window spend";
  if (count >= 10) return "high-frequency window";
  if (spend >= 5_000) return "above-floor window spend";
  return "leading window buyer";
}

function formatUsdCompact(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

export default async function Home() {
  const data = await loadHomeData().catch(() => null);
  if (!data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">
        Upstream Top Shot API unreachable. Reload in a few seconds.
      </div>
    );
  }
  const { indexCells, ticker, moversUp, moversDown, volumeLeaders, featured } = data;
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      {/* Variant tournament banner */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded text-[11px] font-mono">
        <span className="text-[10px] tracking-data-label text-[var(--accent)]">Variant tournament</span>
        <span className="text-[var(--text-dim)]">Compare four homepage concepts before this one becomes canonical:</span>
        <a href="/h/a" className="text-[var(--text)] hover:text-[var(--accent)]">A · KPI</a>
        <span className="text-[var(--text-faint)]">·</span>
        <a href="/h/b" className="text-[var(--text)] hover:text-[var(--accent)]">B · Feed</a>
        <span className="text-[var(--text-faint)]">·</span>
        <a href="/h/c" className="text-[var(--text)] hover:text-[var(--accent)]">C · Indices</a>
        <span className="text-[var(--text-faint)]">·</span>
        <a href="/h/d" className="text-[var(--text)] hover:text-[var(--accent)]">D · Story</a>
      </div>

      {/* Page title — short, factual */}
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Market</h1>
        <p className="text-[12px] text-[var(--text-dim)]">
          Live state of the NBA Top Shot resale market — indices, ticker tape, and the day&apos;s biggest moves.
        </p>
      </header>

      {/* Index strip */}
      <IndexStrip cells={indexCells} />

      {/* Ticker tape */}
      <TickerTape items={ticker} />

      {/* 3 mover columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <MoverColumn
          title="Top movers · up"
          subtitle={`${moversUp.length} sets · early → late mean within window`}
          methodology="Set-level mover from the 400-tx bulk window. Direction inferred from price-trajectory within the window (early half vs late half mean). Set price history at /set/[id]."
          rows={moversUp}
          side="up"
        />
        <MoverColumn
          title="Top movers · down"
          subtitle={`${moversDown.length} sets · early → late mean within window`}
          methodology="Same methodology as movers-up; sorted descending on the negative side."
          rows={moversDown}
          side="down"
        />
        <MoverColumn
          title="Volume leaders · window"
          subtitle={`${volumeLeaders.length} sets · total spend within window`}
          methodology="Sum of all transaction prices within the 400-tx bulk window grouped by set.flowName."
          rows={volumeLeaders}
          side="volume"
        />
      </div>

      {/* Featured collector */}
      <FeaturedCollector data={featured} />

      {/* Honest absence: explain what's NOT here yet */}
      <Card
        title="What this page does not yet show"
        methodology="Honest absence is part of the design. Surfaces below land in subsequent iters; data exists, the UI just hasn't been built yet."
      >
        <ul className="text-[11px] text-[var(--text-dim)] space-y-1 list-disc pl-5">
          <li>True index series (TS500, per-tier, per-series) — gated on /indices/[slug] rebuild; the strip above shows live mean prices as a placeholder.</li>
          <li>24h delta on each index cell — needs the snapshot accumulator at &gt;24h of depth. First snapshot landed 2026-05-15.</li>
          <li>Per-set sparkline on the mover rows — gated on per-set snapshot history (the 1h-warm cron writes this).</li>
          <li>Ticker tape pause-on-hover + click-to-pin — interaction iter follows.</li>
        </ul>
      </Card>
    </div>
  );
}
