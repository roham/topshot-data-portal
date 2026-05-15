// V2 STAGE-1 third round: capture shape of unlocked endpoints discovered in round 2.

import fs from "node:fs/promises";
import path from "node:path";

const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
const UA = "dapper-portal/2.0 (contact: r@dapperlabs.com)";
const OUT_DIR = path.join(process.cwd(), "research", "probes-v2");

interface Probe { slug: string; description: string; query: string }

const PROBES: Probe[] = [
  // getSetPriceHistory with correct args.
  {
    slug: "shape-01-getSetPriceHistory-30d",
    description: "getSetPriceHistory with setID + days. Capture full response shape.",
    query: `query{ getSetPriceHistory(input:{ setID:"108", days:30 }){ data{ price } } }`,
  },
  {
    slug: "shape-01b-getSetPriceHistory-fields",
    description: "Try richer field set on each point.",
    query: `query{ getSetPriceHistory(input:{ setID:"108", days:7 }){ data{ price timestamp date volume tier } } }`,
  },
  // searchChallenges — what fields are on a Challenge?
  {
    slug: "shape-02-searchChallenges-fields",
    description: "searchChallenges with reasonable Challenge fields.",
    query: `query{ searchChallenges(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ data{ searchSummary{ totalCount data{ ... on Challenges{ data{ id name description status startTime endTime reward requirements { count tier } } } } } } } }`,
  },
  {
    slug: "shape-02b-searchChallenges-minimal",
    description: "Minimal Challenge fields to confirm shape on errors.",
    query: `query{ searchChallenges(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ data{ searchSummary{ totalCount data{ ... on Challenges{ data{ id } } } } } } }`,
  },
  // searchBreakEvents
  {
    slug: "shape-03-searchBreakEvents",
    description: "searchBreakEvents — what's a BreakEvent?",
    query: `query{ searchBreakEvents(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:3 } } }){ data{ searchSummary{ totalCount data{ ... on BreakEvents{ data{ id name startTime endTime } } } } } } }`,
  },
  // getTitles
  {
    slug: "shape-04-getTitles",
    description: "getTitles — what is this surface?",
    query: `query{ getTitles{ data{ id name description } } }`,
  },
  // getUserSets
  {
    slug: "shape-05-getUserSets",
    description: "getUserSets — per-user set completion?",
    query: `query{ getUserSets(input:{ flowAddress:"0xee9c9e3651ba6f49" }){ sets{ id flowName completed totalMoments ownedMoments } } }`,
  },
  // Edition.salesHistory? Check getTitles also as alt.
  {
    slug: "shape-06-edition-allfields-list",
    description: "Edition: ask for known-bad field; error message lists valid fields.",
    query: `query{ getEditionByFlowIDs(input:{ setFlowID:"108", playFlowID:"4096" }){ edition{ ___nonexistent } } }`,
  },
  // MintedMoment: same trick to enumerate valid fields.
  {
    slug: "shape-06b-moment-allfields-list",
    description: "MintedMoment field listing via bad-field error.",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ ___nonexistent } } }`,
  },
  // Hildobby wash-trade detection requires buyer/seller circular flows.
  // Confirm tx feed has both buyer + seller identity.
  {
    slug: "shape-07-tx-identity",
    description: "Confirm buyer + seller identity present on tx (wash-trade detection prerequisite).",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{} sortBy:UPDATED_AT_DESC searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:1 } } }){ data{ searchSummary{ data{ ... on MarketplaceTransactions{ data{ id price updatedAt createdAt buyer{ username flowAddress dapperID } seller{ username flowAddress dapperID } } } } } } } }`,
  },
];

async function probe(p: Probe) {
  const start = Date.now();
  const reqBody = { query: p.query, variables: {} };
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
  const errMsg = r?.errors?.[0]?.message?.slice(0, 140) ?? "";
  console.log(`${p.slug.padEnd(46)} ${status} ${elapsedMs}ms  ${errMsg ? "ERR: " + errMsg : "OK" + (r?.data ? " (data)" : "")}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const p of PROBES) { await probe(p); await new Promise((r) => setTimeout(r, 500)); }
}

main().catch((e) => { console.error(e); process.exit(1); });
