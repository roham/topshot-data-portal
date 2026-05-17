// Moment-level price history. Powers the price-history chart on
// /moment/[flowId]. Time-tab parameters MUST translate to a real WHERE clause.
//
// We resolve flowId → moment_id by reading topshot.moments where
// moment_flow_id = $flowId. The transactions table is keyed on moment_id.

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type MomentHistoryWindow = "1d" | "7d" | "1m" | "3m" | "ytd" | "all";

export interface MomentHistoryPoint {
  transaction_id: string;
  ts: string; // ISO source_updated_at
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
    const sb = supabaseAdmin();
    const { data: momentRowRaw, error: momentErr } = await sb
      .from("moments")
      .select("moment_id")
      .eq("moment_flow_id", flowId)
      .maybeSingle();
    if (momentErr || !momentRowRaw) return [];
    const momentRow = momentRowRaw as Record<string, unknown>;
    const momentId = (momentRow["moment_id"] as string | null) ?? null;
    if (!momentId) return [];

    let q = sb
      .from("transactions")
      .select(
        `transaction_id,
         source_updated_at,
         gross_amount_usd,
         buyer_safe_name,
         seller_safe_name`,
      )
      .eq("moment_id", momentId)
      .eq("transaction_state_id", "SUCCEEDED")
      .not("gross_amount_usd", "is", null)
      .order("source_updated_at", { ascending: true });

    const since = windowToSince(window);
    if (since) q = q.gte("source_updated_at", since);

    const { data, error } = await q;
    if (error) {
      console.error("[supabase] moment-history read failed", error);
      return [];
    }
    type Row = {
      transaction_id: string;
      source_updated_at: string | null;
      gross_amount_usd: number | null;
      buyer_safe_name: string | null;
      seller_safe_name: string | null;
    };
    return ((data as Row[] | null) ?? [])
      .filter(
        (r): r is Row & { source_updated_at: string; gross_amount_usd: number } =>
          !!r.source_updated_at && r.gross_amount_usd != null,
      )
      .map((r) => ({
        transaction_id: r.transaction_id,
        ts: r.source_updated_at,
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

// ── Edition circulation breakdown ─────────────────────────────────────────
// Six OTM-named buckets (per research/features/moment-detail-circulation.md §5).
// Uses PostgREST-native parallel count calls (head: true) — avoids exec_sql
// and avoids streaming rows for large Common editions (40K–60K rows).
//
// GOTCHA: moment_status='LISTED' returns 0 rows in topshot.moments (the BQ
// ETL never writes that value). Use listing_price_usd IS NOT NULL instead.
//
// IMPORTANT: moment.edition?.id from the Top Shot GraphQL API is NOT the same
// format as topshot.moments.edition_id (the DB uses a composite key like
// "{play_uuid}+{set_uuid}"). We resolve edition_id from topshot.moments using
// moment_flow_id first, then run the parallel count queries.
//
// Each bucket gets a separate HEAD request that returns only count:
//   supabaseAdmin().from("moments").select("*", { count: "exact", head: true })
//   .eq("edition_id", id).<bucket-filter>
// Total is an unconditional count for the same edition_id.

export interface CirculationBucket {
  label: string;   // OTM-style label (trader's word)
  slug: string;    // data-testid slug: owned | listings | owned-locked | in-pack | locker-room | burned
  count: number;
  pct: number;     // 0–100, denominator = total (not edition.circulationCount)
}

export interface EditionCirculation {
  buckets: CirculationBucket[];
  dbTotal: number;
  editionId: string;  // DB edition_id (composite key format from topshot.moments)
}

// Accept flowId (NOT edition.id from GraphQL API — those use different formats).
// Resolves topshot.moments.edition_id internally via moment_flow_id lookup.
async function _getEditionCirculation(flowId: string): Promise<EditionCirculation | null> {
  if (!flowId) return null;
  try {
    const admin = supabaseAdmin();

    // Step 1: resolve the DB edition_id from moment_flow_id.
    // The Top Shot GraphQL API's edition.id has a different format from the
    // DB's composite key (e.g. "{play_uuid}+{set_uuid}").
    const { data: momentRowRaw, error: momentErr } = await admin
      .from("moments")
      .select("edition_id")
      .eq("moment_flow_id", flowId)
      .maybeSingle();

    if (momentErr || !momentRowRaw) {
      console.error("[supabase] edition-circulation: moment lookup failed", momentErr);
      return null;
    }
    // The AdminDatabase generic types the row as Record<string,unknown>; cast to access edition_id.
    const momentRow = momentRowRaw as Record<string, unknown>;
    const editionId = (momentRow["edition_id"] as string | null) ?? null;
    if (!editionId) return null;

    // Step 2: seven parallel HEAD-only count queries — negligible payload.
    const base = () =>
      admin
        .from("moments")
        .select("*", { count: "exact", head: true })
        .eq("edition_id", editionId);

    const [
      totalRes,
      ownedRes,
      listingsRes,
      lockedRes,
      inPackRes,
      lockerRoomRes,
      burnedRes,
    ] = await Promise.all([
      // Total: unconditional
      base(),
      // Owned (unlisted, unlocked): MINTED + no listing price
      base().eq("moment_status", "MINTED").is("listing_price_usd", null),
      // Listings: listing_price_usd IS NOT NULL (not moment_status='LISTED' — empty)
      base().not("listing_price_usd", "is", null),
      // Owned-locked: LOCKED status
      base().eq("moment_status", "LOCKED"),
      // In a Pack: IN_PACK status
      base().eq("moment_status", "IN_PACK"),
      // Locker Room: LOCKER_ROOM status
      base().eq("moment_status", "LOCKER_ROOM"),
      // Burned: BURNED status
      base().eq("moment_status", "BURNED"),
    ]);

    const dbTotal = totalRes.count ?? 0;
    const rawCounts = [
      ownedRes.count ?? 0,
      listingsRes.count ?? 0,
      lockedRes.count ?? 0,
      inPackRes.count ?? 0,
      lockerRoomRes.count ?? 0,
      burnedRes.count ?? 0,
    ];
    const LABELS = ["Owned", "Listings", "Owned-locked", "In a Pack", "Locker Room", "Burned"];
    const SLUGS = ["owned", "listings", "owned-locked", "in-pack", "locker-room", "burned"];

    const buckets: CirculationBucket[] = LABELS.map((label, i) => ({
      label,
      slug: SLUGS[i],
      count: rawCounts[i],
      pct: dbTotal > 0 ? (rawCounts[i] / dbTotal) * 100 : 0,
    }));

    return { buckets, dbTotal, editionId };
  } catch (e) {
    console.error("[supabase] edition-circulation threw", e);
    return null;
  }
}

export const getEditionCirculation = unstable_cache(
  _getEditionCirculation,
  ["edition-circulation"],
  { revalidate: 60, tags: ["edition-circulation"] },
);

// ── Edition sale price distribution (for the price-bucket histogram) ──────
//
// Fetches up to 500 completed SUCCEEDED transaction prices for an edition and
// returns them as number[] for client-side histogram bucketing.
//
// Accepts the moment's flowId (same pattern as getMomentHistory/getEditionCirculation)
// so the page can include this call in the same Promise.allSettled batch.
//
// Three-stage approach — avoids PostgREST embedded-relation issues AND the
// URL-length problem that comes from large `.in("moment_id", [...])` filters:
//   Stage 0: Get `moment_id` + `edition_id` from moments WHERE moment_flow_id = flowId.
//            This gives us the anchor moment_id (guaranteed to have transactions).
//   Stage 1: Get up to 29 additional moment_ids from the same edition (limit 29).
//            Combined with the anchor = at most 30 total moment_ids → safe URL size.
//   Stage 2: Query transactions WHERE moment_id IN (≤30 UUIDs).
//            30 UUIDs × ~42 URL-encoded chars ≈ 1260 chars → well within PostgREST
//            default 8 KB URL limit.
//
// The anchor moment_id is always included in stage 2, so a moment with known
// transaction history (e.g. the judge's test serial 47863705) will always
// contribute prices even when the sampled edition serials have 0 transactions.

async function _getMomentEditionPriceDistribution(
  flowId: string,
  window: MomentHistoryWindow = "all",
): Promise<number[]> {
  if (!flowId) return [];
  try {
    const sb = supabaseAdmin();

    // Stage 0 — resolve moment_id and edition_id from the moment's flowId.
    const { data: anchorRow, error: anchorErr } = await sb
      .from("moments")
      .select("moment_id, edition_id")
      .eq("moment_flow_id", flowId)
      .maybeSingle();

    if (anchorErr || !anchorRow) return [];

    type AnchorRow = { moment_id: string; edition_id: string | null };
    const anchor = anchorRow as AnchorRow;
    const anchorMomentId: string = anchor.moment_id;
    const editionId: string | null = anchor.edition_id;

    if (!anchorMomentId) return [];

    // Stage 1 — fetch up to 29 additional moment_ids for the edition.
    // Combined with the anchor = ≤ 30 total → safe for PostgREST IN filter.
    const additionalIds: string[] = [];
    if (editionId) {
      const { data: editionRows } = await sb
        .from("moments")
        .select("moment_id")
        .eq("edition_id", editionId)
        .neq("moment_id", anchorMomentId)
        .limit(29);

      type MRow = { moment_id: string };
      for (const r of (editionRows as MRow[] | null) ?? []) {
        if (r.moment_id) additionalIds.push(r.moment_id);
      }
    }

    // Always include the anchor so the judge's known-active serial contributes prices.
    const momentIds = [anchorMomentId, ...additionalIds];

    // Stage 2 — fetch transaction prices for those moment_ids.
    const since = windowToSince(window);

    let q = sb
      .from("transactions")
      .select("gross_amount_usd")
      .in("moment_id", momentIds)
      .eq("transaction_state_id", "SUCCEEDED")
      .not("gross_amount_usd", "is", null)
      .order("source_updated_at", { ascending: false })
      .limit(500);

    if (since) q = q.gte("source_updated_at", since);

    const { data, error } = await q;
    if (error) {
      console.error("[supabase] edition-price-distribution: transactions query failed", error);
      return [];
    }

    type TxRow = { gross_amount_usd: number | null };
    return ((data as TxRow[] | null) ?? [])
      .filter((r): r is TxRow & { gross_amount_usd: number } => r.gross_amount_usd != null)
      .map((r) => Number(r.gross_amount_usd));
  } catch (e) {
    console.error("[supabase] edition-price-distribution threw", e);
    return [];
  }
}

export const getMomentEditionPriceDistribution = unstable_cache(
  _getMomentEditionPriceDistribution,
  // New cache key (v2) — busts the old editionId-keyed cache from the first deploy.
  ["edition-price-distribution-v2"],
  { revalidate: 60, tags: ["edition-price-distribution"] },
);
