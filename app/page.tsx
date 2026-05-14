import Link from "next/link";
import { recentSales, searchMomentsByPlayers, getLeaderboard } from "@/lib/topshot/queries";
import { FEATURED_PLAYERS, TEAM_NAMES } from "@/lib/topshot/teams";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Card } from "@/components/Card";
import { MarketStats } from "@/components/MarketStats";
import { MomentMedia } from "@/components/MomentMedia";
import { TierPill } from "@/components/Tier";
import { TopSales } from "@/components/TopSales";
import { SpotlightCollector, buildSpotlight } from "@/components/SpotlightCollector";
import { TrendingNow } from "@/components/TrendingNow";
import { formatNumber, formatUsd } from "@/lib/utils";
import { CollectorSearch } from "@/components/CollectorSearch";

export const revalidate = 30;

async function loadHome() {
  // Pull in parallel — independent fetches.
  const [txns, ...players] = await Promise.all([
    recentSales(40),
    ...FEATURED_PLAYERS.slice(0, 6).map((p) =>
      searchMomentsByPlayers([p.id], "", 6).then((r) => ({ player: p, items: r.items, totalCount: r.totalCount }))
    ),
  ]);
  return { txns, players };
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof loadHome>> | null = null;
  let error: string | null = null;
  try {
    data = await loadHome();
  } catch (e) {
    error = (e as Error).message ?? "Failed to load";
  }

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Hero stripe */}
      <section className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              <span className="text-[var(--accent)]">Live market.</span> Real names. Real moves.
            </h1>
            <p className="text-[var(--text-dim)] text-sm mt-1">
              Built for the collector who needs the truth — every serial, every parallel, every premium accounted for.
            </p>
          </div>
          <CollectorSearch />
        </div>
      </section>

      {error && (
        <div className="bg-[var(--down)]/10 border border-[var(--down)]/40 text-[var(--down)] text-sm px-4 py-2 rounded mb-4">
          Upstream error: {error}
        </div>
      )}

      {/* D5 collector spotlight */}
      {data?.txns && <SpotlightCollector spotlight={buildSpotlight(data.txns)} />}

      {/* Market signal strip */}
      {data?.txns && <MarketStats txns={data.txns} />}

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Live activity — main column */}
        <Card
          className="lg:col-span-2"
          title="Live sales"
          subtitle={`S1 · ${data?.txns.length ?? 0} most recent · refreshes every 30s`}
          right={
            <span className="text-[10px] text-[var(--text-faint)] tnum hidden sm:inline">
              global · searchMarketplaceTransactions
            </span>
          }
        >
          <div className="max-h-[640px] overflow-y-auto">
            {data && <ActivityFeed txns={data.txns} />}
          </div>
        </Card>

        {/* Discovery rail */}
        <div className="space-y-4">
          <Card title="Top sales · window" subtitle={`M1 · top by price`}>
            <TopSales txns={data?.txns ?? []} limit={5} />
          </Card>
          <Card title="Featured players" subtitle="D1 · top collector-demand">
            <div className="divide-y divide-[var(--border)]">
              {data?.players.map((p) => (
                <Link
                  key={p.player.id}
                  href={`/player/${p.player.id}`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-elev)] transition-colors"
                >
                  <div className="flex -space-x-2">
                    {p.items.slice(0, 3).map((m) => (
                      <MomentMedia key={m.flowId} flowId={m.flowId} type="player" width={36} className="w-7 h-7 rounded-full ring-1 ring-[var(--border)] bg-[var(--bg-elev)] object-cover" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.player.name}</div>
                    <div className="text-[10px] text-[var(--text-faint)] tnum">
                      {p.totalCount != null ? `${formatNumber(p.totalCount)} moments minted` : "—"}
                    </div>
                  </div>
                  <span className="text-[var(--text-faint)] text-xs">→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* S4 trending now */}
      {data?.txns && (
        <Card title="Trending right now" subtitle="S4 · top players + sets by sale count in window" className="mb-6">
          <TrendingNow txns={data.txns} />
        </Card>
      )}

      {/* Voice block — the "we get you" register */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6 text-[12px]">
        <div className="border border-[var(--border)] rounded p-3 text-[var(--text-dim)]">
          <div className="text-[var(--text)] font-semibold mb-1">Numbers, not adjectives.</div>
          Every value here comes from `MintedMoment.lowAsk` or recent comps. No marketing-speak. No "many." No "several."
        </div>
        <div className="border border-[var(--border)] rounded p-3 text-[var(--text-dim)]">
          <div className="text-[var(--text)] font-semibold mb-1">Parallels are first-class.</div>
          Anthology, Holo, In-Color — each parallel has its own floor and serial space. We never collapse them.
        </div>
        <div className="border border-[var(--border)] rounded p-3 text-[var(--text-dim)]">
          <div className="text-[var(--text)] font-semibold mb-1">Your bag, your math.</div>
          Drop a username — we resolve the flow address, pull the full bag, run the valuation engine, show the work.
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-faint)] tnum mt-3">
        Data: public-api.nbatopshot.com/graphql · S30/SWR300 edge cache · scoring rules at <Link className="underline" href="/rules">/rules</Link> ·
        anchors validated against BostonBased (Celtics-heavy) + BigDaddaBear (Hornets-anchor).
      </p>
    </div>
  );
}
