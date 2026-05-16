// Reads the topshot.v_validation_latest view + per-check history. Powers the
// /admin/data-quality dashboard. Both queries hit the anon client — the
// validation rows are public (RLS policy validation_runs_public_read).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface ValidationRow {
  id: string;
  check_name: string;
  ran_at: string;
  bq_value: unknown;
  sb_value: unknown;
  metric: "spearman" | "pct_delta" | "abs_delta" | "ratio";
  metric_value: number | null;
  threshold: number;
  passed: boolean;
  notes: string | null;
}

async function _getLatestValidationRuns(): Promise<ValidationRow[]> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    const { data, error } = await sb
      .from("v_validation_latest")
      .select("*")
      .order("check_name", { ascending: true });
    if (error) {
      console.error("[supabase] v_validation_latest read failed", error);
      return [];
    }
    return (data ?? []) as ValidationRow[];
  } catch (e) {
    console.error("[supabase] v_validation_latest threw", e);
    return [];
  }
}

export const getLatestValidationRuns = unstable_cache(
  _getLatestValidationRuns,
  ["validation-latest"],
  { revalidate: 60, tags: ["validation"] },
);

async function _getValidationHistory(
  checkName: string,
  limit = 50,
): Promise<ValidationRow[]> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    const { data, error } = await sb
      .from("_validation_runs")
      .select("*")
      .eq("check_name", checkName)
      .order("ran_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[supabase] _validation_runs read failed", error);
      return [];
    }
    return (data ?? []) as ValidationRow[];
  } catch (e) {
    console.error("[supabase] _validation_runs threw", e);
    return [];
  }
}

export const getValidationHistory = (checkName: string, limit = 50) =>
  unstable_cache(
    () => _getValidationHistory(checkName, limit),
    ["validation-history", checkName, String(limit)],
    { revalidate: 60, tags: ["validation"] },
  )();
