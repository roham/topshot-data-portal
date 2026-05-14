import Link from "next/link";
import { allSets } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";

export const revalidate = 86400;

export default async function SetsIndex() {
  const sets = await allSets(200);
  // Group by series
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
        <p className="text-[var(--text-dim)] text-sm">D4 · {sets.length} sets in the public directory, grouped by series.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {seriesNums.map((sn) => {
          const list = bySeries.get(sn) ?? [];
          return (
            <Card key={sn} title={`Series ${sn}`} subtitle={`${list.length} sets`}>
              <div className="divide-y divide-[var(--border)]">
                {list
                  .sort((a, b) => a.flowName.localeCompare(b.flowName))
                  .map((s) => (
                    <Link
                      key={s.id}
                      href={`/set/${s.id}`}
                      className="px-4 py-2 flex items-baseline justify-between text-sm hover:bg-[var(--bg-elev)]"
                    >
                      <span className="truncate">{s.flowName}</span>
                      <span className="tnum text-xs text-[var(--text-faint)]">flowId {s.flowId}</span>
                    </Link>
                  ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
