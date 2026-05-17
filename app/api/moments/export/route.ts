// /api/moments/export — CSV export for the /moments grid.
//
// Respects current filter state via query params. Single PostgREST query
// (via supabase-js admin client) with LIMIT capped at MAX_ROWS. Returns
// text/csv with Content-Disposition triggering a browser download.
//
// Cap: 10,000 rows. Pro traders narrow filters to slice the universe; full-
// universe export is intentionally not supported (would be many MB).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 10K-row export via PostgREST native (NOT exec_sql — 30× slower at this row
// count; see research/wiki/gotchas/exec-sql-rpc-is-30x-slower-than-postgrest.md).
const MAX_ROWS = 10_000;

interface EditionLite {
  edition_id: string;
  tier_name: string | null;
  player_name: string | null;
  team_at_moment_current_name: string | null;
  mint_count: number | null;
}

function getStr(sp: URLSearchParams, k: string): string | undefined {
  const v = sp.get(k);
  return v && v.length > 0 ? v : undefined;
}

function getInt(sp: URLSearchParams, k: string): number | undefined {
  const v = sp.get(k);
  if (!v) return undefined;
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : undefined;
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const player = getStr(sp, "player");
  const tiers = (getStr(sp, "tiers") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const league = getStr(sp, "league");
  const maxPriceUsd = getInt(sp, "maxPrice");
  const maxSerial = getInt(sp, "maxSerial");
  const setName = getStr(sp, "set");
  const listedOnly = sp.get("listed") !== "false";
  const sort = sp.get("sort") ?? "listing_price_asc";

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return new NextResponse("Export unavailable: server not configured.", { status: 503 });
  }

  // Stage 1 — resolve editions if player/tier/league filter set
  let editions: EditionLite[] | null = null;
  const hasEditionFilter = !!player || tiers.length > 0 || (league === "NBA" || league === "WNBA");
  if (hasEditionFilter) {
    let eq = admin
      .from("editions")
      .select("edition_id, tier_name, player_name, team_at_moment_current_name, mint_count");
    if (player) eq = eq.ilike("player_name", `%${player}%`);
    if (tiers.length > 0) eq = eq.in("tier_name", tiers);
    if (league === "NBA" || league === "WNBA") eq = eq.eq("league", league);
    eq = eq.limit(4000);
    const { data: edata } = await eq;
    editions = (edata as EditionLite[] | null) ?? [];
    if (editions.length === 0) {
      return csvResponse([], buildFilename());
    }
  }

  // Stage 2 — query moments
  let q = admin
    .from("moments")
    .select(
      "moment_id, moment_flow_id, play_name, edition_name, edition_id, serial_number, listing_price_usd, top_shot_score, set_name, series_name, league",
    );

  if (editions) q = q.in("edition_id", editions.map((e) => e.edition_id));
  if (listedOnly) q = q.not("listing_price_usd", "is", null);
  if (typeof maxPriceUsd === "number") q = q.lte("listing_price_usd", maxPriceUsd);
  if (typeof maxSerial === "number") q = q.lte("serial_number", maxSerial);
  if (setName) q = q.ilike("set_name", `%${setName}%`);
  if (!editions && (league === "NBA" || league === "WNBA")) q = q.eq("league", league);

  // nullsFirst intentionally omitted — see lib/supabase/queries/moments-grid.ts
  switch (sort) {
    case "listing_price_desc":
      q = q.order("listing_price_usd", { ascending: false });
      break;
    case "serial_asc":
      q = q.order("serial_number", { ascending: true });
      break;
    case "serial_desc":
      q = q.order("serial_number", { ascending: false });
      break;
    case "ts_score_desc":
      q = q.order("top_shot_score", { ascending: false });
      break;
    case "released_desc":
      q = q.order("released_at", { ascending: false });
      break;
    case "listing_price_asc":
    default:
      q = q.order("listing_price_usd", { ascending: true });
      break;
  }

  q = q.limit(MAX_ROWS);
  const { data, error } = await q;
  if (error) {
    return new NextResponse(`Export error: ${error.message}`, { status: 500 });
  }
  type MomentRowRaw = {
    moment_id: string;
    moment_flow_id: string | null;
    play_name: string | null;
    edition_name: string | null;
    edition_id: string | null;
    serial_number: number | null;
    listing_price_usd: number | string | null;
    top_shot_score: number | string | null;
    set_name: string | null;
    series_name: string | null;
    league: string | null;
  };
  const rows = (data as MomentRowRaw[] | null) ?? [];

  // Stage 3 — fetch edition metadata for rows if not pre-resolved
  let editionMap = editions ? new Map(editions.map((e) => [e.edition_id, e] as const)) : new Map<string, EditionLite>();
  if (!editions && rows.length > 0) {
    const ids = Array.from(new Set(rows.map((r) => r.edition_id).filter((x): x is string => !!x)));
    if (ids.length > 0) {
      const { data: edata } = await admin
        .from("editions")
        .select("edition_id, tier_name, player_name, team_at_moment_current_name, mint_count")
        .in("edition_id", ids);
      editionMap = new Map(((edata as EditionLite[] | null) ?? []).map((e) => [e.edition_id, e] as const));
    }
  }

  return csvResponse(
    rows.map((m) => {
      const e = m.edition_id ? editionMap.get(m.edition_id) : null;
      return {
        moment_flow_id: m.moment_flow_id,
        player_name: e?.player_name ?? null,
        play_name: m.play_name,
        set_name: m.set_name,
        series_name: m.series_name,
        edition_name: m.edition_name,
        tier_name: e?.tier_name ?? null,
        serial_number: m.serial_number,
        mint_count: e?.mint_count ?? null,
        listing_price_usd: m.listing_price_usd,
        top_shot_score: m.top_shot_score,
        team_name: e?.team_at_moment_current_name ?? null,
        league: m.league,
      };
    }),
    buildFilename(),
  );
}

function buildFilename(): string {
  return `topshot-moments-${new Date().toISOString().slice(0, 10)}.csv`;
}

function csvResponse(rows: Record<string, unknown>[], filename: string): NextResponse {
  const header = [
    "moment_flow_id",
    "player_name",
    "play_name",
    "set_name",
    "series_name",
    "edition_name",
    "tier_name",
    "serial_number",
    "mint_count",
    "listing_price_usd",
    "top_shot_score",
    "team_name",
    "league",
  ];
  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map((k) => csvEscape(r[k])).join(","));
  }
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
