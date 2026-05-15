import { notFound } from "next/navigation";
import { getEdition, editionListedSerials, editionRecentSales } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { EmptyState } from "@/components/primitives/EmptyState";
import { DepthLadder } from "@/components/DepthLadder";
import { EntityTabs } from "@/components/EntityTabs";

// URL form: /edition/{setFlowId}-{playFlowId}
// Composite is the simplest path that maps directly to getEditionByFlowIDs.

export const revalidate = 60;
export const dynamic = "force-dynamic";

interface EditionShape {
  id: string;
  circulationCount: number;
  parallelID: number;
  tier: string;
  set?: { id?: string; flowId?: number; flowName?: string; flowSeriesNumber?: number };
  play?: { id?: string; description?: string; headline?: string; stats?: { playerName?: string; playCategory?: string; jerseyNumber?: string; teamAtMoment?: string; dateOfMoment?: string } };
}

function parseCompositeId(raw: string): { setFlowID: string; playFlowID: string } | null {
  const m = decodeURIComponent(raw).match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return { setFlowID: m[1], playFlowID: m[2] };
}

export default async function EditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const ids = parseCompositeId(id);
  if (!ids) notFound();
  const edition = (await getEdition(ids.setFlowID, ids.playFlowID)) as EditionShape | null;
  if (!edition) notFound();

  // Pull depth + recent sales for the Depth tab (the populated tab in 4.5.5).
  // setUuid + playUuid required for the listing/recent fetchers.
  const setUuid = edition.set?.id ?? "";
  const playUuid = edition.play?.id ?? "";
  const [listed, recentSales] = await Promise.all([
    setUuid && playUuid ? editionListedSerials(setUuid, playUuid, 50) : Promise.resolve([]),
    setUuid && playUuid ? editionRecentSales(setUuid, playUuid, 30) : Promise.resolve([]),
  ]);
  // Sample-based floor: cheapest listed ask, else null.
  const floor = listed.length ? Math.min(...listed.map((l) => l.lowAsk)) : null;
  const medianSale = recentSales.length
    ? [...recentSales.map((s) => s.price)].sort((a, b) => a - b)[Math.floor(recentSales.length / 2)]
    : null;
  const avgSale = recentSales.length
    ? recentSales.reduce((s, x) => s + x.price, 0) / recentSales.length
    : null;

  const activeTab = tab ?? "depth";
  const tabs = [
    { key: "depth", label: "Depth" },
    { key: "history", label: "History", badge: "soon" },
    { key: "holders", label: "Holders", badge: "soon" },
    { key: "serials", label: "Serials", badge: "soon" },
    { key: "parallels", label: "Parallels", badge: "soon" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-3">
      {/* Identity strip */}
      <header className="space-y-1.5">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <span>edition · {edition.id.slice(0, 8)}</span>
          <span>set {edition.set?.flowName ?? "—"}</span>
          {edition.set?.flowSeriesNumber != null && <span>series {edition.set.flowSeriesNumber}</span>}
          <span>setFlow {ids.setFlowID} · playFlow {ids.playFlowID}</span>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-[20px] font-semibold tracking-tight">
            {edition.play?.stats?.playerName ?? "—"}
          </h1>
          <TierChip tier={edition.tier} />
          {edition.parallelID > 0 ? (
            <span className="text-[10px] text-[var(--accent)] tracking-data-label">Parallel #{edition.parallelID}</span>
          ) : (
            <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">Base parallel</span>
          )}
          <span className="text-[11px] text-[var(--text-dim)]">
            {edition.play?.stats?.teamAtMoment ?? ""}
            {edition.play?.stats?.dateOfMoment ? ` · ${new Date(edition.play.stats.dateOfMoment).toLocaleDateString()}` : ""}
          </span>
        </div>
      </header>

      {/* KPI strip */}
      <Card variant="inset">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          <div className="p-3">
            <KPI label="Floor" value={floor} format="usd" size="lg" hint={listed.length ? `${listed.length} listed` : "none listed"} />
          </div>
          <div className="p-3">
            <KPI label="Circulation" value={edition.circulationCount} format="int" size="lg" />
          </div>
          <div className="p-3">
            <KPI label="Median recent sale" value={medianSale} format="usd" size="lg" hint={recentSales.length ? `${recentSales.length} sample` : "none in window"} />
          </div>
          <div className="p-3">
            <KPI label="Mean recent sale" value={avgSale} format="usd" size="lg" />
          </div>
        </div>
      </Card>

      <EntityTabs tabs={tabs} defaultKey="depth" />

      {activeTab === "depth" && (
        <div className="space-y-3">
          <Card title="Depth ladder" subtitle={`${listed.length} listed · asks-only per Ceiling 10`} variant="inset">
            <div className="p-3">
              {listed.length === 0 ? (
                <EmptyState title="No listings" body="No serials currently listed for sale. Floor unavailable; come back when liquidity returns." />
              ) : (
                <DepthLadder listed={listed} fairValue={medianSale ?? null} />
              )}
            </div>
          </Card>

          <Card title="Recent sales" subtitle={`${recentSales.length} most-recent · same edition`} variant="inset">
            {recentSales.length === 0 ? (
              <EmptyState title="No recent sales for this edition" body="Either it has not traded recently or the API returned an empty window." />
            ) : (
              <div>
                <div className="p-3 flex items-center gap-4 border-b border-[var(--border-subtle)]">
                  <Sparkline data={[...recentSales].reverse().map((s) => s.price)} width={240} height={40} />
                  <span className="text-[10px] text-[var(--text-faint)] font-mono">oldest → newest in sample</span>
                </div>
                <table className="w-full text-[11px]">
                  <thead className="bg-[var(--surface-2)]">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Serial</th>
                      <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.slice(0, 24).map((s, i) => (
                      <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)]">
                        <td className="px-2 py-1.5 tnum">#{s.serial}</td>
                        <td className="px-2 py-1.5 text-right"><Num value={s.price} format="usd" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <Card
          title="History"
          methodology="The 30m-market cron has been writing snapshots since 2026-05-15. Per-edition history requires the 15m-hot cron's enriched snapshot pipeline to land (separate iter)."
        >
          <EmptyState
            title="History accumulating since 2026-05-15"
            body="Per-edition price history requires the snapshot accumulator's enrichment pipeline. The cron is firing every 15 minutes; the chart populates once the enrichment iter lands."
          />
        </Card>
      )}

      {activeTab === "holders" && (
        <Card
          title="Holders"
          methodology="Per Ceiling 4 + Ceiling 7, the public API exposes no top-holders aggregate and no per-listing identity. Reconstructed by paginating searchMintedMoments(byEditions) grouped by ownerV2.flowAddress — gated on a follow-up iter that builds the sample-and-group worker."
        >
          <EmptyState
            title="Holders view pending"
            body="Reconstruction from sample data — wires when the holder-distribution iter lands."
          />
        </Card>
      )}

      {activeTab === "serials" && (
        <Card
          title="Serials"
          methodology="Full circulation list with per-serial rarity scoring (#1, jersey-match, last-mint, top-10, top-100, last-serial). The data exists via searchMintedMoments(byEditions) without byForSale — pending iter."
        >
          <EmptyState
            title="Serials view pending"
          />
        </Card>
      )}

      {activeTab === "parallels" && (
        <Card
          title="Parallels"
          methodology="Every parallel of this play across editions. Matrix view; click pivots to that parallel. Data via editionsForPlay — pending iter to port the V1 matrix component to the new design tokens."
        >
          <EmptyState
            title="Parallel matrix pending"
          />
        </Card>
      )}
    </div>
  );
}
