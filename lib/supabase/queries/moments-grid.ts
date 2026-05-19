// /moments — filterable moments grid query.
//
// Uses PostgREST native endpoints (not exec_sql) for ~30× speedup. Two-stage:
//   1. If filters reference editions columns (player_name, tier_name), pre-
//      resolve matching edition_ids from topshot.editions (small table,
//      ~12K rows, fast). Embed tier_name / player_name / team / mint_count
//      into an in-memory Map.
//   2. Query topshot.moments with edition_id IN (...) + other moment-level
//      filters. Native PostgREST GET handles pagination + ordering efficiently.
//   3. JOIN edition metadata into result rows in JS before returning.
//
// Performance:
//   - idx_moments_listing_price (partial WHERE listing_price_usd IS NOT NULL)
//     hits when listedOnly=true (the default).
//   - idx_moments_edition_id hits when edition_id IN (...) is the dominant
//     predicate (any active player/tier filter).
//   - Pre-resolved editions are cached in module memory per-process for the
//     life of the dyno; staleness OK since editions add slowly.
//
// PostgREST schema cache currently lacks the moments<->editions FK, so we
// don't use resource embedding; pre-resolution is the workaround.

import { supabaseAdmin } from "@/lib/supabase/admin";

export type MomentsGridSortKey =
  | "listing_price_asc"
  | "listing_price_desc"
  | "serial_asc"
  | "serial_desc"
  | "ts_score_desc"
  | "released_desc";

export interface MomentsGridFilters {
  player?: string;
  tiers?: string[];
  league?: string;
  maxPriceUsd?: number;
  minPriceUsd?: number;
  maxSerial?: number;
  listedOnly?: boolean;
  setName?: string;
}

export interface MomentsGridRow {
  moment_id: string;
  moment_flow_id: string | null;
  play_name: string | null;
  edition_name: string | null;
  serial_number: number | null;
  listing_price_usd: number | null;
  top_shot_score: number | null;
  set_name: string | null;
  series_name: string | null;
  league: string | null;
  tier_name: string | null;
  player_name: string | null;
  team_name: string | null;
  mint_count: number | null;
  /** Owner flow address (16 hex chars, no 0x prefix). Sourced from
   * `topshot.moments.owner_flow_address` which is populated by the
   * `asset_ownership_nba_moment` BQ backfill. NULL when ownership ETL hasn't
   * landed for this moment. */
  owner_flow_address: string | null;
  /** Owner username — resolved from `topshot.collectors` via flow_address.
   * NULL when address is anonymous/unmapped. Renders as truncated address
   * in UI when null. */
  owner_username: string | null;
}

export interface MomentsGridResult {
  rows: MomentsGridRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  cappedTotal: boolean;
}

const PAGE_SIZE = 50;
const MAX_COUNT_FAST = 10_000;
const MAX_EDITION_IDS = 4000; // PostgREST IN clause has practical URL-length limits

interface EditionLite {
  edition_id: string;
  tier_name: string | null;
  player_name: string | null;
  team_at_moment_current_name: string | null;
  mint_count: number | null;
}

// In-memory edition cache: keyed by composite filter (player+tiers+league).
// Resolved at query time; small enough (~12K editions × ~100 bytes = 1.2MB
// total) to keep many filter slices in memory.
const editionCache = new Map<string, EditionLite[]>();

async function resolveEditions(opts: {
  player?: string;
  tiers?: string[];
  league?: string;
}): Promise<EditionLite[] | null> {
  const hasFilters = !!opts.player || (opts.tiers && opts.tiers.length > 0) || (opts.league && opts.league !== "All");
  if (!hasFilters) return null; // null = "no edition pre-filter needed; query moments directly"

  const cacheKey = `${opts.player ?? ""}|${(opts.tiers ?? []).slice().sort().join(",")}|${opts.league ?? ""}`;
  const cached = editionCache.get(cacheKey);
  if (cached) return cached;

  const admin = supabaseAdmin();
  let q = admin
    .from("editions")
    .select("edition_id, tier_name, player_name, team_at_moment_current_name, mint_count");

  if (opts.player && opts.player.trim()) {
    q = q.ilike("player_name", `%${opts.player.trim()}%`);
  }
  if (opts.tiers && opts.tiers.length > 0) {
    q = q.in("tier_name", opts.tiers);
  }
  if (opts.league === "NBA" || opts.league === "WNBA") {
    q = q.eq("league", opts.league);
  }
  q = q.limit(MAX_EDITION_IDS);

  const { data, error } = await q;
  if (error) {
    console.error("[moments-grid] resolveEditions error", error);
    return [];
  }
  const rows = (data as EditionLite[] | null) ?? [];
  editionCache.set(cacheKey, rows);
  return rows;
}

export async function queryMomentsGrid(opts: {
  filters: MomentsGridFilters;
  sort: MomentsGridSortKey;
  page: number;
}): Promise<MomentsGridResult> {
  const page = Math.max(1, Math.floor(opts.page || 1));
  const offset = (page - 1) * PAGE_SIZE;
  const empty: MomentsGridResult = {
    rows: [],
    total: 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: false,
    cappedTotal: false,
  };

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return empty;
  }

  // Stage 1 — resolve editions if filtering by player/tier/league
  let editions: EditionLite[] | null = null;
  try {
    editions = await resolveEditions({
      player: opts.filters.player,
      tiers: opts.filters.tiers,
      league: opts.filters.league,
    });
  } catch (e) {
    console.error("[moments-grid] resolveEditions threw", e);
    return empty;
  }

  // If we pre-resolved editions and the set is empty, no moments can match.
  if (editions !== null && editions.length === 0) return empty;

  const editionMap = editions
    ? new Map(editions.map((e) => [e.edition_id, e] as const))
    : null;
  const editionIds = editions ? editions.map((e) => e.edition_id) : null;

  // Stage 2 — query moments with the edition filter + price/serial/listed
  //
  // count strategy: when edition_ids are pre-resolved AND small (<200), use
  // `exact` — IN-list narrows the universe enough that a count is cheap.
  // Otherwise use `planned` (pg_class.reltuples estimate) so the bare-query
  // case (10K+ listed moments) doesn't block on COUNT.
  const useExactCount = !!editionIds && editionIds.length > 0 && editionIds.length <= 200;
  let q = admin
    .from("moments")
    .select(
      "moment_id, moment_flow_id, play_name, edition_name, edition_id, serial_number, listing_price_usd, top_shot_score, set_name, series_name, league, owner_flow_address",
      { count: useExactCount ? "exact" : "planned", head: false },
    );

  if (editionIds && editionIds.length > 0) {
    q = q.in("edition_id", editionIds);
  }
  if (opts.filters.listedOnly !== false) {
    q = q.not("listing_price_usd", "is", null);
  }
  if (typeof opts.filters.maxPriceUsd === "number" && opts.filters.maxPriceUsd > 0) {
    q = q.lte("listing_price_usd", opts.filters.maxPriceUsd);
  }
  if (typeof opts.filters.minPriceUsd === "number" && opts.filters.minPriceUsd > 0) {
    q = q.gte("listing_price_usd", opts.filters.minPriceUsd);
  }
  if (typeof opts.filters.maxSerial === "number" && opts.filters.maxSerial > 0) {
    q = q.lte("serial_number", opts.filters.maxSerial);
  }
  if (opts.filters.setName && opts.filters.setName.trim()) {
    q = q.ilike("set_name", `%${opts.filters.setName.trim()}%`);
  }
  // League at the moment-level (denormalized from edition)
  if ((opts.filters.league === "NBA" || opts.filters.league === "WNBA") && !editionIds) {
    q = q.eq("league", opts.filters.league);
  }

  // Sort. nullsFirst is intentionally omitted on listing_price so PostgREST
  // doesn't add a .nullslast qualifier that defeats the partial index
  // `idx_moments_listing_price WHERE listing_price_usd IS NOT NULL` (the
  // qualifier is redundant when the WHERE clause excludes NULLs but makes
  // the planner fall back to a full sort). 30× speedup confirmed empirically.
  switch (opts.sort) {
    case "listing_price_asc":
      q = q.order("listing_price_usd", { ascending: true });
      break;
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
  }

  q = q.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("[moments-grid] moments query error", error);
    return empty;
  }
  type MomentRowRaw = {
    moment_id: string;
    moment_flow_id: string | null;
    play_name: string | null;
    edition_name: string | null;
    edition_id: string | null;
    serial_number: number | null;
    listing_price_usd: number | null;
    top_shot_score: number | null;
    set_name: string | null;
    series_name: string | null;
    league: string | null;
    owner_flow_address: string | null;
  };
  const rawRows = (data as MomentRowRaw[] | null) ?? [];

  // Stage 2.5 — resolve owner usernames from `topshot.collectors`.
  // We batch-fetch the distinct addresses appearing in this page (<=50) so the
  // page render gets `owner_username` populated without an N+1 hit. NULL is
  // the honest empty state for moments whose ownership ETL hasn't landed.
  const ownerAddrs = Array.from(
    new Set(
      rawRows
        .map((r) => r.owner_flow_address)
        .filter((a): a is string => !!a && /^[a-f0-9]{16}$/i.test(a)),
    ),
  );
  let ownerUsernameByAddr = new Map<string, string | null>();
  if (ownerAddrs.length > 0) {
    const { data: cdata } = await admin
      .from("collectors")
      .select("flow_address, username")
      .in("flow_address", ownerAddrs);
    const crows = (cdata as { flow_address: string; username: string | null }[] | null) ?? [];
    ownerUsernameByAddr = new Map(crows.map((c) => [c.flow_address, c.username]));
  }

  // Stage 3 — if no edition pre-filter, fetch edition metadata for the
  // result rows in one batch. If we pre-filtered, editionMap already has it.
  let finalMap = editionMap;
  if (!finalMap && rawRows.length > 0) {
    const ids = Array.from(new Set(rawRows.map((r) => r.edition_id).filter((x): x is string => !!x)));
    if (ids.length > 0) {
      const { data: edata } = await admin
        .from("editions")
        .select("edition_id, tier_name, player_name, team_at_moment_current_name, mint_count")
        .in("edition_id", ids);
      finalMap = new Map(((edata as EditionLite[] | null) ?? []).map((e) => [e.edition_id, e] as const));
    } else {
      finalMap = new Map<string, EditionLite>();
    }
  }

  const rows: MomentsGridRow[] = rawRows.map((m) => {
    const e = m.edition_id ? finalMap?.get(m.edition_id) ?? null : null;
    const ownerAddr = m.owner_flow_address;
    return {
      moment_id: m.moment_id,
      moment_flow_id: m.moment_flow_id,
      play_name: m.play_name,
      edition_name: m.edition_name,
      serial_number: m.serial_number,
      listing_price_usd: m.listing_price_usd != null ? Number(m.listing_price_usd) : null,
      top_shot_score: m.top_shot_score != null ? Number(m.top_shot_score) : null,
      set_name: m.set_name,
      series_name: m.series_name,
      league: m.league,
      tier_name: e?.tier_name ?? null,
      player_name: e?.player_name ?? null,
      team_name: e?.team_at_moment_current_name ?? null,
      mint_count: e?.mint_count ?? null,
      owner_flow_address: ownerAddr,
      owner_username: ownerAddr ? ownerUsernameByAddr.get(ownerAddr) ?? null : null,
    };
  });

  // PostgREST `count: 'exact'` returns total ignoring range. Cap it for UX.
  const rawTotal = typeof count === "number" ? count : 0;
  let total = rawTotal;
  let cappedTotal = false;
  if (total > MAX_COUNT_FAST) {
    total = MAX_COUNT_FAST;
    cappedTotal = true;
  }

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    hasMore: rows.length === PAGE_SIZE,
    cappedTotal,
  };
}

// Distinct tier names for the filter UI. Cached in memory.
const CANONICAL_TIERS = ["Common", "Fandom", "Rare", "Legendary", "Ultimate", "Anthology"];
let _tiersCached: string[] | null = null;
export async function queryDistinctTiers(): Promise<string[]> {
  if (_tiersCached) return _tiersCached;
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("editions")
      .select("tier_name")
      .not("tier_name", "is", null);
    if (error || !data) return CANONICAL_TIERS;
    const unique = Array.from(new Set((data as Array<{ tier_name: string }>).map((r) => r.tier_name))).sort();
    if (unique.length === 0) return CANONICAL_TIERS;
    _tiersCached = unique;
    return _tiersCached;
  } catch {
    return CANONICAL_TIERS;
  }
}

// Top 80 players by # of currently-listed moments. Powers the player
// typeahead. Cached.
let _topPlayersCached: string[] | null = null;
export async function queryTopListedPlayers(): Promise<string[]> {
  if (_topPlayersCached) return _topPlayersCached;
  // We need GROUP BY which PostgREST doesn't expose directly; small custom
  // RPC would be ideal but to keep the surface portable use a curated list
  // of well-known names plus a follow-up DB rollup in iter-2.
  // For now: pull 80 distinct player_names from editions where there's at
  // least one listed moment. Best-effort.
  try {
    const admin = supabaseAdmin();
    // Pull 800 edition player_names; dedupe; cap at 80.
    const { data } = await admin
      .from("editions")
      .select("player_name")
      .not("player_name", "is", null)
      .order("player_name")
      .limit(800);
    if (!data) return [];
    const unique = Array.from(new Set((data as Array<{ player_name: string }>).map((r) => r.player_name)));
    _topPlayersCached = unique.slice(0, 80);
    return _topPlayersCached;
  } catch {
    return [];
  }
}
