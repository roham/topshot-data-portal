import Link from "next/link";
import { recentSalesBulk, allSets } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { TierChip } from "@/components/primitives/TierChip";
import { readRecentSnapshots } from "@/lib/snapshots/store";
import type { MarketAggregateSnapshot } from "@/lib/snapshots/types";
import type { MarketplaceTransaction } from "@/lib/topshot/types";

export const revalidate = 120;
export const metadata = { title: "Market · TS·PORTAL" };

// /  — V3 iter-1 homepage rebuild.
// Six atomic blocks, in order:
//   1) Top movers · players · 24h            (6 cards)
//   2) Most active · editions · 24h          (20-row table)
//   3) Largest sales · 24h                   (10-row table)
//   4) Hot collectors · 24h spend            (6 cards)
//   5) Set momentum · 7d                     (6 cards)
//   6) Indices · 24h                         (single ~80px strip, 6 cells)
//
// Each block prefers the tier-appropriate snapshot from lib/snapshots/store;
// fallback is a single recentSalesBulk() pull aggregated in-memory.
// All human-readable strings are copy-frozen from
//   answers/topshot-data-portal-2026-05-14/iter/v3-iter-1/design.md.

// ──────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────

const MIN_BUYER_COUNT = 3;
const MIN_BUYER_SPEND_CENTS = 100_000; // $1,000

const TIER_LABEL: Record<string, string> = {
  MOMENT_TIER_COMMON: "Common",
  MOMENT_TIER_FANDOM: "Fandom",
  MOMENT_TIER_RARE: "Rare",
  MOMENT_TIER_LEGENDARY: "Legendary",
  MOMENT_TIER_ULTIMATE: "Ultimate",
};

function tierLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return TIER_LABEL[t] ?? t;
}

function parallelLabel(parallelID: number | null | undefined): string {
  if (parallelID == null || parallelID === 0) return "Standard";
  // Top Shot parallels are minted with positive parallelID; surface as a label.
  return `Parallel ${parallelID}`;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function agoLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!isFinite(t)) return "—";
  const dMs = Date.now() - t;
  const m = Math.floor(dMs / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

interface SnapshotPair<T> {
  now: T | null;
  prior: T | null;
}

async function readPair<T = unknown>(
  cadence: "day" | "week" | "month",
): Promise<SnapshotPair<T>> {
  const snaps = await readRecentSnapshots<T>(cadence, 4).catch(() => []);
  if (!snaps.length) return { now: null, prior: null };
  const sorted = [...snaps].sort((a, b) => {
    // newer keys sort later lexically; reverse
    return a.key < b.key ? 1 : -1;
  });
  return {
    now: sorted[0]?.data ?? null,
    prior: sorted[1]?.data ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Block 1 — Top movers · players · 24h
// ──────────────────────────────────────────────────────────────────────────

interface PlayerMover {
  playerId: string;
  playerName: string;
  team: string;
  pct24h: number;
  vol24hUsd: number;
  trades24h: number;
  editionCount: number;
  spark6d: number[];
}

interface MoversBlock {
  rows: PlayerMover[];
  usedLiveFallback: boolean;
  usedLiveDeltaProxy: boolean;
}

// Compute Δ% from in-memory bulk transactions for a single player by
// splitting that player's samples into first-half / second-half by updatedAt
// and taking the ratio of medians. Returns null if the sample is too thin.
function liveProxyPctFromSamples(samples: { cents: number; ts: number }[]): number | null {
  if (samples.length < 4) return null;
  const sorted = [...samples].sort((a, b) => a.ts - b.ts);
  const mid = Math.floor(sorted.length / 2);
  const earlier = sorted.slice(0, mid).map((s) => s.cents);
  const later = sorted.slice(mid).map((s) => s.cents);
  const earlierMed = median(earlier);
  const laterMed = median(later);
  if (earlierMed <= 0) return null;
  return ((laterMed - earlierMed) / earlierMed) * 100;
}

async function loadPlayerMovers24h(bulkRef: { txs: MarketplaceTransaction[] | null }): Promise<MoversBlock> {
  const pair = await readPair<MarketAggregateSnapshot>("day");
  const priorMedians = new Map<string, number>();
  if (pair.prior?.topPlayersByVolume) {
    for (const p of pair.prior.topPlayersByVolume) {
      priorMedians.set(p.playerName, p.medianPriceCents);
    }
  }

  // Always realize the bulk pull at 2000 so Δ% live-proxy + Block 2 + Block 6
  // share one fetch. recentSalesBulk is idempotent inside the request.
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);

  // Build per-player live samples for Δ% proxy fallback.
  const liveByPlayer = new Map<string, { samples: { cents: number; ts: number }[]; volCents: number; trades: number; team: string; editionKeys: Set<string> }>();
  for (const t of bulkRef.txs) {
    const name = t.moment?.play?.stats?.playerName;
    if (!name) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    if (cents <= 0) continue;
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : Date.now();
    const team = t.moment?.play?.stats?.teamAtMoment ?? "";
    const editionKey = `${t.moment?.set?.flowName ?? ""}|${t.moment?.play?.id ?? ""}|${t.moment?.edition?.tier ?? ""}|${t.moment?.edition?.parallelID ?? 0}`;
    const cur =
      liveByPlayer.get(name) ??
      { samples: [] as { cents: number; ts: number }[], volCents: 0, trades: 0, team, editionKeys: new Set<string>() };
    cur.samples.push({ cents, ts });
    cur.volCents += cents;
    cur.trades += 1;
    cur.editionKeys.add(editionKey);
    liveByPlayer.set(name, cur);
  }

  // Detect whether the snapshot join would yield meaningful Δ% (any non-zero prior median
  // for a name that exists in pair.now).
  let snapshotJoinUsable = false;
  if (pair.now?.topPlayersByVolume && pair.prior?.topPlayersByVolume) {
    for (const p of pair.now.topPlayersByVolume.slice(0, 6)) {
      if ((priorMedians.get(p.playerName) ?? 0) > 0) {
        snapshotJoinUsable = true;
        break;
      }
    }
  }

  if (pair.now?.topPlayersByVolume && pair.now.topPlayersByVolume.length) {
    let anyLiveProxyUsed = false;
    const rows: PlayerMover[] = pair.now.topPlayersByVolume.slice(0, 6).map((p) => {
      const priorMed = priorMedians.get(p.playerName) ?? 0;
      let pct = 0;
      if (snapshotJoinUsable && priorMed > 0) {
        pct = ((p.medianPriceCents - priorMed) / priorMed) * 100;
      } else {
        // Live proxy from bulk samples — split first-half / second-half by ts.
        const live = liveByPlayer.get(p.playerName);
        const proxy = live ? liveProxyPctFromSamples(live.samples) : null;
        if (proxy !== null) {
          pct = proxy;
          anyLiveProxyUsed = true;
        }
      }
      const live = liveByPlayer.get(p.playerName);
      return {
        playerId: p.playerName,
        playerName: p.playerName,
        team: live?.team ?? "",
        pct24h: pct,
        vol24hUsd: live ? live.volCents / 100 : (p.medianPriceCents * p.count) / 100,
        trades24h: live?.trades ?? p.count,
        editionCount: live?.editionKeys.size ?? 0,
        spark6d: [],
      };
    });
    return { rows, usedLiveFallback: false, usedLiveDeltaProxy: anyLiveProxyUsed && !snapshotJoinUsable };
  }

  // Live fallback path — derive rows from bulk entirely; Δ% via first/second-half split.
  const rows: PlayerMover[] = [...liveByPlayer.entries()]
    .map(([playerName, v]) => {
      const proxy = liveProxyPctFromSamples(v.samples);
      const priorMed = priorMedians.get(playerName) ?? 0;
      const med = median(v.samples.map((s) => s.cents));
      let pct = 0;
      if (priorMed > 0) {
        pct = ((med - priorMed) / priorMed) * 100;
      } else if (proxy !== null) {
        pct = proxy;
      }
      return {
        playerId: playerName,
        playerName,
        team: v.team,
        pct24h: pct,
        vol24hUsd: v.volCents / 100,
        trades24h: v.trades,
        editionCount: v.editionKeys.size,
        spark6d: [],
      };
    })
    .filter((r) => r.trades24h >= 5)
    .sort((a, b) => b.vol24hUsd - a.vol24hUsd)
    .slice(0, 6);
  return { rows, usedLiveFallback: true, usedLiveDeltaProxy: priorMedians.size === 0 };
}

// ──────────────────────────────────────────────────────────────────────────
// Block 2 — Most active · editions · 24h
// ──────────────────────────────────────────────────────────────────────────

interface EditionActivityRow {
  editionId: string;
  setFlowName: string;
  playerName: string;
  tier: string | null;
  parallelLabel: string;
  rawTier: string | null;
  vol24hUsd: number;
  lastSaleUsd: number;
  pct24h: number;
  trades24h: number;
  floorUsd: number;
  setUuid: string | null;
}

async function loadEditionMostActive24h(
  bulkRef: { txs: MarketplaceTransaction[] | null },
  setUuidByName: Map<string, string>,
): Promise<{ rows: EditionActivityRow[]; usedLiveFallback: boolean; filterRelaxed: boolean }> {
  // Spec says the canonical source is a not-yet-built EditionActivitySnapshot
  // (day tier). Per Builder instructions, derive from recentSalesBulk for this iter.
  // Pulled at 2000 per P0-2 of internal-check; the bulkRef is shared with Block 1.
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);
  const map = new Map<
    string,
    {
      setFlowName: string;
      playerName: string;
      rawTier: string | null;
      parallelID: number;
      volCents: number;
      trades: number;
      samples: { cents: number; ts: number }[];
      lowAsks: number[];
    }
  >();
  for (const t of bulkRef.txs) {
    const setName = t.moment?.set?.flowName;
    const playId = t.moment?.play?.id;
    const playerName = t.moment?.play?.stats?.playerName ?? "";
    const tier = t.moment?.edition?.tier ?? t.moment?.tier ?? null;
    const parallelID = t.moment?.edition?.parallelID ?? 0;
    if (!setName || !playId) continue;
    const key = `${playId}|${tier ?? ""}|${parallelID}`;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : Date.now();
    const cur =
      map.get(key) ??
      {
        setFlowName: setName,
        playerName,
        rawTier: tier,
        parallelID,
        volCents: 0,
        trades: 0,
        samples: [] as { cents: number; ts: number }[],
        lowAsks: [] as number[],
      };
    cur.volCents += cents;
    cur.trades += 1;
    cur.samples.push({ cents, ts });
    if (t.moment?.lowAsk != null) {
      const la = Number(t.moment.lowAsk);
      if (la > 0) cur.lowAsks.push(la);
    }
    map.set(key, cur);
  }
  const all: EditionActivityRow[] = [...map.entries()].map(([k, v]) => {
    v.samples.sort((a, b) => b.ts - a.ts);
    const lastSale = v.samples[0]?.cents ?? 0;
    const firstSale = v.samples[v.samples.length - 1]?.cents ?? 0;
    const pct = firstSale > 0 ? ((lastSale - firstSale) / firstSale) * 100 : 0;
    const floor = v.lowAsks.length ? Math.min(...v.lowAsks) : 0;
    return {
      editionId: k,
      setFlowName: v.setFlowName,
      playerName: v.playerName,
      tier: tierLabel(v.rawTier),
      rawTier: v.rawTier,
      parallelLabel: parallelLabel(v.parallelID),
      vol24hUsd: v.volCents / 100,
      lastSaleUsd: lastSale / 100,
      pct24h: pct,
      trades24h: v.trades,
      floorUsd: floor,
      setUuid: setUuidByName.get(v.setFlowName) ?? null,
    };
  });
  const strict = all
    .filter((r) => r.trades24h >= 3 && r.vol24hUsd >= 1000)
    .sort((a, b) => b.vol24hUsd - a.vol24hUsd);
  let rows = strict.slice(0, 20);
  let filterRelaxed = false;
  if (strict.length < 5) {
    // Demote per P0-2: trades24h ≥ 2 AND vol24hUsd ≥ 500
    const relaxed = all
      .filter((r) => r.trades24h >= 2 && r.vol24hUsd >= 500)
      .sort((a, b) => b.vol24hUsd - a.vol24hUsd)
      .slice(0, 20);
    if (relaxed.length > strict.length) {
      rows = relaxed;
      filterRelaxed = true;
    }
  }
  return { rows, usedLiveFallback: true, filterRelaxed };
}

// ──────────────────────────────────────────────────────────────────────────
// Block 3 — Largest sales · 24h
// ──────────────────────────────────────────────────────────────────────────

interface LargestSaleRow {
  priceUsd: number;
  playerName: string | null;
  setFlowName: string | null;
  serial: string | null;
  tier: string | null;     // raw token e.g. MOMENT_TIER_COMMON
  flowId: string | null;
  buyerUsername: string | null;
  sellerUsername: string | null;
  updatedAt: string | null;
}

async function loadLargestSales24h(
  bulkRef: { txs: MarketplaceTransaction[] | null },
): Promise<{ rows: LargestSaleRow[]; usedLiveFallback: boolean; clearedFiveK: number }> {
  const pair = await readPair<MarketAggregateSnapshot>("day");
  if (pair.now?.largestSales && pair.now.largestSales.length) {
    const rows: LargestSaleRow[] = pair.now.largestSales.slice(0, 10).map((s) => ({
      priceUsd: s.priceCents / 100,
      playerName: s.playerName,
      setFlowName: s.setFlowName,
      serial: s.serial,
      tier: s.tier,
      flowId: s.flowId,
      buyerUsername: s.buyerUsername,
      sellerUsername: s.sellerUsername,
      updatedAt: s.updatedAt,
    }));
    const cleared = (pair.now.largestSales ?? []).filter((s) => s.priceCents >= 500_000).length;
    return { rows, usedLiveFallback: false, clearedFiveK: cleared };
  }
  // Live fallback
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(800).catch(() => [] as MarketplaceTransaction[]);
  const sorted = [...bulkRef.txs].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  const rows: LargestSaleRow[] = sorted.slice(0, 10).map((t) => ({
    priceUsd: Number(t.price ?? 0),
    playerName: t.moment?.play?.stats?.playerName ?? null,
    setFlowName: t.moment?.set?.flowName ?? null,
    serial: t.moment?.flowSerialNumber ?? null,
    tier: t.moment?.edition?.tier ?? t.moment?.tier ?? null,
    flowId: t.moment?.flowId ?? null,
    buyerUsername: t.buyer?.username ?? null,
    sellerUsername: t.seller?.username ?? null,
    updatedAt: t.updatedAt ?? null,
  }));
  const cleared = bulkRef.txs.filter((t) => Number(t.price ?? 0) >= 5000).length;
  return { rows, usedLiveFallback: true, clearedFiveK: cleared };
}

// ──────────────────────────────────────────────────────────────────────────
// Block 4 — Hot collectors · 24h spend
// ──────────────────────────────────────────────────────────────────────────

interface HotCollectorCard {
  username: string;
  spendUsd: number;
  buyCount: number;
  biggestUsd: number;
  biggestFlowId: string | null;
  biggestPlayerName: string | null;
  windowFellbackTo7d: boolean;
}

function rowsFromTopBuyers(
  buyers: NonNullable<MarketAggregateSnapshot["topBuyers"]>,
  fellback: boolean,
): HotCollectorCard[] {
  return buyers
    .filter((b) => b.username && b.count >= MIN_BUYER_COUNT && b.spendCents >= MIN_BUYER_SPEND_CENTS)
    .slice(0, 6)
    .map((b) => ({
      username: b.username,
      spendUsd: b.spendCents / 100,
      buyCount: b.count,
      biggestUsd: b.biggestCents / 100,
      biggestFlowId: b.biggestFlowId,
      biggestPlayerName: null,
      windowFellbackTo7d: fellback,
    }));
}

// P0-3: detect when the persisted snapshot's topBuyers rows lack real counts.
// The writer in a separate repo path is not yet emitting `count` / `biggestCents`
// reliably; if every entry has count==null||count===0, treat the snapshot as
// unusable for this block and fall through to live derivation.
function snapshotBuyersHaveRealCounts(
  buyers: NonNullable<MarketAggregateSnapshot["topBuyers"]> | undefined,
): boolean {
  if (!buyers || !buyers.length) return false;
  return buyers.some((b) => b.count != null && b.count > 0);
}

async function loadHotCollectors24h(
  bulkRef: { txs: MarketplaceTransaction[] | null },
): Promise<{ rows: HotCollectorCard[]; fellback: "none" | "7d" | "live" }> {
  const dayPair = await readPair<MarketAggregateSnapshot>("day");
  if (snapshotBuyersHaveRealCounts(dayPair.now?.topBuyers)) {
    const qualified = rowsFromTopBuyers(dayPair.now!.topBuyers!, false);
    if (qualified.length >= 6) return { rows: qualified, fellback: "none" };
    // Try 7d fallback
    const weekPair = await readPair<MarketAggregateSnapshot>("week");
    if (snapshotBuyersHaveRealCounts(weekPair.now?.topBuyers)) {
      const wq = rowsFromTopBuyers(weekPair.now!.topBuyers!, true);
      if (wq.length >= 6) return { rows: wq, fellback: "7d" };
    }
    if (qualified.length >= 6) return { rows: qualified, fellback: "none" };
    // qualified < 6 and 7d unusable — fall through to live derivation below
    // rather than render stub cards.
  } else {
    const weekPair = await readPair<MarketAggregateSnapshot>("week");
    if (snapshotBuyersHaveRealCounts(weekPair.now?.topBuyers)) {
      const wq = rowsFromTopBuyers(weekPair.now!.topBuyers!, true);
      if (wq.length >= 6) return { rows: wq, fellback: "7d" };
    }
  }
  // Live fallback (always reached when snapshot writer hasn't populated counts).
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);
  const byBuyer = new Map<
    string,
    { spendCents: number; count: number; biggestCents: number; biggestFlowId: string | null; biggestPlayerName: string | null }
  >();
  for (const t of bulkRef.txs) {
    const u = t.buyer?.username;
    if (!u) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    const cur =
      byBuyer.get(u) ??
      { spendCents: 0, count: 0, biggestCents: 0, biggestFlowId: null, biggestPlayerName: null };
    cur.spendCents += cents;
    cur.count += 1;
    if (cents > cur.biggestCents) {
      cur.biggestCents = cents;
      cur.biggestFlowId = t.moment?.flowId ?? null;
      cur.biggestPlayerName = t.moment?.play?.stats?.playerName ?? null;
    }
    byBuyer.set(u, cur);
  }
  const rows: HotCollectorCard[] = [...byBuyer.entries()]
    .map(([username, v]) => ({
      username,
      spendUsd: v.spendCents / 100,
      buyCount: v.count,
      biggestUsd: v.biggestCents / 100,
      biggestFlowId: v.biggestFlowId,
      biggestPlayerName: v.biggestPlayerName,
      windowFellbackTo7d: false,
    }))
    .filter((r) => r.buyCount >= MIN_BUYER_COUNT && r.spendUsd >= 1000)
    .sort((a, b) => b.spendUsd - a.spendUsd)
    .slice(0, 6);
  return { rows, fellback: "live" };
}

// ──────────────────────────────────────────────────────────────────────────
// Block 5 — Set momentum · 7d
// ──────────────────────────────────────────────────────────────────────────

interface SetMomentumCard {
  setUuid: string | null;
  setFlowName: string;
  vol7dUsd: number;
  vol7dPrior: number;
  volPctChange: number;
  trades7d: number;
  medianUsd: number;
}

async function loadSetMomentum7d(
  bulkRef: { txs: MarketplaceTransaction[] | null },
  setUuidByName: Map<string, string>,
): Promise<{ rows: SetMomentumCard[]; priorMissing: boolean; usedLiveFallback: boolean }> {
  const pair = await readPair<MarketAggregateSnapshot>("week");
  if (pair.now?.topSetsByVolume && pair.now.topSetsByVolume.length) {
    const priorVol = new Map<string, number>();
    if (pair.prior?.topSetsByVolume) {
      for (const s of pair.prior.topSetsByVolume) {
        priorVol.set(s.setFlowName, s.medianPriceCents * s.count);
      }
    }
    const priorMissing = !pair.prior || !pair.prior.topSetsByVolume?.length;
    const rows: SetMomentumCard[] = pair.now.topSetsByVolume.slice(0, 6).map((s) => {
      const nowVol = s.medianPriceCents * s.count;
      const prev = priorVol.get(s.setFlowName) ?? 0;
      const pct = prev > 0 ? ((nowVol - prev) / prev) * 100 : 0;
      return {
        setUuid: setUuidByName.get(s.setFlowName) ?? null,
        setFlowName: s.setFlowName,
        vol7dUsd: nowVol / 100,
        vol7dPrior: prev / 100,
        volPctChange: pct,
        trades7d: s.count,
        medianUsd: s.medianPriceCents / 100,
      };
    });
    return { rows, priorMissing, usedLiveFallback: false };
  }
  // Live fallback (24h-bound; signal noisy but the surface stays alive)
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(800).catch(() => [] as MarketplaceTransaction[]);
  const bySet = new Map<string, { count: number; volCents: number; samples: number[] }>();
  for (const t of bulkRef.txs) {
    const name = t.moment?.set?.flowName;
    if (!name) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    const cur = bySet.get(name) ?? { count: 0, volCents: 0, samples: [] };
    cur.count += 1;
    cur.volCents += cents;
    cur.samples.push(cents);
    bySet.set(name, cur);
  }
  const rows: SetMomentumCard[] = [...bySet.entries()]
    .map(([setFlowName, v]) => ({
      setUuid: setUuidByName.get(setFlowName) ?? null,
      setFlowName,
      vol7dUsd: v.volCents / 100,
      vol7dPrior: 0,
      volPctChange: 0,
      trades7d: v.count,
      medianUsd: median(v.samples) / 100,
    }))
    .sort((a, b) => b.vol7dUsd - a.vol7dUsd)
    .slice(0, 6);
  return { rows, priorMissing: true, usedLiveFallback: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Block 6 — Indices · 24h (six-cell strip)
// ──────────────────────────────────────────────────────────────────────────

interface IndexCell {
  slug: "ts500" | "tier-common" | "tier-rare" | "tier-legendary" | "tier-ultimate" | "series-of-the-moment";
  label: string;
  value: string | null;
  pct24h: number | null;
  caption: string;
}

const TIER_MIN_SAMPLES = 10; // P0-4: don't render a tier cell with fewer than 10 sales in the window

async function loadIndicesStrip24h(
  bulkRef: { txs: MarketplaceTransaction[] | null },
): Promise<IndexCell[]> {
  // P0-4: compute per-tier medians from the in-memory bulk pull. Group by
  // moment.tier (raw token), take median price across the last 800-2000 sales.
  // Tiers with <10 sales in the window get an em-dash and the thin-sample caption.
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);

  const byTier = new Map<string, number[]>(); // raw tier token -> sample prices in cents
  for (const t of bulkRef.txs) {
    const raw = t.moment?.edition?.tier ?? t.moment?.tier ?? null;
    if (!raw) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    if (cents <= 0) continue;
    const arr = byTier.get(raw) ?? [];
    arr.push(cents);
    byTier.set(raw, arr);
  }

  const tierCell = (slug: IndexCell["slug"], label: string, rawTier: string): IndexCell => {
    const samples = byTier.get(rawTier) ?? [];
    const n = samples.length;
    const cleanLabel = label.replace(" floor", "");
    if (n < TIER_MIN_SAMPLES) {
      return {
        slug,
        label,
        value: null,
        pct24h: null,
        caption: `Tier sample too thin for 24h proxy — ${n} ${cleanLabel} sales in window. Canonical index live 2026-06-09.`,
      };
    }
    const med = median(samples);
    const usd = Math.round(med / 100);
    return {
      slug,
      label,
      value: `$${usd.toLocaleString()}`,
      pct24h: null,
      caption: `Proxy: median 24h ${cleanLabel} sale, $${usd.toLocaleString()} across ${n.toLocaleString()} tx. Canonical index live 2026-06-09.`,
    };
  };

  // Series-of-the-moment: pick top set by 7d volume as the "current" series anchor
  let seriesValue: string | null = null;
  let seriesCaption = `Proxy: median 24h Series sale, $— across 0 tx. Canonical index live 2026-06-09.`;
  const weekPair = await readPair<MarketAggregateSnapshot>("week");
  const topSet = weekPair.now?.topSetsByVolume?.[0];
  if (topSet) {
    seriesValue = `$${Math.round(topSet.medianPriceCents / 100).toLocaleString()}`;
    seriesCaption = `Proxy: median 24h Series sale, $${Math.round(topSet.medianPriceCents / 100).toLocaleString()} across ${topSet.count.toLocaleString()} tx. Canonical index live 2026-06-09.`;
  }

  const cells: IndexCell[] = [
    {
      slug: "ts500",
      label: "TS500",
      value: null,
      pct24h: null,
      caption: "TS500 computation pending. Component registry at /indices.",
    },
    tierCell("tier-common", "Common floor", "MOMENT_TIER_COMMON"),
    tierCell("tier-rare", "Rare floor", "MOMENT_TIER_RARE"),
    tierCell("tier-legendary", "Legendary floor", "MOMENT_TIER_LEGENDARY"),
    tierCell("tier-ultimate", "Ultimate floor", "MOMENT_TIER_ULTIMATE"),
    {
      slug: "series-of-the-moment",
      label: "Series 6",
      value: seriesValue,
      pct24h: null,
      caption: seriesCaption,
    },
  ];
  return cells;
}

// ──────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────

async function loadDepthCaption(): Promise<string> {
  const [day, week, month] = await Promise.all([
    readRecentSnapshots<MarketAggregateSnapshot>("day", 1).catch(() => []),
    readRecentSnapshots<MarketAggregateSnapshot>("week", 1).catch(() => []),
    readRecentSnapshots<MarketAggregateSnapshot>("month", 1).catch(() => []),
  ]);
  const tierAge = (snaps: Array<{ data: MarketAggregateSnapshot }>, label: string): string => {
    if (!snaps.length || !snaps[0]?.data?.ts) return `${label} tier · warming`;
    const min = Math.round((Date.now() - snaps[0].data.ts) / 60_000);
    if (min < 60) return `${label} tier ${Math.max(1, min)}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 36) return `${label} tier ${hr}h ago`;
    const d = Math.round(hr / 24);
    return `${label} tier ${d}d ago`;
  };
  return `${tierAge(day, "day")} · ${tierAge(week, "week")} · ${tierAge(month, "month")}`;
}

export default async function Home(_: { searchParams?: Promise<{ w?: string }> }) {
  // Per design.md §1: the homepage no longer reads a global window — each
  // block has its own default. The query-string contract (?w=...) is honored
  // for back-compat by callers but does not alter block windows.

  const setRows = await allSets(200).catch(() => []);
  const setUuidByName = new Map<string, string>();
  for (const s of setRows) setUuidByName.set(s.flowName, s.id);

  const bulkRef: { txs: MarketplaceTransaction[] | null } = { txs: null };

  // Realize the bulk pull once upfront at 2000 (raised per P0-2). All block
  // loaders share this ref; they reuse instead of refetching. This avoids
  // a race where Promise.all-parallel loaders each kick off their own fetch.
  bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);

  const [moversBlock, mostActive, largest, collectors, momentum, indices, depthCaption] =
    await Promise.all([
      loadPlayerMovers24h(bulkRef),
      loadEditionMostActive24h(bulkRef, setUuidByName),
      loadLargestSales24h(bulkRef),
      loadHotCollectors24h(bulkRef),
      loadSetMomentum7d(bulkRef, setUuidByName),
      loadIndicesStrip24h(bulkRef),
      loadDepthCaption(),
    ]);

  // Page-level honest absence: only when EVERY surface is empty.
  const allEmpty =
    moversBlock.rows.length === 0 &&
    mostActive.rows.length === 0 &&
    largest.rows.length === 0 &&
    collectors.rows.length === 0 &&
    momentum.rows.length === 0;
  if (allEmpty) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">
        Upstream unreachable + no accumulator snapshots available yet.
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-5">
      {/* Page header */}
      <header className="flex items-baseline gap-3 flex-wrap pt-4 pb-2">
        <h1 className="text-[20px] font-semibold tracking-tight">Market</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">
          six entities · six windows · live state
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">{depthCaption}</span>
      </header>

      {/* ===== Block 1 — Top movers · players · 24h ===== */}
      <section aria-labelledby="b1">
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 id="b1" className="text-[13px] font-semibold tracking-section-header">
            Top movers · players · 24h
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {moversBlock.rows.length} players · $-volume-weighted Δ% across all editions
          </span>
          <Link href="/movers" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        {moversBlock.rows.length === 0 ? (
          <Card className="p-3 text-[11px] text-[var(--text-faint)]">
            No players cleared the 5-trade liquidity floor in 24h or 7d. /movers carries the full register.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {moversBlock.rows.map((p) => (
              <Link
                key={p.playerId}
                href={`/movers`}
                className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="text-[11px] tracking-data-label text-[var(--text-faint)] truncate">
                  {p.playerName}
                  {p.team && <> · {p.team}</>}
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <Num value={p.pct24h} format="deltaPct" colorize className="text-[22px] font-semibold" />
                  <span className="text-[10px] tracking-data-label text-[var(--text-dim)]">24h Δ% · vol-weighted</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-dim)] tnum">
                  24h volume <Num value={p.vol24hUsd} format="usdCompact" />
                  {p.editionCount > 0 && (
                    <> across <Num value={p.editionCount} format="int" /> editions</>
                  )}
                  {" · "}
                  {p.trades24h} trades
                </div>
                {p.spark6d.length >= 2 && (
                  <div className="mt-2">
                    <Sparkline data={p.spark6d} width={72} height={20} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
        <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
          Snapshot history: 6 of 30 days populated — full 30d sparkline live 2026-06-08. 24h Δ% is canonical.
        </p>
        {moversBlock.usedLiveDeltaProxy && (
          <p className="mt-0.5 px-1 text-[10px] text-[var(--text-faint)]">
            Live Δ% proxy · prior-day snapshot empty; Δ% computed from first-half vs second-half of the trailing bulk window.
          </p>
        )}
        {moversBlock.usedLiveFallback && (
          <p className="mt-0.5 px-1 text-[10px] text-[var(--text-faint)]">Live fallback · 24h cron warming.</p>
        )}
      </section>

      {/* ===== Block 2 — Most active · editions · 24h ===== */}
      <section aria-labelledby="b2">
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 id="b2" className="text-[13px] font-semibold tracking-section-header">
            Most active · editions · 24h
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {mostActive.rows.length} editions · $ volume desc · filter{" "}
            {mostActive.filterRelaxed ? "2+ trades / $500 vol (relaxed)" : "3+ trades / $1,000 vol"}
          </span>
          <Link href="/volume" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        {mostActive.rows.length === 0 ? (
          <Card className="p-3 text-[11px] text-[var(--text-faint)]">
            No editions cleared 3 sales / $1,000 volume in the trailing 24h. The screener at /volume covers the long tail.
          </Card>
        ) : (
          <Card variant="inset">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-10">#</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Edition</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">24h $ vol</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Last</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">24h Δ%</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Trades</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Floor</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {mostActive.rows.map((r, i) => (
                  <tr key={r.editionId} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <Link
                        href={r.setUuid ? `/set/${r.setUuid}` : "/volume"}
                        className="text-[var(--text)] hover:text-[var(--accent)]"
                      >
                        {r.parallelLabel} {r.playerName} — {r.setFlowName} {r.tier ?? ""}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-right tnum font-semibold">
                      <Num value={r.vol24hUsd} format="usdCompact" />
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      <Num value={r.lastSaleUsd} format="usd" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Num value={r.pct24h} format="deltaPct" colorize />
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">{r.trades24h}</td>
                    <td className="px-3 py-1.5 text-right tnum">
                      {r.floorUsd > 0 ? <Num value={r.floorUsd} format="usd" /> : <span className="text-[var(--text-faint)]">—</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <TierChip tier={r.rawTier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {mostActive.filterRelaxed && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            Liquidity floor relaxed — 2+ trades / $500 vol shown.
          </p>
        )}
        {mostActive.usedLiveFallback && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">Live fallback · 24h cron warming.</p>
        )}
      </section>

      {/* ===== Block 3 — Largest sales · 24h ===== */}
      <section aria-labelledby="b3">
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 id="b3" className="text-[13px] font-semibold tracking-section-header">
            Largest sales · 24h
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {largest.rows.length} sales · price desc
          </span>
          <Link href="/sales" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        {largest.rows.length === 0 ? (
          <Card className="p-3 text-[11px] text-[var(--text-faint)]">
            Trailing 24h was quiet — only {largest.clearedFiveK} sales cleared $5,000. The full archive is at /sales.
          </Card>
        ) : (
          <Card variant="inset">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right w-[100px]">Price</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Moment</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">Tier</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Buyer</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Seller</th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right w-[60px]">Ago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {largest.rows.map((s, i) => (
                  <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-3 py-1.5 text-right tnum font-semibold text-[var(--up)]">
                      {s.flowId ? (
                        <Link href={`/moment/${s.flowId}`} className="hover:text-[var(--accent)]">
                          <Num value={s.priceUsd} format="usd" />
                        </Link>
                      ) : (
                        <Num value={s.priceUsd} format="usd" />
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-[var(--text)]">
                      {s.playerName ?? <span className="text-[var(--text-faint)]">—</span>}
                      {s.serial && <span className="text-[var(--text-faint)]"> #{s.serial}</span>}
                      {s.setFlowName && <span className="text-[var(--text-dim)]"> · {s.setFlowName}</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <TierChip tier={s.tier} />
                    </td>
                    <td className="px-3 py-1.5">
                      {s.buyerUsername ? (
                        <Link href={`/u/${encodeURIComponent(s.buyerUsername)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">
                          {s.buyerUsername}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {s.sellerUsername ? (
                        <Link href={`/u/${encodeURIComponent(s.sellerUsername)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">
                          {s.sellerUsername}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum text-[var(--text-faint)]">{agoLabel(s.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {largest.usedLiveFallback && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">Live fallback · 24h cron warming.</p>
        )}
      </section>

      {/* ===== Block 4 — Hot collectors · 24h spend ===== */}
      <section aria-labelledby="b4">
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 id="b4" className="text-[13px] font-semibold tracking-section-header">
            Hot collectors · 24h spend
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {collectors.rows.length} buyers · total $ spend
          </span>
          <Link href="/collectors" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        {collectors.rows.length === 0 ? (
          <Card className="p-3 text-[11px] text-[var(--text-faint)]">
            No named buyers cleared the liquidity floor in 24h or 7d. /collectors carries the full register.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {collectors.rows.map((c) => (
              <Link
                key={c.username}
                href={`/u/${encodeURIComponent(c.username)}`}
                className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="text-[11px] tracking-data-label text-[var(--text-faint)] truncate">{c.username}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <Num value={c.spendUsd} format="usdCompact" className="text-[22px] font-semibold" />
                  <span className="text-[10px] tracking-data-label text-[var(--text-dim)]">24h spend</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-dim)] tnum">
                  {c.buyCount} buys · biggest <Num value={c.biggestUsd} format="usdCompact" />
                  {c.biggestPlayerName && <> · {c.biggestPlayerName}</>}
                </div>
              </Link>
            ))}
          </div>
        )}
        {collectors.fellback === "7d" && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            Quiet 24h — fewer than 6 collectors cleared 3 buys / $1,000 in the trailing 24h. Showing 7d leaders.
          </p>
        )}
        {collectors.fellback === "live" && collectors.rows.length > 0 && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">Live fallback · 24h cron warming.</p>
        )}
      </section>

      {/* ===== Block 5 — Set momentum · 7d ===== */}
      <section aria-labelledby="b5">
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 id="b5" className="text-[13px] font-semibold tracking-section-header">
            Set momentum · 7d
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {momentum.rows.length} sets · Δ% of 7d $ volume vs prior 7d
          </span>
          <Link href="/sets" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        {momentum.rows.length === 0 ? (
          <Card className="p-3 text-[11px] text-[var(--text-faint)]">
            No sets cleared the 7d momentum filter. /sets carries the full register.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {momentum.rows.map((s) => (
              <Link
                key={s.setFlowName}
                href={s.setUuid ? `/set/${s.setUuid}` : "/sets"}
                className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="text-[11px] tracking-data-label text-[var(--text-faint)] truncate">{s.setFlowName}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  {momentum.priorMissing ? (
                    <Num value={s.vol7dUsd} format="usdCompact" className="text-[22px] font-semibold" />
                  ) : (
                    <Num value={s.volPctChange} format="deltaPct" colorize className="text-[22px] font-semibold" />
                  )}
                  <span className="text-[10px] tracking-data-label text-[var(--text-dim)]">
                    {momentum.priorMissing ? "7d $ volume" : "7d vol Δ%"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-dim)] tnum">
                  7d volume <Num value={s.vol7dUsd} format="usdCompact" /> · {s.trades7d} trades · median{" "}
                  <Num value={s.medianUsd} format="usd" />
                </div>
              </Link>
            ))}
          </div>
        )}
        {momentum.priorMissing && momentum.rows.length > 0 && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            Δ% pending — prior-week snapshot not yet populated. Showing absolute 7d $ volume.
          </p>
        )}
        {momentum.usedLiveFallback && (
          <p className="mt-0.5 px-1 text-[10px] text-[var(--text-faint)]">
            Live fallback · 7d cron warming. Δ% pending prior-window snapshot.
          </p>
        )}
      </section>

      {/* ===== Block 6 — Indices · 24h (strip, bottom-of-fold) ===== */}
      <Card
        variant="inset"
        methodology="Indices are canonical aggregates (lib/indices/registry.ts). Per-cell methodology in the caption below each cell."
      >
        <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[13px] font-semibold tracking-section-header">Indices · 24h</h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono ml-auto">
            registry → snapshot pipeline pending
          </span>
          <Link href="/indices" className="text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          {indices.map((idx) => (
            <Link
              key={idx.slug}
              href={`/indices/${idx.slug}`}
              className="block px-3 py-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="text-[10px] text-[var(--text-faint)] tracking-data-label">{idx.label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[20px] font-semibold tnum">
                  {idx.value ?? <span className="text-[var(--text-faint)]">—</span>}
                </span>
                {idx.pct24h !== null && <Num value={idx.pct24h} format="deltaPct" colorize className="text-[11px]" />}
              </div>
              <div className="text-[10px] text-[var(--warn)] tnum font-mono mt-0.5 leading-snug">{idx.caption}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
