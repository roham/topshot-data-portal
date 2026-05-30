// Reads mv_edition_cap_asof (per-edition floor cap as-of each window date, with
// carry-forward done correctly in SQL) and aggregates it by any segment × window
// in JS. ~8.7K rows, fetched once + cached. This is the trusted foundation for
// the segment/window explorer — no client carry-forward, no row-cap truncation.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface EditionCapRow {
  edition_id: string;
  player_id: string | null;
  player_name: string | null;
  tier_name: string | null;
  mint_count: number | null;
  series_number: number | null;
  team: string | null;
  cap_now: number;
  cap_d7: number | null;
  cap_d30: number | null;
  cap_d90: number | null;
  cap_d180: number | null;
  cap_d365: number | null;
}

export type Dimension = "tier" | "scarcity" | "series" | "team" | "player" | "cohort";
export type WindowKey = "d7" | "d30" | "d90" | "d180" | "d365";

export const WINDOW_LABEL: Record<WindowKey, string> = {
  d7: "7D", d30: "30D", d90: "90D", d180: "6M", d365: "1Y",
};
const WINDOW_FIELD: Record<WindowKey, keyof EditionCapRow> = {
  d7: "cap_d7", d30: "cap_d30", d90: "cap_d90", d180: "cap_d180", d365: "cap_d365",
};

const PAGE = 1000;

async function _getEditionCapRows(): Promise<EditionCapRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  const out: EditionCapRow[] = [];
  try {
    for (let off = 0; off < 40000; off += PAGE) {
      const { data, error } = await sb
        .from("mv_edition_cap_asof")
        .select("edition_id,player_id,player_name,tier_name,mint_count,series_number,team,cap_now,cap_d7,cap_d30,cap_d90,cap_d180,cap_d365")
        .order("edition_id", { ascending: true })
        .range(off, off + PAGE - 1);
      if (error) { console.error("[edition-cap-asof] read failed", error); break; }
      const rows = (data as EditionCapRow[] | null) ?? [];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
  } catch (e) {
    console.error("[edition-cap-asof] threw", e);
  }
  return out;
}

export const getEditionCapRows = () =>
  unstable_cache(_getEditionCapRows, ["edition-cap-asof-v1"], {
    revalidate: 600,
    tags: ["edition-cap-asof", "mv_edition_cap_asof"],
  })();

export interface SegmentMove {
  label: string;
  cap_now: number;
  cap_then: number;
  pct: number | null;
  eds: number;
  sort: number;
}

const TIER_ORDER: Record<string, number> = { Common: 0, Fandom: 1, Rare: 2, Legendary: 3, Ultimate: 4 };

function scarcityBucket(m: number | null): { label: string; sort: number } {
  if (m == null) return { label: "Unknown", sort: 99 };
  if (m <= 1) return { label: "1-of-1", sort: 0 };
  if (m <= 25) return { label: "/25", sort: 1 };
  if (m <= 99) return { label: "/99", sort: 2 };
  if (m <= 499) return { label: "/499", sort: 3 };
  if (m <= 4999) return { label: "/4,999", sort: 4 };
  return { label: "5,000+", sort: 5 };
}

function bucketOf(r: EditionCapRow, dim: Dimension): { label: string; sort: number } | null {
  switch (dim) {
    case "tier": return { label: r.tier_name ?? "Unknown", sort: TIER_ORDER[r.tier_name ?? ""] ?? 9 };
    case "scarcity": return scarcityBucket(r.mint_count);
    case "series": return r.series_number != null ? { label: `Series ${r.series_number}`, sort: r.series_number } : { label: "Unknown", sort: 99 };
    case "team": return r.team ? { label: r.team, sort: 0 } : null;
    case "player": return r.player_name ? { label: r.player_name, sort: 0 } : null;
    case "cohort": return null; // handled specially (TS50 etc.)
  }
}

/**
 * Aggregate floor-cap move per segment for a dimension + window. Straight matched
 * sum (editions present at both now and the window-ago date) — the literal floor
 * market cap of each segment, then vs now. No outlier filtering: floor cap is
 * faithful (stuck/vanity asks included, per doctrine).
 */
export function aggregateMoves(
  rows: EditionCapRow[],
  dim: Dimension,
  win: WindowKey,
  opts: { minEds?: number; topN?: number } = {},
): { segments: SegmentMove[]; total: SegmentMove } {
  const field = WINDOW_FIELD[win];
  const agg = new Map<string, { now: number; then: number; eds: number; sort: number }>();
  let tNow = 0, tThen = 0, tEds = 0;

  // cohort = TS50 (top 50 editions by cap_now) vs the rest of the market
  const cohortTop = dim === "cohort"
    ? new Set([...rows].sort((a, b) => b.cap_now - a.cap_now).slice(0, 50).map((r) => r.edition_id))
    : null;

  for (const r of rows) {
    const then = r[field] as number | null;
    if (then == null || then <= 0 || !(r.cap_now > 0)) continue;
    let b: { label: string; sort: number } | null;
    if (dim === "cohort") b = { label: cohortTop!.has(r.edition_id) ? "TS-50 (top 50)" : "Rest of market", sort: cohortTop!.has(r.edition_id) ? 0 : 1 };
    else b = bucketOf(r, dim);
    if (!b) continue;
    const e = agg.get(b.label) ?? { now: 0, then: 0, eds: 0, sort: b.sort };
    e.now += r.cap_now; e.then += then; e.eds += 1; agg.set(b.label, e);
    tNow += r.cap_now; tThen += then; tEds += 1;
  }

  const minEds = opts.minEds ?? 3;
  let segments: SegmentMove[] = [...agg.entries()]
    .map(([label, e]) => ({ label, cap_now: e.now, cap_then: e.then, pct: e.then > 0 ? ((e.now - e.then) / e.then) * 100 : null, eds: e.eds, sort: e.sort }))
    .filter((s) => s.eds >= minEds);

  // player/team: rank by cap; others: natural order
  if (dim === "player" || dim === "team") segments.sort((a, b) => b.cap_now - a.cap_now);
  else segments.sort((a, b) => a.sort - b.sort);
  if (opts.topN) segments = segments.slice(0, opts.topN);

  const total: SegmentMove = {
    label: "All", cap_now: tNow, cap_then: tThen, pct: tThen > 0 ? ((tNow - tThen) / tThen) * 100 : null, eds: tEds, sort: -1,
  };
  return { segments, total };
}
