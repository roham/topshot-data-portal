// holders.ts — per-entity holder queries.
//
// Powers the Tier 1 visual wins that unlock once
// `topshot.moments.owner_flow_address` is populated by the BQ ownership
// backfill:
//   1. /player/[id]  — Top Holders panel (top N by COUNT(moment_id))
//   2. /set/[id]     — Per-set Top Collectors + closest-to-completion
//   3. /edition/[id] — Top Holders for THIS edition
//   4. /u/[username] — Bag (rewrite of V5 GraphQL surface)
//
// Comparable (doctrine §0.2): Glassnode supply-distribution; PSA Set Registry
// per-set leaderboard. Both surface "who holds what" as a first-class metric.
//
// Doctrine compliance:
//   P5 (parallels first-class) — holders queries optionally accept a parallel_id
//   filter so the panel can split holders by parallel (e.g. Diamond holders vs
//   Base holders). Never aggregated across parallels by default.
//   P7 (default 30D)            — N/A for holders (snapshot, not windowed).
//   P8 (opportunity framing)    — empty-state copy is "🆕 No holders yet — be
//                                 first" per the empty-states pass.
//
// All queries use the service-role admin client (PostgREST native endpoint)
// because they read across rows. They are NOT user-context queries.

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface HolderRow {
  rank: number;
  owner_flow_address: string;
  owner_username: string | null;
  owner_profile_image_url: string | null;
  moment_count: number;
}

export interface HoldersByPlayerOptions {
  player_id: string;
  limit?: number;          // default 20
  parallel_id?: number | null; // null = base (default); -1 = all parallels; number = specific
}

/** Top holders for a player, ranked by moment count.
 *
 * Returns up to `limit` rows (default 20). Each row has the owner's flow
 * address, joined username + avatar, and the count of distinct moments held.
 *
 * Strategy:
 *   1. Resolve all edition_ids for this player from `topshot.editions`.
 *   2. Aggregate `topshot.moments` rows by `owner_flow_address` filtered to
 *      those edition_ids.
 *   3. JOIN to `topshot.collectors` for display identity.
 *
 * Why client-side aggregate vs an MV: until ownership is stable, the data set
 * is small enough (<100K moments per top player) that PostgREST + native count
 * does well. If we hit a perf wall, this can be promoted to
 * `topshot.mv_holders_by_player` (refresh daily after ownership ETL).
 */
export async function getHoldersByPlayer(opts: HoldersByPlayerOptions): Promise<HolderRow[]> {
  const limit = opts.limit ?? 20;
  const admin = supabaseAdmin();

  // Step 1 — edition_ids for this player. Bounded by the parallel filter.
  let editionsQ = admin
    .from("editions")
    .select("edition_id")
    .eq("player_id", opts.player_id);
  if (opts.parallel_id !== undefined && opts.parallel_id !== -1) {
    // null treated as 0/base for now since legacy rows are NULL
    if (opts.parallel_id === null || opts.parallel_id === 0) {
      editionsQ = editionsQ.or("parallel_id.is.null,parallel_id.eq.0");
    } else {
      editionsQ = editionsQ.eq("parallel_id", opts.parallel_id);
    }
  }
  const { data: editionRows, error: editionsErr } = await editionsQ.limit(2000);
  if (editionsErr) {
    console.error("[holders] editions lookup error", editionsErr);
    return [];
  }
  const editionIds = ((editionRows as { edition_id: string }[] | null) ?? []).map((r) => r.edition_id);
  if (editionIds.length === 0) return [];

  // Step 2 — group_by query. PostgREST doesn't expose GROUP BY directly, so
  // we use an RPC (defined in migration 0019) OR a raw RPC. For now, run the
  // query through `pg-meta`'s json-aggregating select using rpc-style: SELECT
  // owner, COUNT(*) FROM moments WHERE edition_id IN (...) GROUP BY owner.
  //
  // Implementation note: until migration 0019 ships, we approximate by pulling
  // all rows and aggregating client-side. For a top player with ~50K moments
  // this is ~50K rows ÷ 1000-row PostgREST pages = 50 round-trips. Acceptable
  // for the bootstrap. Once 0019 lands, swap to `topshot_holders_by_player`
  // RPC for one-shot result.

  // Bootstrap path: fetch up to 50K rows, aggregate in-process.
  const PAGE = 1000;
  const MAX_PAGES = 50;
  const counts = new Map<string, number>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await admin
      .from("moments")
      .select("owner_flow_address")
      .in("edition_id", editionIds)
      .not("owner_flow_address", "is", null)
      .range(from, to);
    if (error) {
      console.error("[holders] moments fetch error", error);
      break;
    }
    const rows = (data as { owner_flow_address: string }[] | null) ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      counts.set(r.owner_flow_address, (counts.get(r.owner_flow_address) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }
  // Top `limit` by count.
  const topAddrs = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (topAddrs.length === 0) return [];

  // Step 3 — JOIN to collectors for display identity.
  const addrs = topAddrs.map(([a]) => a);
  const { data: cdata, error: cerr } = await admin
    .from("collectors")
    .select("flow_address, username, profile_image_url")
    .in("flow_address", addrs);
  if (cerr) console.error("[holders] collectors join error", cerr);
  const crows = (cdata as { flow_address: string; username: string | null; profile_image_url: string | null }[] | null) ?? [];
  const byAddr = new Map<string, { username: string | null; profile_image_url: string | null }>();
  for (const c of crows) {
    byAddr.set(c.flow_address, {
      username: c.username,
      profile_image_url: c.profile_image_url,
    });
  }
  return topAddrs.map(([addr, cnt], i) => {
    const ident = byAddr.get(addr);
    return {
      rank: i + 1,
      owner_flow_address: addr,
      owner_username: ident?.username ?? null,
      owner_profile_image_url: ident?.profile_image_url ?? null,
      moment_count: cnt,
    };
  });
}

/** Top holders for a set, ranked by total moment count across all that set's editions.
 * Honors parallel discipline same as getHoldersByPlayer.
 */
export interface HoldersBySetOptions {
  set_id: string;
  limit?: number;
  parallel_id?: number | null;
}
export async function getHoldersBySet(opts: HoldersBySetOptions): Promise<HolderRow[]> {
  const limit = opts.limit ?? 20;
  const admin = supabaseAdmin();
  let editionsQ = admin
    .from("editions")
    .select("edition_id")
    .eq("set_id", opts.set_id);
  if (opts.parallel_id !== undefined && opts.parallel_id !== -1) {
    if (opts.parallel_id === null || opts.parallel_id === 0) {
      editionsQ = editionsQ.or("parallel_id.is.null,parallel_id.eq.0");
    } else {
      editionsQ = editionsQ.eq("parallel_id", opts.parallel_id);
    }
  }
  const { data: editionRows, error } = await editionsQ.limit(2000);
  if (error) return [];
  const erows = (editionRows as { edition_id: string }[] | null) ?? [];
  const editionIds = erows.map((r) => r.edition_id);
  if (editionIds.length === 0) return [];

  return aggregateAndJoin(editionIds, limit);
}

/** Top holders for a single edition. Cheapest of the three (no edition lookup). */
export interface HoldersByEditionOptions {
  edition_id: string;
  limit?: number;
}
export async function getHoldersByEdition(opts: HoldersByEditionOptions): Promise<HolderRow[]> {
  return aggregateAndJoin([opts.edition_id], opts.limit ?? 20);
}

// Shared aggregator used by all three entry points.
async function aggregateAndJoin(editionIds: string[], limit: number): Promise<HolderRow[]> {
  const admin = supabaseAdmin();
  const PAGE = 1000;
  const MAX_PAGES = 50;
  const counts = new Map<string, number>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await admin
      .from("moments")
      .select("owner_flow_address")
      .in("edition_id", editionIds)
      .not("owner_flow_address", "is", null)
      .range(from, to);
    if (error) {
      console.error("[holders.aggregate] error", error);
      break;
    }
    const rows = (data as { owner_flow_address: string }[] | null) ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      counts.set(r.owner_flow_address, (counts.get(r.owner_flow_address) ?? 0) + 1);
    }
    if (rows.length < PAGE) break;
  }
  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (top.length === 0) return [];
  const addrs = top.map(([a]) => a);
  const { data: cdata } = await admin
    .from("collectors")
    .select("flow_address, username, profile_image_url")
    .in("flow_address", addrs);
  const crows = (cdata as { flow_address: string; username: string | null; profile_image_url: string | null }[] | null) ?? [];
  const byAddr = new Map<string, { username: string | null; profile_image_url: string | null }>();
  for (const c of crows) {
    byAddr.set(c.flow_address, { username: c.username, profile_image_url: c.profile_image_url });
  }
  return top.map(([addr, cnt], i) => ({
    rank: i + 1,
    owner_flow_address: addr,
    owner_username: byAddr.get(addr)?.username ?? null,
    owner_profile_image_url: byAddr.get(addr)?.profile_image_url ?? null,
    moment_count: cnt,
  }));
}
