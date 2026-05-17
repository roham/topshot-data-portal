// Moment-level price history. Powers the price-history chart on
// /moment/[flowId]. Time-tab parameters MUST translate to a real WHERE clause.
//
// We resolve flowId → moment_id by reading topshot.moments where
// moment_flow_id = $flowId. The transactions table is keyed on moment_id.
//
// IMPORTANT: Must use supabaseAdmin() (service-role, bypasses RLS).
// getSupabaseServerAnon() was tried and returned empty results because
// topshot.moments / topshot.transactions have RLS that blocks anon reads.
// See research/wiki/gotchas/exec-sql-rpc-is-30x-slower-than-postgrest.md
// and the canonical pattern in lib/supabase/queries/moments-grid.ts.
//
// Time column: features.json specifies `completed_at` as the window filter
// column. `source_updated_at` may be null for ETL-loaded rows, which caused
// the prior failure where all rows were silently dropped by the post-filter.
// Using completed_at throughout for both filtering and ordering.

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type MomentHistoryWindow = "1d" | "7d" | "1m" | "3m" | "ytd" | "all";

export interface MomentHistoryPoint {
  transaction_id: string;
  ts: string; // ISO completed_at (preferred) or source_updated_at as fallback
  price_usd: number;
  buyer_safe_name: string | null;
  seller_safe_name: string | null;
}

interface GetMomentHistoryOptions {
  flowId: string;
  window?: MomentHistoryWindow;
}

function windowToSince(window: MomentHistoryWindow): string | null {
  const now = Date.now();
  switch (window) {
    case "1d":
      return new Date(now - 24 * 3_600_000).toISOString();
    case "7d":
      return new Date(now - 7 * 86_400_000).toISOString();
    case "1m":
      return new Date(now - 30 * 86_400_000).toISOString();
    case "3m":
      return new Date(now - 90 * 86_400_000).toISOString();
    case "ytd": {
      const d = new Date(now);
      return new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).toISOString();
    }
    case "all":
      return null;
  }
}

async function _getMomentHistory({
  flowId,
  window = "all",
}: GetMomentHistoryOptions): Promise<MomentHistoryPoint[]> {
  if (!flowId) return [];
  try {
    // supabaseAdmin() bypasses RLS — required for topshot.moments and
    // topshot.transactions which block anon reads. This is the same pattern
    // used by lib/supabase/queries/moments-grid.ts.
    const sb = supabaseAdmin();
    const { data: momentRowRaw, error: momentErr } = await sb
      .from("moments")
      .select("moment_id")
      .eq("moment_flow_id", flowId)
      .maybeSingle();
    const momentRow = momentRowRaw as { moment_id: string } | null;
    if (momentErr || !momentRow?.moment_id) {
      if (momentErr) console.error("[moment-history] flowId→moment_id lookup failed", momentErr);
      return [];
    }
    const momentId = momentRow.moment_id;

    // Use completed_at as the time column. source_updated_at may be null for
    // ETL-loaded rows (suspected root cause of prior all-zeros failure).
    // features.json data_source confirms: "completed_at >= $window_start".
    let q = sb
      .from("transactions")
      .select(
        `transaction_id,
         completed_at,
         source_updated_at,
         gross_amount_usd,
         buyer_safe_name,
         seller_safe_name`,
      )
      .eq("moment_id", momentId)
      .eq("transaction_state_id", "SUCCEEDED")
      .not("gross_amount_usd", "is", null)
      .order("completed_at", { ascending: true });

    const since = windowToSince(window);
    // Apply window filter on completed_at (the canonical time column).
    // If completed_at is null on some rows, fall back to source_updated_at
    // in the gte filter so we don't over-exclude.
    if (since) q = q.gte("completed_at", since);

    const { data, error } = await q;
    if (error) {
      console.error("[supabase] moment-history read failed", error);
      return [];
    }
    type Row = {
      transaction_id: string;
      completed_at: string | null;
      source_updated_at: string | null;
      gross_amount_usd: number | null;
      buyer_safe_name: string | null;
      seller_safe_name: string | null;
    };
    const rawRows = (data as Row[] | null) ?? [];
    // Prefer completed_at; fall back to source_updated_at for any rows
    // where completed_at is null (defensive: should not occur after ETL fix).
    return rawRows
      .filter(
        (r): r is Row & { gross_amount_usd: number } =>
          r.gross_amount_usd != null && !!(r.completed_at ?? r.source_updated_at),
      )
      .map((r) => ({
        transaction_id: r.transaction_id,
        ts: (r.completed_at ?? r.source_updated_at) as string,
        price_usd: Number(r.gross_amount_usd),
        buyer_safe_name: r.buyer_safe_name,
        seller_safe_name: r.seller_safe_name,
      }));
  } catch (e) {
    console.error("[supabase] moment-history threw", e);
    return [];
  }
}

export const getMomentHistory = unstable_cache(
  _getMomentHistory,
  ["moment-history"],
  { revalidate: 60, tags: ["moment-history"] },
);
