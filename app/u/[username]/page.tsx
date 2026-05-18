import { notFound } from "next/navigation";
import { getUserByUsername, getUserByFlow, fetchBagPage } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { PortfolioBagTable, type BagRow } from "@/components/PortfolioBagTable";
import { PortfolioRollup } from "@/components/PortfolioRollup";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Num } from "@/components/primitives/Num";
import { getRecentTransactions } from "@/lib/supabase/queries/recent-transactions";
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
    acquiredAt: m.acquiredAt ?? null,
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

  // Bag (live ownership) stays on the GraphQL path — Supabase
  // `topshot.moments.owner_flow_address` lags ETL cadence and may not always
  // reflect current owner. Activity (purchases / sales) comes from Supabase.
  const [items, purchases, sales] = await Promise.all([
    loadFullBag(user.flowAddress),
    getRecentTransactions({ buyerSafeName: user.username, limit: 50 }),
    getRecentTransactions({ limit: 50 }).then((all) =>
      all.filter((t) => t.seller_safe_name === user.username),
    ),
  ]);
  const rows = toBagRows(items);
  const purchasesSpend = purchases.reduce(
    (s, t) => s + (t.gross_amount_usd ?? 0),
    0,
  );
  const salesProceeds = sales.reduce(
    (s, t) => s + (t.gross_amount_usd ?? 0),
    0,
  );

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
          <div className="p-3" data-testid="bag-size-kpi">
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
        <Card title="Bag" subtitle={`${totalCount} moments · click column to sort · click row to drill`} variant="inset" methodology="All moments owned by this collector. Floor is the lowest active ask per moment. P&L = current floor − last purchase price (not adjusted for fees).">

          {rows.length === 0 ? (
            <EmptyState title="Bag is empty" body="This collector doesn't own any moments right now." />
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

      {/* Activity · Supabase */}
      <Card
        title="Activity"
        subtitle={`${purchases.length} buys · ${sales.length} sells · 24h spend ${"$" + purchasesSpend.toFixed(0)} · 24h proceeds ${"$" + salesProceeds.toFixed(0)}`}
        variant="inset"
        methodology="50 most-recent completed transactions on each side (buys and sells)."
      >
        {purchases.length === 0 && sales.length === 0 ? (
          <EmptyState
            title="No recent on-chain activity"
            body="No recent transactions for this collector."
          />
        ) : (
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
            {/* Buys */}
            <div className="p-3 space-y-1">
              <h3 className="text-[11px] tracking-data-label text-[var(--text-faint)] font-mono">
                Recent buys
              </h3>
              {purchases.length === 0 ? (
                <p className="text-[11px] text-[var(--text-faint)]">None.</p>
              ) : (
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {purchases.slice(0, 20).map((t) => (
                      <tr key={t.transaction_id}>
                        <td className="py-1 pr-2 text-[var(--text)]">
                          {t.player_name ?? "—"}
                          {t.serial_number != null && (
                            <span className="text-[var(--text-faint)]">
                              {" "}
                              #{t.serial_number}
                            </span>
                          )}
                          {t.set_name && (
                            <span className="text-[var(--text-dim)]">
                              {" "}
                              · {t.set_name}
                            </span>
                          )}
                        </td>
                        <td className="py-1 text-right tnum font-semibold">
                          <Num
                            value={
                              t.gross_amount_usd != null
                                ? Number(t.gross_amount_usd)
                                : null
                            }
                            format="usd"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Sells */}
            <div className="p-3 space-y-1">
              <h3 className="text-[11px] tracking-data-label text-[var(--text-faint)] font-mono">
                Recent sells
              </h3>
              {sales.length === 0 ? (
                <p className="text-[11px] text-[var(--text-faint)]">None.</p>
              ) : (
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {sales.slice(0, 20).map((t) => (
                      <tr key={t.transaction_id}>
                        <td className="py-1 pr-2 text-[var(--text)]">
                          {t.player_name ?? "—"}
                          {t.serial_number != null && (
                            <span className="text-[var(--text-faint)]">
                              {" "}
                              #{t.serial_number}
                            </span>
                          )}
                          {t.set_name && (
                            <span className="text-[var(--text-dim)]">
                              {" "}
                              · {t.set_name}
                            </span>
                          )}
                        </td>
                        <td className="py-1 text-right tnum font-semibold text-[var(--up)]">
                          <Num
                            value={
                              t.gross_amount_usd != null
                                ? Number(t.gross_amount_usd)
                                : null
                            }
                            format="usd"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Honest absence */}
      <Card title="What this page does not yet show" methodology="Honest absence — surfaces below land in subsequent iters.">
        <ul className="text-[11px] text-[var(--text-dim)] space-y-1 list-disc pl-5">
          <li>Treemap composition — wires once Recharts treemap primitive lands (next iter).</li>
          <li>Portfolio value over time — gated on the 30m-portfolio cron writing snapshots for this address; add to PORTFOLIO_WATCHLIST repo variable to start accumulating.</li>
          <li>Compare-to-collector view (vs= param) — UI side renders the second collector when the iter ships.</li>
          <li>CSV export — `csv` palette verb will trigger once the export iter lands.</li>
        </ul>
      </Card>
    </div>
  );
}
