// /player/[id]/v/b — Player page Variant B: compact matrix + inline-expand parallels.
//
// Feature: player-detail-variant-b-drill-down (priority 4, beyond_otm).
//
// Comparable primary: Basketball-Reference expandable career-stats sections.
//   Signature moves ported:
//   · Compact (set × tier) matrix as landing surface — identical to base /player/[id]
//   · ▼ caret + ×N badge on cells where multiple parallels exist
//   · Click caret → inline sub-rows below parent set row (no page navigation)
//   · Lighter sub-row background (IBKR Mosaic fill-details pattern)
//   · Nested micro-table: parallel_name | circulation | listings | low_ask | high_offer
//
// vs Variant A (three-axis): Variant B keeps the compact 5-column layout;
// parallels are revealed on demand — not as permanent columns.
//
// URL state (Pillar 4 §1 mandatory):
//   ?q=<set-name-filter> — server-side, survives refresh (form submit)
//   ?expand=<key>[,<key>...] — client-side via nuqs, persists in URL
//   Key format: <set_id>:<tierAbbr> (e.g., "abc123:C")

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlayerDetail } from "@/lib/supabase/queries/player-detail";
import { getPlayerVariantBData } from "@/lib/supabase/queries/player-variant-b";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { EmptyState } from "@/components/primitives/EmptyState";
import {
  ExpandableMatrix,
  type VariantBCellData,
  type VariantBRowData,
  type VariantBSubRow,
} from "./ExpandableMatrix";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  const name = detail.player?.full_name ?? `Player ${id}`;
  return { title: `${name} · Variant B · TS·PORTAL` };
}

// ── Tier column definitions (fixed, must match ExpandableMatrix.TIER_COLS) ──────
const TIER_COLS = [
  { tier: "Common",    abbr: "C", raw: "MOMENT_TIER_COMMON" },
  { tier: "Rare",      abbr: "R", raw: "MOMENT_TIER_RARE" },
  { tier: "Legendary", abbr: "L", raw: "MOMENT_TIER_LEGENDARY" },
  { tier: "Fandom",    abbr: "F", raw: "MOMENT_TIER_FANDOM" },
  { tier: "Ultimate",  abbr: "U", raw: "MOMENT_TIER_ULTIMATE" },
] as const;

// Normalize tier_name to canonical display form.
// Handles both "MOMENT_TIER_*" format and "Anthology" → "Ultimate".
function normalizeTier(tier: string | null): string | null {
  if (!tier) return null;
  if (tier === "Anthology") return "Ultimate";
  if (tier.startsWith("MOMENT_TIER_")) {
    const suffix = tier.replace("MOMENT_TIER_", "");
    return suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
  }
  return tier;
}

// Career volume windows (same as base player page)
const VOLUME_WINDOWS = [
  { label: "24h", key: "volume24h" as const },
  { label: "7d",  key: "volume7d"  as const },
  { label: "30d", key: "volume30d" as const },
  { label: "1y",  key: "volume1y"  as const },
  { label: "ALL", key: "volumeAllTime" as const },
] as const;

export default async function PlayerVariantBPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  // ?q= set-name filter (server-side, URL-encoded, Pillar 4 §1)
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const qLower = qRaw.toLowerCase();

  // Parallel fetch: player header + variant-b matrix data
  const [detail, variantB] = await Promise.all([
    getPlayerDetail(id),
    getPlayerVariantBData(id),
  ]);

  // Resolve player name from either source
  const playerName =
    detail.player?.full_name ??
    variantB.playerName ??
    null;

  if (!playerName && variantB.rows.length === 0) {
    notFound();
  }

  const p = detail.player;

  // ── Build matrix rows from variantB.rows ─────────────────────────────────
  // Group editions by set_id → then by tier → build VariantBRowData[]

  // First, index editions by set_id
  const setEditionMap = new Map<
    string,
    {
      set_id: string;
      set_name: string | null;
      series_number: number | null;
      editions: typeof variantB.rows;
    }
  >();

  for (const row of variantB.rows) {
    const key = row.set_id ?? "__unknown__";
    if (!setEditionMap.has(key)) {
      setEditionMap.set(key, {
        set_id: row.set_id ?? "__unknown__",
        set_name: row.set_name,
        series_number: row.series_number,
        editions: [],
      });
    }
    setEditionMap.get(key)!.editions.push(row);
  }

  // Sort: series DESC, set_name ASC (Basketball-Reference newest-season-first)
  const allSetGroups = [...setEditionMap.values()].sort((a, b) => {
    const sa = a.series_number ?? -1;
    const sb2 = b.series_number ?? -1;
    if (sb2 !== sa) return sb2 - sa;
    return (a.set_name ?? "").localeCompare(b.set_name ?? "");
  });

  // ?q= filter (server-side)
  const filteredSetGroups = qLower
    ? allSetGroups.filter(
        (g) =>
          (g.set_name ?? "").toLowerCase().includes(qLower) ||
          String(g.series_number ?? "").includes(qLower),
      )
    : allSetGroups;

  // Build VariantBRowData[] for the client component
  const matrixRows: VariantBRowData[] = filteredSetGroups.map((group) => {
    // For each TIER_COL, find all editions in this (set × tier) group
    const cells: VariantBCellData[] = TIER_COLS.map((tc) => {
      const tierEditions = group.editions.filter(
        (e) => normalizeTier(e.tier_name) === tc.tier,
      );

      if (tierEditions.length === 0) {
        return {
          tierAbbr: tc.abbr,
          tier: tc.tier,
          tierRaw: tc.raw,
          hasEdition: false,
          minFloor: null,
          maxCirculation: 0,
          count: 0,
          subRows: [],
        };
      }

      // Aggregate parent cell values
      const floors = tierEditions
        .map((e) => e.low_ask)
        .filter((v): v is number => v != null);
      const circulations = tierEditions.map((e) => e.circulation);

      const minFloor = floors.length > 0 ? Math.min(...floors) : null;
      const maxCirculation =
        circulations.length > 0 ? Math.max(...circulations) : 0;

      // Sub-rows: one per parallel edition (Pillar 5 §6 — never aggregate parallels)
      const subRows: VariantBSubRow[] = tierEditions.map((e) => ({
        edition_id: e.edition_id,
        parallel_name: e.parallel_name,
        circulation: e.circulation,
        listings_count: e.listings_count,
        low_ask: e.low_ask,
        high_offer: e.high_offer,
      }));

      return {
        tierAbbr: tc.abbr,
        tier: tc.tier,
        tierRaw: tc.raw,
        hasEdition: true,
        minFloor,
        maxCirculation,
        count: tierEditions.length,
        subRows,
      };
    });

    // Set total market cap from detail.editionFloors (for "All tiers" column)
    let setTotalMktCap: number | null = null;
    for (const e of group.editions) {
      const mc = detail.editionFloors[e.edition_id]?.marketCap;
      if (mc != null) {
        setTotalMktCap = (setTotalMktCap ?? 0) + mc;
      }
    }

    return {
      set_id: group.set_id,
      set_name: group.set_name,
      series_number: group.series_number,
      cells,
      setTotalMktCap,
    };
  });

  // Grand total market cap
  const grandTotalMktCap =
    detail.marketCap?.total_market_cap_usd != null
      ? Number(detail.marketCap.total_market_cap_usd)
      : null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="space-y-1" data-testid="player-header">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <Link href={`/player/${id}`} className="hover:text-[var(--accent)]">
            ← player detail
          </Link>
          <Link href="/players" className="hover:text-[var(--accent)]">
            players
          </Link>
          <span>id: {id}</span>
          {p?.last_known_team_full_name && (
            <span>{p.last_known_team_full_name}</span>
          )}
          {p?.last_known_primary_position && (
            <span>{p.last_known_primary_position}</span>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <h1
            className="text-[22px] font-semibold tracking-tight"
            data-testid="player-name"
          >
            {playerName ?? `Player ${id}`}
          </h1>
          <span className="text-[11px] font-mono text-[var(--text-dim)] border border-[var(--border-subtle)] rounded px-2 py-0.5">
            Variant B — drill-down
          </span>
          {detail.marketCapRank != null && (
            <span
              className="text-[11px] font-mono text-[var(--text-dim)] border border-[var(--border-subtle)] rounded px-2 py-0.5"
              data-testid="player-market-cap-rank"
            >
              rank #{detail.marketCapRank.toLocaleString()} by market cap
            </span>
          )}
          {grandTotalMktCap != null && (
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              market cap{" "}
              <span className="text-[var(--text)] font-semibold">
                <Num value={grandTotalMktCap} format="usdCompact" />
              </span>
            </span>
          )}
        </div>

        {/* Variant nav links */}
        <div className="flex gap-2 text-[10px] font-mono flex-wrap">
          <Link
            href={`/player/${id}`}
            className="text-[var(--text-faint)] hover:text-[var(--accent)] border border-[var(--border-subtle)] rounded px-2 py-0.5"
          >
            Base matrix
          </Link>
          <Link
            href={`/player/${id}/v/a`}
            className="text-[var(--text-faint)] hover:text-[var(--accent)] border border-[var(--border-subtle)] rounded px-2 py-0.5"
          >
            Variant A
          </Link>
          <span className="border border-[var(--accent)] text-[var(--accent)] rounded px-2 py-0.5">
            Variant B
          </span>
        </div>
      </header>

      {/* ── Editions matrix (drill-down) ──────────────────────────────────── */}
      <Card
        title="Editions matrix — drill-down"
        subtitle={`${variantB.rows.length} editions · ${allSetGroups.length} sets · click ▼ to expand parallels`}
        variant="inset"
        methodology="Editions by set × tier. Parent cell shows the minimum active ask across parallels in that cell. ×N badge = N distinct parallels share the cell. Click ▼ to expand each parallel with its own circulation, active listings, low ask, and highest offer."
        right={
          qLower ? (
            <Link
              href={`/player/${id}/v/b`}
              className="text-[10px] font-mono text-[var(--accent)] hover:underline"
            >
              clear filter
            </Link>
          ) : null
        }
      >
        {/* Set search — URL state via ?q= (server re-render, no JS required) */}
        <form
          method="GET"
          action={`/player/${id}/v/b`}
          className="flex items-center gap-2 px-3 pt-3 pb-2"
        >
          <input
            type="text"
            name="q"
            defaultValue={qRaw}
            placeholder="Filter sets…"
            autoComplete="off"
            className="w-full sm:w-[260px] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[12px] font-mono text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
            data-testid="variant-b-set-search"
          />
          <button
            type="submit"
            className="text-[11px] font-mono text-[var(--accent)] border border-[var(--border-subtle)] rounded px-2 py-1 hover:border-[var(--accent)]"
          >
            filter
          </button>
        </form>

        {variantB.rows.length === 0 ? (
          <EmptyState
            title="No editions resolved"
            body="Editions for this player are still loading. Check back in a few minutes."
          />
        ) : filteredSetGroups.length === 0 ? (
          <div className="px-3 pb-3">
            <EmptyState
              title={`No sets match "${qRaw}"`}
              body="Try a different filter or clear the search to see all sets."
              action={
                <Link
                  href={`/player/${id}/v/b`}
                  className="text-[11px] text-[var(--accent)] underline"
                >
                  clear filter
                </Link>
              }
            />
          </div>
        ) : (
          /* ExpandableMatrix — "use client" component manages expand state */
          <ExpandableMatrix
            rows={matrixRows}
            playerId={id}
          />
        )}
      </Card>

      {/* ── Career volume table (same as base player page) ────────────────── */}
      <Card
        title="Career volume"
        subtitle="all transaction windows"
        variant="inset"
        methodology="Trailing window volume aggregates. ALL-time is bounded by the start of our data coverage."
      >
        <div className="overflow-x-auto" data-testid="career-volume-table">
          <table className="w-full text-[12px] font-mono">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] w-16">
                  Window
                </th>
                <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
                  $ Volume
                </th>
                <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
                  Trades
                </th>
                <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
                  Median price
                </th>
              </tr>
            </thead>
            <tbody>
              {VOLUME_WINDOWS.map((w) => {
                const vol = detail[w.key];
                const totalVol =
                  vol?.total_volume_usd != null
                    ? Number(vol.total_volume_usd)
                    : null;
                const txCount =
                  vol?.tx_count != null ? Number(vol.tx_count) : null;
                const median =
                  vol?.median_price_usd != null
                    ? Number(vol.median_price_usd)
                    : null;
                return (
                  <tr
                    key={w.label}
                    className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-2)]/30 transition-colors"
                    data-testid="volume-row"
                    data-window={w.label}
                  >
                    <td className="py-2 px-3 text-[var(--text-dim)] font-semibold">
                      {w.label}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Num
                        value={totalVol}
                        format="usdCompact"
                        className="text-[var(--text)]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Num
                        value={txCount}
                        format="int"
                        className="text-[var(--text-dim)]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Num
                        value={median}
                        format="usd"
                        className="text-[var(--text-dim)]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-[10px] text-[var(--text-faint)] font-mono leading-snug">
        Blank cell = no edition for that (set × tier). 🆕 BE FIRST = circulation
        &gt; 0 but no active listings yet. Click ▼ to drill into per-parallel
        detail.
      </div>

    </div>
  );
}
