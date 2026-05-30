// Per-player market-cap move over an ARBITRARY window.
//
// Why this exists: the player_movers(window_days) RPC times out at request time,
// and only 15d/30d mover MVs are materialized — so longer windows never updated.
// market_caps has deep daily history (2024 → present), so we compute each
// player's cap then-vs-now directly. Bounded + chunked (no broad IN that
// times out), cap-based (sane magnitudes, not transaction-average noise), and
// parametric on any window so every time-scale produces distinct numbers.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface MoverItem {
  player_id: string;
  player_name: string | null;
  pct_change: number;
}

export interface PlayerWindowMoves {
  // player_id → % cap move over the window (null-absent = no comparable snapshot)
  moves: Record<string, number>;
  latest_date: string | null;
  prior_date: string | null;
}

const TOP_PLAYERS = 60; // map shows 40; extra headroom for gainers/losers
const ED_CHUNK = 80; // edition_ids per market_caps request (URL-length safe)

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

    // 2. Prior snapshot at-or-before (latest - windowDays).
    const targetIso = isoMinusDays(latestDate, windowDays);
    const { data: priorRow } = await sb
      .from("market_caps")
      .select("date")
      .lte("date", targetIso)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const priorDate = (priorRow as { date: string } | null)?.date ?? null;
    if (!priorDate || priorDate === latestDate) {
      return { moves: {}, latest_date: latestDate, prior_date: priorDate };
    }

    // 3. Top players by current cap.
    const { data: topRows } = await sb
      .from("mv_player_market_cap")
      .select("player_id")
      .order("total_market_cap_usd", { ascending: false })
      .limit(TOP_PLAYERS);
    const playerIds = ((topRows as { player_id: string }[] | null) ?? []).map((r) => r.player_id);
    if (playerIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: priorDate };

    // 4. Their editions → edition→player map.
    const { data: edRows } = await sb
      .from("editions")
      .select("player_id, edition_id")
      .in("player_id", playerIds);
    const editionToPlayer = new Map<string, string>();
    for (const e of (edRows as { player_id: string; edition_id: string }[] | null) ?? []) {
      editionToPlayer.set(e.edition_id, e.player_id);
    }
    const editionIds = [...editionToPlayer.keys()];
    if (editionIds.length === 0) return { moves: {}, latest_date: latestDate, prior_date: priorDate };

    // 5. market_caps for those editions on exactly the two dates — chunked.
    const chunks: string[][] = [];
    for (let i = 0; i < editionIds.length; i += ED_CHUNK) chunks.push(editionIds.slice(i, i + ED_CHUNK));
    const results = await Promise.all(
      chunks.map((c) =>
        sb
          .from("market_caps")
          .select("edition_id, date, market_cap")
          .in("date", [latestDate, priorDate])
          .in("edition_id", c),
      ),
    );

    // 6. Sum per player per date.
    const capLatest = new Map<string, number>();
    const capPrior = new Map<string, number>();
    for (const res of results) {
      for (const row of (res.data as { edition_id: string; date: string; market_cap: number | null }[] | null) ?? []) {
        const pid = editionToPlayer.get(row.edition_id);
        if (!pid || row.market_cap == null) continue;
        const target = row.date === latestDate ? capLatest : capPrior;
        target.set(pid, (target.get(pid) ?? 0) + Number(row.market_cap));
      }
    }

    // 7. pct move per player.
    const moves: Record<string, number> = {};
    for (const pid of playerIds) {
      const now = capLatest.get(pid);
      const then = capPrior.get(pid);
      if (now != null && then != null && then > 0) {
        moves[pid] = ((now - then) / then) * 100;
      }
    }
    return { moves, latest_date: latestDate, prior_date: priorDate };
  } catch (e) {
    console.error("[state-of-market] player window moves threw", e);
    return empty;
  }
}

export const getPlayerWindowMoves = (windowDays: number) =>
  unstable_cache(
    () => _getPlayerWindowMoves(windowDays),
    ["som-player-window-moves", String(windowDays)],
    { revalidate: 300, tags: ["player-window-moves", "market_caps"] },
  )();
