// Shared helpers for snapshot-*.mjs scripts. ESM, Node 20+, no deps.
import fs from "node:fs/promises";
import path from "node:path";

export const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
export const UA = "dapper-portal/2.0 (contact: r@dapperlabs.com)";

export async function gql(query, variables = {}, opts = {}) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!res.ok) throw new Error(`upstream ${res.status}: ${text.slice(0, 200)}`);
    return body.data ?? null;
  } finally {
    clearTimeout(tid);
  }
}

// Filesystem-safe ISO-8601 UTC: 2026-05-15T01-35-00Z (colons → dashes).
// Lexical order = chronological order.
export function snapshotKeyNow() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");
}

export async function writeSnapshot(cadence, key, data) {
  const dir = path.join(process.cwd(), ".snapshots", cadence);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${key}.json`);
  const payload = JSON.stringify(data, null, 0);
  await fs.writeFile(file, payload, "utf8");
  return { file, bytes: Buffer.byteLength(payload, "utf8") };
}

// Defensive rate-limit between paginated calls (~2 rps).
export const tick = (ms = 500) => new Promise((r) => setTimeout(r, ms));

export function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[Math.floor(mid)];
}

export function mean(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// Pull a bulk recent-tx window. Mirrors V1's recentSalesBulk.
export async function recentSalesBulk(targetCount) {
  const PAGE = 50;
  const out = [];
  let cursor = "";
  while (out.length < targetCount) {
    const q = `query($cur: Cursor!, $lim: Int!) {
      searchMarketplaceTransactions(input: {
        filters: {}
        searchInput: { pagination: { cursor: $cur, direction: RIGHT, limit: $lim } }
      }) {
        data {
          searchSummary {
            pagination { rightCursor }
            data { ... on MarketplaceTransactions { data {
              id price txHash updatedAt
              buyer { username flowAddress dapperID }
              seller { username flowAddress dapperID }
              moment {
                flowId flowSerialNumber tier lowAsk forSale
                set { flowName flowId }
                play { stats { playerName jerseyNumber teamAtMoment dateOfMoment } }
                edition { circulationCount tier parallelID }
              }
            } } }
          }
        }
      }
    }`;
    const d = await gql(q, { cur: cursor, lim: PAGE });
    const ss = d?.searchMarketplaceTransactions?.data?.searchSummary;
    const items = ss?.data?.data ?? [];
    if (!items.length) break;
    out.push(...items);
    cursor = ss?.pagination?.rightCursor ?? "";
    if (!cursor) break;
    await tick();
  }
  return out.slice(0, targetCount);
}

// Pull until updatedAt < cutoff (UPDATED_AT_DESC sort). Mirrors V1's
// chronologicalTxBackfill from STAGE-1 UNLOCK-02.
export async function chronologicalTxBackfill(windowMs, hardCap = 5000) {
  const cutoff = Date.now() - windowMs;
  const PAGE = 50;
  const out = [];
  let cursor = "";
  while (out.length < hardCap) {
    const q = `query($cur: Cursor!, $lim: Int!) {
      searchMarketplaceTransactions(input: {
        filters: {}
        sortBy: UPDATED_AT_DESC
        searchInput: { pagination: { cursor: $cur, direction: RIGHT, limit: $lim } }
      }) {
        data {
          searchSummary {
            pagination { rightCursor }
            data { ... on MarketplaceTransactions { data {
              id price txHash updatedAt
              buyer { username flowAddress dapperID }
              seller { username flowAddress dapperID }
              moment {
                flowId flowSerialNumber tier
                set { flowName flowId }
                play { stats { playerName jerseyNumber teamAtMoment dateOfMoment } }
                edition { circulationCount tier parallelID }
              }
            } } }
          }
        }
      }
    }`;
    const d = await gql(q, { cur: cursor, lim: PAGE });
    const ss = d?.searchMarketplaceTransactions?.data?.searchSummary;
    const items = ss?.data?.data ?? [];
    if (!items.length) break;
    const inWindow = items.filter((t) => {
      const ts = t.updatedAt ? Date.parse(t.updatedAt) : Date.now();
      return ts >= cutoff;
    });
    out.push(...inWindow);
    if (inWindow.length < items.length) break; // crossed cutoff
    cursor = ss?.pagination?.rightCursor ?? "";
    if (!cursor) break;
    await tick();
  }
  return out;
}

// Aggregator shared by every market-window snapshot script. Computes the
// MarketAggregateSnapshot shape (matches lib/snapshots/types.ts) plus
// topBuyers / topSellers (the ownership-graph wedge per design/03 § Social).
//
// `windowLabel` annotates the snapshot so readers know whether it's 30m / day /
// week / month aggregate.
export function aggregateMarketWindow(txs, windowMs, windowLabel) {
  const pricesCents = txs.map((t) => Math.round(Number(t.price ?? 0) * 100));
  const buyers = new Set();
  const sellers = new Set();
  const byPlayer = new Map(); // playerName -> price cents []
  const bySet = new Map(); // setFlowName -> price cents []
  const byBuyer = new Map(); // username -> { spend, count, biggest, biggestFlowId }
  const bySeller = new Map(); // username -> { revenue, count, biggest, biggestFlowId }
  // iter-6: per-tier price samples keyed by RAW upstream token
  // (MOMENT_TIER_COMMON, …). Mapped to clean schema keys after the loop.
  const byTier = new Map(); // rawTierToken -> price cents []
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    const cents = pricesCents[i];
    if (t.buyer?.flowAddress) buyers.add(t.buyer.flowAddress);
    if (t.seller?.flowAddress) sellers.add(t.seller.flowAddress);
    const tier = t.moment?.tier ?? null;
    if (tier) {
      const arr = byTier.get(tier) ?? [];
      arr.push(cents);
      byTier.set(tier, arr);
    }
    const playerName = t.moment?.play?.stats?.playerName;
    if (playerName) {
      const arr = byPlayer.get(playerName) ?? [];
      arr.push(cents);
      byPlayer.set(playerName, arr);
    }
    const setFlowName = t.moment?.set?.flowName;
    if (setFlowName) {
      const arr = bySet.get(setFlowName) ?? [];
      arr.push(cents);
      bySet.set(setFlowName, arr);
    }
    const buyerUsername = t.buyer?.username;
    if (buyerUsername) {
      const cur = byBuyer.get(buyerUsername) ?? { spendCents: 0, count: 0, biggestCents: 0, biggestFlowId: null };
      cur.spendCents += cents;
      cur.count++;
      if (cents > cur.biggestCents) {
        cur.biggestCents = cents;
        cur.biggestFlowId = t.moment?.flowId ?? null;
      }
      byBuyer.set(buyerUsername, cur);
    }
    const sellerUsername = t.seller?.username;
    if (sellerUsername) {
      const cur = bySeller.get(sellerUsername) ?? { revenueCents: 0, count: 0, biggestCents: 0, biggestFlowId: null };
      cur.revenueCents += cents;
      cur.count++;
      if (cents > cur.biggestCents) {
        cur.biggestCents = cents;
        cur.biggestFlowId = t.moment?.flowId ?? null;
      }
      bySeller.set(sellerUsername, cur);
    }
  }
  const topPlayersByVolume = Array.from(byPlayer.entries())
    .map(([playerName, prices]) => ({ playerName, count: prices.length, medianPriceCents: median(prices) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
  const topSetsByVolume = Array.from(bySet.entries())
    .map(([setFlowName, prices]) => ({ setFlowName, count: prices.length, medianPriceCents: median(prices) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
  const topBuyers = Array.from(byBuyer.entries())
    .map(([username, v]) => ({ username, spendCents: v.spendCents, count: v.count, biggestCents: v.biggestCents, biggestFlowId: v.biggestFlowId }))
    .sort((a, b) => b.spendCents - a.spendCents)
    .slice(0, 50);
  const topSellers = Array.from(bySeller.entries())
    .map(([username, v]) => ({ username, revenueCents: v.revenueCents, count: v.count, biggestCents: v.biggestCents, biggestFlowId: v.biggestFlowId }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 50);
  // Largest sales — top 50 by price, with full identity inline for ownership-graph wedge.
  const largestSales = [...txs]
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
    }));
  // iter-6: per-tier medians. Map raw upstream tokens to schema-clean keys; all
  // five keys are always present (null when 0 tx for that tier) to preserve the
  // honest-absence tristate at the writer layer (undefined = old snapshot,
  // null = no tx today, number = real median).
  const TIER_TOKEN_TO_KEY = {
    MOMENT_TIER_COMMON: "Common",
    MOMENT_TIER_RARE: "Rare",
    MOMENT_TIER_FANDOM: "Fandom",
    MOMENT_TIER_LEGENDARY: "Legendary",
    MOMENT_TIER_ULTIMATE: "Ultimate",
  };
  const medianByTier = { Common: null, Rare: null, Fandom: null, Legendary: null, Ultimate: null };
  for (const [rawToken, prices] of byTier.entries()) {
    const key = TIER_TOKEN_TO_KEY[rawToken];
    if (!key) continue; // silently ignore unknown tokens
    if (prices.length > 0) medianByTier[key] = median(prices);
  }
  return {
    ts: Date.now(),
    windowMs,
    windowLabel,
    txCount: txs.length,
    uniqueBuyers: buyers.size,
    uniqueSellers: sellers.size,
    medianPriceCents: median(pricesCents),
    meanPriceCents: mean(pricesCents),
    topPlayersByVolume,
    topSetsByVolume,
    topBuyers,
    topSellers,
    largestSales,
    medianByTier,
  };
}
