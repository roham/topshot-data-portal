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
const ED_CHUNK = 80;

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
    // 1. Latest snapshot date.
    const { data: latestRow } = await sb
      .from("market_caps")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestDate = (latestRow as { date: string } | null)?.date ?? null;
    if (!latestDate) return empty;

    // 2. Two prior candidate dates ≤ (latest − window). Two so editions missing
    //    the nearest one fall back to the next — no per-player blanks.
    const targetIso = isoMinusDays(latestDate, windowDays);
    const { data: p1 } = await sb
      .from("market_caps").select("date").lte("date", targetIso)
      .order("date", { ascending: false }).limit(1).maybeSingle();
    const prior1 = (p1 as { date: string } | null)?.date ?? null;
    if (!prior1 || prior1 === latestDate) return { moves: {}, latest_date: latestDate, prior_date: prior1 };
    const { data: p2 } = await sb
      .from("market_caps").select("date").lt("date", prior1)
      .order("date", { ascending: false }).limit(1).maybeSingle();
    const prior2 = (p2 as { date: string } | null)?.date ?? null;

    // 3. Top players + their editions.
    const { data: topRows } = await sb
      .from("mv_player_market_cap").select("player_id")
      .order("total_market_cap_usd", { ascending: false }).limit(TOP_PLAYERS);
    const playerIds = ((topRows as { player_id: string }[] | null) ?? []).map((r) => r.player_id);
    if (playerIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: prior1 };

    const { data: edRows } = await sb
      .from("editions").select("player_id, edition_id").in("player_id", playerIds);
    const editionToPlayer = new Map<string, string>();
    for (const e of (edRows as { player_id: string; edition_id: string }[] | null) ?? []) {
      editionToPlayer.set(e.edition_id, e.player_id);
    }
    const editionIds = [...editionToPlayer.keys()];
    if (editionIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: prior1 };

    // 4. Caps at the three candidate dates, chunked.
    const dates = [latestDate, prior1, prior2].filter((d): d is string => !!d);
    const chunks: string[][] = [];
    for (let i = 0; i < editionIds.length; i += ED_CHUNK) chunks.push(editionIds.slice(i, i + ED_CHUNK));
    const results = await Promise.all(
      chunks.map((c) =>
        sb.from("market_caps").select("edition_id, date, market_cap").in("date", dates).in("edition_id", c),
      ),
    );

    // 5. Per edition: now = value@latest; then = value@prior1 ?? value@prior2.
    const byEdition = new Map<string, Map<string, number>>();
    for (const res of results) {
      for (const row of (res.data as { edition_id: string; date: string; market_cap: number | null }[] | null) ?? []) {
        if (row.market_cap == null) continue;
        let m = byEdition.get(row.edition_id);
        if (!m) { m = new Map(); byEdition.set(row.edition_id, m); }
        m.set(row.date, Number(row.market_cap));
      }
    }

    // 6. Like-for-like ratio: only editions present at BOTH dates contribute to
    //    both sums, so sparse coverage cancels and the % isn't biased by it.
    const capNow = new Map<string, number>();
    const capThen = new Map<string, number>();
    for (const [eid, pid] of editionToPlayer.entries()) {
      const m = byEdition.get(eid);
      if (!m) continue;
      const now = m.get(latestDate);
      const then = m.get(prior1) ?? (prior2 ? m.get(prior2) : undefined);
      if (now == null || then == null) continue; // matched pairs only
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
    return { moves, latest_date: latestDate, prior_date: prior1 };
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
