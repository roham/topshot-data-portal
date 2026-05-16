// Paginated read from topshot.transactions, joined to moments + sets +
// plays + players. Used by /sales feed and per-moment / per-edition pages.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface RecentTransactionRow {
  transaction_id: string;
  moment_id: string | null;
  gross_amount_usd: number | null;
  net_amount_usd: number | null;
  buyer_safe_name: string | null;
  seller_safe_name: string | null;
  client_marketplace_safe_name: string | null;
  source_updated_at: string | null;
  // joined
  serial_number: number | null;
  edition_id: string | null;
  set_id: string | null;
  set_name: string | null;
  play_id: string | null;
  play_name: string | null;
  player_name: string | null;
  tier_name: string | null;
}

interface GetRecentTransactionsOptions {
  limit?: number;
  // ISO timestamp lower bound; null/undefined = no lower bound.
  since?: string | null;
  // Filter to a specific moment.
  momentId?: string | null;
  // Filter to all moments in this set.
  setId?: string | null;
  // Filter buyer username.
  buyerSafeName?: string | null;
}

async function _getRecentTransactions({
  limit = 50,
  since,
  momentId,
  setId,
  buyerSafeName,
}: GetRecentTransactionsOptions = {}): Promise<RecentTransactionRow[]> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    // Pull the transaction rows + serial/edition/set/play from moments.
    // Player name reached through plays.player_name to survive editions
    // missing the column on legacy rows.
    let query = sb
      .from("transactions")
      .select(
        `transaction_id,
         moment_id,
         gross_amount_usd,
         net_amount_usd,
         buyer_safe_name,
         seller_safe_name,
         client_marketplace_safe_name,
         source_updated_at,
         moments!inner(
           serial_number,
           edition_id,
           set_id,
           set_name,
           play_id,
           play_name,
           plays(player_name),
           editions(tier_name)
         )`,
      )
      .eq("transaction_state_id", "SUCCEEDED")
      .not("gross_amount_usd", "is", null)
      .order("source_updated_at", { ascending: false })
      .limit(limit);

    if (since) query = query.gte("source_updated_at", since);
    if (momentId) query = query.eq("moment_id", momentId);
    if (setId) query = query.eq("moments.set_id", setId);
    if (buyerSafeName) query = query.eq("buyer_safe_name", buyerSafeName);

    const { data, error } = await query;
    if (error) {
      console.error("[supabase] transactions read failed", error);
      return [];
    }
    // PostgREST nested embeds: to-one relations may come back as an array or
    // a single object depending on FK inference. Normalize both.
    interface NestedPlays {
      player_name: string | null;
    }
    interface NestedEditions {
      tier_name: string | null;
    }
    interface NestedMoment {
      serial_number: number | null;
      edition_id: string | null;
      set_id: string | null;
      set_name: string | null;
      play_id: string | null;
      play_name: string | null;
      plays: NestedPlays | NestedPlays[] | null;
      editions: NestedEditions | NestedEditions[] | null;
    }
    interface Joined {
      transaction_id: string;
      moment_id: string | null;
      gross_amount_usd: number | null;
      net_amount_usd: number | null;
      buyer_safe_name: string | null;
      seller_safe_name: string | null;
      client_marketplace_safe_name: string | null;
      source_updated_at: string | null;
      moments: NestedMoment | NestedMoment[] | null;
    }
    const first = <T,>(v: T | T[] | null | undefined): T | null => {
      if (v == null) return null;
      return Array.isArray(v) ? v[0] ?? null : v;
    };
    return ((data as unknown as Joined[] | null) ?? []).map((r) => {
      const m = first(r.moments);
      const play = first(m?.plays ?? null);
      const ed = first(m?.editions ?? null);
      return {
        transaction_id: r.transaction_id,
        moment_id: r.moment_id,
        gross_amount_usd:
          r.gross_amount_usd != null ? Number(r.gross_amount_usd) : null,
        net_amount_usd:
          r.net_amount_usd != null ? Number(r.net_amount_usd) : null,
        buyer_safe_name: r.buyer_safe_name,
        seller_safe_name: r.seller_safe_name,
        client_marketplace_safe_name: r.client_marketplace_safe_name,
        source_updated_at: r.source_updated_at,
        serial_number: m?.serial_number ?? null,
        edition_id: m?.edition_id ?? null,
        set_id: m?.set_id ?? null,
        set_name: m?.set_name ?? null,
        play_id: m?.play_id ?? null,
        play_name: m?.play_name ?? null,
        player_name: play?.player_name ?? null,
        tier_name: ed?.tier_name ?? null,
      };
    });
  } catch (e) {
    console.error("[supabase] transactions threw", e);
    return [];
  }
}

// The cache tag covers both inputs to the function via the cache key — every
// distinct (limit, since, momentId, setId, buyerSafeName) combo is its own
// entry under tag `recent-transactions`.
export const getRecentTransactions = unstable_cache(
  _getRecentTransactions,
  ["recent-transactions"],
  { revalidate: 60, tags: ["recent-transactions", "transactions"] },
);

// Helper: a Postgres timestamptz string `N hours ago`.
export function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

// Helper: a Postgres timestamptz string `N days ago`.
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
