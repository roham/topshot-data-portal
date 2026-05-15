// 30-min watchlist-portfolio snapshot. Reads PORTFOLIO_WATCHLIST env
// (comma-separated flowAddresses) and snapshots each.
import { gql, writeSnapshot, snapshotKeyNow, tick } from "./_snapshot-helpers.mjs";

const addrs = (process.env.PORTFOLIO_WATCHLIST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!addrs.length) {
  console.log(JSON.stringify({ cadence: "portfolios", skipped: "PORTFOLIO_WATCHLIST not set" }));
  process.exit(0);
}

const MINTED_MOMENT_LITE = `
  flowId flowSerialNumber tier lowAsk forSale acquiredAt lastPurchasePrice
  play { stats { playerName teamAtMoment } }
  set { flowName flowSeriesNumber flowId }
`;

async function getUserByFlow(addr) {
  const q = `query($a: String!) { getUserProfile(input: { flowAddress: $a }) { publicInfo { username dapperID flowAddress } } }`;
  try {
    const d = await gql(q, { a: addr });
    return d?.getUserProfile?.publicInfo ?? null;
  } catch { return null; }
}

async function firstBagPage(addr) {
  const q = `query($a:[String],$c:Cursor!,$l:Int!){
    searchMintedMoments(input:{ filters:{ byOwnerFlowAddress: $a } searchInput:{ pagination:{ cursor:$c, direction:RIGHT, limit:$l } } }) {
      data{ searchSummary{ totalCount pagination{ rightCursor } data{ ... on MintedMoments{ data{ ${MINTED_MOMENT_LITE} } } } } }
    }
  }`;
  const d = await gql(q, { a: [addr], c: "", l: 100 });
  const ss = d?.searchMintedMoments?.data?.searchSummary;
  return {
    totalCount: ss?.totalCount ?? 0,
    items: ss?.data?.data ?? [],
  };
}

async function snapshotPortfolio(addr) {
  const [user, page] = await Promise.all([getUserByFlow(addr), firstBagPage(addr)]);
  let sumCentsSampled = 0;
  let listedSampled = 0;
  for (const m of page.items) {
    if (m.lowAsk && Number(m.lowAsk) > 0) {
      sumCentsSampled += Math.round(Number(m.lowAsk) * 100);
      listedSampled++;
    }
  }
  const sampleSize = page.items.length;
  const total = page.totalCount;
  const estCents = sampleSize > 0 && total > 0
    ? Math.round((sumCentsSampled / sampleSize) * total)
    : 0;
  const topHoldingsByValue = page.items
    .filter((m) => m.lowAsk && Number(m.lowAsk) > 0)
    .sort((a, b) => Number(b.lowAsk) - Number(a.lowAsk))
    .slice(0, 25)
    .map((m) => ({
      flowId: m.flowId,
      playerName: m.play?.stats?.playerName ?? "(unknown)",
      setFlowName: m.set?.flowName ?? "(unknown)",
      serial: Number(m.flowSerialNumber),
      lowAskCents: Math.round(Number(m.lowAsk) * 100),
    }));
  return {
    ts: Date.now(),
    flowAddress: addr,
    username: user?.username ?? null,
    totalMoments: total,
    estimatedValueCents: estCents,
    listedSampled,
    sampleSize,
    topHoldingsByValue,
  };
}

const key = snapshotKeyNow();
const results = [];
for (const addr of addrs) {
  try {
    const snap = await snapshotPortfolio(addr);
    const w = await writeSnapshot("portfolios", `${key}__${addr}`, snap);
    results.push({ flowAddress: addr, ok: true, bytes: w.bytes });
  } catch (e) {
    results.push({ flowAddress: addr, ok: false, error: e?.message ?? String(e) });
  }
  await tick();
}
console.log(JSON.stringify({ cadence: "portfolios", count: addrs.length, results }));
