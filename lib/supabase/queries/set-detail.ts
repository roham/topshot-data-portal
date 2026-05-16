// Set detail surface. Powers /set/[id].
//
// Composition:
//   - sets row (header)
//   - editions in the set + latest market_caps row joined per edition (circulation + floor + cap)
//   - mv_set_24h_activity row (24h KPIs)
//   - mv_set_completion_distribution rows (histogram)
//   - recent transactions for moments in the set (top N)

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import {
  getRecentTransactions,
  type RecentTransactionRow,
} from "./recent-transactions";

export interface SetDetail {
  set: Tables["sets"] | null;
  activity24h: Tables["mv_set_24h_activity"] | null;
  completion: Array<{
    bucket: string;
    owner_count: number;
    total_editions_in_set: number | null;
  }>;
  editions: Array<{
    edition_id: string;
    edition_name: string | null;
    tier_name: string | null;
    play_id: string | null;
    play_name: string | null;
    player_name: string | null;
    mint_count: number | null;
    num_moments_in_circulation: number | null;
    lowest_ask_price: number | null;
    highest_offer_price: number | null;
    market_cap: number | null;
    market_cap_as_of: string | null;
  }>;
  recentTransactions: RecentTransactionRow[];
}

async function _getSetDetail(setId: string): Promise<SetDetail> {
  const empty: SetDetail = {
    set: null,
    activity24h: null,
    completion: [],
    editions: [],
    recentTransactions: [],
  };
  if (!setId) return empty;
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return empty;

    const [
      setRowRes,
      activityRes,
      completionRes,
      editionsRes,
      recentTxs,
    ] = await Promise.all([
      sb.from("sets").select("*").eq("set_id", setId).maybeSingle(),
      sb
        .from("mv_set_24h_activity")
        .select("*")
        .eq("set_id", setId)
        .maybeSingle(),
      sb
        .from("mv_set_completion_distribution")
        .select("bucket, owner_count, total_editions_in_set")
        .eq("set_id", setId)
        .order("owner_count", { ascending: false }),
      sb
        .from("editions")
        .select(
          `edition_id,
           edition_name,
           tier_name,
           play_id,
           player_name,
           mint_count,
           plays(play_name)`,
        )
        .eq("set_id", setId),
      getRecentTransactions({ setId, limit: 20 }),
    ]);

    const editionRows =
      (editionsRes.data as Array<{
        edition_id: string;
        edition_name: string | null;
        tier_name: string | null;
        play_id: string | null;
        player_name: string | null;
        mint_count: number | null;
        plays: { play_name: string | null } | null;
      }> | null) ?? [];
    if (!editionRows.length) {
      return {
        set: (setRowRes.data as Tables["sets"] | null) ?? null,
        activity24h:
          (activityRes.data as Tables["mv_set_24h_activity"] | null) ?? null,
        completion: (completionRes.data as Array<{
          bucket: string;
          owner_count: number;
          total_editions_in_set: number | null;
        }> | null) ?? [],
        editions: [],
        recentTransactions: recentTxs,
      };
    }

    // For each edition pull the most-recent market_caps row.
    const editionIds = editionRows.map((e) => e.edition_id);
    const { data: mcRows } = await sb
      .from("market_caps")
      .select(
        "edition_id, date, num_moments_in_circulation, lowest_ask_price, highest_offer_price, market_cap",
      )
      .in("edition_id", editionIds)
      .order("date", { ascending: false });
    const latestMcByEdition = new Map<
      string,
      Tables["market_caps"] & { date: string }
    >();
    for (const r of (mcRows as Tables["market_caps"][] | null) ?? []) {
      // first occurrence wins because rows are sorted DESC by date
      if (!latestMcByEdition.has(r.edition_id)) {
        latestMcByEdition.set(r.edition_id, r);
      }
    }

    return {
      set: (setRowRes.data as Tables["sets"] | null) ?? null,
      activity24h:
        (activityRes.data as Tables["mv_set_24h_activity"] | null) ?? null,
      completion:
        (completionRes.data as Array<{
          bucket: string;
          owner_count: number;
          total_editions_in_set: number | null;
        }> | null) ?? [],
      editions: editionRows.map((e) => {
        const mc = latestMcByEdition.get(e.edition_id);
        return {
          edition_id: e.edition_id,
          edition_name: e.edition_name,
          tier_name: e.tier_name,
          play_id: e.play_id,
          play_name: e.plays?.play_name ?? null,
          player_name: e.player_name,
          mint_count: e.mint_count,
          num_moments_in_circulation: mc?.num_moments_in_circulation ?? null,
          lowest_ask_price: mc?.lowest_ask_price ?? null,
          highest_offer_price: mc?.highest_offer_price ?? null,
          market_cap: mc?.market_cap ?? null,
          market_cap_as_of: mc?.date ?? null,
        };
      }),
      recentTransactions: recentTxs,
    };
  } catch (e) {
    console.error("[supabase] set-detail threw", e);
    return empty;
  }
}

export const getSetDetail = unstable_cache(_getSetDetail, ["set-detail"], {
  revalidate: 60,
  tags: ["set-detail"],
});
