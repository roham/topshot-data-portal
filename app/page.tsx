import Link from "next/link";
import { recentSalesBulk, allSets } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { TierChip } from "@/components/primitives/TierChip";
import { readRecentSnapshots, type Cadence } from "@/lib/snapshots/store";
import { parseTimeWindow, windowToCadence, type TimeWindow } from "@/components/global/window-types";
import { INDICES } from "@/lib/indices/registry";
import type { MarketAggregateSnapshot } from "@/lib/snapshots/types";
import type { MarketplaceTransaction } from "@/lib/topshot/types";

export const revalidate = 120;
export const metadata = { title: "Market · TS·PORTAL" };

// /  — canonical homepage. Anchor: design/03-comp-anchors.md § /
// (verified TradingView markets-page pattern).
//
// iter-16: default window flipped 24h → 30d. Sections route the active
// window to the right accumulator tier:
//   30d → .snapshots/month/*  (24h cron)
//   7d  → .snapshots/week/*   (12h cron)
//   24h → .snapshots/day/*    (2h cron)
//   30m → live API + recentSalesBulk fallback
// Each section's depth caption reflects its own tier, not the slowest cron.

interface SectionData {
  topBuyers: NonNullable<MarketAggregateSnapshot["topBuyers"]>;
  topSetsByVolume: MarketAggregateSnapshot["topSetsByVolume"];
  largestSales: NonNullable<MarketAggregateSnapshot["largestSales"]>;
  txCount: number;
  uniqueBuyers: number;
  ts: number;
  windowLabel: string;
}

async function loadFromSnapshot(cadence: Cadence): Promise<SectionData | null> {
  const snaps = await readRecentSnapshots<MarketAggregateSnapshot>(cadence, 4).catch(() => []);
  if (!snaps.length) return null;
  // Take newest (lexical sort desc returned by listRecentSnapshotKeys).
  const sorted = [...snaps].sort((a, b) => (b.data?.ts ?? 0) - (a.data?.ts ?? 0));
  const d = sorted[0].data;
  return {
    topBuyers: d.topBuyers ?? [],
    topSetsByVolume: d.topSetsByVolume ?? [],
    largestSales: d.largestSales ?? [],
    txCount: d.txCount,
    uniqueBuyers: d.uniqueBuyers,
    ts: d.ts,
    windowLabel: d.windowLabel ?? "—",
  };
}

// Fallback when the target cadence has no snapshot yet — pull live and aggregate
// in-memory. Lower fidelity but keeps the surface alive while the cron warms.
async function loadFromLive(): Promise<SectionData | null> {
  const bulk = await recentSalesBulk(400).catch(() => [] as MarketplaceTransaction[]);
  if (!bulk.length) return null;
  // Compose the same aggregate shape as the snapshot would.
  const byBuyer = new Map<string, { spendCents: number; count: number; biggestCents: number; biggestFlowId: string | null }>();
  const bySet = new Map<string, { count: number; samples: number[] }>();
  const buyers = new Set<string>();
  for (const t of bulk) {
    const cents = Math.round(Number(t.price ?? 0) * 100);
    if (t.buyer?.flowAddress) buyers.add(t.buyer.flowAddress);
    const u = t.buyer?.username;
    if (u) {
      const cur = byBuyer.get(u) ?? { spendCents: 0, count: 0, biggestCents: 0, biggestFlowId: null };
      cur.spendCents += cents;
      cur.count++;
      if (cents > cur.biggestCents) {
        cur.biggestCents = cents;
        cur.biggestFlowId = t.moment?.flowId ?? null;
      }
      byBuyer.set(u, cur);
    }
    const setName = t.moment?.set?.flowName;
    if (setName) {
      const cur = bySet.get(setName) ?? { count: 0, samples: [] };
      cur.count++;
      cur.samples.push(cents);
      bySet.set(setName, cur);
    }
  }
  const median = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return {
    topBuyers: [...byBuyer.entries()]
      .map(([username, v]) => ({ username, ...v }))
      .sort((a, b) => b.spendCents - a.spendCents)
      .slice(0, 50),
    topSetsByVolume: [...bySet.entries()]
      .map(([setFlowName, v]) => ({ setFlowName, count: v.count, medianPriceCents: median(v.samples) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    largestSales: [...bulk]
      .sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
      .slice(0, 50)
      .map((t) => ({
        priceCents: Math.round(Number(t.price ?? 0) * 100),
        playerName: t.moment?.play?.stats?.playerName ?? null,
        setFlowName: t.moment?.set?.flowName ?? null,
        tier: t.moment?.tier ?? null,
        serial: t.moment?.flowSerialNumber ?? null,
        flowId: t.moment?.flowId ?? null,
        buyerUsername: t.buyer?.username ?? null,
        sellerUsername: t.seller?.username ?? null,
        updatedAt: t.updatedAt ?? null,
      })),
    txCount: bulk.length,
    uniqueBuyers: buyers.size,
    ts: Date.now(),
    windowLabel: "window (live fallback)",
  };
}

function depthCaptionFor(window: TimeWindow, snapshot: SectionData | null): string {
  if (!snapshot) {
    return `${window} accumulating — first cron run pending`;
  }
  const ageMs = Date.now() - snapshot.ts;
  const ageMin = Math.round(ageMs / 60000);
  return `${window} · ${snapshot.txCount.toLocaleString()} tx · snapshot ${ageMin}m ago`;
}

async function loadHome(window: TimeWindow) {
  const cadence = windowToCadence(window);
  // Try the tier-appropriate snapshot first; fall back to live if cron hasn't run.
  let section: SectionData | null = null;
  let usedLiveFallback = false;
  if (cadence && cadence !== "market") {
    section = await loadFromSnapshot(cadence);
  }
  if (!section) {
    section = await loadFromLive();
    usedLiveFallback = true;
  }
  // Resolve setUuid for every top set so cards link into /set/[id].
  const sets = await allSets(200).catch(() => []);
  const setUuidByName = new Map<string, string>();
  for (const s of sets) setUuidByName.set(s.flowName, s.id);
  return { section, usedLiveFallback, setUuidByName, window };
}

const ALL_WINDOWS: TimeWindow[] = ["24h", "7d", "30d", "1y", "all"];

export default async function Home({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const sp = await searchParams;
  const { window } = parseTimeWindow(sp.w);
  const { section, usedLiveFallback, setUuidByName } = await loadHome(window);

  if (!section) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">
        Upstream unreachable + no accumulator snapshots available yet.
      </div>
    );
  }

  // Sections built from the snapshot
  const topMovers = section.topSetsByVolume.slice(0, 6).map((s) => ({
    setFlowName: s.setFlowName,
    setUuid: setUuidByName.get(s.setFlowName) ?? null,
    salesCount: s.count,
    medianUsd: s.medianPriceCents / 100,
  }));

  const mostActive = section.topSetsByVolume.slice(0, 6); // same source, same order — sales-count is the canonical "active" metric

  const featuredCollectors = section.topBuyers.slice(0, 6);
  const largestSales = section.largestSales.slice(0, 6);

  const depthCaption = depthCaptionFor(window, section);

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-5">
      {/* Page title + window indicator + cross-link to /briefing */}
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Market</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">live state · {window}</span>
        <nav className="flex items-center gap-1 text-[10px] font-mono">
          {ALL_WINDOWS.map((w) => (
            <Link
              key={w}
              href={`/?w=${w}`}
              prefetch={false}
              className={
                w === window
                  ? "px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text)] tracking-data-label"
                  : "px-1.5 py-0.5 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] tracking-data-label"
              }
            >
              {w.toUpperCase()}
            </Link>
          ))}
        </nav>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">
          {depthCaption}
          {usedLiveFallback && <span className="ml-2 text-[var(--warn)]">· cron warming, live fallback</span>}
          <span className="ml-3"><Link href="/briefing" className="text-[var(--text-dim)] hover:text-[var(--accent)]">briefing →</Link></span>
        </span>
      </header>

      {/* ===== Section 1: Indices strip =====
          Canonical: TS500 + 4 tier indices from lib/indices/registry.ts.
          Index computation pipeline (registry → snapshot integration) is the
          next iter for this slot. Until then: honest warming caption. */}
      <Card
        variant="inset"
        methodology="Indices are canonical aggregates (lib/indices/registry.ts). TS500 weights by circulationCount × floorPrice; per-tier weights by circulation. Index computation pipeline is the iter that follows this one — until it lands, cells are honestly warming."
      >
        <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[13px] font-semibold tracking-section-header">Indices</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono ml-auto">
            registry → snapshot pipeline pending
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          {INDICES.filter((i) => ["ts500", "tier-common", "tier-rare", "tier-fandom", "tier-legendary"].includes(i.slug)).map((idx) => (
            <Link key={idx.slug} href={`/indices/${idx.slug}`} className="block px-3 py-3 hover:bg-[var(--surface-2)] transition-colors">
              <div className="text-[10px] text-[var(--text-faint)] tracking-data-label">{idx.name}</div>
              <div className="mt-1 text-[20px] font-semibold tnum text-[var(--text-faint)]">—</div>
              <div className="text-[10px] text-[var(--warn)] tnum font-mono mt-0.5">computation pending</div>
            </Link>
          ))}
        </div>
      </Card>

      {/* ===== Section 2: Top movers · {window} =====
          ALGORITHMIC: score = sales count (window-snapshot.topSetsByVolume already
          sorted desc). 6-card grid per TV markets-page pattern. */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Top movers · {window}</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {topMovers.length} sets · by sales count
          </span>
          <Link href="/movers" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">see all →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topMovers.map((m) => (
            <Link
              key={m.setFlowName}
              href={m.setUuid ? `/set/${m.setUuid}` : "/movers"}
              className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="text-[11px] tracking-data-label text-[var(--text-faint)] truncate">{m.setFlowName}</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-[22px] font-semibold tnum">{m.salesCount.toLocaleString()}</span>
                <span className="text-[11px] text-[var(--text-dim)] tracking-data-label">sales</span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-dim)] tnum">
                median <Num value={m.medianUsd} format="usd" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Section 3: Most active · {window} =====
          ALGORITHMIC: same source as movers (sales count); rendered as a
          table for keyboard scan. Defining metric "Sales" at column 2 per
          TV most-active pattern. */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Most active · {window}</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{mostActive.length} sets · sales count</span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {mostActive.map((s, i) => {
                const uuid = setUuidByName.get(s.setFlowName);
                return (
                  <tr key={s.setFlowName} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <Link href={uuid ? `/set/${uuid}` : "/volume"} className="text-[var(--text)] hover:text-[var(--accent)]">{s.setFlowName}</Link>
                    </td>
                    <td className="px-3 py-1.5 text-right tnum font-semibold">{s.count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right tnum"><Num value={s.medianPriceCents / 100} format="usd" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ===== Section 4: Featured collectors · {window} =====
          OWNERSHIP-GRAPH WEDGE. ALGORITHMIC: score = sum(buy.price by username)
          from the snapshot's topBuyers field. At 30d window with ~25k tx the
          top-10 list shows substantive activity; at 24h the top-10 are mostly
          1-2 buys (which is why default flipped to 30d in iter-16). */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Featured collectors · {window}</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{featuredCollectors.length} buyers · total spend</span>
          <Link href="/collectors" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">see all →</Link>
        </div>
        <Card variant="inset" methodology="Top buyers ranked by total spend in the selected window. Ownership-graph wedge — every other market-analytics tool lacks full identity coverage on the buyer side. Per design/03 § Social.">
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
              {featuredCollectors.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-[var(--text-faint)] font-mono text-[11px]">No named buyers in this window yet.</td></tr>
              )}
              {featuredCollectors.map((c, i) => (
                <tr key={c.username} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <Link href={`/u/${encodeURIComponent(c.username)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{c.username}</Link>
                  </td>
                  <td className="px-3 py-1.5 text-right tnum">{c.count.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold"><Num value={c.spendCents / 100} format="usdCompact" /></td>
                  <td className="px-3 py-1.5 text-right tnum">
                    {c.biggestFlowId ? (
                      <Link href={`/moment/${c.biggestFlowId}`} className="hover:text-[var(--accent)]"><Num value={c.biggestCents / 100} format="usdCompact" /></Link>
                    ) : <Num value={c.biggestCents / 100} format="usdCompact" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ===== Section 5: Largest sales · {window} =====
          ALGORITHMIC: score = price desc. */}
      <section>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 className="text-[13px] font-semibold tracking-section-header">Largest sales · {window}</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">{largestSales.length} sales · price desc</span>
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
              {largestSales.map((s, i) => (
                <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3 py-1.5 text-right tnum font-semibold text-[var(--up)]">
                    {s.flowId ? <Link href={`/moment/${s.flowId}`} className="hover:text-[var(--accent)]"><Num value={s.priceCents / 100} format="usd" /></Link> : <Num value={s.priceCents / 100} format="usd" />}
                  </td>
                  <td className="px-3 py-1.5 text-[var(--text)]">{s.playerName ?? "—"} {s.serial && <span className="text-[var(--text-faint)]">#{s.serial}</span>}</td>
                  <td className="px-3 py-1.5 text-[var(--text-dim)] truncate">{s.setFlowName ?? "—"}</td>
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

      {/* Honest-absence footer — per-tier, not single-cron */}
      <Card title="Currently warming" methodology="Each item gates on its own data-pipeline depth. Honest disclosure per the rationale-per-choice doctrine.">
        <ul className="text-[11px] text-[var(--text-dim)] space-y-1 list-disc pl-5">
          <li><span className="text-[var(--text)]">Index values (TS500 + per-tier)</span> — gated on the registry → snapshot computation pipeline (next iter).</li>
          <li><span className="text-[var(--text)]">Per-set sparklines on mover cards</span> — gated on the 1h-warm cron's per-set snapshot history maturing across the active edition population.</li>
          <li><span className="text-[var(--text)]">Named-whale activity ticker (real-time)</span> — carries forward as the <Link href="/whales" className="text-[var(--accent)] hover:underline">/whales</Link> iter (ownership-graph wedge expansion).</li>
          <li><span className="text-[var(--text)]">Community pages</span> — <Link href="/community/player/2544" className="text-[var(--accent)] hover:underline">/community/player/[id]</Link>, <Link href="/community/team/1610612747" className="text-[var(--accent)] hover:underline">/community/team/[id]</Link>, <Link href="/community/set/abc" className="text-[var(--accent)] hover:underline">/community/set/[id]</Link> per design/03 § Social.</li>
        </ul>
      </Card>
    </div>
  );
}
