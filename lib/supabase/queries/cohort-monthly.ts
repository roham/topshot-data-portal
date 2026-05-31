// Reads mv_cohort_cap_monthly (monthly floor cap per cohort, outlier-guarded) for
// overlaid time-series line charts. ~170 rows, one read.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface CohortMonthRow { cohort: string; month: string; cap: number; eds: number; }

async function _getCohortMonthly(): Promise<CohortMonthRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("mv_cohort_cap_monthly")
      .select("cohort, month, cap, eds")
      .order("month", { ascending: true })
      .limit(2000);
    if (error) { console.error("[cohort-monthly] read failed", error); return []; }
    return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      cohort: String(r.cohort), month: String(r.month).slice(0, 7), cap: Number(r.cap), eds: Number(r.eds),
    }));
  } catch (e) { console.error("[cohort-monthly] threw", e); return []; }
}

export const getCohortMonthly = () =>
  unstable_cache(_getCohortMonthly, ["cohort-monthly-v1"], {
    revalidate: 600, tags: ["cohort-monthly", "mv_cohort_cap_monthly"],
  })();
