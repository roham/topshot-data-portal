// /moments — the filterable Moments grid. OTM centerpiece port.
//
// Server component: reads searchParams, resolves filters, queries Supabase,
// renders OTM-shape layout (persistent left filter rail + sortable table on
// the right). Filter state lives entirely in the URL via nuqs (no client
// fetching). Pagination is also URL-driven.
//
// This page is intentionally render-on-demand (no ISR) because the filter
// space is large and listing_price_usd shifts every few minutes. Cache
// surfaces sit lower in the stack (queryMomentsGrid uses no Next cache; the
// CDN sees Cache-Control: no-store via cache:'no-store' in fetch).

import Link from "next/link";
import type { Metadata } from "next";
import { TopNav } from "@/components/TopNav";
import {
  queryMomentsGrid,
  queryDistinctTiers,
  queryTopListedPlayers,
  type MomentsGridFilters,
  type MomentsGridSortKey,
  type MomentsGridRow,
} from "@/lib/supabase/queries/moments-grid";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { EmptyState } from "@/components/primitives/EmptyState";
import { MomentsFilterRail } from "./MomentsFilterRail";
import { SortableHeader } from "./SortableHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Moments · TS·PORTAL",
  description: "Filterable grid over every Top Shot moment — player, tier, price, serial. The OTM centerpiece, ported.",
};

// nuqs delivers tiers as a comma-joined string in URLs by default. Parse here
// for the server query side.
function parseTiersParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function parseIntParam(raw: string | string[] | undefined): number | undefined {
  if (!raw) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return isFinite(n) && n > 0 ? n : undefined;
}

function parseStringParam(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s && s.length > 0 ? s : undefined;
}

const VALID_SORTS: MomentsGridSortKey[] = [
  "listing_price_asc",
  "listing_price_desc",
  "serial_asc",
  "serial_desc",
  "ts_score_desc",
  "released_desc",
];

function parseSort(raw: string | string[] | undefined): MomentsGridSortKey {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return VALID_SORTS.includes(s as MomentsGridSortKey) ? (s as MomentsGridSortKey) : "listing_price_asc";
}

export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters: MomentsGridFilters = {
    player: parseStringParam(sp.player),
    tiers: parseTiersParam(sp.tiers),
    league: parseStringParam(sp.league),
    maxPriceUsd: parseIntParam(sp.maxPrice),
    maxSerial: parseIntParam(sp.maxSerial),
    setName: parseStringParam(sp.set),
    listedOnly: sp.listed !== "false",
  };

  const sort = parseSort(sp.sort);
  const page = parseIntParam(sp.page) ?? 1;

  // Fan out: rows + tier list + top-player typeahead. These are independent,
  // mechanically-verifiable IO calls (no creative canon) — parallel is fine
  // per the Sinbad lesson (on-canon-decoherence-at-fan-out applies to
  // creative work, not data fetches).
  const [result, tierOptions, topPlayers] = await Promise.all([
    queryMomentsGrid({ filters, sort, page }),
    queryDistinctTiers(),
    queryTopListedPlayers(),
  ]);

  const { rows, total, pageSize, hasMore, cappedTotal } = result;
  const totalLabel = cappedTotal ? `${total.toLocaleString("en-US")}+` : total.toLocaleString("en-US");
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = (page - 1) * pageSize + rows.length;
  const exportQs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (typeof v === "string") exportQs.set(k, v);
    else if (Array.isArray(v) && v[0]) exportQs.set(k, v[0]);
  });
  exportQs.set("format", "csv");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <TopNav />
      <main className="max-w-[1440px] mx-auto px-4 py-4">
        <header className="mb-4">
          <h1 className="text-[18px] font-semibold tracking-tight">
            Moments<span className="text-[var(--accent)] mx-1.5">·</span>
            <span className="text-[var(--text-dim)] text-[13px] tracking-normal font-normal">filter every listed moment in the universe</span>
          </h1>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--text-faint)] font-mono">
            <span>
              <span className="text-[var(--text)] tnum">{totalLabel}</span> matches
            </span>
            <span>·</span>
            <span className="tnum">
              showing {startRow.toLocaleString("en-US")}–{endRow.toLocaleString("en-US")}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <a
                href={`/api/moments/export?${exportQs.toString()}`}
                className="text-[var(--text-dim)] hover:text-[var(--accent)] underline-offset-2 hover:underline"
                data-testid="moments-export-csv"
              >
                ⤓ EXPORT CSV
              </a>
            </span>
          </div>
        </header>

        <div className="flex gap-4">
          <MomentsFilterRail tierOptions={tierOptions} topPlayers={topPlayers} />

          <section className="flex-1 min-w-0">
            {rows.length === 0 ? (
              <div className="border border-[var(--border-subtle)] rounded-md">
                <EmptyState
                  title="No moments match these filters."
                  body="Loosen the price ceiling, add another tier, or clear the player filter. The universe currently contains ~3.5M moments across all tiers."
                />
              </div>
            ) : (
              <MomentsTable rows={rows} />
            )}

            <Paginator page={page} pageSize={pageSize} total={total} hasMore={hasMore} cappedTotal={cappedTotal} currentSp={sp} />
          </section>
        </div>

        <footer className="mt-8 text-[10px] text-[var(--text-faint)] leading-relaxed">
          <p>
            Source: <code className="font-mono">topshot.moments</code> LEFT JOIN <code className="font-mono">topshot.editions</code>. &quot;Listed&quot; means
            <code className="font-mono ml-1">listing_price_usd IS NOT NULL</code> — the canonical predicate per
            <code className="font-mono ml-1">research/wiki/gotchas/moment-status-listed-is-empty.md</code>.
          </p>
          <p className="mt-1">
            Total counts cap at 10,000+ to keep pagination snappy. To narrow the universe, add a player + tier filter.
          </p>
        </footer>
      </main>
    </div>
  );
}

function MomentsTable({ rows }: { rows: MomentsGridRow[] }) {
  return (
    <div className="border border-[var(--border-subtle)] rounded-md overflow-x-auto bg-[var(--surface-1)]/30">
      <table className="w-full text-[12px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Moment</th>
            <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Edition</th>
            <th className="text-right py-2.5 px-3">
              <SortableHeader label="Serial" ascKey="serial_asc" descKey="serial_desc" align="right" data-testid="th-serial" />
            </th>
            <th className="text-right py-2.5 px-3">
              <SortableHeader label="TS Score" ascKey="ts_score_desc" descKey="ts_score_desc" align="right" data-testid="th-ts-score" />
            </th>
            <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Tier</th>
            <th className="text-right py-2.5 px-3">
              <SortableHeader label="Ask" ascKey="listing_price_asc" descKey="listing_price_desc" align="right" data-testid="th-listing-price" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.moment_id}
              className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-1)]/60 transition-colors"
              data-testid="moment-row"
            >
              <td className="py-2 px-3 max-w-[360px]">
                <Link
                  href={r.moment_flow_id ? `/moment/${r.moment_flow_id}` : `#`}
                  className="block leading-tight"
                  data-testid="moment-row-link"
                >
                  <div className="text-[var(--text)] font-medium truncate">{r.player_name ?? "—"}</div>
                  <div className="text-[10px] text-[var(--text-dim)] truncate">
                    {r.play_name ?? "—"}
                  </div>
                </Link>
              </td>
              <td className="py-2 px-3 max-w-[260px]">
                <div className="text-[var(--text)] truncate">{r.set_name ?? "—"}</div>
                <div className="text-[10px] text-[var(--text-dim)] truncate">{r.series_name ?? "—"}</div>
              </td>
              <td className="py-2 px-3 text-right tnum">
                <span className="text-[var(--text)]">#{r.serial_number?.toLocaleString("en-US") ?? "—"}</span>
                {r.mint_count != null && (
                  <span className="text-[var(--text-faint)]"> / {r.mint_count.toLocaleString("en-US")}</span>
                )}
              </td>
              <td className="py-2 px-3 text-right tnum text-[var(--text-dim)]">
                {r.top_shot_score != null ? r.top_shot_score.toFixed(0) : "—"}
              </td>
              <td className="py-2 px-3">
                <TierChip tier={tierToToken(r.tier_name)} />
              </td>
              <td className="py-2 px-3 text-right">
                <Num value={r.listing_price_usd} format="usd" className="text-[var(--text)] text-[13px]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tierToToken(name: string | null | undefined): string {
  if (!name) return "";
  // Map editions.tier_name ("Common", "Rare", …) to the TierChip enum token
  // ("MOMENT_TIER_COMMON", …). Anthology has no theme token; let TierChip
  // fall through to its default.
  const upper = name.toUpperCase();
  if (upper === "ANTHOLOGY") return "MOMENT_TIER_ULTIMATE"; // visual fallback
  return `MOMENT_TIER_${upper}`;
}

function Paginator({
  page,
  pageSize,
  total,
  hasMore,
  cappedTotal,
  currentSp,
}: {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  cappedTotal: boolean;
  currentSp: Record<string, string | string[] | undefined>;
}) {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

  function urlFor(p: number): string {
    const qs = new URLSearchParams();
    Object.entries(currentSp).forEach(([k, v]) => {
      if (k === "page") return;
      if (typeof v === "string" && v.length > 0) qs.set(k, v);
      else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
    });
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/moments?${s}` : "/moments";
  }

  return (
    <nav className="flex items-center justify-between mt-3 text-[11px] font-mono">
      <span className="text-[var(--text-faint)]">
        page {page.toLocaleString("en-US")} / {cappedTotal ? "10,000+" : totalPages.toLocaleString("en-US")}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={urlFor(page - 1)}
            className="px-2.5 py-1 border border-[var(--border-subtle)] rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
            data-testid="paginator-prev"
          >
            ← prev
          </Link>
        ) : (
          <span className="px-2.5 py-1 border border-[var(--border-subtle)]/40 rounded text-[var(--text-faint)]">← prev</span>
        )}
        {hasMore ? (
          <Link
            href={urlFor(page + 1)}
            className="px-2.5 py-1 border border-[var(--border-subtle)] rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
            data-testid="paginator-next"
          >
            next →
          </Link>
        ) : (
          <span className="px-2.5 py-1 border border-[var(--border-subtle)]/40 rounded text-[var(--text-faint)]">next →</span>
        )}
      </div>
    </nav>
  );
}
