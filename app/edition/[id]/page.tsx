import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getEdition, editionListedSerials, editionRecentSales } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { EmptyState } from "@/components/primitives/EmptyState";
import { DepthLadder } from "@/components/DepthLadder";
import { EntityTabs } from "@/components/EntityTabs";
import { getEditionHeader } from "@/lib/supabase/queries/edition-detail-header";
import { getEditionPriceHistory } from "@/lib/supabase/queries/edition-price-history";
import { EditionPriceChart } from "@/components/state-of-market/EditionPriceChart";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, windowToDays } from "@/components/global/window-types";

// Two id forms share this route:
//   • legacy flow-id form  {setFlowId}-{playFlowId}  (numeric-numeric) → live-API depth view
//   • portal edition_id    {setUuid}+{playUuid}                        → StockX-style price chart
export const dynamic = "force-dynamic";

function parseCompositeId(raw: string): { setFlowID: string; playFlowID: string } | null {
  const m = decodeURIComponent(raw).match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return { setFlowID: m[1], playFlowID: m[2] };
}
const isLegacyFlowId = (raw: string) => /^(\d+)-(\d+)$/.test(decodeURIComponent(raw));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (isLegacyFlowId(id)) return { title: "Edition · TS·PORTAL" };
  const h = await getEditionHeader(decodeURIComponent(id));
  return { title: h?.player_name ? `${h.player_name} ${h.tier_name ?? ""} · price · TS·PORTAL` : "Edition · TS·PORTAL" };
}

// ── Portal price-chart view (UUID edition_id) ───────────────────────────────
const fmtOdds = (p: number | null) => (p == null || p <= 0 ? "—" : p >= 0.01 ? `${(p * 100).toFixed(1)}%` : `1 in ${Math.round(1 / p).toLocaleString()}`);

async function PriceChart({ id, sinceDays, msrp }: { id: string; sinceDays: number | null; msrp: number | null }) {
  const rows = await getEditionPriceHistory(id, sinceDays);
  return <EditionPriceChart rows={rows} msrp={msrp} />;
}

async function EditionPriceView({ id, w }: { id: string; w?: string }) {
  const h = await getEditionHeader(id);
  if (!h) notFound();
  const { window } = parseTimeWindow(w, "1y");
  const sinceDays = window === "all" ? null : windowToDays(window);
  const mult = h.floor != null && h.msrp ? h.floor / h.msrp : null;
  const stats = [
    { label: "Odds-based MSRP", node: <Num value={h.msrp} format="usd" /> },
    { label: "Current floor", node: <Num value={h.floor} format="usd" /> },
    { label: "vs MSRP", node: <span style={{ color: mult == null ? undefined : mult >= 1 ? "#34d399" : "#f87171" }}>{mult == null ? "—" : `${mult >= 10 ? Math.round(mult) : mult.toFixed(1)}×`}</span> },
    { label: "Pull odds", node: <span>{fmtOdds(h.pull_odds)}</span> },
  ];
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[20px] font-semibold tracking-tight">{h.player_name ?? "Edition"}</h1>
        <TierChip tier={h.tier_name} />
        {h.parallel_id ? <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--text-dim)]">Parallel</span> : null}
      </div>
      <p className="mb-4 mt-1 font-mono text-[10px] text-[var(--text-faint)]">
        {h.series_name ?? "—"} · /{h.mint_count?.toLocaleString() ?? "—"}{h.msrp_pack ? ` · from ${h.msrp_pack}` : ""}
      </p>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{s.label}</div>
            <div className="mt-1 text-[20px] font-semibold tabular-nums">{s.node}</div>
          </div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">Median sale price · per day · realized trades</div>
        <TimeWindowSelector />
      </div>
      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
        <Suspense key={window} fallback={<div className="h-[440px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
          <PriceChart id={id} sinceDays={sinceDays} msrp={h.msrp} />
        </Suspense>
      </div>
    </main>
  );
}

// ── Route entry: branch on id form ──────────────────────────────────────────
export default async function EditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; w?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isLegacyFlowId(id)) {
    return <EditionPriceView id={decodeURIComponent(id)} w={sp.w} />;
  }

  // ── Legacy flow-id depth view (unchanged) ──
  const ids = parseCompositeId(id);
  if (!ids) notFound();
  const edition = (await getEdition(ids.setFlowID, ids.playFlowID)) as {
    id: string; circulationCount: number; parallelID: number; tier: string;
    set?: { id?: string; flowName?: string; flowSeriesNumber?: number };
    play?: { id?: string; stats?: { playerName?: string; teamAtMoment?: string; dateOfMoment?: string } };
  } | null;
  if (!edition) notFound();

  const setUuid = edition.set?.id ?? "";
  const playUuid = edition.play?.id ?? "";
  const [listed, recentSales] = await Promise.all([
    setUuid && playUuid ? editionListedSerials(setUuid, playUuid, 50) : Promise.resolve([]),
    setUuid && playUuid ? editionRecentSales(setUuid, playUuid, 30) : Promise.resolve([]),
  ]);
  const floor = listed.length ? Math.min(...listed.map((l) => l.lowAsk)) : null;
  const medianSale = recentSales.length
    ? [...recentSales.map((s) => s.price)].sort((a, b) => a - b)[Math.floor(recentSales.length / 2)]
    : null;
  const avgSale = recentSales.length ? recentSales.reduce((s, x) => s + x.price, 0) / recentSales.length : null;
  const activeTab = sp.tab ?? "depth";
  const tabs = [
    { key: "depth", label: "Depth" },
    { key: "history", label: "History", badge: "soon" },
    { key: "holders", label: "Holders", badge: "soon" },
    { key: "serials", label: "Serials", badge: "soon" },
    { key: "parallels", label: "Parallels", badge: "soon" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-3">
      <header className="space-y-1.5">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <span>edition · {edition.id.slice(0, 8)}</span>
          <span>set {edition.set?.flowName ?? "—"}</span>
          {edition.set?.flowSeriesNumber != null && <span>series {edition.set.flowSeriesNumber}</span>}
          <span>setFlow {ids.setFlowID} · playFlow {ids.playFlowID}</span>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-[20px] font-semibold tracking-tight">{edition.play?.stats?.playerName ?? "—"}</h1>
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

      <Card variant="inset">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          <div className="p-3"><KPI label="Floor" value={floor} format="usd" size="lg" hint={listed.length ? `${listed.length} listed` : "none listed"} /></div>
          <div className="p-3"><KPI label="Circulation" value={edition.circulationCount} format="int" size="lg" /></div>
          <div className="p-3"><KPI label="Median recent sale" value={medianSale} format="usd" size="lg" hint={recentSales.length ? `${recentSales.length} sample` : "none in window"} /></div>
          <div className="p-3"><KPI label="Mean recent sale" value={avgSale} format="usd" size="lg" /></div>
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

      {activeTab !== "depth" && (
        <Card title={tabs.find((t) => t.key === activeTab)?.label ?? ""}>
          <EmptyState title="Pending" body="This tab wires in a later iter." />
        </Card>
      )}
    </div>
  );
}
