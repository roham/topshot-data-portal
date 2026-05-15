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
