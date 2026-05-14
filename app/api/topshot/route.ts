import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
const UA = "dapper-portal/1.0 (contact: r@dapperlabs.com)";
const TIMEOUT_MS = 12000;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { query?: string; variables?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.query || typeof body.query !== "string") {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Accept: "application/json",
      },
      body: JSON.stringify({ query: body.query, variables: body.variables ?? {} }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const msg = (err as Error)?.name === "AbortError" ? "upstream_timeout" : "proxy_error";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
