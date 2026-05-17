import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSetDetail } from "@/lib/supabase/queries/set-detail";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { EmptyState } from "@/components/primitives/EmptyState";
import { SetCompletionHistogram } from "@/components/SetCompletionHistogram";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getSetDetail(id);
  const name = detail.set?.set_name ?? `Set ${id}`;
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

function agoLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!isFinite(t)) return "—";
  const dMs = Date.now() - t;
  const m = Math.floor(dMs / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default async function SetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSetDetail(id);
  if (!detail.set) notFound();

  const s = detail.set;
  const a = detail.activity24h;

  // Sort completion buckets in human-readable order (best → worst).
  const completionOrder = [
    "100% (complete)",
    "75-99%",
    "50-74%",
    "25-49%",
    "10-24%",
    "<10%",
  ];
  const orderedCompletion = [...detail.completion].sort(
    (x, y) =>
      completionOrder.indexOf(x.bucket) - completionOrder.indexOf(y.bucket),
  );
  const totalOwners = orderedCompletion.reduce(
    (sum, b) => sum + Number(b.owner_count ?? 0),
    0,
  );
  const totalEditionsInSet =
    orderedCompletion.find((b) => b.total_editions_in_set != null)
      ?.total_editions_in_set ?? null;

  const sortedEditions = [...detail.editions].sort((a, b) => {
    // surface highest market cap first, then mint count, then by play name
    const aMc = a.market_cap ?? 0;
    const bMc = b.market_cap ?? 0;
    if (bMc !== aMc) return bMc - aMc;
    const aMc2 = a.mint_count ?? 0;
    const bMc2 = b.mint_count ?? 0;
    if (bMc2 !== aMc2) return bMc2 - aMc2;
    return (a.play_name ?? "").localeCompare(b.play_name ?? "");
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      {/* Header */}
      <header className="space-y-1">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <span>set · {id}</span>
          {s.series_number != null && <span>series {s.series_number}</span>}
          {s.set_tier_name && <span>tier {s.set_tier_name}</span>}
          {s.is_locked && <span>locked</span>}
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">
          {s.set_name ?? "Unnamed set"}
        </h1>
        {s.description && (
          <p className="text-[12px] text-[var(--text-dim)] max-w-3xl">
            {s.description}
          </p>
        )}
      </header>

      {/* KPI strip · 24h */}
      <Card
        variant="inset"
        methodology="topshot.mv_set_24h_activity — rolled up from SUCCEEDED transactions on moments in this set over the trailing 24h."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          <div className="p-3">
            <KPI
              label="24h $ volume"
              value={a?.volume_usd != null ? Number(a.volume_usd) : null}
              format="usdCompact"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label="24h trades"
              value={a?.tx_count != null ? Number(a.tx_count) : null}
              format="int"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label="24h median"
              value={
                a?.median_price_usd != null ? Number(a.median_price_usd) : null
              }
              format="usd"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label="Editions traded"
              value={
                a?.unique_editions_traded != null
                  ? Number(a.unique_editions_traded)
                  : null
              }
              format="int"
              size="lg"
            />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {/* Editions list */}
        <Card
          title="Editions in set"
          subtitle={`${sortedEditions.length} editions · sorted by market cap · floor + cap from topshot.market_caps`}
          variant="inset"
          methodology="Join across topshot.editions ↔ latest topshot.market_caps. Floor = lowest_ask_price; market cap = circulation × lowest ask (BQ-side definition)."
        >
          {sortedEditions.length === 0 ? (
            <EmptyState
              title="No editions resolved"
              body="The set exists but the editions table has no rows joined to it. ETL backfill may still be running."
            />
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Play / Player
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">
                    Tier
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Mint
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    In circ.
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Floor
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Market cap
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sortedEditions.map((e) => (
                  <tr
                    key={e.edition_id}
                    className="hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-3 py-1.5 text-[var(--text)]">
                      <span className="text-[var(--text)]">
                        {e.player_name ?? "—"}
                      </span>
                      {e.play_name && (
                        <span className="text-[var(--text-dim)]">
                          {" "}
                          · {e.play_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <TierChip
                        tier={
                          e.tier_name
                            ? TIER_NAME_TO_RAW[e.tier_name] ?? null
                            : null
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      {e.mint_count?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      {e.num_moments_in_circulation?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      <Num
                        value={
                          e.lowest_ask_price != null
                            ? Number(e.lowest_ask_price)
                            : null
                        }
                        format="usd"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tnum font-semibold">
                      <Num
                        value={
                          e.market_cap != null ? Number(e.market_cap) : null
                        }
                        format="usdCompact"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Completion histogram — Recharts BarChart (histogram-bar Pillar 1 viz kind).
            OTM signature move: each completion level as its own bar with exact owner
            count, ordered highest-completion-first so rarity is scannable at a glance.
            Cross-domain: PSA Set Registry pop-report (each grade = discrete bar). */}
        <div data-testid="completion-section">
          <Card
            title="Completion · owners"
            subtitle={
              totalEditionsInSet != null
                ? `${totalOwners.toLocaleString()} owners across ${totalEditionsInSet} editions`
                : `${totalOwners.toLocaleString()} owners`
            }
            variant="inset"
            methodology="topshot.mv_set_completion_distribution — buckets owners by fraction of the set's editions they hold (MINTED+LOCKED+UNLOCKED)."
          >
            <SetCompletionHistogram data={orderedCompletion} />
          </Card>
        </div>
      </div>

      {/* Recent transactions */}
      <Card
        title="Recent transactions"
        subtitle={`${detail.recentTransactions.length} most recent · SUCCEEDED only`}
        variant="inset"
        methodology="topshot.transactions filtered by moments in this set, state SUCCEEDED, sorted by source_updated_at DESC."
      >
        {detail.recentTransactions.length === 0 ? (
          <EmptyState
            title="No recent transactions"
            body="No SUCCEEDED transactions in the last few hours touched moments in this set."
          />
        ) : (
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                  Moment
                </th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                  Buyer
                </th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                  Seller
                </th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                  Price
                </th>
                <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right w-[60px]">
                  Ago
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {detail.recentTransactions.map((tx) => (
                <tr
                  key={tx.transaction_id}
                  className="hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-3 py-1.5">
                    <span className="text-[var(--text)]">
                      {tx.player_name ?? tx.play_name ?? "—"}
                    </span>
                    {tx.serial_number != null && (
                      <span className="text-[var(--text-faint)]">
                        {" "}
                        #{tx.serial_number}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {tx.buyer_safe_name ? (
                      <Link
                        href={`/u/${encodeURIComponent(tx.buyer_safe_name)}`}
                        className="text-[var(--text-dim)] hover:text-[var(--accent)]"
                      >
                        {tx.buyer_safe_name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {tx.seller_safe_name ? (
                      <Link
                        href={`/u/${encodeURIComponent(tx.seller_safe_name)}`}
                        className="text-[var(--text-dim)] hover:text-[var(--accent)]"
                      >
                        {tx.seller_safe_name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tnum font-semibold">
                    <Num
                      value={
                        tx.gross_amount_usd != null
                          ? Number(tx.gross_amount_usd)
                          : null
                      }
                      format="usd"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tnum text-[var(--text-faint)]">
                    {agoLabel(tx.source_updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
