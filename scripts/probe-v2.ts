// V2 STAGE-1 probe script.
// Run with: npx tsx scripts/probe-v2.ts
// Hits public-api.nbatopshot.com/graphql directly (no proxy), saves each
// probe's raw request+response to research/probes-v2/{slug}.json as positive
// proof for the ceilings doc. Negative findings require receipts.

import fs from "node:fs/promises";
import path from "node:path";

const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
const UA = "dapper-portal/2.0 (contact: r@dapperlabs.com)";
const OUT_DIR = path.join(process.cwd(), "research", "probes-v2");

interface Probe {
  slug: string;
  category: "ceiling" | "open-question" | "control" | "permissive";
  description: string;
  query: string;
  variables?: Record<string, unknown>;
  expectError?: boolean; // for ceiling probes we expect errors; for controls we don't
}

const PROBES: Probe[] = [
  // ---------------- CONTROLS (should succeed) ----------------
  {
    slug: "control-01-getUserProfileByUsername",
    category: "control",
    description: "Baseline: known-working query for BostonBased.",
    query: `query($u:String!){ getUserProfileByUsername(input:{username:$u}){ publicInfo{ username dapperID flowAddress } } }`,
    variables: { u: "BostonBased" },
    expectError: false,
  },

  // ---------------- CEILING PROBES (should error) ----------------
  {
    slug: "ceiling-01-searchUsers-by-prefix",
    category: "ceiling",
    description: "Ceiling 1: no searchUsers endpoint. Try a plausible search-by-prefix.",
    query: `query{ searchUsers(input:{ filters:{ byPrefix:"Boston" } searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ data{ searchSummary{ totalCount } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-01b-searchUsers-no-args",
    category: "ceiling",
    description: "Ceiling 1 fallback: bare searchUsers — confirm field absence.",
    query: `query{ searchUsers{ __typename } }`,
    expectError: true,
  },
  {
    slug: "ceiling-02-moment-transfers",
    category: "ceiling",
    description: "Ceiling 2: per-moment transfer history not exposed. Query for `.transfers` on a known moment.",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId transfers{ from to txHash timestamp } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-02b-moment-transferHistory",
    category: "ceiling",
    description: "Ceiling 2 alt: try `.transferHistory` and `.history` aliases.",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId transferHistory { txHash } history { txHash } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-03-tx-filter-byDateRange",
    category: "ceiling",
    description: "Ceiling 3: global tx feed has no date-range filter axis.",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{ byDateRange:{ from:"2026-05-01", to:"2026-05-14" } } searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ data{ searchSummary{ totalCount } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-03b-tx-filter-byPriceRange",
    category: "ceiling",
    description: "Ceiling 3 alt: also no price-range filter on the global tx feed.",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{ byPriceRange:{ min:1000, max:10000 } } searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ data{ searchSummary{ totalCount } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-04-moment-listings-array",
    category: "ceiling",
    description: "Ceiling 4: no `.listings[]` per moment exposing per-listing price. Aggregate lowAsk only.",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId lowAsk listings { id price seller { username } } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-05-edition-lowestAsk",
    category: "ceiling",
    description: "Ceiling 5: Edition has no `.lowestAsk` aggregate field.",
    query: `query{ getEditionByFlowIDs(input:{ setFlowID:"108", playFlowID:"4096" }){ edition{ id lowestAsk lowAsk floor floorPrice } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-07-leaderboard-entry-username",
    category: "ceiling",
    description: "Ceiling 7: leaderboard entries have rank/score only; no collector identity.",
    query: `query{ getLeaderboard(input:{ kind:PLAYER id:"2544" sortBy:SCORE_DESC pagination:{ cursor:"", direction:RIGHT, limit:5 } }){ leaderboard{ ... on PlayerLeaderboard{ entries{ rank score user{ username flowAddress } owner{ username } } } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-08-getPriceHistory",
    category: "ceiling",
    description: "Ceiling 8: no time-series historical pricing endpoint.",
    query: `query{ getPriceHistory(input:{ setFlowID:"108", playFlowID:"4096", interval:DAY }){ points{ ts price } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-08b-edition-priceHistory",
    category: "ceiling",
    description: "Ceiling 8 alt: also not on Edition.priceHistory.",
    query: `query{ getEditionByFlowIDs(input:{ setFlowID:"108", playFlowID:"4096" }){ edition{ priceHistory{ ts price } salesHistory{ price } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-09-introspection-schema",
    category: "ceiling",
    description: "Ceiling 9: introspection disabled.",
    query: `query{ __schema{ types{ name } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-09b-introspection-type",
    category: "ceiling",
    description: "Ceiling 9 alt: __type introspection.",
    query: `query{ __type(name:"MintedMoment"){ name fields{ name type{ name } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-10-moment-bids",
    category: "ceiling",
    description: "Ceiling 10: no bid or offer data on moments.",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId bids { id price bidder { username } } offers { id price } } } }`,
    expectError: true,
  },
  {
    slug: "ceiling-10b-edition-bestBid",
    category: "ceiling",
    description: "Ceiling 10 alt: no bestBid aggregate on Edition.",
    query: `query{ getEditionByFlowIDs(input:{ setFlowID:"108", playFlowID:"4096" }){ edition{ bestBid highestBid bidCount } } }`,
    expectError: true,
  },

  // ---------------- OPEN QUESTIONS ----------------
  {
    slug: "open-01-lockStatus-on-moment",
    category: "open-question",
    description: "Open Q1: does MintedMoment.lockStatus exist (J-X3 locking dashboard dependency)?",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId lockStatus isLocked locked lockExpiresAt } } }`,
  },
  {
    slug: "open-02-dateOfMoment-reliability",
    category: "open-question",
    description: "Open Q2: pull recent plays' dateOfMoment and inspect coverage / format.",
    query: `query{ searchPlays(input:{ searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:20 } } }){ searchSummary{ data{ ... on Plays{ data{ id headline stats{ playerName dateOfMoment teamAtMoment } } } } } } }`,
  },
  {
    slug: "open-03-tx-byEditions-volume-window",
    category: "open-question",
    description: "Open Q3: per-edition sale-count over a window. The byEditions filter works; can we sortBy date and combine?",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{ byEditions:[{ setID:"a1b2c3", playID:"d4e5f6" }] } sortBy:DATE_DESC searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:5 } } }){ data{ searchSummary{ totalCount } } } }`,
  },
  {
    slug: "open-04-holder-distribution",
    category: "open-question",
    description: "Open Q4: getEditionMinted or holders distribution.",
    query: `query{ getEditionByFlowIDs(input:{ setFlowID:"108", playFlowID:"4096" }){ edition{ id holders{ totalCount } topHolders{ flowAddress count } } } }`,
  },
  {
    slug: "open-05-challenge-staking",
    category: "open-question",
    description: "Open Q5: challenge/staking state. Try Challenge type and stake fields.",
    query: `query{ getMintedMoment(momentId:"45064996"){ data{ flowId stakedIn{ id name } activeChallenges{ id name } } } }`,
  },

  // ---------------- PERMISSIVE PROBES (what filters DO work on tx feed?) ----------------
  {
    slug: "permissive-01-tx-by-tier-only",
    category: "permissive",
    description: "Permissive: confirm `searchMarketplaceTransactions filters:{}` returns sorted-by-date globally (default behavior).",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:3 } } }){ data{ searchSummary{ totalCount data{ ... on MarketplaceTransactions{ data{ id price } } } } } } }`,
  },
  {
    slug: "permissive-02-tx-sortBy-PRICE_DESC",
    category: "permissive",
    description: "Permissive: PRICE_DESC sort (already used by biggestSalesAllTime).",
    query: `query{ searchMarketplaceTransactions(input:{ filters:{} sortBy:PRICE_DESC searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:1 } } }){ data{ searchSummary{ data{ ... on MarketplaceTransactions{ data{ id price } } } } } } }`,
  },
];

async function probe(p: Probe) {
  const start = Date.now();
  const reqBody = { query: p.query, variables: p.variables ?? {} };
  let resJson: unknown;
  let status = 0;
  let err: string | null = null;
  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Accept: "application/json",
      },
      body: JSON.stringify(reqBody),
    });
    status = res.status;
    const text = await res.text();
    try {
      resJson = JSON.parse(text);
    } catch {
      resJson = { raw: text };
    }
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : String(e);
  }
  const elapsedMs = Date.now() - start;
  const out = {
    slug: p.slug,
    category: p.category,
    description: p.description,
    expectError: p.expectError ?? null,
    timestamp: new Date().toISOString(),
    elapsedMs,
    request: reqBody,
    response: { status, body: resJson, networkError: err },
  };
  await fs.writeFile(path.join(OUT_DIR, `${p.slug}.json`), JSON.stringify(out, null, 2));
  // Compact stdout summary
  const r = resJson as { errors?: Array<{ message?: string }> } | undefined;
  const errMsg = r?.errors?.[0]?.message?.slice(0, 80) ?? "(no errors[])";
  console.log(
    `[${p.category.toUpperCase().padEnd(13)}] ${p.slug.padEnd(42)} ${status} ${elapsedMs}ms  ${r?.errors ? "ERR: " + errMsg : "OK"}`
  );
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Probing ${UPSTREAM} (${PROBES.length} probes)\n`);
  for (const p of PROBES) {
    await probe(p);
    // Rate-limit defensively: 2 rps cap per V2 conventions
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`\nProbes saved to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
