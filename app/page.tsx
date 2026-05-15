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
  snapshotJoinUsable: boolean;
  constrainedPool: boolean;
}

// Compute Δ% from in-memory bulk transactions for a single player by
// splitting that player's samples into first-half / second-half by updatedAt
// and taking the ratio of medians. Returns null if the sample is too thin.
function liveProxyPctFromSamples(samples: { cents: number; ts: number }[]): number | null {
  if (samples.length < 6) return null;
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
    // Map snapshot rows to PlayerMover, applying trade-count floor (≥5 trades)
    // and, on the live-Δ% proxy path, a samples-length floor (≥6 samples per player).
    // Filtered-out players don't render at all (no em-dash padding).
    type CandidateWithPath = PlayerMover & { __liveProxy: boolean };
    const candidates: CandidateWithPath[] = pair.now.topPlayersByVolume
      .map((p) => {
        const priorMed = priorMedians.get(p.playerName) ?? 0;
        const live = liveByPlayer.get(p.playerName);
        const trades24h = live?.trades ?? p.count;
        if (trades24h < 5) return null;
        let pct = 0;
        let liveProxyThisRow = false;
        if (snapshotJoinUsable && priorMed > 0) {
          pct = ((p.medianPriceCents - priorMed) / priorMed) * 100;
        } else {
          // Live proxy path — require ≥6 samples per player so first-half / second-half
          // each carry ≥3 prints. Players with thinner samples are dropped.
          if (!live || live.samples.length < 6) return null;
          const proxy = liveProxyPctFromSamples(live.samples);
          if (proxy === null) return null;
          pct = proxy;
          liveProxyThisRow = true;
        }
        if (liveProxyThisRow) anyLiveProxyUsed = true;
        return {
          playerId: p.playerName,
          playerName: p.playerName,
          team: live?.team ?? "",
          pct24h: pct,
          vol24hUsd: live ? live.volCents / 100 : (p.medianPriceCents * p.count) / 100,
          trades24h,
          editionCount: live?.editionKeys.size ?? 0,
          spark6d: [],
          __liveProxy: liveProxyThisRow,
        } as CandidateWithPath;
      })
      .filter((r): r is CandidateWithPath => r !== null)
      // iter-2 R1 fix: hard-gate Δ% to [-50%, +50%] regardless of path
      // (spec §5.6 — values outside that range are statistical artifacts of thin trade counts).
      .filter((r) => r.pct24h >= -50 && r.pct24h <= 50)
      // iter-2 R1 fix: on the live-proxy path, also drop exact-zero Δ%
      // (first/second-half medians matched — degenerate sample split).
      .filter((r) => !(r.__liveProxy && r.pct24h === 0))
      .sort((a, b) => b.vol24hUsd - a.vol24hUsd);
    const rows: PlayerMover[] = candidates.slice(0, 6).map(({ __liveProxy: _lp, ...rest }) => rest);
    const constrainedPool = candidates.length < 6;
    return {
      rows,
      usedLiveFallback: false,
      usedLiveDeltaProxy: anyLiveProxyUsed && !snapshotJoinUsable,
      snapshotJoinUsable,
      constrainedPool,
    };
  }

  // Live fallback path — derive rows from bulk entirely; Δ% via first/second-half split.
  // Same filters: trades24h ≥ 5 and (when no priorMed available) samples.length ≥ 6.
  type FallbackCandidate = PlayerMover & { __liveProxy: boolean };
  const liveCandidates: FallbackCandidate[] = [...liveByPlayer.entries()]
    .map(([playerName, v]) => {
      if (v.trades < 5) return null;
      const priorMed = priorMedians.get(playerName) ?? 0;
      let pct = 0;
      let liveProxyThisRow = false;
      if (priorMed > 0) {
        const med = median(v.samples.map((s) => s.cents));
        pct = ((med - priorMed) / priorMed) * 100;
      } else {
        if (v.samples.length < 6) return null;
        const proxy = liveProxyPctFromSamples(v.samples);
        if (proxy === null) return null;
        pct = proxy;
        liveProxyThisRow = true;
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
        __liveProxy: liveProxyThisRow,
      } as FallbackCandidate;
    })
    .filter((r): r is FallbackCandidate => r !== null)
    // iter-2 R1 fix: hard-gate Δ% to [-50%, +50%] for all candidates.
    .filter((r) => r.pct24h >= -50 && r.pct24h <= 50)
    // iter-2 R1 fix: live-proxy path also drops exact-zero Δ% (degenerate split).
    .filter((r) => !(r.__liveProxy && r.pct24h === 0))
    .sort((a, b) => b.vol24hUsd - a.vol24hUsd);
  const rows: PlayerMover[] = liveCandidates.slice(0, 6).map(({ __liveProxy: _lp, ...rest }) => rest);
  const constrainedPool = liveCandidates.length < 6;
  return {
    rows,
    usedLiveFallback: true,
    usedLiveDeltaProxy: priorMedians.size === 0,
    snapshotJoinUsable,
    constrainedPool,
  };
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
): Promise<{
  rows: EditionActivityRow[];
  usedLiveFallback: boolean;
  filterRelaxed: boolean;
  fellback: "none" | "relaxed-24h" | "7d-bulk" | "7d-bulk-deep" | "cascade-exhausted";
  bulkWindowDaysApprox: number | null;
}> {
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
  let fellback: "none" | "relaxed-24h" | "7d-bulk" | "7d-bulk-deep" | "cascade-exhausted" =
    strict.length >= 5 ? "none" : "none";
  let bulkWindowDaysApprox: number | null = null;
  const computeBulkWindow = () => {
    const txs = bulkRef.txs ?? [];
    if (!txs.length) return;
    let oldest = Infinity;
    let newest = -Infinity;
    for (const t of txs) {
      const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
      if (!isFinite(ts)) continue;
      if (ts < oldest) oldest = ts;
      if (ts > newest) newest = ts;
    }
    if (isFinite(oldest) && isFinite(newest) && newest > oldest) {
      bulkWindowDaysApprox = Math.max(1, Math.round((newest - oldest) / 86_400_000));
    }
  };
  if (strict.length < 5) {
    // Tier-2: relaxed 24h — trades24h ≥ 2 AND vol24hUsd ≥ 500
    const relaxed = all
      .filter((r) => r.trades24h >= 2 && r.vol24hUsd >= 500)
      .sort((a, b) => b.vol24hUsd - a.vol24hUsd);
    if (relaxed.length >= 5) {
      rows = relaxed.slice(0, 20);
      filterRelaxed = true;
      fellback = "relaxed-24h";
    } else {
      // Tier-3 (iter-2): 7d-bulk fallback over the full bulk window with a weaker
      // filter (≥2 trades, ≥$100 volume — iter-2 R2 fix relaxed from $200).
      // The bulk pull is ~2-3 days at current platform volume; we surface the
      // actual ts-range coverage.
      const weak = all
        .filter((r) => r.trades24h >= 2 && r.vol24hUsd >= 100)
        .sort((a, b) => b.vol24hUsd - a.vol24hUsd);
      if (weak.length >= 5) {
        rows = weak.slice(0, 20);
        filterRelaxed = true;
        fellback = "7d-bulk";
        computeBulkWindow();
      } else {
        // Tier-4 (iter-3 Fix-1a): deepest bulk slice — ≥1 trade, ANY volume.
        // The ≥1 trade constraint is implicit (buckets only exist if a trade
        // occurred). Drop the $50 vol floor that iter-2 still carried — at
        // bulk-window scale most buckets are single-trade Common/Fandom
        // editions whose individual price is < $50. Ranking by descending
        // aggregate volume and slicing top-20 lets the real depth come up.
        const deep = all
          .filter((r) => r.trades24h >= 1)
          .sort((a, b) => b.vol24hUsd - a.vol24hUsd);
        if (deep.length >= 5) {
          rows = deep.slice(0, 20);
          filterRelaxed = true;
          fellback = "7d-bulk-deep";
          computeBulkWindow();
        } else if (deep.length > 0) {
          // 1-4 buckets exist; still show them but mark cascade as exhausted
          // (header truth — see render rule below).
          rows = deep.slice(0, 20);
          filterRelaxed = true;
          fellback = "cascade-exhausted";
          computeBulkWindow();
        } else {
          // 0 buckets — genuine zero. Header reflects exhaustion.
          rows = [];
          fellback = "cascade-exhausted";
          computeBulkWindow();
        }
      }
    }
  }
  return { rows, usedLiveFallback: true, filterRelaxed, fellback, bulkWindowDaysApprox };
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
): Promise<{
  rows: HotCollectorCard[];
  fellback: "none" | "7d" | "live" | "7d-bulk";
  bulkWindowDaysApprox: number | null;
}> {
  const dayPair = await readPair<MarketAggregateSnapshot>("day");
  if (snapshotBuyersHaveRealCounts(dayPair.now?.topBuyers)) {
    const qualified = rowsFromTopBuyers(dayPair.now!.topBuyers!, false);
    if (qualified.length >= 6) return { rows: qualified, fellback: "none", bulkWindowDaysApprox: null };
    // Try 7d snapshot fallback
    const weekPair = await readPair<MarketAggregateSnapshot>("week");
    if (snapshotBuyersHaveRealCounts(weekPair.now?.topBuyers)) {
      const wq = rowsFromTopBuyers(weekPair.now!.topBuyers!, true);
      if (wq.length >= 6) return { rows: wq, fellback: "7d", bulkWindowDaysApprox: null };
    }
    // qualified < 6 and 7d unusable — fall through to live derivation below.
  } else {
    const weekPair = await readPair<MarketAggregateSnapshot>("week");
    if (snapshotBuyersHaveRealCounts(weekPair.now?.topBuyers)) {
      const wq = rowsFromTopBuyers(weekPair.now!.topBuyers!, true);
      if (wq.length >= 6) return { rows: wq, fellback: "7d", bulkWindowDaysApprox: null };
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
  const allBuyers: HotCollectorCard[] = [...byBuyer.entries()]
    .map(([username, v]) => ({
      username,
      spendUsd: v.spendCents / 100,
      buyCount: v.count,
      biggestUsd: v.biggestCents / 100,
      biggestFlowId: v.biggestFlowId,
      biggestPlayerName: v.biggestPlayerName,
      windowFellbackTo7d: false,
    }))
    .sort((a, b) => b.spendUsd - a.spendUsd);
  const strict = allBuyers
    .filter((r) => r.buyCount >= MIN_BUYER_COUNT && r.spendUsd >= 1000)
    .slice(0, 6);
  if (strict.length >= 5) return { rows: strict, fellback: "live", bulkWindowDaysApprox: null };
  // iter-2 §2 — expand to full bulk window with relaxed buyer filter (≥1 buy, no spend min).
  // Surfaces the trailing ~2-3 day bulk-derived 7d view when 24h-grade liquidity is thin.
  const relaxed = allBuyers
    .filter((r) => r.buyCount >= 1)
    .map((r) => ({ ...r, windowFellbackTo7d: true }))
    .slice(0, 6);
  let bulkWindowDaysApprox: number | null = null;
  const txs = bulkRef.txs;
  if (txs && txs.length) {
    let oldest = Infinity;
    let newest = -Infinity;
    for (const t of txs) {
      const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
      if (!isFinite(ts)) continue;
      if (ts < oldest) oldest = ts;
      if (ts > newest) newest = ts;
    }
    if (isFinite(oldest) && isFinite(newest) && newest > oldest) {
      bulkWindowDaysApprox = Math.max(1, Math.round((newest - oldest) / 86_400_000));
    }
  }
  return { rows: relaxed, fellback: "7d-bulk", bulkWindowDaysApprox };
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
): Promise<{
  rows: SetMomentumCard[];
  priorMissing: boolean;
  usedLiveFallback: boolean;
  bulkWindowDaysApprox: number | null;
  bulkTxCount: number;
}> {
  // iter-3 Fix-2: compute true aggregate volume by summing per-tx prices from
  // the bulk window, regardless of whether the week-tier snapshot has
  // topSetsByVolume — that snapshot's `count × medianPrice` heuristic
  // under-reports for sets with right-skewed price distributions, which is
  // every Top Shot set. Caption discloses the bulk-window depth honestly.
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);
  const txs = bulkRef.txs;

  // Compute bulk window coverage for the caption.
  let bulkWindowDaysApprox: number | null = null;
  let oldest = Infinity;
  let newest = -Infinity;
  for (const t of txs) {
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
    if (!isFinite(ts)) continue;
    if (ts < oldest) oldest = ts;
    if (ts > newest) newest = ts;
  }
  if (isFinite(oldest) && isFinite(newest) && newest > oldest) {
    bulkWindowDaysApprox = Math.max(1, Math.round((newest - oldest) / 86_400_000));
  }

  // Aggregate per-tx volume by set.
  const bySet = new Map<string, { count: number; volCents: number; samples: number[] }>();
  for (const t of txs) {
    const name = t.moment?.set?.flowName;
    if (!name) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    if (cents <= 0) continue;
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
  return { rows, priorMissing: true, usedLiveFallback: true, bulkWindowDaysApprox, bulkTxCount: txs.length };
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
  // Tiers with <10 sales in the 24h sub-window get a fallback path (iter-3
  // Fix-3: Ultimate uses bulk-window median when 24h is empty; other tiers
  // keep the thin-sample em-dash).
  if (!bulkRef.txs) bulkRef.txs = await recentSalesBulk(2000).catch(() => [] as MarketplaceTransaction[]);
  const txs = bulkRef.txs;

  // Compute bulk window coverage (used in Ultimate fallback caption).
  let bulkWindowDaysApprox: number | null = null;
  let oldest = Infinity;
  let newest = -Infinity;
  for (const t of txs) {
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
    if (!isFinite(ts)) continue;
    if (ts < oldest) oldest = ts;
    if (ts > newest) newest = ts;
  }
  if (isFinite(oldest) && isFinite(newest) && newest > oldest) {
    bulkWindowDaysApprox = Math.max(1, Math.round((newest - oldest) / 86_400_000));
  }
  const last24hCutoff = Date.now() - 24 * 60 * 60 * 1000;

  // Tier samples: 24h slice (last 24h by updatedAt) and full bulk slice.
  const tier24h = new Map<string, number[]>();
  const tierBulk = new Map<string, number[]>();
  for (const t of txs) {
    const raw = t.moment?.edition?.tier ?? t.moment?.tier ?? null;
    if (!raw) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    if (cents <= 0) continue;
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
    const bulkArr = tierBulk.get(raw) ?? [];
    bulkArr.push(cents);
    tierBulk.set(raw, bulkArr);
    if (isFinite(ts) && ts >= last24hCutoff) {
      const arr = tier24h.get(raw) ?? [];
      arr.push(cents);
      tier24h.set(raw, arr);
    }
  }

  const tierCell = (slug: IndexCell["slug"], label: string, rawTier: string): IndexCell => {
    const samples = tier24h.get(rawTier) ?? [];
    const n = samples.length;
    const cleanLabel = label.split(" · ")[0];
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

  // iter-3 Fix-3 (Ultimate): when 0 Ultimate sales in 24h, fall back to the
  // median Ultimate sale across the full bulk window.
  const ultimateRaw = "MOMENT_TIER_ULTIMATE";
  let ultimateCell: IndexCell = tierCell("tier-ultimate", "Ultimate · median 24h", ultimateRaw);
  const ultimate24h = (tier24h.get(ultimateRaw) ?? []).length;
  if (ultimate24h === 0) {
    const bulkSamples = tierBulk.get(ultimateRaw) ?? [];
    if (bulkSamples.length > 0) {
      const med = median(bulkSamples);
      const usd = Math.round(med / 100);
      ultimateCell = {
        slug: "tier-ultimate",
        label: "Ultimate · median 24h",
        value: `$${usd.toLocaleString()}`,
        pct24h: null,
        caption: `Ultimate proxy: median Ultimate sale over trailing ~${bulkWindowDaysApprox && bulkWindowDaysApprox > 0 ? bulkWindowDaysApprox : "?"}d bulk window (${(bulkSamples.length || 0).toLocaleString()} tx). Canonical index live 2026-06-09.`,
      };
    }
  }

  // iter-3 Fix-3 (Series-of-the-moment): pick the series with the most 24h tx
  // from grouping bulkRef.txs by moment.set.flowSeriesNumber. If the top
  // series has < 10 tx in 24h, fall back to the bulk-window proxy — pick the
  // series with the most tx in the FULL bulk window and render the proxy
  // caption (same template as the Ultimate-tier fallback). Em-dash only when
  // the bulk window itself has 0 series tx for any series.
  let seriesValue: string | null = null;
  let seriesLabel = "Series — · median 24h";
  let seriesCaption = `Tier sample too thin for 24h proxy — 0 Series sales in window. Canonical index live 2026-06-09.`;

  const bySeries24h = new Map<number, number[]>();
  const bySeriesBulk = new Map<number, number[]>();
  for (const t of txs) {
    const sn = t.moment?.set?.flowSeriesNumber;
    if (sn == null) continue;
    const cents = Math.round(Number(t.price ?? 0) * 100);
    if (cents <= 0) continue;
    const bulkArr = bySeriesBulk.get(sn) ?? [];
    bulkArr.push(cents);
    bySeriesBulk.set(sn, bulkArr);
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
    if (!isFinite(ts) || ts < last24hCutoff) continue;
    const arr = bySeries24h.get(sn) ?? [];
    arr.push(cents);
    bySeries24h.set(sn, arr);
  }
  let topSeries24h: { n: number; samples: number[] } | null = null;
  for (const [n, samples] of bySeries24h.entries()) {
    if (!topSeries24h || samples.length > topSeries24h.samples.length) {
      topSeries24h = { n, samples };
    }
  }
  if (topSeries24h && topSeries24h.samples.length >= 10) {
    const med = median(topSeries24h.samples);
    const usd = Math.round(med / 100);
    seriesValue = `$${usd.toLocaleString()}`;
    seriesLabel = `Series ${topSeries24h.n} · median 24h`;
    seriesCaption = `Proxy: median 24h Series ${topSeries24h.n} sale, $${usd.toLocaleString()} across ${topSeries24h.samples.length.toLocaleString()} tx. Canonical index live 2026-06-09.`;
  } else {
    // Bulk-window fallback: no series has ≥10 24h tx. Pick the series with the
    // most tx in the FULL bulk window (regardless of 24h freshness).
    let topSeriesBulk: { n: number; samples: number[] } | null = null;
    for (const [n, samples] of bySeriesBulk.entries()) {
      if (!topSeriesBulk || samples.length > topSeriesBulk.samples.length) {
        topSeriesBulk = { n, samples };
      }
    }
    if (topSeriesBulk && topSeriesBulk.samples.length > 0) {
      const med = median(topSeriesBulk.samples);
      const usd = Math.round(med / 100);
      seriesValue = `$${usd.toLocaleString()}`;
      seriesLabel = `Series ${topSeriesBulk.n} · median 24h`;
      seriesCaption = `Series ${topSeriesBulk.n} proxy: median sale over trailing ~${bulkWindowDaysApprox && bulkWindowDaysApprox > 0 ? bulkWindowDaysApprox : "?"}d bulk window (${topSeriesBulk.samples.length.toLocaleString()} tx). Canonical index live 2026-06-09.`;
    }
    // else: em-dash with default caption (bulk window has 0 series tx anywhere).
  }

  const cells: IndexCell[] = [
    {
      slug: "ts500",
      label: "TS500",
      value: null,
      pct24h: null,
      caption: "TS500 computation pending. Component registry at /indices.",
    },
    tierCell("tier-common", "Common · median 24h", "MOMENT_TIER_COMMON"),
    tierCell("tier-rare", "Rare · median 24h", "MOMENT_TIER_RARE"),
    tierCell("tier-legendary", "Legendary · median 24h", "MOMENT_TIER_LEGENDARY"),
    ultimateCell,
    {
      slug: "series-of-the-moment",
      label: seriesLabel,
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
      <section aria-labelledby="b1" data-constrained-pool={moversBlock.constrainedPool ? "true" : "false"}>
        <div className="flex items-baseline gap-3 mb-2 px-1">
          <h2 id="b1" className="text-[13px] font-semibold tracking-section-header">
            Top movers · players · 24h
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {moversBlock.rows.length} players · ranked by 24h $ volume · filter: ≥5 trades
            {moversBlock.constrainedPool && " (constrained — pool below 6)"}
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
        {/* iter-2 §4: caption switches by snapshot-join state.
            Live-proxy branch is canonical until prior-day snapshots populate. */}
        {moversBlock.snapshotJoinUsable && !moversBlock.usedLiveDeltaProxy ? (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            Snapshot history: 6 of 30 days populated — full 30d sparkline live 2026-06-08. 24h Δ% snapshot-derived.
          </p>
        ) : (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            Live Δ% proxy · prior-day snapshot empty; Δ% computed from first-half vs second-half of the trailing bulk window.
          </p>
        )}
        {moversBlock.constrainedPool && (
          <p className="mt-0.5 px-1 text-[10px] text-[var(--text-faint)]">
            Constrained pool — fewer than 6 players cleared 5 trades in 24h. Ranked by 24h $ volume.
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
            {mostActive.fellback === "cascade-exhausted"
              ? "Most active · editions · 24h–7d (cascade exhausted)"
              : mostActive.fellback === "7d-bulk" || mostActive.fellback === "7d-bulk-deep"
                ? "Most active · editions · 7d"
                : "Most active · editions · 24h"}
          </h2>
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            {mostActive.rows.length} editions · $ volume desc · filter{" "}
            {mostActive.fellback === "cascade-exhausted"
              ? "1+ trade (deepest, no vol floor)"
              : mostActive.fellback === "7d-bulk-deep"
                ? "1+ trade (7d deep)"
                : mostActive.fellback === "7d-bulk"
                  ? "2+ trades / $100 vol (7d)"
                  : mostActive.filterRelaxed
                    ? "2+ trades / $500 vol (relaxed)"
                    : "3+ trades / $1,000 vol"}
          </span>
          <Link href="/volume" className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono">
            see all →
          </Link>
        </div>
        {mostActive.rows.length === 0 ? (
          <Card className="p-3 text-[11px] text-[var(--text-faint)]">
            {mostActive.fellback === "cascade-exhausted"
              ? "24h strict, 24h relaxed, and ~2-3d bulk passes each returned fewer than 5 qualifying editions. Showing nothing rather than noise."
              : "No editions cleared 3 sales / $1,000 volume in the trailing 24h. The screener at /volume covers the long tail."}
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
        {mostActive.fellback === "cascade-exhausted" && mostActive.rows.length > 0 ? (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            24h strict, 24h relaxed, and ~2-3d bulk passes each returned fewer than 5 qualifying editions. Showing the {mostActive.rows.length} bucket{mostActive.rows.length === 1 ? "" : "s"} that exist rather than noise.
          </p>
        ) : mostActive.fellback === "7d-bulk-deep" ? (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            24h depth insufficient — surfaced over the deepest bulk slice (~2-3d, broadest filter). 24h re-engages when ≥5 entities clear the filter.
          </p>
        ) : mostActive.fellback === "7d-bulk" ? (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            24h depth insufficient — surfaced over trailing ~2-3d bulk window. 24h re-engages when ≥5 entities clear the filter.
          </p>
        ) : mostActive.filterRelaxed ? (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            Liquidity floor relaxed — 2+ trades / $500 vol shown.
          </p>
        ) : null}
        {mostActive.usedLiveFallback &&
          mostActive.fellback !== "7d-bulk" &&
          mostActive.fellback !== "7d-bulk-deep" &&
          mostActive.fellback !== "cascade-exhausted" && (
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
            Hot collectors · {collectors.fellback === "7d" || collectors.fellback === "7d-bulk" ? "7d" : "24h"} spend
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
                  <span className="text-[10px] tracking-data-label text-[var(--text-dim)]">
                    {collectors.fellback !== "none" ? "7d spend" : "24h spend"}
                  </span>
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
        {collectors.fellback === "7d-bulk" && (
          <p className="mt-1 px-1 text-[10px] text-[var(--text-faint)]">
            24h depth insufficient — surfaced over trailing ~2-3d bulk window. 24h re-engages when ≥5 entities clear the filter.
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
            Δ% pending — prior-week snapshot not yet populated. Showing absolute $ volume.
          </p>
        )}
        {momentum.usedLiveFallback && (
          <p className="mt-0.5 px-1 text-[10px] text-[var(--text-faint)]">
            Aggregate volume from trailing ~{momentum.bulkWindowDaysApprox && momentum.bulkWindowDaysApprox > 0 ? momentum.bulkWindowDaysApprox : "?"}d bulk window ({(momentum.bulkTxCount || 0).toLocaleString()} tx){(momentum.bulkTxCount || 0) === 0 ? " — depth unavailable at this render." : "."}
          </p>
        )}
      </section>

      {/* ===== Block 6 — Indices · 24h (strip, bottom-of-fold) ===== */}
      <Card
        variant="inset"
        methodology="Indices are canonical aggregates (lib/indices/registry.ts). Per-cell methodology in the caption below each cell."
      >
        <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[13px] font-semibold tracking-section-header">Tier medians · 24h</h2>
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
