import Link from "next/link";
import { recentSales, recentSalesBulk, allSets, getSetPriceHistory, biggestSalesAllTime } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { TierChip } from "@/components/primitives/TierChip";
import { getAccumulatorDepth, formatDepthCaption } from "@/lib/snapshots/depth";
import { INDICES } from "@/lib/indices/registry";
import type { MarketplaceTransaction } from "@/lib/topshot/types";

export const revalidate = 60;
export const metadata = { title: "Market · TS·PORTAL" };

// /  — canonical homepage. Anchor: design/03-comp-anchors.md § /
// (verified TradingView markets-page pattern).
//
// Rebuild from iter-10's /h/c content. The previous shape labeled six
// sets as "Indices" — failed the rationale-per-choice test (a set is not
// an index). This rebuild keeps the underlying data fetchers and replaces
// the misframed section with TradingView's 6-card / 6-row atomic-section
// layout. Rationale per section is inline; full audit at
// kaaos-knowledge iter/15-homepage-rebuild/rationale-audit.md.

interface PageData {
  // Section 1 — index strip
  indexStrip: Array<{ slug: string; name: string; value: number | null; deltaPct: number | null; warming: boolean }>;

  // Section 2 — top movers
  movers: Array<{
    setFlowName: string;
    setUuid: string | null;
    salesCount: number;
    volumeUsd: number;
    earlyHalfMean: number;
    lateHalfMean: number;
    impliedPct: number;
    spark: number[];
  }>;

  // Section 3 — most active
  mostActive: Array<{
    setFlowName: string;
    setUuid: string | null;
    salesCount: number;
    medianUsd: number;
    spark: number[];
  }>;

  // Section 4 — featured collectors (ownership-graph wedge)
  featuredCollectors: Array<{
    username: string;
    buyCount: number;
    totalSpend: number;
    biggestBuyUsd: number;
    biggestBuyFlowId: string | null;
  }>;

  // Section 5 — largest sales
  largestSales: Array<{
    price: number;
    playerName: string;
    serial: string;
    setFlowName: string;
    tier: string | null;
    flowId: string | null;
    buyerUsername: string | null;
    sellerUsername: string | null;
  }>;

  depthCaption: string;
  accumulatorMs: number;
  accumulatorTargetMs: number;
}

// Within-window mean change proxy until accumulator has 48h depth:
// split window by tx order, compare early-half mean to late-half mean.
function impliedDelta(samples: number[]): { early: number; late: number; pct: number } {
  if (samples.length < 4) return { early: 0, late: 0, pct: 0 };
  const sorted = [...samples]; // tx order, already chronological from bulk pull
  const mid = Math.floor(sorted.length / 2);
  const early = sorted.slice(0, mid);
  const late = sorted.slice(mid);
  const earlyMean = early.reduce((s, x) => s + x, 0) / early.length;
  const lateMean = late.reduce((s, x) => s + x, 0) / late.length;
  const pct = earlyMean > 0 ? ((lateMean - earlyMean) / earlyMean) * 100 : 0;
  return { early: earlyMean, late: lateMean, pct };
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

async function loadHome(): Promise<PageData | null> {
  // ---- pull live + accumulator state in parallel ----
  const [bulk, biggestAllTime, sets, depth] = await Promise.all([
    recentSalesBulk(400).catch(() => [] as MarketplaceTransaction[]),
    biggestSalesAllTime(20).catch(() => [] as MarketplaceTransaction[]),
    allSets(200).catch(() => []),
    getAccumulatorDepth().catch(() => null),
  ]);
  if (!bulk.length) return null;

  // ---- Section 1: Index strip ----
  // Canonical content: TS500 + 4 tier indices. RATIONALE: TS500 is canonical
  // because it's the top-500 editions weighted by circulationCount × floorPrice
  // (lib/indices/registry.ts). Per-tier is canonical because tier IS a first-
  // class Top Shot taxonomy axis. Both require accumulator depth ≥48h for
  // 24h Δ. While warming, cells render honest "warming · target 48h" caption.
  const want = ["ts500", "tier-common", "tier-rare", "tier-fandom", "tier-legendary"];
  const indexStrip = want.map((slug) => {
    const def = INDICES.find((i) => i.slug === slug);
    return {
      slug,
      name: def?.name ?? slug,
      value: null as number | null,
      deltaPct: null as number | null,
      warming: true, // computation pipeline gates on accumulator ≥48h; not yet built
    };
  });

  // ---- Group by set for movers / most-active sections ----
  const bySet = new Map<string, { setFlowName: string; setFlowId?: number; samples: number[]; ordered: number[] }>();
  for (const t of bulk) {
    const flowName = t.moment?.set?.flowName;
    if (!flowName) continue;
    const price = Number(t.price ?? 0);
    const cur = bySet.get(flowName) ?? { setFlowName: flowName, setFlowId: t.moment?.set?.flowId, samples: [], ordered: [] };
    cur.samples.push(price);
    cur.ordered.push(price);
    bySet.set(flowName, cur);
  }
  // Resolve setUuid for each via the allSets directory.
  const setUuidByName = new Map<string, string>();
  for (const s of sets) setUuidByName.set(s.flowName, s.id);

  const setAggs = Array.from(bySet.values()).map((agg) => {
    const delta = impliedDelta(agg.ordered);
    return {
      setFlowName: agg.setFlowName,
      setUuid: setUuidByName.get(agg.setFlowName) ?? null,
      salesCount: agg.samples.length,
      volumeUsd: agg.samples.reduce((s, x) => s + x, 0),
      earlyHalfMean: delta.early,
      lateHalfMean: delta.late,
      impliedPct: delta.pct,
      samples: agg.ordered,
    };
  });

  // ---- Section 2: Top movers ----
  // RATIONALE (algorithmic): score = volumeUsd × |impliedPct|. Picks reward both
  // magnitude AND conviction. Below filter requires ≥4 sales to avoid noise.
  // Sparkline shows recent prices in tx order (within-window only — beats
  // showing a static getSetPriceHistory chart that doesn't reflect "right now").
  const moversCandidates = setAggs
    .filter((s) => s.salesCount >= 4)
    .map((s) => ({ ...s, score: s.volumeUsd * Math.abs(s.impliedPct) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const movers = moversCandidates.map((s) => ({
    setFlowName: s.setFlowName,
    setUuid: s.setUuid,
    salesCount: s.salesCount,
    volumeUsd: s.volumeUsd,
    earlyHalfMean: s.earlyHalfMean,
    lateHalfMean: s.lateHalfMean,
    impliedPct: s.impliedPct,
    spark: s.samples,
  }));

  // ---- Section 3: Most active ----
  // RATIONALE (algorithmic): defining metric = sales count, promoted to column 2
  // per TradingView's most-active pattern (tradingview-deep-walk.md §6).
  const mostActive = setAggs
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 6)
    .map((s) => ({
      setFlowName: s.setFlowName,
      setUuid: s.setUuid,
      salesCount: s.salesCount,
      medianUsd: median(s.samples),
      spark: s.samples,
    }));

  // ---- Section 4: Featured collectors (ownership-graph wedge) ----
  // RATIONALE (algorithmic): score = sum(price where buyer.username = X) within
  // window. This section is Top-Shot-unique — no other analytics tool has full
  // named-identity coverage on the buyer side. Per design/03 § Social.
  const byBuyer = new Map<string, { username: string; spend: number; buyCount: number; biggest: number; biggestFlowId: string | null }>();
  for (const t of bulk) {
    const u = t.buyer?.username;
    if (!u) continue;
    const price = Number(t.price ?? 0);
    const cur = byBuyer.get(u) ?? { username: u, spend: 0, buyCount: 0, biggest: 0, biggestFlowId: null };
    cur.spend += price;
    cur.buyCount++;
    if (price > cur.biggest) {
      cur.biggest = price;
      cur.biggestFlowId = t.moment?.flowId ?? null;
    }
    byBuyer.set(u, cur);
  }
  const featuredCollectors = Array.from(byBuyer.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 6)
    .map((c) => ({
      username: c.username,
      buyCount: c.buyCount,
      totalSpend: c.spend,
      biggestBuyUsd: c.biggest,
      biggestBuyFlowId: c.biggestFlowId,
    }));

  // ---- Section 5: Largest sales ----
  // RATIONALE (algorithmic): score = price desc within window. Single-event
  // surfacing. Each linked to its moment page.
  const largestSales = [...bulk]
    .sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
    .slice(0, 6)
    .map((t) => ({
      price: Number(t.price ?? 0),
      playerName: t.moment?.play?.stats?.playerName ?? "—",
      serial: t.moment?.flowSerialNumber ?? "?",
      setFlowName: t.moment?.set?.flowName ?? "—",
      tier: t.moment?.tier ?? null,
      flowId: t.moment?.flowId ?? null,
      buyerUsername: t.buyer?.username ?? null,
      sellerUsername: t.seller?.username ?? null,
    }));

  // Suppress unused-var lint while biggestSalesAllTime is reserved for a near-term iter.
  void biggestAllTime;

  return {
    indexStrip,
    movers,
    mostActive,
    featuredCollectors,
    largestSales,
    depthCaption: depth ? formatDepthCaption(depth) : "Snapshot history: warming",
    accumulatorMs: depth?.headlineSpanMs ?? 0,
    accumulatorTargetMs: depth?.targetMs ?? 7 * 24 * 60 * 60 * 1000,
  };
}

export default async function Home() {
  const d = await loadHome();
  if (!d) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">
        Upstream Top Shot API unreachable.
      </div>
    );
  }

  const accumulatorHours = d.accumulatorMs / (60 * 60 * 1000);
  const needHoursFor24hDelta = Math.max(0, 48 - accumulatorHours);

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-5">
      {/* Page title — short, factual, canonical */}
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Market</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">live state</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">
          {d.depthCaption}
          <span className="ml-3"><Link href="/briefing" className="text-[var(--text-dim)] hover:text-[var(--accent)]">briefing →</Link></span>
        </span>
      </header>

      {/* ===== Section 1: Index strip =====
          Canonical: TS500 + 4 tier indices from lib/indices/registry.ts.
          Honestly warming until accumulator depth ≥48h. */}
      <Card
        variant="inset"
        methodology="Indices are canonical aggregates (lib/indices/registry.ts). TS500 weights by circulationCount × floorPrice; per-tier weights by circulation. 24h Δ requires accumulator depth ≥48h."
      >
        <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[13px] font-semibold tracking-section-header">Indices</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono ml-auto">
            warming · need {needHoursFor24hDelta.toFixed(1)}h more / 48h target
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          {d.indexStrip.map((idx) => (
            <Link
              key={idx.slug}
              href={`/indices/${idx.slug}`}
              className="block px-3 py-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="text-[10px] text-[var(--text-faint)] tracking-data-label">{idx.name}</div>
              <div className="mt-1 text-[20px] font-semibold tnum text-[var(--text-faint)]">—</div>
              <div className="text-[10px] text-[var(--warn)] tnum font-mono mt-0.5">warming</div>
            </Link>
          ))}
        </div>
      </Card>

      {/* ===== Section 2: Top movers =====
          Algorithmic: score = volumeUsd × |impliedPct| (early-half mean → late-half mean).
          6-card grid per TradingView markets-page pattern. */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Top movers · window</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{d.movers.length} sets · score = volume × |Δ%|</span>
          <Link href="/movers" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">see all →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {d.movers.map((m) => (
            <Link
              key={m.setFlowName}
              href={m.setUuid ? `/set/${m.setUuid}` : "/movers"}
              className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="text-[11px] tracking-data-label text-[var(--text-faint)] truncate">{m.setFlowName}</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-[22px] font-semibold tnum">
                  <Num value={m.impliedPct} format="deltaPct" colorize precision={1} />
                </span>
                <span className="text-[11px] text-[var(--text-dim)] tnum">
                  <Num value={m.volumeUsd} format="usdCompact" /> vol
                </span>
              </div>
              <div className="mt-2"><Sparkline data={m.spark} width={260} height={36} /></div>
              <div className="mt-1 text-[10px] text-[var(--text-faint)] font-mono">
                {m.salesCount} sales · early ${m.earlyHalfMean.toFixed(2)} → late ${m.lateHalfMean.toFixed(2)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Section 3: Most active =====
          Algorithmic: score = sales count (TradingView's most-active pattern,
          defining metric promoted to column 2). */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Most active · window</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{d.mostActive.length} sets · sales count</span>
          <Link href="/volume" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">see all →</Link>
        </div>
        <Card variant="inset">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-10">#</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Set</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Sales</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Median sale</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[140px]">Last 30</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {d.mostActive.map((s, i) => (
                <tr key={s.setFlowName} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <Link href={s.setUuid ? `/set/${s.setUuid}` : "/volume"} className="text-[var(--text)] hover:text-[var(--accent)]">{s.setFlowName}</Link>
                  </td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold">{s.salesCount}</td>
                  <td className="px-3 py-1.5 text-right tnum"><Num value={s.medianUsd} format="usd" /></td>
                  <td className="px-3 py-1.5"><Sparkline data={s.spark.slice(-30)} width={120} height={20} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ===== Section 4: Featured collectors · OWNERSHIP-GRAPH WEDGE =====
          Algorithmic: score = sum(buy price by username) within window.
          Per design/03 § Social — leverages the full-identity wedge no other
          market-analytics tool has. */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Featured collectors · window</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{d.featuredCollectors.length} buyers · total spend</span>
          <Link href="/collectors" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">see all →</Link>
        </div>
        <Card variant="inset">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-10">#</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Collector</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Buys</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Total spend</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Biggest buy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {d.featuredCollectors.map((c, i) => (
                <tr key={c.username} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <Link href={`/u/${encodeURIComponent(c.username)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{c.username}</Link>
                  </td>
                  <td className="px-3 py-1.5 text-right tnum">{c.buyCount}</td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold"><Num value={c.totalSpend} format="usdCompact" /></td>
                  <td className="px-3 py-1.5 text-right tnum">
                    {c.biggestBuyFlowId ? (
                      <Link href={`/moment/${c.biggestBuyFlowId}`} className="hover:text-[var(--accent)]">
                        <Num value={c.biggestBuyUsd} format="usdCompact" />
                      </Link>
                    ) : (
                      <Num value={c.biggestBuyUsd} format="usdCompact" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ===== Section 5: Largest sales · window =====
          Algorithmic: score = price desc. */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Largest sales · window</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{d.largestSales.length} sales · price desc</span>
          <Link href="/archive" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">see all →</Link>
        </div>
        <Card variant="inset">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right w-[90px]">Price</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Player</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Set</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">Tier</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Buyer</th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Seller</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {d.largestSales.map((s, i) => (
                <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3 py-1.5 text-right tnum font-semibold text-[var(--up)]">
                    {s.flowId ? <Link href={`/moment/${s.flowId}`} className="hover:text-[var(--accent)]"><Num value={s.price} format="usd" /></Link> : <Num value={s.price} format="usd" />}
                  </td>
                  <td className="px-3 py-1.5 text-[var(--text)]">{s.playerName} <span className="text-[var(--text-faint)]">#{s.serial}</span></td>
                  <td className="px-3 py-1.5 text-[var(--text-dim)] truncate">{s.setFlowName}</td>
                  <td className="px-3 py-1.5"><TierChip tier={s.tier} /></td>
                  <td className="px-3 py-1.5">
                    {s.buyerUsername ? <Link href={`/u/${encodeURIComponent(s.buyerUsername)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">{s.buyerUsername}</Link> : <span className="text-[var(--text-faint)]">—</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    {s.sellerUsername ? <Link href={`/u/${encodeURIComponent(s.sellerUsername)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">{s.sellerUsername}</Link> : <span className="text-[var(--text-faint)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Honest-absence footer */}
      <Card
        title="Currently warming"
        methodology="Honest absence. Each item is gated on a specific data-pipeline depth or future-iter scope."
      >
        <ul className="text-[11px] text-[var(--text-dim)] space-y-1 list-disc pl-5">
          <li><span className="text-[var(--text)]">24h Δ on indices</span> — accumulator at {accumulatorHours.toFixed(1)}h, needs ≥48h. Index computation pipeline (registry → snapshot integration) lands as a follow-on iter.</li>
          <li><span className="text-[var(--text)]">Per-set 7d / 30d sparklines on mover rows</span> — gated on the warm-cron's snapshot history covering enough sets at depth.</li>
          <li><span className="text-[var(--text)]">Named-whale activity ticker</span> — carries forward as the <Link href="/whales" className="text-[var(--accent)] hover:underline">/whales</Link> iter (ownership-graph wedge).</li>
          <li><span className="text-[var(--text)]">Community pages</span> — <Link href="/community/player/2544" className="text-[var(--accent)] hover:underline">/community/player/[id]</Link>, <Link href="/community/team/1610612747" className="text-[var(--accent)] hover:underline">/community/team/[id]</Link>, <Link href="/community/set/abc" className="text-[var(--accent)] hover:underline">/community/set/[id]</Link> deferred to subsequent iters per design/03.</li>
        </ul>
      </Card>
    </div>
  );
}
