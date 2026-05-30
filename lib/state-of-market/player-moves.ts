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

const TOP_PLAYERS = 50;
const ED_CHUNK = 120;
const PAGE = 1000; // PostgREST row cap per request — paginate past it, don't truncate
const EDITIONS_LIMIT = 20000;

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

    // 2. Target = latest − window, clamped to the data span.
    let targetIso = isoMinusDays(latestDate, windowDays);
    if (targetIso < earliestDate) targetIso = earliestDate;
    if (targetIso >= latestDate) return { moves: {}, latest_date: latestDate, prior_date: targetIso };

    // 2b. Carry-forward BANDS — each edition's most-recent snapshot within a band
    //     (per-edition nearest; global exact dates miss because editions snapshot
    //     on different days). Read with PAGINATION so the 1000-row cap can't
    //     truncate dense bands (that truncation was the blank cause).
    const nowFrom = isoMinusDays(latestDate, 9);
    const thenFrom = isoMinusDays(targetIso, 25);

    // 3. Top players + their editions (override the 1000-row default).
    const { data: topRows } = await sb
      .from("mv_player_market_cap").select("player_id")
      .order("total_market_cap_usd", { ascending: false }).limit(TOP_PLAYERS);
    const playerIds = ((topRows as { player_id: string }[] | null) ?? []).map((r) => r.player_id);
    if (playerIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: targetIso };

    // PAGINATE — the server enforces max-rows=1000 regardless of .limit(), so a
    // single read silently drops 2/3 of the editions (the actual blank cause).
    const editionToPlayer = new Map<string, string>();
    for (let off = 0; off < EDITIONS_LIMIT; off += PAGE) {
      const { data } = await sb
        .from("editions").select("player_id, edition_id").in("player_id", playerIds)
        .order("edition_id", { ascending: true }).range(off, off + PAGE - 1);
      const rows = (data as { player_id: string; edition_id: string }[] | null) ?? [];
      for (const e of rows) editionToPlayer.set(e.edition_id, e.player_id);
      if (rows.length < PAGE) break;
    }
    const editionIds = [...editionToPlayer.keys()];
    if (editionIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: targetIso };

    // 4. Paginated band read per chunk → every row, no cap truncation.
    type Row = { edition_id: string; date: string; market_cap: number | null };
    const fetchBand = async (c: string[], from: string, to: string): Promise<Row[]> => {
      const out: Row[] = [];
      for (let off = 0; off < 20000; off += PAGE) {
        const { data } = await sb.from("market_caps").select("edition_id, date, market_cap")
          .gte("date", from).lte("date", to).in("edition_id", c)
          .order("edition_id", { ascending: true }).order("date", { ascending: true })
          .range(off, off + PAGE - 1);
        const batch = (data as Row[] | null) ?? [];
        out.push(...batch);
        if (batch.length < PAGE) break;
      }
      return out;
    };
    const chunks: string[][] = [];
    for (let i = 0; i < editionIds.length; i += ED_CHUNK) chunks.push(editionIds.slice(i, i + ED_CHUNK));
    const [nowChunks, thenChunks] = await Promise.all([
      Promise.all(chunks.map((c) => fetchBand(c, nowFrom, latestDate))),
      Promise.all(chunks.map((c) => fetchBand(c, thenFrom, targetIso))),
    ]);

    // 5. Per edition: most-recent value within each band (carry-forward).
    const pickLatest = (lists: Row[][]) => {
      const best = new Map<string, { date: string; val: number }>();
      for (const list of lists) for (const r of list) {
        if (r.market_cap == null) continue;
        const cur = best.get(r.edition_id);
        if (!cur || r.date > cur.date) best.set(r.edition_id, { date: r.date, val: Number(r.market_cap) });
      }
      return best;
    };
    const nowByEd = pickLatest(nowChunks);
    const thenByEd = pickLatest(thenChunks);

    // 6. Per-player basket sums over editions present in both bands → ratio.
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
