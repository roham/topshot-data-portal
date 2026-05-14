import Link from "next/link";
import { notFound } from "next/navigation";
import { setDetail, editionsInSet } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { TierPill } from "@/components/Tier";
import { formatNumber, tierLabel } from "@/lib/utils";

export const revalidate = 86400;

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [set, editions] = await Promise.all([setDetail(id), editionsInSet(id)]);
  if (!set) notFound();

  // Group editions by tier × parallel.
  const byTier = new Map<string, number>();
  const byParallel = new Map<number, number>();
  let totalCirculation = 0;
  for (const e of editions) {
    byTier.set(e.tier, (byTier.get(e.tier) ?? 0) + 1);
    byParallel.set(e.parallelID, (byParallel.get(e.parallelID) ?? 0) + 1);
    totalCirculation += e.circulationCount;
  }
  const playCount = set.plays?.length ?? 0;

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">
          A4 · Set retrospective · Series {set.flowSeriesNumber ?? "?"} · flowId {set.flowId}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{set.flowName}</h1>
        <p className="text-[var(--text-dim)] text-sm mt-1">
          {formatNumber(playCount)} plays · {formatNumber(editions.length)} editions · {formatNumber(totalCirculation)} total minted
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card title="By tier" subtitle="edition count per tier">
          <div className="divide-y divide-[var(--border)]">
            {[...byTier.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => (
              <div key={t} className="px-4 py-1.5 flex items-baseline gap-3 text-sm">
                <TierPill tier={t} />
                <span className="tnum text-xs text-[var(--text-dim)] ml-auto">{c} editions</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="By parallel" subtitle="parallel-variant breakdown">
          <div className="divide-y divide-[var(--border)]">
            {[...byParallel.entries()].sort((a, b) => a[0] - b[0]).map(([p, c]) => (
              <div key={p} className="px-4 py-1.5 flex items-baseline gap-3 text-sm">
                <span>
                  Parallel #{p}
                  {p === 0 && <span className="text-[var(--text-faint)] ml-1">(base)</span>}
                </span>
                <span className="tnum text-xs text-[var(--text-dim)] ml-auto">{c} editions</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Plays in set" subtitle={`${playCount} entries`}>
          <div className="px-4 py-2 max-h-48 overflow-y-auto">
            <div className="text-xs text-[var(--text-dim)] space-y-1">
              {(set.plays ?? []).slice(0, 50).map((p) => (
                <div key={p.id} className="truncate">{p.headline ?? p.id}</div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="All editions" subtitle="per-edition row · ordered by tier then parallel">
        <div className="divide-y divide-[var(--border)] text-sm font-mono">
          {[...editions]
            .sort((a, b) => (a.tier !== b.tier ? a.tier.localeCompare(b.tier) : a.parallelID - b.parallelID))
            .slice(0, 200)
            .map((e) => (
              <div key={e.id} className="px-4 py-1.5 flex items-baseline gap-3">
                <TierPill tier={e.tier} />
                <span className="text-xs">P#{e.parallelID}</span>
                <span className="text-[10px] text-[var(--text-faint)] truncate flex-1">{e.id}</span>
                <span className="tnum text-xs text-[var(--text-dim)]">{formatNumber(e.circulationCount)} minted</span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
