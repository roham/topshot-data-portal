import { notFound } from "next/navigation";
import { getUserByUsername, getUserByFlow, fetchBagPage } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { PortfolioBagTable, type BagRow } from "@/components/PortfolioBagTable";
import { PortfolioRollup } from "@/components/PortfolioRollup";
import { EmptyState } from "@/components/primitives/EmptyState";
import type { MintedMoment } from "@/lib/topshot/types";

export const revalidate = 60;
export const dynamic = "force-dynamic";

async function loadFullBag(flowAddress: string): Promise<MintedMoment[]> {
  const all: MintedMoment[] = [];
  let cursor = "";
  for (let i = 0; i < 30; i++) {  // hard cap ~3000 moments
    const page = await fetchBagPage(flowAddress, cursor, 100);
    all.push(...page.items);
    if (!page.rightCursor || page.items.length < 100) break;
    cursor = page.rightCursor;
  }
  return all;
}

function toBagRows(items: MintedMoment[]): BagRow[] {
  return items.map((m) => ({
    flowId: m.flowId,
    serial: Number(m.flowSerialNumber),
    circulation: m.edition?.circulationCount ?? 0,
    playerName: m.play?.stats?.playerName ?? "—",
    setFlowName: m.set?.flowName ?? "—",
    setSeries: m.set?.flowSeriesNumber ?? null,
    tier: m.edition?.tier ?? m.tier ?? "MOMENT_TIER_COMMON",
    parallelID: m.edition?.parallelID ?? 0,
    lowAskUsd: m.lowAsk != null ? Number(m.lowAsk) : null,
    lastPurchaseUsd: m.lastPurchasePrice != null ? Number(m.lastPurchasePrice) : null,
    forSale: !!m.forSale,
  }));
}

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ vs?: string }>;
}) {
  const { username: raw } = await params;
  const { vs } = await searchParams;
  const username = decodeURIComponent(raw);

  // Resolve identity: try username first, then flow-address.
  let user = await getUserByUsername(username);
  if (!user && /^0x[0-9a-fA-F]+$/.test(username)) {
    user = await getUserByFlow(username);
  }
  if (!user) notFound();

  const items = await loadFullBag(user.flowAddress);
  const rows = toBagRows(items);

  const totalCount = rows.length;
  const valueListedUsd = rows.reduce((s, r) => s + (r.lowAskUsd ?? 0), 0);
  const listedCount = rows.filter((r) => r.forSale).length;
  const tierMix = new Map<string, number>();
  for (const r of rows) tierMix.set(r.tier, (tierMix.get(r.tier) ?? 0) + 1);
  const topTier = [...tierMix.entries()].sort((a, b) => b[1] - a[1])[0];
  const distinctPlayers = new Set(rows.map((r) => r.playerName)).size;
  // pnl across rows where we have both numbers
  let pnlSum = 0;
  for (const r of rows) {
    if (r.lowAskUsd != null && r.lastPurchaseUsd != null) {
      pnlSum += r.lowAskUsd - r.lastPurchaseUsd;
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-4 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">{user.username ?? user.flowAddress}</h1>
        <span className="text-[11px] text-[var(--text-faint)] font-mono">
          {user.flowAddress}
        </span>
        {vs && (
          <span className="text-[11px] text-[var(--accent)] tracking-data-label">
            ↔ comparing to {decodeURIComponent(vs)} (compare iter pending)
          </span>
        )}
      </header>

      {/* KPI strip */}
      <Card variant="inset">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          <div className="p-3">
            <KPI label="Bag size" value={totalCount} format="int" size="lg" />
          </div>
          <div className="p-3">
            <KPI label="Est. listed value" value={valueListedUsd} format="usdCompact" size="lg" hint={`${listedCount} listed`} />
          </div>
          <div className="p-3">
            <KPI label="P&L on known buys" value={pnlSum} format="usdCompact" size="lg" delta={pnlSum} deltaFormat="delta" />
          </div>
          <div className="p-3">
            <KPI label="Distinct players" value={distinctPlayers} format="int" size="lg" hint={topTier ? `${topTier[1]} ${topTier[0].replace("MOMENT_TIER_", "")}` : undefined} />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {/* Bag table */}
        <Card title="Bag" subtitle={`${totalCount} moments · click column to sort · click row to drill`} variant="inset" methodology="Bag pulled via searchMintedMoments(byOwnerFlowAddress). Floor = MintedMoment.lowAsk (per-listing prices not exposed). P&L = current floor − lastPurchasePrice; not adjusted for fees.">
          {rows.length === 0 ? (
            <EmptyState title="Bag is empty" body="This collector has no minted moments under the public API." />
          ) : (
            <PortfolioBagTable rows={rows} />
          )}
        </Card>

        {/* Rollup rail */}
        <Card title="Composition" subtitle="rollup by axis" methodology="Sum of floor-listed values across all moments grouped by the chosen axis. Empty-floor moments excluded from the value column but counted in count.">
          {rows.length === 0 ? (
            <EmptyState title="No moments to roll up" />
          ) : (
            <PortfolioRollup rows={rows} />
          )}
        </Card>
      </div>

      {/* Honest absence */}
      <Card title="What this page does not yet show" methodology="Honest absence — surfaces below land in subsequent iters.">
        <ul className="text-[11px] text-[var(--text-dim)] space-y-1 list-disc pl-5">
          <li>Treemap composition — wires once Recharts treemap primitive lands (next iter).</li>
          <li>Portfolio value over time — gated on the 30m-portfolio cron writing snapshots for this address; add to PORTFOLIO_WATCHLIST repo variable to start accumulating.</li>
          <li>Compare-to-collector view (vs= param) — UI side renders the second collector when the iter ships.</li>
          <li>CSV export — `csv` palette verb will trigger once the export iter lands.</li>
          <li>Activity tab — recent buys/sells involving this collector, parsed from the market accumulator.</li>
        </ul>
      </Card>
    </div>
  );
}
