// V2 STAGE-1 follow-up probes. Targeted discovery based on the first pass.
// Run with: npx tsx scripts/probe-v2-followups.ts

import fs from "node:fs/promises";
import path from "node:path";

const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
const UA = "dapper-portal/2.0 (contact: r@dapperlabs.com)";
const OUT_DIR = path.join(process.cwd(), "research", "probes-v2");

interface Probe { slug: string; description: string; query: string; variables?: Record<string, unknown> }

const PROBES: Probe[] = [
  // Discovery 1: getSetPriceHistory exists. What's its shape and is it usable?
  {
    slug: "discovery-01-getSetPriceHistory-shape",
    description: "Probe getSetPriceHistory args/shape. Try common arg names.",
    query: `query{ getSetPriceHistory(input:{ setFlowID:"108" }){ points{ ts price } } }`,
  },
  {
    slug: "discovery-01b-getSetPriceHistory-altargs",
    description: "Try setID arg.",
    query: `query{ getSetPriceHistory(input:{ setID:"108" }){ points{ ts price } } }`,
  },
  {
    slug: "discovery-01c-getSetPriceHistory-bareID",
    description: "Try bare ID arg.",
    query: `query($id:ID!){ getSetPriceHistory(setID:$id){ data{ ts price } } }`,
    variables: { id: "108" },
  },
  // Discovery 2: marketplace tx sort enum values.
  {
    slug: "discovery-02-tx-sort-CREATED_AT_DESC",
    description: "What sort enum values exist on MarketplaceTransactionSortType beyond PRICE_DESC?",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{} sortBy:CREATED_AT_DESC searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:1 } } }){ data{ searchSummary{ totalCount } } } }`,
  },
  {
    slug: "discovery-02b-tx-sort-INVALID",
    description: "Use deliberately invalid enum to surface valid options in error.",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{} sortBy:WAT_DESC searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:1 } } }){ data{ searchSummary{ totalCount } } } }`,
  },
  // Discovery 3: Edition has any sales/transactions field?
  {
    slug: "discovery-03-edition-fields",
    description: "Probe Edition fields beyond what V1 uses.",
    query: `query{ getEditionByFlowIDs(input:{ setFlowID:"108", playFlowID:"4096" }){ edition{ id mostRecentSale recentSales{ price } transactions{ price } salesCount } } }`,
  },
  // Discovery 4: searchSets supports filter args?
  {
    slug: "discovery-04-searchSets-filters",
    description: "Does searchSets accept bySeries or byActive filters?",
    query: `query{ searchSets(input:{ filters:{ bySeries:[1,2] byActive:true } searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ searchSummary{ data{ ... on Sets{ data{ id flowName flowSeriesNumber } } } } } }`,
  },
  // Discovery 5: Series root entity?
  {
    slug: "discovery-05-getSeries",
    description: "Is there a getSeries / getSeriesByNumber query?",
    query: `query{ getSeries(seriesNumber:1){ id name sets{ id } } }`,
  },
  // Discovery 6: Marketplace listings as first-class.
  {
    slug: "discovery-06-searchListings",
    description: "Does a separate searchMarketplaceListings query exist?",
    query: `query{ searchMarketplaceListings(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:3 } } }){ data{ searchSummary{ totalCount data{ ... on MarketplaceListings{ data{ id price moment{ flowId } } } } } } } }`,
  },
  // Discovery 7: Aggregate stats on MintedMoment edition embed.
  {
    slug: "discovery-07-edition-stats-on-moment",
    description: "Does the Edition stub embedded on a MintedMoment expose more fields?",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId edition{ id circulationCount tier parallelID name slug mostRecentSalePrice lastSale } } } }`,
  },
  // Discovery 8: Withdrawal / burn feed (J-X4 burn-feed dependency).
  {
    slug: "discovery-08-burns",
    description: "Burn / withdrawal events — any field on MintedMoment or top-level query?",
    query: `query{ searchBurnedMoments(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:3 } } }){ data{ searchSummary{ totalCount } } } }`,
  },
  // Discovery 9: Challenge / completion / set rewards query.
  {
    slug: "discovery-09-challenges",
    description: "Top-level challenges / rewards query.",
    query: `query{ searchChallenges(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:3 } } }){ data{ searchSummary{ totalCount } } } }`,
  },
];

async function probe(p: Probe) {
  const start = Date.now();
  const reqBody = { query: p.query, variables: p.variables ?? {} };
  let resJson: unknown;
  let status = 0;
  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA, Accept: "application/json" },
      body: JSON.stringify(reqBody),
    });
    status = res.status;
    const text = await res.text();
    try { resJson = JSON.parse(text); } catch { resJson = { raw: text }; }
  } catch (e) {
    resJson = { networkError: e instanceof Error ? e.message : String(e) };
  }
  const elapsedMs = Date.now() - start;
  const out = { slug: p.slug, description: p.description, timestamp: new Date().toISOString(), elapsedMs, request: reqBody, response: { status, body: resJson } };
  await fs.writeFile(path.join(OUT_DIR, `${p.slug}.json`), JSON.stringify(out, null, 2));
  const r = resJson as { errors?: Array<{ message?: string }>; data?: unknown } | undefined;
  const errMsg = r?.errors?.[0]?.message?.slice(0, 120) ?? "";
  const dataMsg = r?.data ? "  (data present)" : "";
  console.log(`${p.slug.padEnd(46)} ${status} ${elapsedMs}ms  ${errMsg ? "ERR: " + errMsg : "OK" + dataMsg}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const p of PROBES) {
    await probe(p);
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
