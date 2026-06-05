// Supply timeline query — reads topshot.supply_timeline + topshot.supply_snapshot.
// Governing spec: specs/001-supply-timeline/spec.md  (FR-3)
//
// Both tables are populated by scripts/etl/bq-refresh-supply-timeline.mjs from the
// FULL BigQuery moment history (the Supabase topshot.moments mirror is partial and
// cannot produce the true curve). This module just reads the rolled-up result and
// derives the cumulative + yearly views the page renders.
//
// Honest-absence: returns null when the tables are empty / unreadable. The page
// MUST render an empty state, never a zeroed chart masquerading as data.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface SupplySnapshot {
  totalMinted: number;
  totalBurned: number;
  currentlyLocked: number;
  currentlyMinted: number;
  circulating: number;
  firstMintMonth: string | null;
  firstBurnMonth: string | null;
  lockLaunchMonth: string | null;
  spannerReportedCount: number | null;
  bqTotalRows: number | null;
  refreshedAt: string;
}

/** One calendar month of supply flow + running cumulative state at month end. */
export interface SupplyMonth {
  month: string; // YYYY-MM-DD (first of month)
  minted: number; // minted this month
  burned: number; // burned this month
  lockEvents: number; // locks initiated this month
  lockExits: number; // unlocks + burns-while-locked this month
  cumMinted: number; // ever minted through month end
  cumBurned: number; // ever burned through month end
  circulating: number; // cumMinted - cumBurned
  netLocked: number; // running (lockEvents - lockExits)
}

/** One calendar year — the default framing ("year by year"). */
export interface SupplyYear {
  year: number;
  minted: number; // minted during the year
  burned: number; // burned during the year
  cumMintedEnd: number; // ever minted by year end
  cumBurnedEnd: number; // ever burned by year end
  circulatingEnd: number; // circulating at year end
  netLockedEnd: number; // net locked at year end
}

export interface SupplyTimeline {
  snapshot: SupplySnapshot;
  monthly: SupplyMonth[];
  yearly: SupplyYear[];
}

interface RawSnapshot {
  total_minted: number;
  total_burned: number;
  currently_locked: number;
  currently_minted: number;
  circulating: number;
  first_mint_month: string | null;
  first_burn_month: string | null;
  lock_launch_month: string | null;
  spanner_reported_count: number | null;
  bq_total_rows: number | null;
  refreshed_at: string;
}

interface RawMonth {
  month: string;
  minted: number;
  burned: number;
  lock_events: number;
  lock_exits: number;
}

async function _getSupplyTimeline(): Promise<SupplyTimeline | null> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return null;

    const [snapRes, tlRes] = await Promise.all([
      sb.from("supply_snapshot").select("*").eq("singleton_id", 1).maybeSingle(),
      sb
        .from("supply_timeline")
        .select("month,minted,burned,lock_events,lock_exits")
        .order("month", { ascending: true }),
    ]);

    if (snapRes.error) {
      console.error("[supabase] supply_snapshot read failed", snapRes.error);
      return null;
    }
    if (tlRes.error) {
      console.error("[supabase] supply_timeline read failed", tlRes.error);
      return null;
    }

    const rawSnap = snapRes.data as RawSnapshot | null;
    const rawRows = (tlRes.data as RawMonth[] | null) ?? [];
    if (!rawSnap || rawRows.length === 0) return null;

    // ── Cumulative monthly curves
    let cumMinted = 0;
    let cumBurned = 0;
    let netLocked = 0;
    const monthly: SupplyMonth[] = rawRows.map((r) => {
      cumMinted += r.minted;
      cumBurned += r.burned;
      netLocked += r.lock_events - r.lock_exits;
      return {
        month: r.month,
        minted: r.minted,
        burned: r.burned,
        lockEvents: r.lock_events,
        lockExits: r.lock_exits,
        cumMinted,
        cumBurned,
        circulating: cumMinted - cumBurned,
        netLocked,
      };
    });

    // ── Yearly rollup (the default "year by year" framing)
    const byYear = new Map<number, SupplyYear>();
    for (const m of monthly) {
      const year = Number(m.month.slice(0, 4));
      const acc =
        byYear.get(year) ??
        {
          year,
          minted: 0,
          burned: 0,
          cumMintedEnd: 0,
          cumBurnedEnd: 0,
          circulatingEnd: 0,
          netLockedEnd: 0,
        };
      acc.minted += m.minted;
      acc.burned += m.burned;
      // End-of-year cumulative = the last month's cumulative seen for that year.
      acc.cumMintedEnd = m.cumMinted;
      acc.cumBurnedEnd = m.cumBurned;
      acc.circulatingEnd = m.circulating;
      acc.netLockedEnd = m.netLocked;
      byYear.set(year, acc);
    }
    const yearly = Array.from(byYear.values()).sort((a, b) => a.year - b.year);

    const snapshot: SupplySnapshot = {
      totalMinted: rawSnap.total_minted,
      totalBurned: rawSnap.total_burned,
      currentlyLocked: rawSnap.currently_locked,
      currentlyMinted: rawSnap.currently_minted,
      circulating: rawSnap.circulating,
      firstMintMonth: rawSnap.first_mint_month,
      firstBurnMonth: rawSnap.first_burn_month,
      lockLaunchMonth: rawSnap.lock_launch_month,
      spannerReportedCount: rawSnap.spanner_reported_count,
      bqTotalRows: rawSnap.bq_total_rows,
      refreshedAt: rawSnap.refreshed_at,
    };

    return { snapshot, monthly, yearly };
  } catch (e) {
    console.error("[supabase] supply-timeline read threw", e);
    return null;
  }
}

export const getSupplyTimeline = () =>
  unstable_cache(_getSupplyTimeline, ["supply-timeline"], {
    revalidate: 3600,
    tags: ["supply-timeline"],
  })();
