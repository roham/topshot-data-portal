// Most-active editions (24h) — reads mv_edition_24h_activity gated by
// tx_count >= 5 so single-tx, single-buyer noise (the Norman-Powell-#1
// artifact) doesn't surface.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface MostActiveEditionRow {
  edition_id: string;
  edition_name: string | null;
  set_id: string | null;
  set_name: string | null;
  play_id: string | null;
  player_id: string | null;
  player_name: string | null;
  tier_name: string | null;
  tx_count: number;
  volume_usd: number;
  unique_traders: number;
  median_price_usd: number | null;
  min_price_usd: number | null;
  max_price_usd: number | null;
}

interface GetMostActiveOptions {
  limit?: number;
  minTxCount?: number;
}

async function _getMostActiveEditions(
  opts: GetMostActiveOptions = {},
): Promise<MostActiveEditionRow[]> {
  const limit = opts.limit ?? 20;
  const minTxCount = opts.minTxCount ?? 5;
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    // Pull mv_edition_24h_activity then join set + player names from base
    // tables. Join via a follow-up read keyed on set_id and player_id to
    // avoid relying on FK metadata in PostgREST (the MV doesn't carry FK
    // hints automatically).
    const { data: rows, error } = await sb
      .from("mv_edition_24h_activity")
      .select("*")
      .gte("tx_count", minTxCount)
      .order("volume_usd", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[supabase] mv_edition_24h_activity read failed", error);
      return [];
    }
    const editionRows = (rows ?? []) as Tables["mv_edition_24h_activity"][];
    if (!editionRows.length) return [];

    // Hydrate set + player names in one round-trip each.
    const setIds = Array.from(
      new Set(editionRows.map((r) => r.set_id).filter((x): x is string => !!x)),
    );
    const playerIds = Array.from(
      new Set(
        editionRows.map((r) => r.player_id).filter((x): x is string => !!x),
      ),
    );
    const [setLookup, playerLookup] = await Promise.all([
      setIds.length
        ? sb.from("sets").select("set_id, set_name").in("set_id", setIds)
        : Promise.resolve({ data: [], error: null }),
      playerIds.length
        ? sb
            .from("players")
            .select("player_id, full_name")
            .in("player_id", playerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const setNameById = new Map<string, string | null>();
    for (const s of (setLookup.data as Tables["sets"][] | null) ?? []) {
      setNameById.set(s.set_id, s.set_name);
    }
    const playerNameById = new Map<string, string | null>();
    for (const p of (playerLookup.data as Tables["players"][] | null) ?? []) {
      playerNameById.set(p.player_id, p.full_name);
    }

    return editionRows.map((r) => ({
      edition_id: r.edition_id,
      edition_name: r.edition_name,
      set_id: r.set_id,
      set_name: r.set_id ? setNameById.get(r.set_id) ?? null : null,
      play_id: r.play_id,
      player_id: r.player_id,
      player_name: r.player_id
        ? playerNameById.get(r.player_id) ?? null
        : null,
      tier_name: r.tier_name,
      tx_count: Number(r.tx_count),
      volume_usd: Number(r.volume_usd),
      unique_traders: Number(r.unique_traders),
      median_price_usd: r.median_price_usd,
      min_price_usd: r.min_price_usd,
      max_price_usd: r.max_price_usd,
    }));
  } catch (e) {
    console.error("[supabase] mv_edition_24h_activity threw", e);
    return [];
  }
}

export const getMostActiveEditions = unstable_cache(
  _getMostActiveEditions,
  ["most-active-editions"],
  { revalidate: 60, tags: ["most-active-editions", "mv_edition_24h_activity"] },
);
