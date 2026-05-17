// Pack detail surface. Powers /packs/[id] (where id = pack_listing_id).
//
// Composition:
//   - packs rows WHERE pack_listing_id = $id (SKU metadata + instance counts)
//   - drops row via pack.drop_id (for DROPPED ON date)
//   - moments WHERE pack_listing_id = $id → group by edition_id (contents grid)
//   - editions batch (player_name, tier_name, mint_count) for the grid rows
//   - avg pack value from transactions → moments (two-stage: moment_ids → txs)
//
// IMPORTANT gotchas honored:
//   · moment_status='IN_PACK' returns 0 rows — do NOT use for sealed/in-pack
//     count; use pack_status or the moments-released approximation.
//   · moment_status='LISTED' returns 0 rows — use listing_price_usd IS NOT NULL
//     for listing count per edition.
//   · Never exec_sql RPC — all queries use PostgREST native endpoints.
//   · nullsFirst omitted from .order() to avoid partial-index defeat.

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface PackEditionRow {
  edition_id: string;
  player_name: string | null;
  play_name: string | null;
  edition_name: string | null;
  tier_name: string | null;
  mint_count: number | null;
  moment_count: number;
  listed_count: number;
}

export interface PackDetail {
  /** First pack row with this pack_listing_id (SKU metadata). */
  pack: {
    pack_id: string;
    pack_listing_id: string | null;
    pack_name: string | null;
    description: string | null;
    image_url: string | null;
    moments_per_pack: number | null;
    total_packs: number | null;
    total_moments: number | null;
    price: number | null;
    currency: string | null;
    pack_tier_name: string | null;
    drop_id: string | null;
    started_at: string | null;
  } | null;
  /** Drop record for DROPPED ON date. */
  drop: {
    drop_id: string;
    started_at: string | null;
  } | null;
  /**
   * Opened/sealed counts.
   * source = 'pack_status' if derived from per-instance pack rows.
   * source = 'moments_approx' if derived from released moments count.
   * source = 'unavailable' if no usable data.
   */
  openedCount: number | null;
  sealedCount: number | null;
  totalFromPacks: number | null;
  openedSource: "pack_status" | "moments_approx" | "unavailable";
  /** Avg gross_amount_usd for SUCCEEDED transactions on moments in this pack. */
  avgPackValue: number | null;
  avgPackValueSampleSize: number;
  /** Edition rows for the contents grid. */
  editions: PackEditionRow[];
  /** ISO timestamp of the last ETL refresh (moments.last_updated_at max). */
  refreshedAt: string | null;
}

async function _getPackDetail(packListingId: string): Promise<PackDetail> {
  const empty: PackDetail = {
    pack: null,
    drop: null,
    openedCount: null,
    sealedCount: null,
    totalFromPacks: null,
    openedSource: "unavailable",
    avgPackValue: null,
    avgPackValueSampleSize: 0,
    editions: [],
    refreshedAt: null,
  };

  if (!packListingId) return empty;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return empty;
  }

  try {
    // ── Stage 1: fetch pack SKU metadata (first row by pack_listing_id) ──
    const { data: packRows, error: packErr } = await admin
      .from("packs")
      .select(
        "pack_id, pack_listing_id, pack_name, description, image_url, " +
        "moments_per_pack, total_packs, total_moments, price, currency, " +
        "pack_tier_name, drop_id, started_at, pack_status",
      )
      .eq("pack_listing_id", packListingId)
      .order("inserted_at", { ascending: true })
      .limit(500);

    if (packErr) {
      console.error("[pack-detail] packs query error", packErr);
      return empty;
    }

    const rows = (packRows as Array<{
      pack_id: string;
      pack_listing_id: string | null;
      pack_name: string | null;
      description: string | null;
      image_url: string | null;
      moments_per_pack: number | null;
      total_packs: number | null;
      total_moments: number | null;
      price: number | null;
      currency: string | null;
      pack_tier_name: string | null;
      drop_id: string | null;
      started_at: string | null;
      pack_status: string | null;
    }> | null) ?? [];

    if (rows.length === 0) return empty;

    const firstRow = rows[0];

    // Determine if this is per-instance (multiple rows → count by pack_status)
    // or SKU-level (single row → derive from moments).
    let openedCount: number | null = null;
    let sealedCount: number | null = null;
    let openedSource: PackDetail["openedSource"] = "unavailable";

    if (rows.length > 1) {
      // Per-instance model: count rows by pack_status
      let opened = 0;
      let sealed = 0;
      for (const r of rows) {
        if (r.pack_status === "OPENED") opened++;
        else if (r.pack_status === "SEALED") sealed++;
      }
      if (opened > 0 || sealed > 0) {
        openedCount = opened;
        sealedCount = sealed;
        openedSource = "pack_status";
      }
    }

    // ── Stage 2: fetch drop record ────────────────────────────────────────
    let drop: { drop_id: string; started_at: string | null } | null = null;
    if (firstRow.drop_id) {
      const { data: dropData } = await admin
        .from("drops")
        .select("drop_id, started_at")
        .eq("drop_id", firstRow.drop_id)
        .maybeSingle();
      drop = (dropData as typeof drop) ?? null;
    }

    // ── Stage 3: fetch moments WHERE pack_listing_id = $id ───────────────
    // Pull all moments for this pack to:
    //   (a) build the edition→contents grid
    //   (b) derive opened/sealed if SKU-level (moments_approx fallback)
    //   (c) get moment_ids for avg-pack-value tx query
    //
    // listing_price_usd IS NOT NULL check (not moment_status='LISTED') per gotcha.
    const { data: momentData, error: momentErr } = await admin
      .from("moments")
      .select(
        "moment_id, edition_id, edition_name, play_name, listing_price_usd, last_updated_at",
      )
      .eq("pack_listing_id", packListingId)
      .limit(10000);

    if (momentErr) {
      console.error("[pack-detail] moments query error", momentErr);
    }

    const moments = (momentData as Array<{
      moment_id: string;
      edition_id: string | null;
      edition_name: string | null;
      play_name: string | null;
      listing_price_usd: number | null;
      last_updated_at: string | null;
    }> | null) ?? [];

    // Derive opened/sealed from moments if no per-instance pack rows.
    if (openedSource === "unavailable" && moments.length > 0) {
      const momentsPerPack = firstRow.moments_per_pack ?? 1;
      const totalPacks = firstRow.total_packs ?? null;
      if (momentsPerPack > 0 && totalPacks != null) {
        const impliedOpened = Math.round(moments.length / momentsPerPack);
        openedCount = impliedOpened;
        sealedCount = Math.max(0, totalPacks - impliedOpened);
        openedSource = "moments_approx";
      }
    }

    // Freshness: max last_updated_at across moments
    const refreshedAt = moments.reduce((best, m) => {
      if (!m.last_updated_at) return best;
      if (!best) return m.last_updated_at;
      return m.last_updated_at > best ? m.last_updated_at : best;
    }, null as string | null);

    // Group moments by edition_id for the contents grid
    const editionGroupMap = new Map<string, {
      edition_name: string | null;
      play_name: string | null;
      moment_ids: string[];
      listed_count: number;
    }>();

    for (const m of moments) {
      const eid = m.edition_id ?? "__unknown__";
      if (!editionGroupMap.has(eid)) {
        editionGroupMap.set(eid, {
          edition_name: m.edition_name,
          play_name: m.play_name,
          moment_ids: [],
          listed_count: 0,
        });
      }
      const g = editionGroupMap.get(eid)!;
      g.moment_ids.push(m.moment_id);
      // listing_price_usd IS NOT NULL = "listed" (gotcha: moment_status='LISTED' is empty)
      if (m.listing_price_usd != null) g.listed_count++;
    }

    // ── Stage 4: fetch edition metadata (tier_name, player_name, mint_count) ──
    const editionIds = Array.from(editionGroupMap.keys()).filter(k => k !== "__unknown__");
    const editionMetaMap = new Map<string, {
      tier_name: string | null;
      player_name: string | null;
      mint_count: number | null;
    }>();

    if (editionIds.length > 0) {
      const { data: edData } = await admin
        .from("editions")
        .select("edition_id, tier_name, player_name, mint_count")
        .in("edition_id", editionIds);
      for (const e of (edData as Array<{
        edition_id: string;
        tier_name: string | null;
        player_name: string | null;
        mint_count: number | null;
      }> | null) ?? []) {
        editionMetaMap.set(e.edition_id, {
          tier_name: e.tier_name,
          player_name: e.player_name,
          mint_count: e.mint_count,
        });
      }
    }

    // Build edition rows for the contents grid
    const editionRows: PackEditionRow[] = Array.from(editionGroupMap.entries())
      .filter(([eid]) => eid !== "__unknown__")
      .map(([eid, g]) => {
        const meta = editionMetaMap.get(eid);
        return {
          edition_id: eid,
          player_name: meta?.player_name ?? null,
          play_name: g.play_name,
          edition_name: g.edition_name,
          tier_name: meta?.tier_name ?? null,
          mint_count: meta?.mint_count ?? null,
          moment_count: g.moment_ids.length,
          listed_count: g.listed_count,
        };
      })
      .sort((a, b) => (a.player_name ?? "").localeCompare(b.player_name ?? ""));

    // ── Stage 5: avg pack value from transactions ─────────────────────────
    // Two-stage: collect moment_ids → query transactions WHERE moment_id IN (...)
    // per research note §5. Cap at 500 moment_ids for URL length safety.
    let avgPackValue: number | null = null;
    let avgPackValueSampleSize = 0;
    const allMomentIds = moments.map(m => m.moment_id).slice(0, 500);
    if (allMomentIds.length > 0) {
      const { data: txData } = await admin
        .from("transactions")
        .select("gross_amount_usd")
        .in("moment_id", allMomentIds)
        .eq("transaction_state_id", "SUCCEEDED")
        .not("gross_amount_usd", "is", null)
        .limit(1000);

      const txAmounts = ((txData as Array<{ gross_amount_usd: number | null }> | null) ?? [])
        .map(t => t.gross_amount_usd)
        .filter((v): v is number => v != null && v > 0);

      if (txAmounts.length > 0) {
        avgPackValue = txAmounts.reduce((s, v) => s + Number(v), 0) / txAmounts.length;
        avgPackValueSampleSize = txAmounts.length;
      }
    }

    return {
      pack: {
        pack_id: firstRow.pack_id,
        pack_listing_id: firstRow.pack_listing_id,
        pack_name: firstRow.pack_name,
        description: firstRow.description,
        image_url: firstRow.image_url,
        moments_per_pack: firstRow.moments_per_pack,
        total_packs: firstRow.total_packs,
        total_moments: firstRow.total_moments,
        price: firstRow.price,
        currency: firstRow.currency,
        pack_tier_name: firstRow.pack_tier_name,
        drop_id: firstRow.drop_id,
        started_at: firstRow.started_at,
      },
      drop,
      openedCount,
      sealedCount,
      totalFromPacks: firstRow.total_packs,
      openedSource,
      avgPackValue,
      avgPackValueSampleSize,
      editions: editionRows,
      refreshedAt,
    };
  } catch (e) {
    console.error("[pack-detail] threw", e);
    return empty;
  }
}

export const getPackDetail = unstable_cache(_getPackDetail, ["pack-detail"], {
  revalidate: 300,
  tags: ["pack-detail"],
});

// ── Packs directory listing ───────────────────────────────────────────────
export interface PackListingRow {
  pack_listing_id: string;
  pack_name: string | null;
  pack_tier_name: string | null;
  moments_per_pack: number | null;
  total_packs: number | null;
  price: number | null;
  currency: string | null;
  started_at: string | null;
  primary_league: string | null;
}

async function _getPacksDirectory(): Promise<PackListingRow[]> {
  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return [];
  }

  try {
    // Fetch distinct pack listings. Since packs table may have multiple rows
    // per pack_listing_id (per-instance), we need DISTINCT. PostgREST doesn't
    // support DISTINCT directly — use a GROUP BY workaround by pulling all rows
    // and de-duplicating in JS. Cap at 2000 to keep response fast.
    const { data, error } = await admin
      .from("packs")
      .select(
        "pack_listing_id, pack_name, pack_tier_name, moments_per_pack, " +
        "total_packs, price, currency, started_at, primary_league",
      )
      .not("pack_listing_id", "is", null)
      .not("pack_name", "is", null)
      .order("started_at", { ascending: false })
      .limit(2000);

    if (error) {
      console.error("[packs-directory] query error", error);
      return [];
    }

    // De-duplicate by pack_listing_id — first occurrence wins (ordered by started_at desc)
    const seen = new Set<string>();
    const rows: PackListingRow[] = [];
    for (const r of (data as PackListingRow[] | null) ?? []) {
      const lid = r.pack_listing_id;
      if (!lid || seen.has(lid)) continue;
      seen.add(lid);
      rows.push(r);
    }
    return rows;
  } catch (e) {
    console.error("[packs-directory] threw", e);
    return [];
  }
}

export const getPacksDirectory = unstable_cache(
  _getPacksDirectory,
  ["packs-directory"],
  { revalidate: 600, tags: ["packs-directory"] },
);
