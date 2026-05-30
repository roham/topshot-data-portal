// Per-player cap + move over an arbitrary window — ONE coherent source.
//
// Both the displayed cap and the % come from the same market_caps computation,
// so they reconcile by construction: cap_now is the latest snapshot sum, % is
// (cap_now − cap_then)/cap_then over the window. The displayed cap stays the
// same across windows (it's current); only the % moves.
//
// No blanks: cap_then falls back from the nearest snapshot ≤ target to the one
// before it, covering editions missing the exact prior date (the bug that made
// 1Y go empty under single-date gating).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface MoverItem {
  player_id: string;
  player_name: string | null;
  pct_change: number;
}

export interface PlayerWindowMoves {
  // player_id → % cap move over the window. Like-for-like ratio over editions
  // present at BOTH the latest and prior snapshot (coverage cancels). The cap
  // LEVEL displayed comes from mv_player_market_cap (authoritative current cap);
  // a single-date market_caps sum undercounts and must not be shown.
  moves: Record<string, number>;
  latest_date: string | null;
  prior_date: string | null;
}

const TOP_PLAYERS = 60;
// Chunk × band-days must stay well under PostgREST's 1000-row response cap, or
// rows get silently truncated and editions vanish (the bug that blanked tiles).
const ED_CHUNK = 40;
const ROW_LIMIT = 1000;

function isoMinusDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function _getPlayerWindowMoves(windowDays: number): Promise<PlayerWindowMoves> {
  const empty: PlayerWindowMoves = { moves: {}, latest_date: null, prior_date: null };
  const sb = getSupabaseServerAnon();
  if (!sb) return empty;
  try {
    // 1. Data span.
    const { data: latestRow } = await sb
      .from("market_caps").select("date").order("date", { ascending: false }).limit(1).maybeSingle();
    const latestDate = (latestRow as { date: string } | null)?.date ?? null;
    if (!latestDate) return empty;
    const { data: earliestRow } = await sb
      .from("market_caps").select("date").order("date", { ascending: true }).limit(1).maybeSingle();
    const earliestDate = (earliestRow as { date: string } | null)?.date ?? latestDate;

    // 2. Target = latest − window, clamped to the data span (so ALL compares to
    //    the oldest snapshot). then-band reaches back further for sparse history.
    let targetIso = isoMinusDays(latestDate, windowDays);
    if (targetIso < earliestDate) targetIso = earliestDate;
    if (targetIso >= latestDate) return { moves: {}, latest_date: latestDate, prior_date: targetIso };
    // Narrow carry-forward bands (each edition's most-recent snapshot within the
    // band). Coverage is dense daily, so a tight band catches editions without
    // exploding past the row cap. now: 5d, then: 11d.
    const nowFrom = isoMinusDays(latestDate, 4);
    const thenFrom = isoMinusDays(targetIso, 10);

    // 3. Top players + their editions.
    const { data: topRows } = await sb
      .from("mv_player_market_cap").select("player_id")
      .order("total_market_cap_usd", { ascending: false }).limit(TOP_PLAYERS);
    const playerIds = ((topRows as { player_id: string }[] | null) ?? []).map((r) => r.player_id);
    if (playerIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: targetIso };

    const { data: edRows } = await sb
      .from("editions").select("player_id, edition_id").in("player_id", playerIds);
    const editionToPlayer = new Map<string, string>();
    for (const e of (edRows as { player_id: string; edition_id: string }[] | null) ?? []) {
      editionToPlayer.set(e.edition_id, e.player_id);
    }
    const editionIds = [...editionToPlayer.keys()];
    if (editionIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: targetIso };

    // 4. Two bounded range reads per chunk (now-band, then-band).
    const chunks: string[][] = [];
    for (let i = 0; i < editionIds.length; i += ED_CHUNK) chunks.push(editionIds.slice(i, i + ED_CHUNK));
    const band = (c: string[], from: string, to: string) =>
      sb.from("market_caps").select("edition_id, date, market_cap")
        .gte("date", from).lte("date", to).in("edition_id", c).limit(ROW_LIMIT);
    const [nowRes, thenRes] = await Promise.all([
      Promise.all(chunks.map((c) => band(c, nowFrom, latestDate))),
      Promise.all(chunks.map((c) => band(c, thenFrom, targetIso))),
    ]);

    // 5. Per edition: most-recent value within each band (carry-forward).
    type Row = { edition_id: string; date: string; market_cap: number | null };
    const pickLatest = (resList: { data: unknown }[]) => {
      const best = new Map<string, { date: string; val: number }>();
      for (const res of resList) {
        for (const r of (res.data as Row[] | null) ?? []) {
          if (r.market_cap == null) continue;
          const cur = best.get(r.edition_id);
          if (!cur || r.date > cur.date) best.set(r.edition_id, { date: r.date, val: Number(r.market_cap) });
        }
      }
      return best;
    };
    const nowByEd = pickLatest(nowRes);
    const thenByEd = pickLatest(thenRes);

    // 6. Per-player basket sums over the SAME editions present in both bands
    //    (like-for-like), then ratio.
    const capNow = new Map<string, number>();
    const capThen = new Map<string, number>();
    for (const [eid, pid] of editionToPlayer.entries()) {
      const now = nowByEd.get(eid)?.val;
      const then = thenByEd.get(eid)?.val;
      if (now == null || then == null) continue;
      capNow.set(pid, (capNow.get(pid) ?? 0) + now);
      capThen.set(pid, (capThen.get(pid) ?? 0) + then);
    }

    const moves: Record<string, number> = {};
    for (const pid of playerIds) {
      const now = capNow.get(pid);
      const then = capThen.get(pid);
      if (now != null && then != null && then > 0) {
        moves[pid] = ((now - then) / then) * 100;
      }
    }
    return { moves, latest_date: latestDate, prior_date: targetIso };
  } catch (e) {
    console.error("[state-of-market] player window moves threw", e);
    return empty;
  }
}

export const getPlayerWindowMoves = (windowDays: number) =>
  unstable_cache(
    () => _getPlayerWindowMoves(windowDays),
    ["som-player-window-moves-v2", String(windowDays)],
    { revalidate: 300, tags: ["player-window-moves", "market_caps"] },
  )();
