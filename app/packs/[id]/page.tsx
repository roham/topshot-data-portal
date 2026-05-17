// /packs/[id] — Pack detail page (packs-tracker OTM-parity feature).
//
// Route param: [id] = pack_listing_id from topshot.packs.
//
// Comparable primary: OTM Packs tracker "What's Left" view.
//   Signature moves ported:
//   · Two-zone layout: metadata column + main KPI strip
//   · PACKS OPENED summary strip: avg value · opened count · sealed count · % opened
//   · Contents grid: player / play / tier / listing count per edition
//
// Cross-domain: Topps break tracker sealed-vs-broken countdown.
//   Signature move: "remaining sealed" as a decrementing counter.
//   This thin-slice: snapshot view with ETL refresh timestamp.
//
// data_viz_kind: table-plus-contents-grid (compound-table pattern).
//
// Honest-absence policy (Pillar 5 §2):
//   · If openedSource='unavailable': render '—' for opened/sealed with footnote.
//   · If openedSource='moments_approx': label the counts as "approx." with
//     asterisk + explanation ("derived from released-moments count ÷ moments_per_pack").
//   · avgPackValue = null → render '—' not '$0.00'.

import Link from "next/link";
import type { Metadata } from "next";
import { getPackDetail } from "@/lib/supabase/queries/pack-detail";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { EmptyState } from "@/components/primitives/EmptyState";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPackDetail(decodeURIComponent(id));
  const name = detail.pack?.pack_name ?? `Pack ${id}`;
  return { title: `${name} · TS·PORTAL` };
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

function refreshLabel(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  try {
    const d = new Date(iso);
    const agoMs = Date.now() - d.getTime();
    const agoM = Math.floor(agoMs / 60_000);
    if (agoM < 60) return `${Math.max(1, agoM)}m ago`;
    const agoH = Math.floor(agoM / 60);
    if (agoH < 24) return `${agoH}h ago`;
    return `${Math.floor(agoH / 24)}d ago`;
  } catch {
    return "—";
  }
}

// Normalize tier_name string to MOMENT_TIER_ prefix for TierChip.
function normalizeTier(t: string | null | undefined): string | null {
  if (!t) return null;
  if (t.startsWith("MOMENT_TIER_")) return t;
  return `MOMENT_TIER_${t.toUpperCase()}`;
}

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const packListingId = decodeURIComponent(id);
  const detail = await getPackDetail(packListingId);

  if (!detail.pack) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 pt-8">
        <EmptyState
          title="Pack not found"
          body={`No pack with listing ID "${packListingId}" exists in the portal's data. It may not yet be indexed.`}
          action={
            <Link href="/packs" className="text-[var(--accent)] text-[12px] hover:underline">
              ← Back to Packs
            </Link>
          }
        />
      </div>
    );
  }

  const p = detail.pack;
  const totalPacks = p.total_packs ?? null;

  // Compute % opened
  const pctOpened =
    detail.openedCount != null && totalPacks != null && totalPacks > 0
      ? (detail.openedCount / totalPacks) * 100
      : null;

  // Drop date: prefer drops.started_at, fall back to packs.started_at
  const droppedOn = detail.drop?.started_at ?? p.started_at;

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-3">
      {/* Breadcrumb */}
      <nav className="text-[10px] text-[var(--text-faint)] tracking-data-label font-mono">
        <Link href="/packs" className="hover:text-[var(--text)]">PACKS</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--text-dim)]">{p.pack_name ?? packListingId}</span>
      </nav>

      {/* ── Pack header (metadata block) ── */}
      <div data-testid="pack-header" className="space-y-2">
        <div className="flex items-start gap-4 flex-wrap">
          {p.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_url}
              alt={p.pack_name ?? "Pack thumbnail"}
              className="w-20 h-20 object-contain rounded border border-[var(--border-subtle)]"
            />
          )}
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-semibold tracking-tight">
                {p.pack_name ?? packListingId}
              </h1>
              <TierChip tier={normalizeTier(p.pack_tier_name)} />
            </div>
            <div className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase font-mono">
              DROPPED ON {droppedOnLabel(droppedOn)}
            </div>
            {p.description && (
              <p className="text-[11px] text-[var(--text-dim)] max-w-xl">{p.description}</p>
            )}
          </div>
        </div>

        {/* Pack metadata mini-table */}
        <Card variant="inset">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            <div className="p-3">
              <KPI
                label="Moments per pack"
                value={p.moments_per_pack}
                format="int"
                size="md"
              />
            </div>
            <div className="p-3">
              <KPI
                label="Total packs"
                value={totalPacks}
                format="int"
                size="md"
              />
            </div>
            <div className="p-3">
              <KPI
                label="Original price"
                value={p.price}
                format="usd"
                size="md"
                hint={p.currency ?? undefined}
              />
            </div>
            <div className="p-3">
              <KPI
                label="Pack type"
                value={null}
                format="int"
                size="md"
                sub={
                  <span className="text-[11px] tnum text-[var(--text)]">
                    {p.pack_tier_name ?? "—"}
                  </span>
                }
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── PACKS OPENED summary strip ── */}
      <Card variant="inset">
        <div
          data-testid="packs-opened-strip"
          className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]"
        >
          <div className="p-3">
            <div data-testid="avg-pack-value">
              <KPI
                label="Avg pack value"
                value={detail.avgPackValue}
                format="usd"
                size="lg"
                hint={
                  detail.avgPackValueSampleSize > 0
                    ? `${detail.avgPackValueSampleSize} sales`
                    : "no sales data"
                }
              />
            </div>
          </div>
          <div className="p-3">
            <KPI
              label={
                detail.openedSource === "moments_approx"
                  ? "Opened (approx.)"
                  : "Opened"
              }
              value={detail.openedCount}
              format="int"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label={
                detail.openedSource === "moments_approx"
                  ? "Sealed (approx.)"
                  : "Sealed"
              }
              value={detail.sealedCount}
              format="int"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label="% Opened"
              value={pctOpened}
              format="pct"
              size="lg"
            />
          </div>
        </div>
        {detail.openedSource === "moments_approx" && (
          <div className="px-3 pb-3 text-[10px] text-[var(--text-faint)] leading-snug">
            * Opened / sealed counts derived from released-moments count ÷ moments_per_pack.
            Packs table is SKU-level; per-instance status not available.
            {detail.refreshedAt && (
              <> · ETL data as of {refreshLabel(detail.refreshedAt)}.</>
            )}
          </div>
        )}
        {detail.openedSource === "pack_status" && detail.refreshedAt && (
          <div className="px-3 pb-3 text-[10px] text-[var(--text-faint)]">
            Data as of {refreshLabel(detail.refreshedAt)}.
          </div>
        )}
        {detail.openedSource === "unavailable" && (
          <div className="px-3 pb-3 text-[10px] text-[var(--text-faint)]">
            Opened / sealed counts unavailable — pack status not indexed for this listing.
          </div>
        )}
      </Card>

      {/* ── Contents grid ── */}
      <Card title="Pack contents" subtitle={`${detail.editions.length} editions`} variant="inset">
        {detail.editions.length === 0 ? (
          <div className="px-3 pb-3">
            <EmptyState
              title="No edition data"
              body="No moments with this pack_listing_id found in topshot.moments. The contents may not yet be indexed."
            />
          </div>
        ) : (
          <div
            data-testid="pack-contents-table"
            className="overflow-x-auto"
          >
            <table className="w-full text-[12px] border-collapse">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    PLAYER
                  </th>
                  <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    PLAY / EDITION
                  </th>
                  <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    TIER
                  </th>
                  <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    MINTED
                  </th>
                  <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    MOMENTS IN PACK
                  </th>
                  <th className="px-3 py-2 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    LISTED
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.editions.map((e) => (
                  <tr
                    key={e.edition_id}
                    data-testid="pack-edition-row"
                    className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-3 py-2 font-medium">
                      {e.player_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-dim)]">
                      {e.play_name ?? e.edition_name ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <TierChip tier={normalizeTier(e.tier_name)} />
                    </td>
                    <td className="px-3 py-2 text-right tnum">
                      <Num value={e.mint_count} format="int" />
                    </td>
                    <td className="px-3 py-2 text-right tnum">
                      <Num value={e.moment_count} format="int" />
                    </td>
                    <td className="px-3 py-2 text-right tnum">
                      <Num value={e.listed_count} format="int" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
