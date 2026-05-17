// /api/parallels/export — CSV export for /parallels page.
//
// Accepts the same filter params as the page:
//   ?player=<id_or_name>
//   ?tiers=Common,Rare
//   ?parallel=0,16
//   ?sort=<col>
//   ?dir=<asc|desc>
//
// Returns text/csv with Content-Disposition: attachment triggering browser download.
// Cap: 5000 rows. Returns error if player not resolved.

import { NextResponse } from "next/server";
import { getParallelsData, type ParallelRow } from "@/lib/supabase/queries/parallels";

export const dynamic = "force-dynamic";

const DEFAULT_PLAYER = "201939";

function str(sp: URLSearchParams, k: string): string | undefined {
  const v = sp.get(k);
  return v && v.length > 0 ? v : undefined;
}

function parseArr(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function esc(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function sortRows(
  rows: ParallelRow[],
  col: string,
  dir: string,
): ParallelRow[] {
  const asc = dir === "asc";
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "set_name":
        cmp = (a.set_name ?? "").localeCompare(b.set_name ?? "");
        break;
      case "tier":
        cmp = (a.tier_name ?? "").localeCompare(b.tier_name ?? "");
        break;
      case "parallel":
        cmp = a.parallel_name.localeCompare(b.parallel_name);
        break;
      case "circulation":
        cmp = a.circulation - b.circulation;
        break;
      case "listings":
        cmp = a.listings_count - b.listings_count;
        break;
      case "low_ask":
        if (a.low_ask == null && b.low_ask == null) return 0;
        if (a.low_ask == null) return 1;
        if (b.low_ask == null) return -1;
        cmp = a.low_ask - b.low_ask;
        break;
      case "high_offer":
        if (a.high_offer == null && b.high_offer == null) return 0;
        if (a.high_offer == null) return 1;
        if (b.high_offer == null) return -1;
        cmp = a.high_offer - b.high_offer;
        break;
      case "avg_sale_30d":
        if (a.avg_sale_30d == null && b.avg_sale_30d == null) return 0;
        if (a.avg_sale_30d == null) return 1;
        if (b.avg_sale_30d == null) return -1;
        cmp = a.avg_sale_30d - b.avg_sale_30d;
        break;
    }
    return asc ? cmp : -cmp;
  });
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const player = str(sp, "player") ?? DEFAULT_PLAYER;
  const tierFilter = parseArr(str(sp, "tiers"));
  const parallelFilter = parseArr(str(sp, "parallel"));
  const sortCol = str(sp, "sort") ?? "set_name";
  const sortDir = str(sp, "dir") ?? "asc";

  const { rows: allRows, playerName } = await getParallelsData(player);

  let rows = allRows;
  if (tierFilter.length > 0) {
    rows = rows.filter((r) => r.tier_name && tierFilter.includes(r.tier_name));
  }
  if (parallelFilter.length > 0) {
    rows = rows.filter((r) => r.parallel_id && parallelFilter.includes(r.parallel_id));
  }
  rows = sortRows(rows, sortCol, sortDir).slice(0, 5000);

  const HEADERS = [
    "Player",
    "Set Name",
    "Series",
    "Tier",
    "Parallel",
    "Edition ID",
    "Circulation",
    "Listings",
    "Low Ask (USD)",
    "High Offer (USD)",
    "Avg Sale 30D (USD)",
  ];

  const csvLines = [
    HEADERS.join(","),
    ...rows.map((r) =>
      [
        esc(playerName ?? player),
        esc(r.set_name),
        esc(r.series_number),
        esc(r.tier_name),
        esc(r.parallel_name),
        esc(r.edition_id),
        esc(r.circulation),
        esc(r.listings_count),
        esc(r.low_ask),
        esc(r.high_offer),
        esc(r.avg_sale_30d != null ? r.avg_sale_30d.toFixed(2) : null),
      ].join(","),
    ),
  ];

  const csv = csvLines.join("\n");
  const filename = `topshot-parallels-${(playerName ?? player).replace(/\s+/g, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
