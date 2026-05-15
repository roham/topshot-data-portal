import { allSets, getSetPriceHistory, recentSalesBulk, type SetPriceHistoryPoint } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Sparkline } from "@/components/primitives/Sparkline";
import { Num } from "@/components/primitives/Num";
import Link from "next/link";

export const revalidate = 300;
export const metadata = { title: "Variant C · Indices · TS·PORTAL" };

// Variant C — indices-first. Card Ladder pattern. Lead with set-level
// price-history charts via getSetPriceHistory (STAGE-1 UNLOCK-01).
// No accumulator dependency; renders real data on first paint.

interface IndexCard {
  setUuid: string;
  setFlowName: string;
  series?: number;
  history: SetPriceHistoryPoint[];
}

interface VariantData {
  indices: IndexCard[];
  windowTopSets: Array<{ flowName: string; count: number; medianUsd: number }>;
}

// Curated lead-set list — high-circulation, recognizable, likely to have
// usable history (avoids edge cases where the set is too new or too dead).
const FEATURED_SET_NAMES = [
  "Base Set",
  "Metallic Gold LE",
  "Rookie Debut",
  "Run It Back: Origins",
  "Holo Icon",
  "Top Shot This",
];

async function loadVariantC(): Promise<VariantData | null> {
  const [sets, bulk] = await Promise.all([
    allSets(200).catch(() => []),
    recentSalesBulk(300).catch(() => []),
  ]);
  if (!sets.length) return null;
  // Pick the featured sets that exist in the catalog.
  const indices: IndexCard[] = [];
  const seen = new Set<string>();
  for (const name of FEATURED_SET_NAMES) {
    const set = sets.find((s) => s.flowName === name && !seen.has(s.id));
    if (!set) continue;
    seen.add(set.id);
    const history = await getSetPriceHistory(set.id, 30).catch(() => []);
    if (history.length > 1) {
      indices.push({ setUuid: set.id, setFlowName: set.flowName, series: set.flowSeriesNumber, history });
    }
  }
  // If we have fewer than 4 featured, fill with the top-volume sets from
  // the live tx feed that have non-empty history.
  if (indices.length < 4) {
    const bySet = new Map<string, { count: number; firstSetUuid?: string }>();
    for (const t of bulk) {
      const n = t.moment?.set?.flowName;
      if (!n) continue;
      const cur = bySet.get(n) ?? { count: 0 };
      cur.count++;
      bySet.set(n, cur);
    }
    const top = [...bySet.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 30);
    for (const [name] of top) {
      if (indices.length >= 6) break;
      const set = sets.find((s) => s.flowName === name && !seen.has(s.id));
      if (!set) continue;
      seen.add(set.id);
      const history = await getSetPriceHistory(set.id, 30).catch(() => []);
      if (history.length > 1) {
        indices.push({ setUuid: set.id, setFlowName: set.flowName, series: set.flowSeriesNumber, history });
      }
    }
  }
  // Window top sets for sidebar
  const bySetWindow = new Map<string, { count: number; samples: number[] }>();
  for (const t of bulk) {
    const n = t.moment?.set?.flowName;
    if (!n) continue;
    const cur = bySetWindow.get(n) ?? { count: 0, samples: [] };
    cur.count++; cur.samples.push(Number(t.price ?? 0));
    bySetWindow.set(n, cur);
  }
  const median = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const windowTopSets = [...bySetWindow.entries()]
    .map(([flowName, v]) => ({ flowName, count: v.count, medianUsd: median(v.samples) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return { indices, windowTopSets };
}

function summarize(history: SetPriceHistoryPoint[]) {
  if (history.length < 2) return null;
  const first = history[0].price;
  const last = history[history.length - 1].price;
  const delta = last - first;
  const pct = first > 0 ? (delta / first) * 100 : 0;
  const high = Math.max(...history.map((p) => p.price));
  const low = Math.min(...history.map((p) => p.price));
  return { last, delta, pct, high, low, up: delta >= 0 };
}

export default async function HomeVariantC() {
  const d = await loadVariantC();
  if (!d || d.indices.length === 0) {
    return <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">No set-price-history available right now. The getSetPriceHistory endpoint returned no data for any featured set.</div>;
  }
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Indices</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">Variant C · set-level real history</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">{d.indices.length} sets · 30d</span>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-3">
        {/* Index cards grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {d.indices.map((idx) => {
            const summary = summarize(idx.history);
            return (
              <Link
                key={idx.setUuid}
                href={`/set/${idx.setUuid}`}
                className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-3 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[11px] tracking-data-label text-[var(--text-faint)] truncate flex-1">
                    {idx.setFlowName}
                    {idx.series != null && <span className="ml-2 text-[var(--text-faint)]">· s{idx.series}</span>}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[24px] font-semibold tnum">
                    <Num value={summary?.last ?? 0} format="usd" />
                  </span>
                  {summary && (
                    <span className="text-[12px]">
                      <Num value={summary.pct} format="deltaPct" colorize />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Sparkline data={idx.history.map((p) => p.price)} width={280} height={56} />
                </div>
                <div className="text-[10px] text-[var(--text-faint)] font-mono mt-1.5 flex items-baseline gap-2">
                  <span>30d high <Num value={summary?.high} format="usd" precision={0} /></span>
                  <span>· low <Num value={summary?.low} format="usd" precision={0} /></span>
                  <span className="ml-auto">{idx.history.length} pts</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sidebar — window leaderboard */}
        <aside className="space-y-3">
          <Card title="Window leaders" subtitle={`${d.windowTopSets.length} sets · most-traded`} methodology="Grouped by set.flowName over the 300-tx bulk pull.">
            <div className="divide-y divide-[var(--border-subtle)]">
              {d.windowTopSets.map((s) => (
                <div key={s.flowName} className="px-1 py-1.5 grid grid-cols-[1fr_auto_auto] items-baseline gap-2">
                  <span className="text-[11px] text-[var(--text)] truncate">{s.flowName}</span>
                  <span className="text-[10px] text-[var(--text-faint)] tnum">{s.count}</span>
                  <span className="text-[11px] tnum"><Num value={s.medianUsd} format="usdCompact" /></span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="On the chart" methodology="getSetPriceHistory exposes ~daily-cadence series per set. UUID input, not flowId. STAGE-1 UNLOCK-01.">
            <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
              Each card is a real 30-day price history for the set, pulled fresh on every server render. No
              accumulator warmup required — the API gives this directly. Per-edition history requires the snapshot
              accumulator and lights up as it deepens.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
