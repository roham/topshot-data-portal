// V2 STAGE-1 final round: nail down shapes for getSetPriceHistory + searchChallenges + searchBreakEvents.

import fs from "node:fs/promises";
import path from "node:path";

const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
const UA = "dapper-portal/2.0 (contact: r@dapperlabs.com)";
const OUT_DIR = path.join(process.cwd(), "research", "probes-v2");

interface Probe { slug: string; description: string; query: string }

const PROBES: Probe[] = [
  // getSetPriceHistory returns [Float] (raw scalars). Just take the array.
  {
    slug: "final-01-getSetPriceHistory-scalar",
    description: "Confirm getSetPriceHistory returns scalar array.",
    query: `query{ getSetPriceHistory(input:{ setID:"108", days:30 }){ data } }`,
  },
  // searchChallenges — probe with no inline fragment, full envelope.
  {
    slug: "final-02-searchChallenges-envelope",
    description: "searchChallenges full envelope.",
    query: `query{ searchChallenges(input:{ filters:{} searchInput:{ pagination:{ cursor:"", direction:RIGHT, limit:3 } } }){ data{ searchSummary{ totalCount __typename data{ __typename } } } } }`,
  },
  // searchBreakEvents with different input shape (no searchInput).
  {
    slug: "final-03-searchBreakEvents-no-pagination",
    description: "Try searchBreakEvents without searchInput wrapper.",
    query: `query{ searchBreakEvents(input:{ filters:{} pagination:{ cursor:"", direction:RIGHT, limit:3 } }){ data{ id name } } }`,
  },
  // getTitles real shape.
  {
    slug: "final-04-getTitles-real",
    description: "Probe getTitles fields via bad-field error.",
    query: `query{ getTitles{ ___nonexistent } }`,
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
  const errMsg = r?.errors?.[0]?.message?.slice(0, 200) ?? "";
  console.log(`${p.slug.padEnd(46)} ${status} ${elapsedMs}ms  ${errMsg ? "ERR: " + errMsg : "OK" + (r?.data ? " (data)" : "")}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const p of PROBES) { await probe(p); await new Promise((r) => setTimeout(r, 500)); }
}

main().catch((e) => { console.error(e); process.exit(1); });
