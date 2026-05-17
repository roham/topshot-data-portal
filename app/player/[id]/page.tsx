// /player/[id] — Player detail with editions matrix + career volume table.
//
// OTM-parity feature: player-detail (priority 13).
//
// Comparable primary: OTM Player page (editions matrix grouped by set/tier).
//   Signature moves ported:
//   · Pivot-table grid: rows = sets (series DESC), columns = C/R/L/F/U (fixed)
//   · Each cell shows floor price + market cap; blank cell when no edition
//   · Count badge "×N" when multiple editions share the same (set, tier)
//   · Market cap rank badge in header ("rank #12 by market cap")
//   · Career volume table: one row per window (24h/7d/30d/1y/ALL)
//
// Cross-domain: Basketball-Reference per-season table.
//   Signature move: sparse column treatment — blank cell != zero; Career row.
//
// URL state (Pillar 4 §1):
//   ?q=<set-name-filter> — server-side filter on set rows in the matrix
//   (encoded in URL; survives page refresh; no JS needed)

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlayerDetail } from "@/lib/supabase/queries/player-detail";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { EmptyState } from "@/components/primitives/EmptyState";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  const name = detail.player?.full_name ?? `Player ${id}`;
  return { title: `${name} · TS·PORTAL` };
}

// ── Tier column definitions (fixed left-to-right, rarity ascending) ────────
// C = Common · R = Rare · L = Legendary · F = Fandom · U = Ultimate
// Matches the acceptance text "columns by tier (C/R/L/F)" + U for completeness.
const TIER_COLS = [
  { tier: "Common",    abbr: "C", raw: "MOMENT_TIER_COMMON" },
  { tier: "Rare",      abbr: "R", raw: "MOMENT_TIER_RARE" },
  { tier: "Legendary", abbr: "L", raw: "MOMENT_TIER_LEGENDARY" },
  { tier: "Fandom",    abbr: "F", raw: "MOMENT_TIER_FANDOM" },
  { tier: "Ultimate",  abbr: "U", raw: "MOMENT_TIER_ULTIMATE" },
] as const;

// "Anthology" editions are functionally Ultimate parallels — normalize them.
function normalizeTier(tier: string | null): string | null {
  if (!tier) return null;
  if (tier === "Anthology") return "Ultimate";
  return tier;
}

// ── Career volume window definitions (acceptance: 24h/7d/30d/1y/ALL) ───────
const VOLUME_WINDOWS = [
  { label: "24h", key: "volume24h" as const },
  { label: "7d",  key: "volume7d"  as const },
  { label: "30d", key: "volume30d" as const },
  { label: "1y",  key: "volume1y"  as const },
  { label: "ALL", key: "volumeAllTime" as const },
] as const;

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // ?q= — set name filter; URL-encoded, survives refresh (Pillar 4 §1).
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const qLower = qRaw.toLowerCase();

  const detail = await getPlayerDetail(id);
  if (!detail.player) notFound();
  const p = detail.player;

  // ── Build set groups (rows of the matrix) ──────────────────────────────
  const bySet = new Map<
    string,
    {
      set_id: string | null;
      set_name: string | null;
      series_number: number | null;
      editions: typeof detail.editions;
    }
  >();
  for (const e of detail.editions) {
    const key = e.set_id ?? "__unknown__";
    if (!bySet.has(key)) {
      bySet.set(key, {
        set_id: e.set_id,
        set_name: e.set_name,
        series_number: e.series_number,
        editions: [],
      });
    }
    bySet.get(key)!.editions.push(e);
  }

  // Sort: series DESC, then set name ASC — newest series appears first
  // (Basketball-Reference signature move: most-recent season at the top).
  const allSetGroups = [...bySet.values()].sort((a, b) => {
    const sa = a.series_number ?? -1;
    const sb = b.series_number ?? -1;
    if (sb !== sa) return sb - sa;
    return (a.set_name ?? "").localeCompare(b.set_name ?? "");
  });

  // ?q= filter (server-side, URL-encoded state)
  const setGroups = qLower
    ? allSetGroups.filter(
        (g) =>
          (g.set_name ?? "").toLowerCase().includes(qLower) ||
          String(g.series_number ?? "").includes(qLower),
      )
    : allSetGroups;

  // ── Determine which tier columns actually have any edition in this player ─
  const tiersPresent = new Set(
    detail.editions
      .map((e) => normalizeTier(e.tier_name))
      .filter((t): t is string => t != null),
  );
  // Always show all defined TIER_COLS columns regardless of presence —
  // blank cells communicate honest absence (Basketball-Reference move).
  const visibleTierCols = TIER_COLS;

  // ── Compute "All tiers" market cap per set row ──────────────────────────
  function getSetTotalMktCap(setKey: string): number | null {
    const group = bySet.get(setKey);
    if (!group) return null;
    let total: number | null = null;
    for (const e of group.editions) {
      const mc = detail.editionFloors[e.edition_id]?.marketCap;
      if (mc != null) {
        total = (total ?? 0) + mc;
      }
    }
    return total;
  }

  // ── Compute "All sets" totals per tier column (the "Career" row) ─────────
  function getTierTotalMktCap(tierLabel: string): number | null {
    const tierEditions = detail.editions.filter(
      (e) => normalizeTier(e.tier_name) === tierLabel,
    );
    if (tierEditions.length === 0) return null;
    let total: number | null = null;
    for (const e of tierEditions) {
      const mc = detail.editionFloors[e.edition_id]?.marketCap;
      if (mc != null) {
        total = (total ?? 0) + mc;
      }
    }
    return total;
  }

  // ── Grand total market cap ───────────────────────────────────────────────
  const grandTotalMktCap =
    detail.marketCap?.total_market_cap_usd != null
      ? Number(detail.marketCap.total_market_cap_usd)
      : null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="space-y-1" data-testid="player-header">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <Link href="/players" className="hover:text-[var(--accent)]">
            ← players
          </Link>
          <span>id: {id}</span>
          {p.last_known_team_full_name && (
            <span>{p.last_known_team_full_name}</span>
          )}
          {p.last_known_primary_position && (
            <span>{p.last_known_primary_position}</span>
          )}
          {p.draft_year && <span>draft {p.draft_year}</span>}
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
          </h1>
          {/* Market cap rank badge — acceptance §3: "rank #12 by market cap" */}
          <span
            className="text-[11px] font-mono text-[var(--text-dim)] border border-[var(--border-subtle)] rounded px-2 py-0.5"
            data-testid="player-market-cap-rank"
          >
            {detail.marketCapRank != null
              ? `rank #${detail.marketCapRank.toLocaleString()} by market cap`
              : "rank — by market cap"}
          </span>
          {grandTotalMktCap != null && (
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              market cap{" "}
              <span className="text-[var(--text)] font-semibold">
                <Num value={grandTotalMktCap} format="usdCompact" />
              </span>
            </span>
          )}
        </div>
      </header>

      {/* ── Editions matrix ─────────────────────────────────────────────── */}
      <Card
        title="Editions matrix"
        subtitle={`${detail.editions.length} editions · ${allSetGroups.length} sets`}
        variant="inset"
        methodology={`topshot.editions WHERE player_id='${id}' JOIN sets + market_caps (latest date per edition). Floor = lowest_ask_price; Market cap = market_cap. Blank cell = no edition in that (set × tier). ×N = N editions share this (set × tier) cell (distinct parallels). ?q= URL param filters set rows server-side.`}
        right={
          qLower ? (
            <Link
              href={`/player/${id}`}
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
          action={`/player/${id}`}
          className="flex items-center gap-2 px-3 pt-3 pb-2"
        >
          <input
            type="text"
            name="q"
            defaultValue={qRaw}
            placeholder="Filter sets…"
            autoComplete="off"
            className="w-full sm:w-[260px] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[12px] font-mono text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
            data-testid="matrix-set-search"
          />
          <button
            type="submit"
            className="text-[11px] font-mono text-[var(--accent)] border border-[var(--border-subtle)] rounded px-2 py-1 hover:border-[var(--accent)]"
          >
            filter
          </button>
        </form>

        {detail.editions.length === 0 ? (
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
                  href={`/player/${id}`}
                  className="text-[11px] text-[var(--accent)] underline"
                >
                  clear filter
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-[12px] font-mono border-collapse"
              data-testid="editions-matrix"
            >
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {/* Set column header */}
                  <th className="text-left py-2 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] min-w-[180px] sticky left-0 bg-[var(--surface-1)]">
                    Set
                  </th>
                  {/* Tier column headers — fixed C/R/L/F/U */}
                  {visibleTierCols.map((tc) => (
                    <th
                      key={tc.abbr}
                      className="text-center py-2 px-2 min-w-[120px]"
                      data-testid={`matrix-col-${tc.abbr}`}
                    >
                      <TierChip tier={tc.raw} />
                    </th>
                  ))}
                  {/* All tiers total column */}
                  <th className="text-right py-2 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] min-w-[100px]">
                    All tiers
                  </th>
                </tr>
              </thead>
              <tbody>
                {setGroups.map((group) => (
                  <MatrixRow
                    key={group.set_id ?? "unknown"}
                    group={group}
                    visibleTierCols={visibleTierCols}
                    editionFloors={detail.editionFloors}
                    setTotalMktCap={getSetTotalMktCap(
                      group.set_id ?? "__unknown__",
                    )}
                  />
                ))}

                {/* "All sets" summary row — Basketball-Reference "Career" row */}
                <tr
                  className="border-t-2 border-[var(--border-subtle)] bg-[var(--surface-2)]/40"
                  data-testid="matrix-career-row"
                >
                  <td className="py-2 px-3 text-[var(--text-faint)] text-[11px] font-semibold sticky left-0 bg-[var(--surface-2)]/40">
                    All sets
                  </td>
                  {visibleTierCols.map((tc) => {
                    const total = getTierTotalMktCap(tc.tier);
                    return (
                      <td
                        key={tc.abbr}
                        className="py-2 px-2 text-right align-top"
                      >
                        {total != null ? (
                          <span className="text-[11px] text-[var(--text-dim)]">
                            <Num value={total} format="usdCompact" />
                          </span>
                        ) : (
                          <span className="text-[var(--text-faint)]">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right">
                    <Num
                      value={grandTotalMktCap}
                      format="usdCompact"
                      className="font-semibold text-[var(--text)]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Career volume table ──────────────────────────────────────────── */}
      <Card
        title="Career volume"
        subtitle="all transaction windows"
        variant="inset"
        methodology="Sources: topshot.mv_player_24h_volume, mv_player_7d_volume, mv_player_30d_volume, mv_player_1y_volume, mv_player_all_time_volume. ALL-time window bounded by ETL launch date (public-API ceiling #8). Null values (—) indicate no recorded activity in that window."
      >
        <div
          className="overflow-x-auto"
          data-testid="career-volume-table"
        >
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
                      <Num value={txCount} format="int" className="text-[var(--text-dim)]" />
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
        {/* ALL-time coverage disclosure — Pillar 5 §4 honest-absence */}
        {detail.volumeAllTime?.refreshed_at && (
          <p className="text-[10px] text-[var(--text-faint)] font-mono px-3 pb-3">
            ALL-time covers data since ETL launch
            {detail.volumeAllTime.refreshed_at
              ? ` · refreshed ${detail.volumeAllTime.refreshed_at.slice(0, 10)}`
              : ""}
            . Pre-portal history not included (public-API ceiling #8).
          </p>
        )}
      </Card>

    </div>
  );
}

// ── MatrixRow — one set row in the editions matrix ───────────────────────────
function MatrixRow({
  group,
  visibleTierCols,
  editionFloors,
  setTotalMktCap,
}: {
  group: {
    set_id: string | null;
    set_name: string | null;
    series_number: number | null;
    editions: Array<{
      edition_id: string;
      tier_name: string | null;
      mint_count: number | null;
    }>;
  };
  visibleTierCols: typeof TIER_COLS;
  editionFloors: Record<string, { floor: number | null; marketCap: number | null }>;
  setTotalMktCap: number | null;
}) {
  return (
    <tr
      className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-2)]/20 transition-colors align-top"
      data-testid="matrix-row"
    >
      {/* Set name */}
      <td className="py-2 px-3 sticky left-0 bg-[var(--surface-1)] hover:bg-[var(--surface-2)]/20">
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

      {/* Tier cells */}
      {visibleTierCols.map((tc) => {
        // Find all editions for this (set, tier) combination.
        const matches = group.editions.filter(
          (e) => normalizeTier(e.tier_name) === tc.tier,
        );

        if (matches.length === 0) {
          // Blank cell — honest absence (Basketball-Reference sparse move).
          return (
            <td
              key={tc.abbr}
              className="py-2 px-2 text-center text-[var(--text-faint)]"
            />
          );
        }

        // Aggregate floor (min) + market cap (sum) across matches.
        const floors = matches
          .map((e) => editionFloors[e.edition_id]?.floor ?? null)
          .filter((v): v is number => v != null);
        const mktCaps = matches
          .map((e) => editionFloors[e.edition_id]?.marketCap ?? null)
          .filter((v): v is number => v != null);

        const minFloor = floors.length > 0 ? Math.min(...floors) : null;
        const sumMktCap =
          mktCaps.length > 0
            ? mktCaps.reduce((a, b) => a + b, 0)
            : null;
        const count = matches.length;

        return (
          <td
            key={tc.abbr}
            className="py-2 px-2 text-right align-top"
            data-testid="matrix-cell"
            data-tier={tc.abbr}
            data-set={group.set_id ?? undefined}
          >
            <div className="flex flex-col items-end gap-0.5">
              {/* Floor — dominant value per OTM comparable */}
              <span className="text-[13px] font-semibold text-[var(--text)]">
                <Num value={minFloor} format="usd" />
              </span>
              {/* Market cap — secondary, muted */}
              <span className="text-[10px] text-[var(--text-faint)] tnum">
                <Num value={sumMktCap} format="usdCompact" />
              </span>
              {/* ×N badge — honest disclosure of multi-edition aggregation */}
              {count > 1 && (
                <span className="text-[9px] text-[var(--text-faint)] border border-[var(--border-subtle)] rounded px-1">
                  ×{count}
                </span>
              )}
            </div>
          </td>
        );
      })}

      {/* All-tiers total for this set row */}
      <td className="py-2 px-3 text-right">
        <Num
          value={setTotalMktCap}
          format="usdCompact"
          className="text-[var(--text-dim)]"
        />
      </td>
    </tr>
  );
}
