// /player/[id]/v/a — Player page Variant A: three-axis matrix (rows=set, cols=tier×parallel).
//
// Feature: player-detail-variant-a-three-axis-matrix (priority 4, beyond_otm).
//
// Comparable primary: StockX size × condition grid.
//   Signature moves ported:
//   · 2D sparse grid: rows = sets (series DESC), columns = (tier × parallel)
//   · Column header = compound label "Common · Base", "Common · Crystal", etc. (Discogs move)
//   · Cell value = low_ask (dominant) + listings_count (secondary, muted)
//   · "—" for missing editions (no circulation); NewDropTag for unlisted-with-circulation
//   · Column headers fixed-width; body wrapper overflow-x-auto (horizontal scroll)
//
// Cross-domain comparables:
//   · Discogs format×region matrix: compound column headers "Format, Region"
//   · Basketball-Reference per-season grid: newest series at top
//
// Parallels NEVER aggregated (Pillar 5 §6):
//   · Each (tier × parallel) combination is its own column — never merged.
//
// URL state (Pillar 4 §1, mandatory):
//   ?q=<set-name-filter> — server-side filter on set rows
//   (URL-encoded; survives refresh; no JS required)

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlayerVariantAData } from "@/lib/supabase/queries/player-variant-a";
import { getPlayerDetail } from "@/lib/supabase/queries/player-detail";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { EmptyState } from "@/components/primitives/EmptyState";
import { NewDropTag } from "@/components/primitives/NewDropTag";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  const name = detail.player?.full_name ?? `Player ${id}`;
  return { title: `${name} · Variant A · TS·PORTAL` };
}

// ── Tier rarity ordering (Common → Fandom → Rare → Legendary → Ultimate) ─────
const TIER_ORDER: Record<string, number> = {
  Common: 1,
  Fandom: 2,
  Rare: 3,
  Legendary: 4,
  Ultimate: 5,
};

// Map raw DB tier_name strings to canonical display tier
function canonicalTierName(tier: string | null): string {
  if (!tier) return "Unknown";
  // Handle MOMENT_TIER_* format
  if (tier.startsWith("MOMENT_TIER_")) {
    const suffix = tier.replace("MOMENT_TIER_", "");
    return suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
  }
  return tier;
}

function tierSortOrder(tierName: string | null): number {
  const canonical = canonicalTierName(tierName);
  return TIER_ORDER[canonical] ?? 99;
}

// Column key: stable unique identifier for (tier × parallel) pair
function colKey(tier: string | null, parallel: string): string {
  return `${canonicalTierName(tier)}__${parallel}`;
}

// Column label: "Common · Base" — Discogs compound header move
function colLabel(tier: string | null, parallel: string): string {
  return `${canonicalTierName(tier)} · ${parallel}`;
}

// Stable tier chip key for TierChip (needs MOMENT_TIER_* format)
function tierChipKey(tier: string | null): string {
  if (!tier) return "";
  if (tier.startsWith("MOMENT_TIER_")) return tier;
  return `MOMENT_TIER_${tier.toUpperCase()}`;
}

export default async function PlayerVariantAPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  // ?q= set-name filter (URL-encoded, server-side, Pillar 4 §1 mandatory)
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const qLower = qRaw.toLowerCase();

  // Parallel fetch: player header + variant-a matrix data
  const [detail, variantA] = await Promise.all([
    getPlayerDetail(id),
    getPlayerVariantAData(id),
  ]);

  // Resolve player name from either source
  const playerName =
    detail.player?.full_name ??
    variantA.playerName ??
    null;

  if (!playerName && variantA.rows.length === 0) {
    notFound();
  }

  const p = detail.player;

  // ── Build unique (tier × parallel) columns ────────────────────────────────
  // Each unique combination is its own column — never merged (Pillar 5 §6).
  const colSet = new Map<string, { tier: string | null; parallel: string }>();
  for (const row of variantA.rows) {
    const key = colKey(row.tier_name, row.parallel_name);
    if (!colSet.has(key)) {
      colSet.set(key, { tier: row.tier_name, parallel: row.parallel_name });
    }
  }

  // Sort columns: tier rarity ASC, then parallel_name ASC within tier
  const columns = [...colSet.entries()]
    .sort(([, a], [, b]) => {
      const ta = tierSortOrder(a.tier);
      const tb = tierSortOrder(b.tier);
      if (ta !== tb) return ta - tb;
      return a.parallel.localeCompare(b.parallel);
    })
    .map(([key, { tier, parallel }]) => ({ key, tier, parallel }));

  // ── Build set rows ────────────────────────────────────────────────────────
  // Group editions by set_id; each group = one row in the matrix.
  const setMap = new Map<
    string,
    {
      set_id: string | null;
      set_name: string | null;
      series_number: number | null;
      // cell data: colKey → {low_ask, listings_count, circulation}
      cells: Map<string, { low_ask: number | null; listings_count: number; circulation: number }>;
    }
  >();

  for (const row of variantA.rows) {
    const setKey = row.set_id ?? "__unknown__";
    if (!setMap.has(setKey)) {
      setMap.set(setKey, {
        set_id: row.set_id,
        set_name: row.set_name,
        series_number: row.series_number,
        cells: new Map(),
      });
    }
    const group = setMap.get(setKey)!;
    const ck = colKey(row.tier_name, row.parallel_name);
    // If multiple editions collide on same (set, tier, parallel) — take best (lowest) low_ask
    const existing = group.cells.get(ck);
    if (!existing) {
      group.cells.set(ck, {
        low_ask: row.low_ask,
        listings_count: row.listings_count,
        circulation: row.circulation,
      });
    } else {
      // Merge: min low_ask (or keep non-null), sum listings_count + max circulation
      const mergedFloor =
        existing.low_ask == null ? row.low_ask
        : row.low_ask == null ? existing.low_ask
        : Math.min(existing.low_ask, row.low_ask);
      group.cells.set(ck, {
        low_ask: mergedFloor,
        listings_count: existing.listings_count + row.listings_count,
        circulation: Math.max(existing.circulation, row.circulation),
      });
    }
  }

  // Sort: series DESC, then set_name ASC (Basketball-Reference newest-season-first move)
  const allSetGroups = [...setMap.values()].sort((a, b) => {
    const sa = a.series_number ?? -1;
    const sb2 = b.series_number ?? -1;
    if (sb2 !== sa) return sb2 - sa;
    return (a.set_name ?? "").localeCompare(b.set_name ?? "");
  });

  // ?q= filter (server-side, URL-encoded state per Pillar 4 §1 mandate)
  const setGroups = qLower
    ? allSetGroups.filter(
        (g) =>
          (g.set_name ?? "").toLowerCase().includes(qLower) ||
          String(g.series_number ?? "").includes(qLower),
      )
    : allSetGroups;

  const totalEditions = variantA.rows.length;
  const totalSets = allSetGroups.length;
  const totalCols = columns.length;

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
          <h1 className="text-[22px] font-semibold tracking-tight" data-testid="player-name">
            {playerName ?? `Player ${id}`}
          </h1>
          <span className="text-[11px] font-mono text-[var(--text-dim)] border border-[var(--border-subtle)] rounded px-2 py-0.5">
            Variant A — (tier × parallel) matrix
          </span>
        </div>

        {/* Variant nav links */}
        <div className="flex gap-2 text-[10px] font-mono">
          <Link
            href={`/player/${id}`}
            className="text-[var(--text-faint)] hover:text-[var(--accent)] border border-[var(--border-subtle)] rounded px-2 py-0.5"
          >
            Base matrix
          </Link>
          <span className="border border-[var(--accent)] text-[var(--accent)] rounded px-2 py-0.5">
            Variant A
          </span>
        </div>
      </header>

      {/* ── Three-axis matrix ────────────────────────────────────────────── */}
      <Card
        title="Three-axis matrix"
        subtitle={`${totalEditions} editions · ${totalSets} sets · ${totalCols} (tier × parallel) columns`}
        variant="inset"
        methodology={`topshot.editions WHERE player_id='${id}' JOIN sets + market_caps (latest date per edition) + moments WHERE listing_price_usd IS NOT NULL. Low ask = lowest_ask_price; Listings count = COUNT(moments WHERE listing_price_usd IS NOT NULL). Parallels never aggregated — each (tier × parallel) column is its own market. ?q= URL param filters set rows server-side.`}
        right={
          qLower ? (
            <Link
              href={`/player/${id}/v/a`}
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
          action={`/player/${id}/v/a`}
          className="flex items-center gap-2 px-3 pt-3 pb-2"
        >
          <input
            type="text"
            name="q"
            defaultValue={qRaw}
            placeholder="Filter sets…"
            autoComplete="off"
            className="w-full sm:w-[260px] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[12px] font-mono text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
            data-testid="variant-a-set-search"
          />
          <button
            type="submit"
            className="text-[11px] font-mono text-[var(--accent)] border border-[var(--border-subtle)] rounded px-2 py-1 hover:border-[var(--accent)]"
          >
            filter
          </button>
        </form>

        {variantA.rows.length === 0 ? (
          <EmptyState
            title="No editions resolved"
            body="The player row exists but no editions are linked. ETL backfill may still be running."
          />
        ) : setGroups.length === 0 ? (
          <div className="px-3 pb-3">
            <EmptyState
              title={`No sets match "${qRaw}"`}
              body="Try a different filter or clear the search to see all sets."
              action={
                <Link
                  href={`/player/${id}/v/a`}
                  className="text-[11px] text-[var(--accent)] underline"
                >
                  clear filter
                </Link>
              }
            />
          </div>
        ) : (
          // overflow-x-auto: horizontal scroll when columns exceed viewport (Pillar 1 + StockX move)
          <div
            className="overflow-x-auto"
            data-testid="variant-a-matrix-wrapper"
          >
            <table
              className="w-full text-[12px] font-mono border-collapse"
              data-testid="variant-a-matrix"
              style={{ minWidth: `${Math.max(600, 180 + columns.length * 120)}px` }}
            >
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {/* Set column (sticky left) */}
                  <th
                    className="text-left py-2 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] min-w-[180px] sticky left-0 bg-[var(--surface-1)]"
                    data-testid="matrix-col-set"
                  >
                    Set
                  </th>

                  {/* Compound (tier × parallel) column headers — Discogs signature move */}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="text-center py-2 px-2 min-w-[120px] align-bottom"
                      data-testid={`matrix-col-${col.key.replace(/__/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase()}`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <TierChip tier={tierChipKey(col.tier)} />
                        <span className="text-[9px] text-[var(--text-faint)] tracking-data-label">
                          {col.parallel}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody data-testid="variant-a-matrix-body">
                {setGroups.map((group) => (
                  <tr
                    key={group.set_id ?? "unknown"}
                    className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-2)]/20 transition-colors align-top"
                    data-testid="variant-a-row"
                  >
                    {/* Set name (sticky left) */}
                    <td
                      className="py-2 px-3 sticky left-0 bg-[var(--surface-1)] hover:bg-[var(--surface-2)]/20"
                      data-testid="variant-a-set-name"
                    >
                      <Link
                        href={group.set_id ? `/set/${group.set_id}` : "#"}
                        className="text-[var(--text)] hover:text-[var(--accent)] font-medium"
                      >
                        {group.set_name ?? "Unnamed set"}
                      </Link>
                      {group.series_number != null && (
                        <span className="block text-[10px] text-[var(--text-faint)] tracking-data-label">
                          S{group.series_number}
                        </span>
                      )}
                    </td>

                    {/* (tier × parallel) cells — StockX size×condition grid move */}
                    {columns.map((col) => {
                      const cell = group.cells.get(col.key);

                      if (!cell) {
                        // Blank cell — honest absence (StockX "—" for size/condition combos that don't exist)
                        return (
                          <td
                            key={col.key}
                            className="py-2 px-2 text-center text-[var(--text-faint)]"
                            data-testid="variant-a-cell-empty"
                          >
                            —
                          </td>
                        );
                      }

                      // NewDropTag: circulation > 0 but no listings (Pillar 5 §2 positive framing)
                      const showNewDrop =
                        cell.low_ask === null && cell.circulation > 0;

                      return (
                        <td
                          key={col.key}
                          className="py-2 px-2 text-right align-top"
                          data-testid="variant-a-cell"
                          data-col={col.key}
                          data-set={group.set_id ?? undefined}
                        >
                          <div className="flex flex-col items-end gap-0.5">
                            {/* Low ask — dominant value (StockX "Lowest Ask" cell) */}
                            {showNewDrop ? (
                              <NewDropTag />
                            ) : (
                              <span
                                className="text-[13px] font-semibold text-[var(--text)]"
                                data-testid="variant-a-cell-floor"
                              >
                                <Num value={cell.low_ask} format="usd" />
                              </span>
                            )}
                            {/* Listings count — secondary, muted */}
                            <span
                              className="text-[10px] text-[var(--text-faint)] tnum"
                              data-testid="variant-a-cell-listings"
                            >
                              <Num value={cell.listings_count} format="int" />
                              {" "}listed
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Sample size confidence disclosure (Pillar 5 §4) ─────────────── */}
      <div className="text-[10px] text-[var(--text-faint)] font-mono leading-snug">
        <span className="text-[var(--text-dim)]">Data sources:</span>{" "}
        <code>topshot.editions</code> ·{" "}
        <code>topshot.market_caps</code> (latest date per edition) ·{" "}
        <code>topshot.moments WHERE listing_price_usd IS NOT NULL</code> ·{" "}
        <code>topshot.parallel_types</code>. Blank cell = no edition in that
        (set × tier × parallel). 🆕 BE FIRST = circulation &gt; 0 but no active
        listings. Listings count is live; floor may lag 5-minute ETL window.
      </div>

    </div>
  );
}
