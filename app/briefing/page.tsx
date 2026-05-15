import { recentSalesBulk, biggestSalesAllTime, allSets, getSetPriceHistory, type SetPriceHistoryPoint } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { TierChip } from "@/components/primitives/TierChip";
import { getAccumulatorDepth, formatDepthCaption } from "@/lib/snapshots/depth";
import { readRecentSnapshots, type Cadence } from "@/lib/snapshots/store";
import Link from "next/link";

export const revalidate = 60;
export const metadata = { title: "Briefing · TS·PORTAL" };

// /briefing — Pro Trader morning surface. Three bands:
//   Top: canonical KPI strip (6 metrics defensible against Bloomberg WEI,
//        TradingView screener, Card Ladder, Polymarket — every KPI
//        appears on 3+ reference surfaces. See
//        iter/12-briefing/kpi-rationale.md for the picks + the rejects.)
//   Middle: 3-5 algorithmic story cards.
//   Bottom: top-10 most-traded editions + top-10 biggest single sales.
//
// Reads live API + accumulator depth. % change is gated on accumulator ≥48h
// and renders an honest "warming" cell until then.

interface MarketSnapshotShape {
  ts: number;
  txCount: number;
  uniqueBuyers: number;
  medianPriceCents: number;
  meanPriceCents: number;
  topSetsByVolume?: Array<{ setFlowName: string; count: number; medianPriceCents: number }>;
  topPlayersByVolume?: Array<{ playerName: string; count: number; medianPriceCents: number }>;
}

interface Headline {
  key: string;
  kicker: string;
  hed: string;
  dek: React.ReactNode;
  href: string;
  spark?: number[];
  sparkColor?: string;
  tier?: string | null;
}

async function computePctChange24h(): Promise<{ pct: number | null; available: boolean; reason: string }> {
  // Compare current 30m-market snapshot's median price to one ~24h ago.
  // We need at least 2 snapshots at least 24h apart.
  const snaps = await readRecentSnapshots<MarketSnapshotShape>("market", 200).catch(() => []);
  if (snaps.length < 2) return { pct: null, available: false, reason: "warming — needs ≥2 snapshots" };
  // Sort by ts.
  const sorted = [...snaps].sort((a, b) => (a.data?.ts ?? 0) - (b.data?.ts ?? 0));
  const newest = sorted[sorted.length - 1].data;
  const oldest = sorted[0].data;
  const newestTs = newest?.ts ?? 0;
  const oldestTs = oldest?.ts ?? 0;
  const span = newestTs - oldestTs;
  if (span < 24 * 60 * 60 * 1000) {
    return {
      pct: null,
      available: false,
      reason: `warming — ${(span / (60 * 60 * 1000)).toFixed(1)}h of ${24}h needed`,
    };
  }
  if (!newest || !oldest || !oldest.medianPriceCents) {
    return { pct: null, available: false, reason: "snapshot field missing" };
  }
  const pct = ((newest.medianPriceCents - oldest.medianPriceCents) / oldest.medianPriceCents) * 100;
  return { pct, available: true, reason: "" };
}

async function loadBriefing() {
  const [bulk, biggestAllTime, sets, depth, deltaResult] = await Promise.all([
    recentSalesBulk(500).catch(() => []),
    biggestSalesAllTime(10).catch(() => []),
    allSets(200).catch(() => []),
    getAccumulatorDepth().catch(() => null),
    computePctChange24h().catch(() => ({ pct: null, available: false, reason: "error" })),
  ]);
  if (!bulk.length) return null;

  // ---- KPI strip ----
  const volumeUsd = bulk.reduce((s, t) => s + Number(t.price ?? 0), 0);
  const salesCount = bulk.length;
  const buyers = new Set<string>();
  for (const t of bulk) {
    if (t.buyer?.flowAddress) buyers.add(t.buyer.flowAddress);
  }
  const prices = bulk.map((t) => Number(t.price ?? 0)).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  // Active listings — issue a count-only query for listed-moments-market-wide.
  // To keep this surface fast we approximate from the bulk window: count
  // moments in this window that are forSale=true. (A proper count requires
  // searchMintedMoments(byForSale:FOR_SALE) totalCount call — wire that
  // in the next iter.) For now: total listings approx from forSale flag.
  let listedApprox = 0;
  for (const t of bulk) {
    if (t.moment?.forSale) listedApprox++;
  }

  // ---- Story cards (port of /h/d format) ----
  const headlines: Headline[] = [];
  // Biggest sale in window
  const sortedByPrice = [...bulk].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  const biggestWindow = sortedByPrice[0];
  if (biggestWindow) {
    const price = Number(biggestWindow.price ?? 0);
    headlines.push({
      key: "biggest-window",
      kicker: "Biggest sale · 24h",
      hed: `$${price.toLocaleString()} for ${biggestWindow.moment?.play?.stats?.playerName ?? "—"} #${biggestWindow.moment?.flowSerialNumber ?? "?"}`,
      dek: (
        <>
          The largest transaction in the recent window from{" "}
          <span className="text-[var(--text)]">{biggestWindow.moment?.set?.flowName ?? "—"}</span>
          {biggestWindow.buyer?.username && (
            <>
              {", bought by "}
              <Link href={`/u/${encodeURIComponent(biggestWindow.buyer.username)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{biggestWindow.buyer.username}</Link>
            </>
          )}
          {biggestWindow.seller?.username && (
            <>
              {", sold by "}
              <Link href={`/u/${encodeURIComponent(biggestWindow.seller.username)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{biggestWindow.seller.username}</Link>
            </>
          )}
          .
        </>
      ),
      href: biggestWindow.moment?.flowId ? `/moment/${biggestWindow.moment.flowId}` : "#",
      tier: biggestWindow.moment?.tier ?? null,
    });
  }

  // Hottest set
  const bySet = new Map<string, { count: number; samples: number[] }>();
  for (const t of bulk) {
    const n = t.moment?.set?.flowName;
    if (!n) continue;
    const cur = bySet.get(n) ?? { count: 0, samples: [] };
    cur.count++; cur.samples.push(Number(t.price ?? 0));
    bySet.set(n, cur);
  }
  const med = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const topSetEntry = [...bySet.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (topSetEntry) {
    headlines.push({
      key: "hot-set",
      kicker: "Hot set · window",
      hed: `${topSetEntry[0]} leads with ${topSetEntry[1].count} sales`,
      dek: (
        <>
          Most-traded set in the current window. Median sale across those{" "}
          <span className="font-mono tnum text-[var(--text)]">{topSetEntry[1].count}</span> transactions:{" "}
          <span className="font-mono tnum text-[var(--text)]">${med(topSetEntry[1].samples).toFixed(2)}</span>.
        </>
      ),
      href: `/sets`,
      spark: topSetEntry[1].samples.slice(-30),
    });
  }

  // Sharpest 30d move (featured set scan)
  const FEATURED_TREND_SETS = ["Base Set", "Metallic Gold LE", "Rookie Debut", "Run It Back: Origins", "Holo Icon"];
  let sharpest: { name: string; uuid: string; pct: number; history: SetPriceHistoryPoint[] } | null = null;
  for (const name of FEATURED_TREND_SETS) {
    const set = sets.find((s) => s.flowName === name);
    if (!set) continue;
    const history = await getSetPriceHistory(set.id, 30).catch(() => []);
    if (history.length < 2) continue;
    const first = history[0].price;
    const last = history[history.length - 1].price;
    const pct = first > 0 ? ((last - first) / first) * 100 : 0;
    if (!sharpest || Math.abs(pct) > Math.abs(sharpest.pct)) {
      sharpest = { name: set.flowName, uuid: set.id, pct, history };
    }
  }
  if (sharpest) {
    headlines.push({
      key: "sharp-30d",
      kicker: `30-day move · ${sharpest.name}`,
      hed: `${sharpest.name} ${sharpest.pct >= 0 ? "up" : "down"} ${Math.abs(sharpest.pct).toFixed(1)}% over 30 days`,
      dek: (
        <>
          Set-level VWAP via the public <code className="font-mono text-[var(--text)]">getSetPriceHistory</code> endpoint.{" "}
          {sharpest.history.length} datapoints · 30d window. The chart on the set page expands this.
        </>
      ),
      href: `/set/${sharpest.uuid}`,
      spark: sharpest.history.map((p) => p.price),
      sparkColor: sharpest.pct >= 0 ? "var(--up)" : "var(--down)",
    });
  }

  // Whale accumulation — biggest single buyer in window
  const buyerSpend = new Map<string, { spend: number; count: number; flowAddress: string | null }>();
  for (const t of bulk) {
    const u = t.buyer?.username;
    if (!u) continue;
    const cur = buyerSpend.get(u) ?? { spend: 0, count: 0, flowAddress: t.buyer?.flowAddress ?? null };
    cur.spend += Number(t.price ?? 0);
    cur.count++;
    buyerSpend.set(u, cur);
  }
  const topBuyer = [...buyerSpend.entries()].sort((a, b) => b[1].spend - a[1].spend)[0];
  if (topBuyer) {
    headlines.push({
      key: "whale-accumulation",
      kicker: "Whale accumulation · window",
      hed: `${topBuyer[0]} spent $${topBuyer[1].spend.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${topBuyer[1].count} buys`,
      dek: (
        <>
          The window&apos;s top buyer by total spend. Full portfolio breakdown at{" "}
          <Link href={`/u/${encodeURIComponent(topBuyer[0])}`} className="text-[var(--text)] hover:text-[var(--accent)]">/u/{topBuyer[0]}</Link>.
        </>
      ),
      href: `/u/${encodeURIComponent(topBuyer[0])}`,
    });
  }

  // All-time anchor
  if (biggestAllTime.length > 0) {
    const t = biggestAllTime[0];
    const price = Number(t.price ?? 0);
    headlines.push({
      key: "all-time",
      kicker: "Standing record",
      hed: `Top sale ever: $${price.toLocaleString()} for ${t.moment?.play?.stats?.playerName ?? "—"}`,
      dek: (
        <>
          The all-time record from <code className="font-mono">biggestSalesAllTime(PRICE_DESC)</code>. Stable anchor unless a bigger trade just printed.
        </>
      ),
      href: t.moment?.flowId ? `/moment/${t.moment.flowId}` : "#",
    });
  }

  // ---- Condensed tables ----
  // Top-10 most-traded editions (by (set, player) tuple in window)
  const byEdition = new Map<string, { setName: string; playerName: string; count: number; samples: number[]; representativeFlowId: string | null; tier: string | null }>();
  for (const t of bulk) {
    const setName = t.moment?.set?.flowName;
    const playerName = t.moment?.play?.stats?.playerName;
    if (!setName || !playerName) continue;
    const key = `${setName}|${playerName}`;
    const cur = byEdition.get(key) ?? { setName, playerName, count: 0, samples: [], representativeFlowId: null, tier: t.moment?.tier ?? null };
    cur.count++;
    cur.samples.push(Number(t.price ?? 0));
    if (!cur.representativeFlowId && t.moment?.flowId) cur.representativeFlowId = t.moment.flowId;
    byEdition.set(key, cur);
  }
  const topEditions = [...byEdition.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  const top10BiggestSales = biggestAllTime.slice(0, 10).map((t) => ({
    price: Number(t.price ?? 0),
    playerName: t.moment?.play?.stats?.playerName ?? "—",
    setFlowName: t.moment?.set?.flowName ?? "—",
    serial: t.moment?.flowSerialNumber ?? "?",
    flowId: t.moment?.flowId ?? null,
    tier: t.moment?.tier ?? null,
  }));

  return {
    kpis: {
      volumeUsd,
      salesCount,
      buyersCount: buyers.size,
      median,
      listedApprox,
      delta24h: deltaResult,
    },
    headlines,
    topEditions,
    top10BiggestSales,
    depthCaption: depth ? formatDepthCaption(depth) : "Snapshot history: warming",
  };
}

export default async function BriefingPage() {
  const d = await loadBriefing();
  if (!d) {
    return <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">Upstream Top Shot API unreachable. The briefing requires live data.</div>;
  }
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Briefing</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">scanner view · KPIs + stories + lists</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">
          {d.depthCaption}
          <span className="ml-3">
            <Link href="/" className="text-[var(--text-dim)] hover:text-[var(--accent)]">market →</Link>
          </span>
        </span>
      </header>

      {/* Canonical KPI strip. Six metrics, every one defensible against
          3+ reference surfaces. See iter/12-briefing/kpi-rationale.md. */}
      <Card variant="inset" methodology="Each KPI appears on 3+ reference surfaces (Bloomberg WEI / TradingView Screener / Card Ladder / OpenSea / Polymarket). Picks + rejects documented at iter/12-briefing/kpi-rationale.md.">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          <div className="p-3">
            <KPI label="Volume" value={d.kpis.volumeUsd} format="usdCompact" size="xl" hint="window" />
          </div>
          <div className="p-3">
            <KPI label="Sales" value={d.kpis.salesCount} format="int" size="xl" hint="window" />
          </div>
          <div className="p-3">
            {d.kpis.delta24h.available && d.kpis.delta24h.pct != null ? (
              <KPI label="24h Δ% median" value={d.kpis.delta24h.pct} format="pct" size="xl" delta={d.kpis.delta24h.pct} deltaFormat="deltaPct" />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">24h Δ% median</span>
                <span className="text-[22px] font-semibold tnum text-[var(--text-faint)]">—</span>
                <span className="text-[10px] text-[var(--warn)] tnum font-mono">{d.kpis.delta24h.reason}</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <KPI label="Unique buyers" value={d.kpis.buyersCount} format="int" size="xl" hint="window" />
          </div>
          <div className="p-3">
            <KPI label="Median sale" value={d.kpis.median} format="usd" size="xl" hint="window" />
          </div>
          <div className="p-3">
            <KPI label="Active listings" value={d.kpis.listedApprox} format="int" size="xl" hint="from window sample" />
          </div>
        </div>
      </Card>

      {/* Story cards */}
      <div className="grid lg:grid-cols-2 gap-3">
        {d.headlines.map((h, i) => (
          <Link
            key={h.key}
            href={h.href}
            className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-4 hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[10px] tracking-data-label text-[var(--accent)]">{h.kicker}</span>
              {h.tier && <TierChip tier={h.tier} />}
              <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">#{i + 1}</span>
            </div>
            <h2 className={`font-semibold tracking-tight text-[var(--text)] ${i === 0 ? "text-[22px]" : "text-[16px]"} leading-tight`}>
              {h.hed}
            </h2>
            <p className="text-[12px] text-[var(--text-dim)] mt-2 leading-relaxed">{h.dek}</p>
            {h.spark && h.spark.length > 1 && (
              <div className="mt-3">
                <Sparkline data={h.spark} width={520} height={48} color={h.sparkColor} />
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Condensed lists */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card title="Most-traded editions · window" subtitle={`top 10 by tx count`} methodology="Grouped by (set, player) from the 500-tx bulk pull. Edition UUID resolution lands when the per-edition floor enrichment lib ships.">
          <div className="divide-y divide-[var(--border-subtle)]">
            {d.topEditions.length === 0 && (
              <div className="px-1 py-3 text-[11px] text-[var(--text-faint)] font-mono">no editions in window</div>
            )}
            {d.topEditions.map((e) => (
              <Link
                key={`${e.setName}|${e.playerName}`}
                href={e.representativeFlowId ? `/moment/${e.representativeFlowId}` : "#"}
                className="px-1 py-1.5 grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-3 hover:bg-[var(--surface-2)]"
              >
                <span className="text-[12px] text-[var(--text)] truncate">
                  {e.playerName} <span className="text-[var(--text-dim)]">· {e.setName}</span>
                </span>
                <TierChip tier={e.tier} />
                <span className="text-[11px] tnum text-[var(--text-faint)]">{e.count}</span>
                <span className="text-[11px] tnum"><Num value={(e.samples.reduce((s, x) => s + x, 0) / e.samples.length)} format="usd" /></span>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Biggest single sales · all time" subtitle={`top 10`} methodology="biggestSalesAllTime(sortBy: PRICE_DESC, limit: 10) — server-side rank.">
          <div className="divide-y divide-[var(--border-subtle)]">
            {d.top10BiggestSales.map((s, i) => (
              <Link
                key={i}
                href={s.flowId ? `/moment/${s.flowId}` : "#"}
                className="px-1 py-1.5 grid grid-cols-[auto_1fr_auto_auto] items-baseline gap-3 hover:bg-[var(--surface-2)]"
              >
                <span className="text-[10px] text-[var(--text-faint)] tnum">#{i + 1}</span>
                <span className="text-[12px] text-[var(--text)] truncate">
                  {s.playerName} <span className="text-[var(--text-dim)]">#{s.serial} · {s.setFlowName}</span>
                </span>
                <TierChip tier={s.tier} />
                <span className="text-[12px] tnum text-[var(--up)]"><Num value={s.price} format="usdCompact" /></span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
