import Link from "next/link";
import { allSets, recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { formatUsd } from "@/lib/utils";

export const revalidate = 3600;

export default async function SetsIndex() {
  const [sets, txns] = await Promise.all([allSets(200), recentSalesBulk(200)]);
  // Volume per set name
  const volBySet = new Map<string, { count: number; volume: number }>();
  for (const t of txns) {
    const setName = t.moment?.set?.flowName;
    if (!setName) continue;
    const price = Number(t.price ?? 0);
    const e = volBySet.get(setName) ?? { count: 0, volume: 0 };
    e.count += 1;
    e.volume += isFinite(price) ? price : 0;
    volBySet.set(setName, e);
  }
  const bySeries = new Map<number, typeof sets>();
  for (const s of sets) {
    const k = s.flowSeriesNumber ?? 0;
    const arr = bySeries.get(k) ?? [];
    arr.push(s);
    bySeries.set(k, arr);
  }
  const seriesNums = [...bySeries.keys()].sort((a, b) => b - a);
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Sets</h1>
        <p className="text-[var(--text-dim)] text-sm">D4 · {sets.length} sets in the public directory, grouped by series. Volume from 200-sale window.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {seriesNums.map((sn) => {
          const list = bySeries.get(sn) ?? [];
          // Sort by recent volume desc, then name
          const sorted = [...list].sort((a, b) => {
            const av = volBySet.get(a.flowName)?.volume ?? 0;
            const bv = volBySet.get(b.flowName)?.volume ?? 0;
            if (av !== bv) return bv - av;
            return a.flowName.localeCompare(b.flowName);
          });
          return (
            <Card key={sn} title={`Series ${sn}`} subtitle={`${list.length} sets · ranked by recent vol`}>
              <div className="divide-y divide-[var(--border)]">
                {sorted.map((s) => {
                  const v = volBySet.get(s.flowName);
                  return (
                    <Link
                      key={s.id}
                      href={`/set/${s.id}`}
                      className="px-4 py-2 flex items-baseline justify-between gap-2 text-sm hover:bg-[var(--bg-elev)]"
                    >
                      <span className="truncate flex-1">{s.flowName}</span>
                      {v && v.count > 0 ? (
                        <>
                          <span className="tnum text-xs text-[var(--text-dim)] w-10 text-right">{v.count}</span>
                          <span className="tnum text-xs text-[var(--accent)] w-14 text-right">{formatUsd(v.volume)}</span>
                        </>
                      ) : (
                        <span className="tnum text-xs text-[var(--text-faint)] w-24 text-right">—</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
