// Slice Lab — market-cap move (%) sliced by many dimensions, to find cuts with
// signal (not the all-negative blob the player view shows in a bear window).
//
// Same proven engine as player-moves: top-N players' editions, paginated band
// reads (no row-cap truncation), per-edition outlier guard. Here we aggregate the
// now/then caps by dimension (tier / price band / scarcity / series / team) and
// report each bucket's cap-weighted % move. It's a blue-chip-universe sample
// (top players), enough to see which slices diverge.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface Slice {
  label: string;
  cap_now: number;
  pct: number; // cap-weighted % move over the window
  editions: number;
  order: number; // stable sort hint
}
export interface SliceMoves {
  byTier: Slice[];
  byPriceBand: Slice[];
  byScarcity: Slice[];
  bySeries: Slice[];
  byTeam: Slice[];
  latest_date: string | null;
  prior_date: string | null;
}

const TOP_PLAYERS = 120;
const PAGE = 1000;

function isoMinusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const TIER_ORDER: Record<string, number> = { Common: 0, Fandom: 1, Rare: 2, Legendary: 3, Ultimate: 4 };

function priceBand(cap: number): { label: string; order: number } {
  if (cap < 50) return { label: "< $50", order: 0 };
  if (cap < 250) return { label: "$50–250", order: 1 };
  if (cap < 1000) return { label: "$250–1K", order: 2 };
  if (cap < 5000) return { label: "$1K–5K", order: 3 };
  if (cap < 25000) return { label: "$5K–25K", order: 4 };
  return { label: "$25K+", order: 5 };
}
function scarcityBand(mint: number | null): { label: string; order: number } {
  if (mint == null) return { label: "Unknown", order: 9 };
  if (mint <= 1) return { label: "1-of-1", order: 0 };
  if (mint <= 25) return { label: "/25", order: 1 };
  if (mint <= 99) return { label: "/99", order: 2 };
  if (mint <= 499) return { label: "/499", order: 3 };
  if (mint <= 4999) return { label: "/4,999", order: 4 };
  return { label: "5,000+", order: 5 };
}

interface EdMeta {
  player_id: string;
  tier_name: string | null;
  mint_count: number | null;
  set_id: string | null;
  team: string | null;
}

async function _getSliceMoves(windowDays: number): Promise<SliceMoves> {
  const empty: SliceMoves = { byTier: [], byPriceBand: [], byScarcity: [], bySeries: [], byTeam: [], latest_date: null, prior_date: null };
  const sb = getSupabaseServerAnon();
  if (!sb) return empty;
  try {
    const { data: latestRow } = await sb.from("market_caps").select("date").order("date", { ascending: false }).limit(1).maybeSingle();
    const latestDate = (latestRow as { date: string } | null)?.date ?? null;
    if (!latestDate) return empty;
    const { data: earliestRow } = await sb.from("market_caps").select("date").order("date", { ascending: true }).limit(1).maybeSingle();
    const earliestDate = (earliestRow as { date: string } | null)?.date ?? latestDate;
    let targetIso = isoMinusDays(latestDate, windowDays);
    if (targetIso < earliestDate) targetIso = earliestDate;
    if (targetIso >= latestDate) return { ...empty, latest_date: latestDate, prior_date: targetIso };
    const nowFrom = isoMinusDays(latestDate, 9);
    const thenFrom = isoMinusDays(targetIso, 25);

    const { data: topRows } = await sb.from("mv_player_market_cap").select("player_id")
      .order("total_market_cap_usd", { ascending: false }).limit(TOP_PLAYERS);
    const playerIds = ((topRows as { player_id: string }[] | null) ?? []).map((r) => r.player_id);
    if (playerIds.length === 0) return { ...empty, latest_date: latestDate, prior_date: targetIso };

    // Editions WITH slice metadata — paginated (server caps at 1000).
    const edMeta = new Map<string, EdMeta>();
    for (let off = 0; off < 40000; off += PAGE) {
      const { data } = await sb.from("editions")
        .select("edition_id, player_id, tier_name, mint_count, set_id, team_at_moment_current_name")
        .in("player_id", playerIds).order("edition_id", { ascending: true }).range(off, off + PAGE - 1);
      const rows = (data as Record<string, unknown>[] | null) ?? [];
      for (const e of rows) edMeta.set(String(e.edition_id), {
        player_id: String(e.player_id),
        tier_name: e.tier_name == null ? null : String(e.tier_name),
        mint_count: e.mint_count == null ? null : Number(e.mint_count),
        set_id: e.set_id == null ? null : String(e.set_id),
        team: e.team_at_moment_current_name == null ? null : String(e.team_at_moment_current_name),
      });
      if (rows.length < PAGE) break;
    }
    const editionIds = [...edMeta.keys()];
    if (editionIds.length === 0) return { ...empty, latest_date: latestDate, prior_date: targetIso };

    // set_id → series_number
    const setIds = [...new Set([...edMeta.values()].map((m) => m.set_id).filter((s): s is string => !!s))];
    const seriesBySet = new Map<string, number | null>();
    for (let i = 0; i < setIds.length; i += 200) {
      const { data } = await sb.from("sets").select("set_id, series_number").in("set_id", setIds.slice(i, i + 200));
      for (const s of (data as { set_id: string; series_number: number | null }[] | null) ?? []) seriesBySet.set(s.set_id, s.series_number);
    }

    // Paginated band reads.
    type Row = { edition_id: string; date: string; market_cap: number | null };
    const fetchBand = async (c: string[], from: string, to: string): Promise<Row[]> => {
      const out: Row[] = [];
      for (let off = 0; off < 40000; off += PAGE) {
        const { data } = await sb.from("market_caps").select("edition_id, date, market_cap")
          .gte("date", from).lte("date", to).in("edition_id", c)
          .order("edition_id", { ascending: true }).order("date", { ascending: true }).range(off, off + PAGE - 1);
        const batch = (data as Row[] | null) ?? [];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      return out;
    };
    const chunks: string[][] = [];
    for (let i = 0; i < editionIds.length; i += 120) chunks.push(editionIds.slice(i, i + 120));
    const [nowChunks, thenChunks] = await Promise.all([
      Promise.all(chunks.map((c) => fetchBand(c, nowFrom, latestDate))),
      Promise.all(chunks.map((c) => fetchBand(c, thenFrom, targetIso))),
    ]);
    const pick = (lists: Row[][]) => {
      const best = new Map<string, { date: string; val: number }>();
      for (const list of lists) for (const r of list) {
        if (r.market_cap == null) continue;
        const cur = best.get(r.edition_id);
        if (!cur || r.date > cur.date) best.set(r.edition_id, { date: r.date, val: Number(r.market_cap) });
      }
      return best;
    };
    const nowByEd = pick(nowChunks);
    const thenByEd = pick(thenChunks);

    // Aggregate now/then by each dimension (outlier-guarded per edition).
    type Agg = Map<string, { now: number; then: number; n: number; order: number }>;
    const tier: Agg = new Map(), band: Agg = new Map(), scar: Agg = new Map(), series: Agg = new Map(), team: Agg = new Map();
    const add = (agg: Agg, key: string, order: number, now: number, then: number) => {
      const a = agg.get(key) ?? { now: 0, then: 0, n: 0, order };
      a.now += now; a.then += then; a.n += 1; agg.set(key, a);
    };
    for (const [eid, meta] of edMeta.entries()) {
      const now = nowByEd.get(eid)?.val;
      const then = thenByEd.get(eid)?.val;
      if (now == null || then == null || then <= 0) continue;
      const ratio = now / then;
      if (ratio > 5 || ratio < 0.2) continue; // stuck-listing / artifact guard
      add(tier, meta.tier_name ?? "Unknown", TIER_ORDER[meta.tier_name ?? ""] ?? 8, now, then);
      const pb = priceBand(now); add(band, pb.label, pb.order, now, then);
      const sc = scarcityBand(meta.mint_count); add(scar, sc.label, sc.order, now, then);
      const sn = meta.set_id ? seriesBySet.get(meta.set_id) : null;
      add(series, sn != null ? `Series ${sn}` : "Unknown", sn ?? 99, now, then);
      if (meta.team) add(team, meta.team, 0, now, then);
    }
    const toSlices = (agg: Agg, sortByCap = false): Slice[] => {
      const out = [...agg.entries()].map(([label, a]) => ({
        label, cap_now: a.now, pct: a.then > 0 ? ((a.now - a.then) / a.then) * 100 : 0, editions: a.n, order: a.order,
      })).filter((s) => s.editions >= 3); // drop tiny buckets
      out.sort((x, y) => (sortByCap ? y.cap_now - x.cap_now : x.order - y.order));
      return out;
    };
    return {
      byTier: toSlices(tier),
      byPriceBand: toSlices(band),
      byScarcity: toSlices(scar),
      bySeries: toSlices(series),
      byTeam: toSlices(team, true).slice(0, 12),
      latest_date: latestDate,
      prior_date: targetIso,
    };
  } catch (e) {
    console.error("[state-of-market] slice moves threw", e);
    return empty;
  }
}

export const getSliceMoves = (windowDays: number) =>
  unstable_cache(
    () => _getSliceMoves(windowDays),
    ["som-slice-moves-v1", String(windowDays)],
    { revalidate: 300, tags: ["slice-moves", "market_caps"] },
  )();
