// Market Cap Viz Landing — all 8 chart queries.
//
// Doctrine reference: research/doctrine.md v1.1 §P9, research/features/market-cap-viz-landing.md.
// All read-only against topshot.* — zero BQ at request time.
// PostgREST-native; no exec_sql (per gotcha).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

/**
 * Supabase PostgREST has a server-side max-rows cap (default 1000). To fetch
 * larger result sets we paginate via .range(from, to). This helper iterates
 * pages of `pageSize` until either an empty page is returned OR `cap` rows
 * have been accumulated.
 */
type PagedSelector<T> = (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>;
async function pagedFetch<T>(
  select: PagedSelector<T>,
  cap: number,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (all.length < cap) {
    const to = Math.min(from + pageSize - 1, cap - 1);
    const { data, error } = await select(from, to);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export interface PlayerMcapRow {
  player_id: string;
  player_name: string | null;
  team_name: string | null;
  total_market_cap_usd: number;
  edition_count: number;
}

export interface TierMcapRow {
  tier_name: string;
  total_mcap: number;
  edition_count: number;
}

export interface ParallelMcapRow {
  parallel_id: number | null;
  parallel_name: string;
  total_mcap: number;
  edition_count: number;
}

export interface SetMcapRow {
  set_id: string;
  set_name: string | null;
  series_number: number | null;
  total_mcap: number;
}

export interface TeamMcapRow {
  team_id: string | null;
  team_name: string;
  total_mcap: number;
  player_count: number;
}

export interface McapOverTimeRow {
  date: string;
  total_mcap: number;
  edition_count: number;
}

export interface MoverRow {
  player_id: string;
  player_name: string;
  earliest_mcap: number;
  latest_mcap: number;
  pct_change: number;
}

export interface ConcentrationRow {
  top_n: number;
  share_pct: number;
}

export interface MarketCapLanding {
  topPlayers: PlayerMcapRow[];
  byTier: TierMcapRow[];
  byParallel: ParallelMcapRow[];
  topSets: SetMcapRow[];
  byTeam: TeamMcapRow[];
  totalOverTime: McapOverTimeRow[];
  gainers: MoverRow[];
  losers: MoverRow[];
  concentration: ConcentrationRow[];
  asOfDate: string | null;
  /** Total mcap on latest date (sum of all market_caps.market_cap rows). Includes player-attributed AND non-player editions. */
  totalMcap: number;
  /** Player-attributed mcap (sum across mv_player_market_cap). Subset of totalMcap. */
  playerAttributedMcap: number;
  /** total editions with non-zero mcap on latest date. */
  totalEditions: number;
  /** distinct players with non-zero mcap. */
  playerCount: number;
  /** Top-10-player share of player-attributed mcap as %. */
  top10SharePct: number;
}

async function _getMarketCapLanding(): Promise<MarketCapLanding> {
  const empty: MarketCapLanding = {
    topPlayers: [],
    byTier: [],
    byParallel: [],
    topSets: [],
    byTeam: [],
    totalOverTime: [],
    gainers: [],
    losers: [],
    concentration: [],
    asOfDate: null,
    totalMcap: 0,
    playerAttributedMcap: 0,
    totalEditions: 0,
    playerCount: 0,
    top10SharePct: 0,
  };

  const sb = getSupabaseServerAnon();
  if (!sb) return empty;

  try {
    // ── Stage 1: latest date in market_caps ──────────────────────────────
    const { data: dateRow } = await sb
      .from("market_caps")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const asOfDate = dateRow?.date as string | null;
    if (!asOfDate) return empty;

    // ── Stage 2: parallel fetch — paginated to bypass PostgREST 1000-row cap ─
    const sinceDate = new Date(new Date(asOfDate).getTime() - 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const [
      topPlayersRes,
      mcCapsLatest,
      mcCapsAllDates,
      editions,
      sets,
      players,
      parallelTypesRes,
    ] = await Promise.all([
      sb
        .from("mv_player_market_cap")
        .select(
          "player_id, player_name, last_known_team_full_name, total_market_cap_usd, edition_count",
        )
        .order("total_market_cap_usd", { ascending: false })
        .limit(20),
      // NOTE: every paged query has an explicit .order(...) so .range()
      // pagination returns deterministic, balanced chunks. Without ordering,
      // PostgREST returns rows in unspecified order and pages skew toward
      // earlier-inserted rows (latest-date data ends up under-represented).
      pagedFetch<{
        edition_id: string;
        market_cap: number | string | null;
        num_moments_in_circulation: number | string | null;
        lowest_ask_price: number | string | null;
      }>(
        (from, to) =>
          sb
            .from("market_caps")
            .select(
              "edition_id, market_cap, num_moments_in_circulation, lowest_ask_price",
            )
            .eq("date", asOfDate)
            .not("market_cap", "is", null)
            .gt("market_cap", 0)
            .order("edition_id", { ascending: true })
            .range(from, to),
        50000,
      ),
      pagedFetch<{
        date: string;
        market_cap: number | string | null;
        edition_id: string;
      }>(
        (from, to) =>
          sb
            .from("market_caps")
            .select("date, market_cap, edition_id")
            .gte("date", sinceDate)
            .not("market_cap", "is", null)
            .gt("market_cap", 0)
            .order("date", { ascending: true })
            .order("edition_id", { ascending: true })
            .range(from, to),
        200000,
      ),
      pagedFetch<{
        edition_id: string;
        tier_name: string | null;
        set_id: string | null;
        parallel_id: number | null;
        player_id: string | null;
      }>(
        (from, to) =>
          sb
            .from("editions")
            .select("edition_id, tier_name, set_id, parallel_id, player_id")
            .order("edition_id", { ascending: true })
            .range(from, to),
        50000,
      ),
      pagedFetch<{
        set_id: string;
        set_name: string | null;
        series_number: number | null;
      }>(
        (from, to) =>
          sb
            .from("sets")
            .select("set_id, set_name, series_number")
            .order("set_id", { ascending: true })
            .range(from, to),
        5000,
      ),
      pagedFetch<{
        player_id: string;
        full_name: string | null;
        last_known_team_full_name: string | null;
        last_known_team_id: string | null;
      }>(
        (from, to) =>
          sb
            .from("players")
            .select(
              "player_id, full_name, last_known_team_full_name, last_known_team_id",
            )
            .order("player_id", { ascending: true })
            .range(from, to),
        10000,
      ),
      sb.from("parallel_types").select("parallel_id, name"),
    ]);

    // Wrap raw arrays into the .data-style shape the rest of the code expects
    const mcCapsLatestRes = { data: mcCapsLatest };
    const mcCapsAllDatesRes = { data: mcCapsAllDates };
    const editionsRes = { data: editions };
    const setsRes = { data: sets };
    const playersRes = { data: players };

    type TopPlayerRaw = {
      player_id: string;
      player_name: string | null;
      last_known_team_full_name: string | null;
      total_market_cap_usd: number | string | null;
      edition_count: number | string | null;
    };
    const topPlayers: PlayerMcapRow[] = ((topPlayersRes.data ?? []) as TopPlayerRaw[]).map(
      (r) =>
        ({
          player_id: r.player_id,
          player_name: r.player_name ?? null,
          team_name: r.last_known_team_full_name ?? null,
          total_market_cap_usd: Number(r.total_market_cap_usd ?? 0),
          edition_count: Number(r.edition_count ?? 0),
        }) satisfies PlayerMcapRow,
    );

    // Editions index for joining
    type EditionLite = {
      edition_id: string;
      tier_name: string | null;
      set_id: string | null;
      parallel_id: number | null;
      player_id: string | null;
    };
    const editionsRaw = (editionsRes.data ?? []) as EditionLite[];
    const editionById = new Map<string, EditionLite>(
      editionsRaw.map((e) => [
        e.edition_id,
        {
          edition_id: e.edition_id,
          tier_name: e.tier_name ?? null,
          set_id: e.set_id ?? null,
          parallel_id: e.parallel_id ?? null,
          player_id: e.player_id ?? null,
        },
      ]),
    );

    type SetLite = {
      set_id: string;
      set_name: string | null;
      series_number: number | null;
    };
    const setsRaw = (setsRes.data ?? []) as SetLite[];
    const setById = new Map<string, SetLite>(
      setsRaw.map((s) => [
        s.set_id,
        {
          set_id: s.set_id,
          set_name: s.set_name ?? null,
          series_number: s.series_number ?? null,
        },
      ]),
    );

    type PlayerLite = {
      player_id: string;
      full_name: string | null;
      last_known_team_full_name: string | null;
      last_known_team_id: string | null;
    };
    const playersRaw = (playersRes.data ?? []) as PlayerLite[];
    const playerById = new Map<string, PlayerLite>(
      playersRaw.map((p) => [
        p.player_id,
        {
          player_id: p.player_id,
          full_name: p.full_name ?? null,
          last_known_team_full_name: p.last_known_team_full_name ?? null,
          last_known_team_id: p.last_known_team_id ?? null,
        },
      ]),
    );

    type ParallelLite = { parallel_id: number; name: string };
    const parallelsRaw = (parallelTypesRes.data ?? []) as ParallelLite[];
    const parallelById = new Map<number, ParallelLite>(
      parallelsRaw.map((p) => [p.parallel_id, { parallel_id: p.parallel_id, name: p.name }]),
    );

    // Latest mcap per edition (we already filtered to asOfDate)
    type LatestMcRaw = {
      edition_id: string;
      market_cap: number | string | null;
      num_moments_in_circulation: number | string | null;
      lowest_ask_price: number | string | null;
    };
    type LatestMc = {
      edition_id: string;
      market_cap: number;
      num_moments_in_circulation: number;
      lowest_ask_price: number | null;
    };
    const latestMc: LatestMc[] = ((mcCapsLatestRes.data ?? []) as LatestMcRaw[]).map((r) => ({
      edition_id: r.edition_id,
      market_cap: Number(r.market_cap ?? 0),
      num_moments_in_circulation: Number(r.num_moments_in_circulation ?? 0),
      lowest_ask_price: r.lowest_ask_price != null ? Number(r.lowest_ask_price) : null,
    }));

    // ── Aggregation: by tier ─────────────────────────────────────────────
    const tierAgg = new Map<string, { total_mcap: number; edition_count: number }>();
    for (const mc of latestMc) {
      const ed = editionById.get(mc.edition_id);
      const tier = ed?.tier_name ?? "Unknown";
      const cur = tierAgg.get(tier) ?? { total_mcap: 0, edition_count: 0 };
      cur.total_mcap += mc.market_cap;
      cur.edition_count += 1;
      tierAgg.set(tier, cur);
    }
    const byTier: TierMcapRow[] = Array.from(tierAgg.entries())
      .map(([tier_name, v]) => ({ tier_name, ...v }))
      .sort((a, b) => b.total_mcap - a.total_mcap);

    // ── Aggregation: by parallel ────────────────────────────────────────
    const parallelAgg = new Map<
      string,
      { parallel_id: number | null; total_mcap: number; edition_count: number }
    >();
    for (const mc of latestMc) {
      const ed = editionById.get(mc.edition_id);
      let pname: string;
      let pid: number | null;
      if (ed?.parallel_id != null) {
        const p = parallelById.get(ed.parallel_id);
        pname = p?.name ?? `Parallel ${ed.parallel_id}`;
        pid = ed.parallel_id;
      } else {
        pname = "Unknown (backfill pending)";
        pid = null;
      }
      const cur = parallelAgg.get(pname) ?? {
        parallel_id: pid,
        total_mcap: 0,
        edition_count: 0,
      };
      cur.total_mcap += mc.market_cap;
      cur.edition_count += 1;
      parallelAgg.set(pname, cur);
    }
    const byParallelLive: ParallelMcapRow[] = Array.from(parallelAgg.entries())
      .map(([parallel_name, v]) => ({
        parallel_name,
        parallel_id: v.parallel_id,
        total_mcap: v.total_mcap,
        edition_count: v.edition_count,
      }))
      .sort((a, b) => b.total_mcap - a.total_mcap);

    // Augment with zero-mcap placeholder rows for every named parallel that
    // currently has 0 editions in our DB. This makes the chart show the full
    // taxonomy (Base + 22 named) as a scaffold — empty rows surface the
    // sibling-edition ETL gap honestly per doctrine §P8 (NEW DROP framing
    // for empty markets; here the "NEW DROP" framing is "ETL fill pending").
    const liveById = new Set(byParallelLive.map((p) => p.parallel_id));
    const placeholders: ParallelMcapRow[] = [];
    for (const pt of parallelsRaw) {
      if (pt.parallel_id <= 0) continue; // skip Base (0) — already in liveById
      if (!liveById.has(pt.parallel_id)) {
        placeholders.push({
          parallel_name: pt.name,
          parallel_id: pt.parallel_id,
          total_mcap: 0,
          edition_count: 0,
        });
      }
    }
    const byParallel: ParallelMcapRow[] = [...byParallelLive, ...placeholders];

    // ── Aggregation: by set (top 20) ────────────────────────────────────
    const setAgg = new Map<string, { total_mcap: number }>();
    for (const mc of latestMc) {
      const ed = editionById.get(mc.edition_id);
      const sid = ed?.set_id;
      if (!sid) continue;
      const cur = setAgg.get(sid) ?? { total_mcap: 0 };
      cur.total_mcap += mc.market_cap;
      setAgg.set(sid, cur);
    }
    const topSets: SetMcapRow[] = Array.from(setAgg.entries())
      .map(([set_id, v]) => {
        const s = setById.get(set_id);
        return {
          set_id,
          set_name: s?.set_name ?? null,
          series_number: s?.series_number ?? null,
          total_mcap: v.total_mcap,
        };
      })
      .sort((a, b) => b.total_mcap - a.total_mcap)
      .slice(0, 20);

    // ── Aggregation: by team ────────────────────────────────────────────
    const teamAgg = new Map<
      string,
      { team_id: string | null; team_name: string; total_mcap: number; players: Set<string> }
    >();
    for (const mc of latestMc) {
      const ed = editionById.get(mc.edition_id);
      const pid = ed?.player_id;
      if (!pid) continue;
      const p = playerById.get(pid);
      const teamName = p?.last_known_team_full_name ?? "Unknown";
      const teamId = p?.last_known_team_id ?? null;
      const cur =
        teamAgg.get(teamName) ?? {
          team_id: teamId,
          team_name: teamName,
          total_mcap: 0,
          players: new Set<string>(),
        };
      cur.total_mcap += mc.market_cap;
      cur.players.add(pid);
      teamAgg.set(teamName, cur);
    }
    const byTeam: TeamMcapRow[] = Array.from(teamAgg.values())
      .map((v) => ({
        team_id: v.team_id,
        team_name: v.team_name,
        total_mcap: v.total_mcap,
        player_count: v.players.size,
      }))
      .sort((a, b) => b.total_mcap - a.total_mcap)
      .slice(0, 30);

    // ── Total mcap over time ───────────────────────────────────────────
    const overTimeAgg = new Map<
      string,
      { total_mcap: number; edition_count: number }
    >();
    for (const r of mcCapsAllDatesRes.data ?? []) {
      const date = r.date as string;
      const mc = Number(r.market_cap ?? 0);
      if (mc <= 0) continue;
      const cur =
        overTimeAgg.get(date) ?? { total_mcap: 0, edition_count: 0 };
      cur.total_mcap += mc;
      cur.edition_count += 1;
      overTimeAgg.set(date, cur);
    }
    const totalOverTime: McapOverTimeRow[] = Array.from(overTimeAgg.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Movers: gainers + losers between earliest and latest date in window ─
    const dateRange =
      totalOverTime.length >= 2
        ? { from: totalOverTime[0].date, to: totalOverTime[totalOverTime.length - 1].date }
        : null;

    let gainers: MoverRow[] = [];
    let losers: MoverRow[] = [];
    if (dateRange) {
      // Per-edition mcap on earliest + latest dates
      const earliestByEd = new Map<string, number>();
      const latestByEd = new Map<string, number>();
      for (const r of mcCapsAllDatesRes.data ?? []) {
        const d = r.date as string;
        const ed = r.edition_id as string;
        const mc = Number(r.market_cap ?? 0);
        if (d === dateRange.from) earliestByEd.set(ed, mc);
        if (d === dateRange.to) latestByEd.set(ed, mc);
      }

      // Aggregate by player across editions
      const playerMover = new Map<
        string,
        { earliest: number; latest: number }
      >();
      for (const [ed, lateMc] of latestByEd) {
        const e = editionById.get(ed);
        if (!e?.player_id) continue;
        const cur =
          playerMover.get(e.player_id) ?? { earliest: 0, latest: 0 };
        cur.latest += lateMc;
        cur.earliest += earliestByEd.get(ed) ?? 0;
        playerMover.set(e.player_id, cur);
      }

      const moverRows: MoverRow[] = Array.from(playerMover.entries())
        .map(([pid, v]) => {
          const p = playerById.get(pid);
          const earliest = v.earliest;
          const latest = v.latest;
          const pct =
            earliest > 0 ? ((latest - earliest) / earliest) * 100 : 0;
          return {
            player_id: pid,
            player_name: p?.full_name ?? "Unknown",
            earliest_mcap: earliest,
            latest_mcap: latest,
            pct_change: pct,
          };
        })
        // Cut floor: only consider players with meaningful mcap (avoid noise from tiny floors)
        .filter((r) => r.latest_mcap > 1000 && Math.abs(r.pct_change) > 1);

      gainers = [...moverRows]
        .sort((a, b) => b.pct_change - a.pct_change)
        .slice(0, 8);
      losers = [...moverRows]
        .sort((a, b) => a.pct_change - b.pct_change)
        .slice(0, 8);
    }

    // ── Concentration ────────────────────────────────────────────────
    // Use top-N share from mv_player_market_cap (paged because PostgREST caps at 1000)
    const allPlayersRaw = await pagedFetch<{ total_market_cap_usd: number | string | null }>(
      (from, to) =>
        sb
          .from("mv_player_market_cap")
          .select("total_market_cap_usd")
          .order("total_market_cap_usd", { ascending: false })
          .range(from, to),
      5000,
    );
    const allMcap: number[] = allPlayersRaw.map((p) =>
      Number(p.total_market_cap_usd ?? 0),
    );
    const total = allMcap.reduce((a, b) => a + b, 0);
    const concentration: ConcentrationRow[] =
      total > 0
        ? [10, 25, 50, 100, 250, 500, 1000].map((n) => ({
            top_n: n,
            share_pct:
              (allMcap.slice(0, n).reduce((a, b) => a + b, 0) / total) * 100,
          }))
        : [];

    // Aggregate counters
    const totalMcapOnLatest = latestMc.reduce((a, b) => a + b.market_cap, 0);
    const top10Sum = allMcap.slice(0, 10).reduce((a, b) => a + b, 0);

    return {
      topPlayers,
      byTier,
      byParallel,
      topSets,
      byTeam,
      totalOverTime,
      gainers,
      losers,
      concentration,
      asOfDate,
      totalMcap: totalMcapOnLatest,
      playerAttributedMcap: total,
      totalEditions: latestMc.length,
      playerCount: allMcap.length,
      top10SharePct: total > 0 ? (top10Sum / total) * 100 : 0,
    };
  } catch (err) {
    console.error("market-cap-landing query failed:", err);
    return empty;
  }
}

export const getMarketCapLanding = unstable_cache(
  _getMarketCapLanding,
  ["market-cap-landing"],
  { revalidate: 300, tags: ["market-cap-landing"] },
);
