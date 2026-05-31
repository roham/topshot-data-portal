// Reads mv_cohort_cap_daily (daily floor cap per cohort, outlier-guarded) for a
// normal absolute-$ time-series that zooms with the site-standard window bubbles.
// ~7K rows total → MUST paginate (PostgREST hard 1000-row cap; .limit() does NOT
// override server max-rows). We also scope by the visible cohorts + the window's
// date range so short windows stay to a single page.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface CohortDayRow { cohort: string; date: string; cap: number; eds: number; }

const PAGE = 1000;

async function _getCohortDaily(cohorts: string[], sinceDays: number | null): Promise<CohortDayRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb || cohorts.length === 0) return [];

  // Cutoff is computed from the MV's own max date, not wall-clock — data can be
  // stale and a now()-based window would silently show an empty chart.
  let cutoff: string | null = null;
  if (sinceDays != null) {
    const { data: maxRow, error: maxErr } = await sb
      .from("mv_cohort_cap_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1);
    if (maxErr) { console.error("[cohort-daily] max-date read failed", maxErr); return []; }
    const maxd = (maxRow as { date: string }[] | null)?.[0]?.date;
    if (maxd) {
      const d = new Date(maxd + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - sinceDays);
      cutoff = d.toISOString().slice(0, 10);
    }
  }

  const out: CohortDayRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb
      .from("mv_cohort_cap_daily")
      .select("cohort, date, cap, eds")
      .in("cohort", cohorts)
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (cutoff) q = q.gte("date", cutoff);
    const { data, error } = await q;
    if (error) { console.error("[cohort-daily] read failed", error); break; }
    const rows = (data as Record<string, unknown>[] | null) ?? [];
    out.push(...rows.map((r) => ({
      cohort: String(r.cohort), date: String(r.date).slice(0, 10), cap: Number(r.cap), eds: Number(r.eds),
    })));
    if (rows.length < PAGE) break;
  }
  return out;
}

// Cache key includes cohorts + window so each view/window caches independently;
// bump "v1" whenever the computation changes (unstable_cache persists across deploys).
export const getCohortDaily = (cohorts: string[], sinceDays: number | null) =>
  unstable_cache(
    () => _getCohortDaily(cohorts, sinceDays),
    ["cohort-daily-v1", [...cohorts].sort().join(","), String(sinceDays)],
    { revalidate: 600, tags: ["cohort-daily", "mv_cohort_cap_daily"] },
  )();
