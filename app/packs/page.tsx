// /packs — Pack listings directory.
// OTM-parity feature: packs-tracker (entry point for /packs/[id]).
//
// Thin-slice: sortable table of available pack SKUs so traders can browse
// and click into a pack detail page. URL filter state via searchParams.
//
// Comparable primary: OTM Packs tracker (pack list + detail drill-down).
// Signature move ported: pack name as primary clickable, tier badge,
// price column, DROPPED ON date sortable.
//
// URL state: ?sort=<col> &dir=<asc|desc>
// (Pillar 4 §1 mandatory URL-encoded filter state)

import Link from "next/link";
import type { Metadata } from "next";
import {
  getPacksDirectory,
  type PackListingRow,
} from "@/lib/supabase/queries/pack-detail";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { EmptyState } from "@/components/primitives/EmptyState";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Packs · TS·PORTAL",
  description: "Browse every Top Shot pack — drop date, tier, price, contents.",
};

const VALID_SORT_COLS = ["pack_name", "started_at", "price", "total_packs", "moments_per_pack"] as const;
type SortCol = (typeof VALID_SORT_COLS)[number];

function parseSortCol(raw: string | undefined): SortCol {
  if (raw && (VALID_SORT_COLS as readonly string[]).includes(raw)) {
    return raw as SortCol;
  }
  return "started_at";
}

function parseDir(raw: string | undefined): "asc" | "desc" {
  return raw === "asc" ? "asc" : "desc";
}

function droppedOnLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// Normalize tier_name string to a format TierChip understands.
// Pack tier names from DB might be "Legendary" (human-readable) or
// "MOMENT_TIER_LEGENDARY" (the raw enum). TierChip handles both because it
// falls through to raw label if no MOMENT_TIER_ prefix mapping is found.
function normalizeTier(t: string | null | undefined): string | null {
  if (!t) return null;
  // Already canonical
  if (t.startsWith("MOMENT_TIER_")) return t;
  // Convert "Legendary" → "MOMENT_TIER_LEGENDARY"
  return `MOMENT_TIER_${t.toUpperCase()}`;
}

function sortRows(rows: PackListingRow[], col: SortCol, dir: "asc" | "desc"): PackListingRow[] {
  const sorted = [...rows].sort((a, b) => {
    let av: string | number | null, bv: string | number | null;
    switch (col) {
      case "pack_name":
        av = a.pack_name ?? "";
        bv = b.pack_name ?? "";
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      case "started_at":
        av = a.started_at ?? "";
        bv = b.started_at ?? "";
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      case "price":
        av = a.price ?? -Infinity;
        bv = b.price ?? -Infinity;
        return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      case "total_packs":
        av = a.total_packs ?? -Infinity;
        bv = b.total_packs ?? -Infinity;
        return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      case "moments_per_pack":
        av = a.moments_per_pack ?? -Infinity;
        bv = b.moments_per_pack ?? -Infinity;
        return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      default:
        return 0;
    }
  });
  return sorted;
}

function thHref(col: SortCol, current: SortCol, dir: "asc" | "desc"): string {
  const newDir = current === col && dir === "asc" ? "desc" : "asc";
  return `/packs?sort=${col}&dir=${newDir}`;
}

function thLabel(col: SortCol, current: SortCol, dir: "asc" | "desc", label: string): string {
  if (col !== current) return label;
  return `${label} ${dir === "asc" ? "↑" : "↓"}`;
}

export default async function PacksPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const sort = parseSortCol(sp.sort);
  const dir = parseDir(sp.dir);

  const rawRows = await getPacksDirectory();
  const rows = sortRows(rawRows, sort, dir);

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-3">
      <header className="space-y-1">
        <h1 className="text-[18px] font-semibold tracking-tight">Packs</h1>
        <p className="text-[11px] text-[var(--text-faint)]">
          {rows.length.toLocaleString()} pack listings · click a pack to see what&apos;s inside
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No packs found"
          body="The packs ETL has not yet populated topshot.packs. Data lands on the next ETL cycle."
        />
      ) : (
        <div
          data-testid="packs-table"
          className="overflow-x-auto border border-[var(--border-subtle)] rounded-md bg-[var(--surface-1)]"
        >
          <table className="w-full text-[12px] border-collapse">
            <thead className="bg-[var(--surface-2)] sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] w-[40%]">
                  <Link
                    href={thHref("pack_name", sort, dir)}
                    data-testid="th-pack-name"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    {thLabel("pack_name", sort, dir, "PACK NAME")}
                  </Link>
                </th>
                <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)]">
                  TIER
                </th>
                <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)]">
                  <Link
                    href={thHref("started_at", sort, dir)}
                    data-testid="th-started-at"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    {thLabel("started_at", sort, dir, "DROPPED ON")}
                  </Link>
                </th>
                <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                  <Link
                    href={thHref("price", sort, dir)}
                    data-testid="th-price"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    {thLabel("price", sort, dir, "ORIG. PRICE")}
                  </Link>
                </th>
                <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                  <Link
                    href={thHref("total_packs", sort, dir)}
                    data-testid="th-total-packs"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    {thLabel("total_packs", sort, dir, "TOTAL PACKS")}
                  </Link>
                </th>
                <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                  <Link
                    href={thHref("moments_per_pack", sort, dir)}
                    data-testid="th-moments-per-pack"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    {thLabel("moments_per_pack", sort, dir, "MOMENTS/PACK")}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.pack_listing_id}
                  data-testid="pack-row"
                  className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-2)] group"
                >
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/packs/${encodeURIComponent(row.pack_listing_id)}`}
                      data-testid="pack-row-link"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {row.pack_name ?? row.pack_listing_id}
                    </Link>
                    {row.primary_league && (
                      <span className="ml-2 text-[9px] text-[var(--text-faint)] tracking-data-label">
                        {row.primary_league}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <TierChip tier={normalizeTier(row.pack_tier_name)} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-dim)]">
                    {droppedOnLabel(row.started_at)}
                  </td>
                  <td className="px-3 py-2 text-right tnum">
                    <Num value={row.price} format="usd" />
                  </td>
                  <td className="px-3 py-2 text-right tnum">
                    <Num value={row.total_packs} format="int" />
                  </td>
                  <td className="px-3 py-2 text-right tnum">
                    <Num value={row.moments_per_pack} format="int" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
