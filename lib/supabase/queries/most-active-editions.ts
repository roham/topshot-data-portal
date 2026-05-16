// Most-active editions in a parameterized window. Reads the per-window
// mv_edition_*_activity MV, gated by tx_count >= 5 so single-tx, single-buyer
// noise (the Norman-Powell-#1 artifact) doesn't surface. The 24h MV has
// volume_usd + unique_traders; the new 7d/30d/1y/all_time variants emit
// total_volume_usd and omit unique_traders — both shapes are normalized here.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { TimeWindow } from "@/components/global/window-types";
import { windowToEditionActivityView } from "@/lib/supabase/helpers";

export interface MostActiveEditionRow {
  edition_id: string;
  edition_name: string | null;
  set_id: string | null;
  set_name: string | null;
  play_id: string | null;
  play_name: string | null;
  player_id: string | null;
  player_name: string | null;
  tier_name: string | null;
  tx_count: number;
  volume_usd: number;
  unique_traders: number | null;
  median_price_usd: number | null;
  min_price_usd: number | null;
  max_price_usd: number | null;
}

interface GetMostActiveOptions {
  window?: TimeWindow;
  limit?: number;
  minTxCount?: number;
}

async function _getMostActiveEditions(
  opts: GetMostActiveOptions = {},
): Promise<MostActiveEditionRow[]> {
  const window = opts.window ?? "24h";
  const limit = opts.limit ?? 20;
  const minTxCount = opts.minTxCount ?? 5;
  const view = windowToEditionActivityView(window);
  // The legacy 24h MV uses `volume_usd`; the new variants use
  // `total_volume_usd`. The .order() target differs accordingly.
  const sortColumn = view === "mv_edition_24h_activity"
    ? "volume_usd"
    : "total_volume_usd";
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    const { data: rows, error } = await sb
      .from(view)
      .select("*")
      .gte("tx_count", minTxCount)
      .order(sortColumn, { ascending: false })
      .limit(limit);
    if (error) {
      console.error(`[supabase] ${view} read failed`, error);
      return [];
    }
    const editionRows = (rows ?? []) as Tables["mv_edition_24h_activity"][];
    if (!editionRows.length) return [];

    // The 7d/30d/1y/all_time variants ship set_name + play_name +
    // player_name pre-joined; the legacy 24h MV does not. Hydrate only
    // the IDs that came back without their human-readable label.
    const needsSetHydration = editionRows.some(
      (r) => r.set_id != null && (r.set_name == null || r.set_name === undefined),
    );
    const needsPlayerHydration = editionRows.some(
      (r) =>
        r.player_id != null &&
        (r.player_name == null || r.player_name === undefined),
    );

    let setNameById = new Map<string, string | null>();
    let playerNameById = new Map<string, string | null>();
    if (needsSetHydration || needsPlayerHydration) {
      const setIds = Array.from(
        new Set(
          editionRows
            .map((r) => r.set_id)
            .filter((x): x is string => !!x),
        ),
      );
      const playerIds = Array.from(
        new Set(
          editionRows
            .map((r) => r.player_id)
            .filter((x): x is string => !!x),
        ),
      );
      const [setLookup, playerLookup] = await Promise.all([
        needsSetHydration && setIds.length
          ? sb.from("sets").select("set_id, set_name").in("set_id", setIds)
          : Promise.resolve({ data: [], error: null }),
        needsPlayerHydration && playerIds.length
          ? sb
              .from("players")
              .select("player_id, full_name")
              .in("player_id", playerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const s of (setLookup.data as Tables["sets"][] | null) ?? []) {
        setNameById.set(s.set_id, s.set_name);
      }
      for (const p of (playerLookup.data as Tables["players"][] | null) ?? []) {
        playerNameById.set(p.player_id, p.full_name);
      }
    }

    return editionRows.map((r) => {
      const volume = Number(r.total_volume_usd ?? r.volume_usd ?? 0);
      const traders = r.unique_traders != null ? Number(r.unique_traders) : null;
      const setNameJoined =
        r.set_name ?? (r.set_id ? setNameById.get(r.set_id) ?? null : null);
      const playerNameJoined =
        r.player_name ??
        (r.player_id ? playerNameById.get(r.player_id) ?? null : null);
      return {
        edition_id: r.edition_id,
        edition_name: r.edition_name,
        set_id: r.set_id,
        set_name: setNameJoined,
        play_id: r.play_id,
        play_name: r.play_name ?? null,
        player_id: r.player_id,
        player_name: playerNameJoined,
        tier_name: r.tier_name,
        tx_count: Number(r.tx_count),
        volume_usd: volume,
        unique_traders: traders,
        median_price_usd: r.median_price_usd,
        min_price_usd: r.min_price_usd ?? null,
        max_price_usd: r.max_price_usd ?? null,
      };
    });
  } catch (e) {
    console.error(`[supabase] edition-activity read threw`, e);
    return [];
  }
}

export const getMostActiveEditions = (opts: GetMostActiveOptions = {}) => {
  const window = opts.window ?? "24h";
  return unstable_cache(
    () => _getMostActiveEditions(opts),
    [
      "most-active-editions",
      window,
      String(opts.limit ?? 20),
      String(opts.minTxCount ?? 5),
    ],
    {
      revalidate: 60,
      tags: [
        "most-active-editions",
        `mv_edition_${window}_activity`,
      ],
    },
  )();
};
