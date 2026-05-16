import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlayerDetail } from "@/lib/supabase/queries/player-detail";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
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

const TIER_NAME_TO_RAW: Record<string, string> = {
  Common: "MOMENT_TIER_COMMON",
  Fandom: "MOMENT_TIER_FANDOM",
  Rare: "MOMENT_TIER_RARE",
  Legendary: "MOMENT_TIER_LEGENDARY",
  Ultimate: "MOMENT_TIER_ULTIMATE",
  Anthology: "MOMENT_TIER_ULTIMATE",
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPlayerDetail(id);
  if (!detail.player) notFound();
  const p = detail.player;

  // Group editions by set; within each set sort by tier rarity then mint count.
  const TIER_RANK: Record<string, number> = {
    Ultimate: 5,
    Anthology: 5,
    Legendary: 4,
    Rare: 3,
    Fandom: 2,
    Common: 1,
  };
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
    const cur =
      bySet.get(key) ??
      {
        set_id: e.set_id,
        set_name: e.set_name,
        series_number: e.series_number,
        editions: [] as typeof detail.editions,
      };
    cur.editions.push(e);
    bySet.set(key, cur);
  }
  const setGroups = [...bySet.values()]
    .map((g) => ({
      ...g,
      editions: [...g.editions].sort((a, b) => {
        const ra = a.tier_name ? TIER_RANK[a.tier_name] ?? 0 : 0;
        const rb = b.tier_name ? TIER_RANK[b.tier_name] ?? 0 : 0;
        if (rb !== ra) return rb - ra;
        return (a.mint_count ?? 0) - (b.mint_count ?? 0);
      }),
    }))
    .sort((a, b) => {
      // Series DESC then set name asc — newest series first
      const sa = a.series_number ?? -1;
      const sb = b.series_number ?? -1;
      if (sb !== sa) return sb - sa;
      return (a.set_name ?? "").localeCompare(b.set_name ?? "");
    });

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      {/* Header */}
      <header className="space-y-1">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <span>player · {id}</span>
          {p.last_known_team_full_name && (
            <span>team {p.last_known_team_full_name}</span>
          )}
          {p.last_known_primary_position && (
            <span>position {p.last_known_primary_position}</span>
          )}
          {p.draft_year && <span>draft {p.draft_year}</span>}
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">
          {p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
        </h1>
        {p.birthplace && (
          <p className="text-[12px] text-[var(--text-dim)]">{p.birthplace}</p>
        )}
      </header>

      {/* Volume KPI strip · 24h / 7d / 30d / market cap */}
      <Card
        variant="inset"
        methodology="Per-window MVs: mv_player_24h_volume, mv_player_7d_volume, mv_player_30d_volume. Market cap from mv_player_market_cap (latest topshot.market_caps date)."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          <div className="p-3">
            <KPI
              label="24h $ volume"
              value={
                detail.volume24h?.total_volume_usd != null
                  ? Number(detail.volume24h.total_volume_usd)
                  : null
              }
              format="usdCompact"
              size="lg"
              hint={
                detail.volume24h?.tx_count != null
                  ? `${Number(detail.volume24h.tx_count)} trades`
                  : undefined
              }
            />
          </div>
          <div className="p-3">
            <KPI
              label="7d $ volume"
              value={
                detail.volume7d?.total_volume_usd != null
                  ? Number(detail.volume7d.total_volume_usd)
                  : null
              }
              format="usdCompact"
              size="lg"
              hint={
                detail.volume7d?.tx_count != null
                  ? `${Number(detail.volume7d.tx_count)} trades`
                  : undefined
              }
            />
          </div>
          <div className="p-3">
            <KPI
              label="30d $ volume"
              value={
                detail.volume30d?.total_volume_usd != null
                  ? Number(detail.volume30d.total_volume_usd)
                  : null
              }
              format="usdCompact"
              size="lg"
              hint={
                detail.volume30d?.tx_count != null
                  ? `${Number(detail.volume30d.tx_count)} trades`
                  : undefined
              }
            />
          </div>
          <div className="p-3">
            <KPI
              label="Market cap"
              value={
                detail.marketCap?.total_market_cap_usd != null
                  ? Number(detail.marketCap.total_market_cap_usd)
                  : null
              }
              format="usdCompact"
              size="lg"
              hint={
                detail.marketCapRank != null
                  ? `rank #${detail.marketCapRank.toLocaleString()}`
                  : undefined
              }
            />
          </div>
        </div>
      </Card>

      {/* Editions matrix grouped by set */}
      <Card
        title="Editions"
        subtitle={`${detail.editions.length} editions across ${setGroups.length} sets`}
        variant="inset"
        methodology="topshot.editions filtered by player_id, joined to topshot.sets for set name + series number."
      >
        {setGroups.length === 0 ? (
          <EmptyState
            title="No editions resolved"
            body="The player row exists but no editions are linked. ETL backfill may still be running."
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {setGroups.map((group) => (
              <div
                key={group.set_id ?? "unknown"}
                className="px-3 py-2 space-y-1"
              >
                <div className="flex items-baseline gap-3">
                  <Link
                    href={group.set_id ? `/set/${group.set_id}` : "#"}
                    className="text-[12px] font-semibold text-[var(--text)] hover:text-[var(--accent)]"
                  >
                    {group.set_name ?? "Unnamed set"}
                  </Link>
                  {group.series_number != null && (
                    <span className="text-[10px] font-mono text-[var(--text-faint)] tracking-data-label">
                      Series {group.series_number}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[var(--text-faint)] ml-auto">
                    {group.editions.length} edition
                    {group.editions.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.editions.map((e) => (
                    <div
                      key={e.edition_id}
                      className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-sm px-2 py-1 text-[11px]"
                    >
                      <TierChip
                        tier={
                          e.tier_name
                            ? TIER_NAME_TO_RAW[e.tier_name] ?? null
                            : null
                        }
                      />
                      {e.mint_count != null && (
                        <span className="tnum text-[var(--text-dim)]">
                          /{e.mint_count.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
