import Link from "next/link";
import { notFound } from "next/navigation";
import { searchMomentsByPlayers, getLeaderboard } from "@/lib/topshot/queries";
import { FEATURED_PLAYERS } from "@/lib/topshot/teams";
import { formatNumber, mediaUrl } from "@/lib/utils";
import { Card } from "@/components/Card";
import { TierPill } from "@/components/Tier";

export const revalidate = 120;

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let bag: Awaited<ReturnType<typeof searchMomentsByPlayers>> | null = null;
  let ladder: Awaited<ReturnType<typeof getLeaderboard>> = [];
  let bagErr: string | null = null;
  try {
    bag = await searchMomentsByPlayers([id], "", 24);
  } catch (e) {
    bagErr = (e as Error).message;
  }
  try {
    ladder = await getLeaderboard("PLAYER", id, 10);
  } catch {}
  if (!bag) {
    return (
      <div className="max-w-portal mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold">Player {id} unavailable.</h1>
        <p className="text-[var(--text-dim)] text-sm mt-2">Reason: {bagErr ?? "no data"}</p>
      </div>
    );
  }
  const playerName = bag.items[0]?.play?.stats?.playerName ?? FEATURED_PLAYERS.find((p) => p.id === id)?.name ?? "Unknown";

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <header className="mb-6 pb-4 border-b border-[var(--border)]">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">Player ID {id}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{playerName}</h1>
        <div className="text-[var(--text-dim)] text-sm mt-1">
          {formatNumber(bag.totalCount ?? 0)} moments minted across all tiers and parallels
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card title="Most recent mints" subtitle={`Showing ${bag.items.length}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
            {bag.items.map((m) => (
              <Link
                key={m.flowId}
                href={`/moment/${m.flowId}`}
                className="bg-[var(--bg-elev)] border border-[var(--border)] rounded overflow-hidden card-hover"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(m.flowId, "hero", { width: 280 })} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                <div className="p-2">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)] tnum">
                    <span>#{m.flowSerialNumber}/{m.edition?.circulationCount ?? "?"}</span>
                    <TierPill tier={m.tier} />
                  </div>
                  <div className="text-[11px] text-[var(--text-dim)] truncate mt-0.5">{m.set?.flowName ?? "—"}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Score ladder" subtitle="D3 · anonymous · top 10 collectors of this player">
            {ladder.length === 0 ? (
              <div className="text-sm text-[var(--text-dim)] px-4 py-3">Leaderboard data unavailable for this player.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {ladder.map((e) => {
                  const max = ladder[0].score || 1;
                  const pct = (e.score / max) * 100;
                  return (
                    <div key={e.rank} className="px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="tnum text-[var(--text-faint)] w-8">#{e.rank}</span>
                        <span className="tnum text-[var(--text)] flex-1 text-right">{formatNumber(e.score)}</span>
                      </div>
                      <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
                        <div className="h-1 bg-[var(--accent)] rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-3 pb-3 text-[10px] text-[var(--text-faint)]">
              Public API exposes rank + score only — collector identities are intentionally withheld.
              See <Link href="/methodology" className="underline">/methodology</Link>.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
