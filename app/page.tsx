import { allSets, getSetPriceHistory, recentSalesBulk, type SetPriceHistoryPoint } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Sparkline } from "@/components/primitives/Sparkline";
import { Num } from "@/components/primitives/Num";
import { getAccumulatorDepth, formatDepthCaption } from "@/lib/snapshots/depth";
import Link from "next/link";

export const revalidate = 300;
export const metadata = { title: "Market · TS·PORTAL" };

// Canonical homepage. Indices-first, by Roham's tournament call:
// the set-level VWAP charts from STAGE-1 UNLOCK-01 read as the most
// finished, most decision-supporting first paint we can render today.
// No accumulator warmup required — getSetPriceHistory gives us 30 days
// of real history on every server render.
//
// Companion: /briefing carries the KPI strip + algorithmic story cards
// + condensed lists. The two surfaces serve different reading modes;
// /briefing is the scanner's view, / is the chart-led view.

interface IndexCard {
  setUuid: string;
  setFlowName: string;
  series?: number;
  history: SetPriceHistoryPoint[];
}

interface PageData {
  indices: IndexCard[];
  windowTopSets: Array<{ flowName: string; count: number; medianUsd: number }>;
  depthCaption: string;
}

const FEATURED_SET_NAMES = [
  "Base Set",
  "Metallic Gold LE",
  "Rookie Debut",
  "Run It Back: Origins",
  "Holo Icon",
  "Top Shot This",
];

async function loadHome(): Promise<PageData | null> {
  const [sets, bulk, depth] = await Promise.all([
    allSets(200).catch(() => []),
    recentSalesBulk(300).catch(() => []),
    getAccumulatorDepth().catch(() => null),
  ]);
  if (!sets.length) return null;
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
  if (indices.length < 4) {
    const bySet = new Map<string, number>();
    for (const t of bulk) {
      const n = t.moment?.set?.flowName;
      if (!n) continue;
      bySet.set(n, (bySet.get(n) ?? 0) + 1);
    }
    const top = [...bySet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
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
  return {
    indices,
    windowTopSets,
    depthCaption: depth ? formatDepthCaption(depth) : "Snapshot history: warming",
  };
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

export default async function Home() {
  const d = await loadHome();
  if (!d || d.indices.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">
        No set-price-history available right now. The getSetPriceHistory endpoint returned no data for any featured set.
      </div>
    );
  }
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Market</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">{d.indices.length} sets · 30d VWAP</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">
          {d.depthCaption}
          <span className="ml-3">
            <Link href="/briefing" className="text-[var(--text-dim)] hover:text-[var(--accent)]">briefing →</Link>
          </span>
        </span>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-3">
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

        <aside className="space-y-3">
          <Card title="Window leaders" subtitle={`${d.windowTopSets.length} sets · most-traded`} methodology="Grouped by set.flowName from the 300-tx bulk pull.">
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
              Each card is a real 30-day price history for the set, pulled fresh on every render. No accumulator
              warmup required — the API gives this directly. Per-edition history requires the snapshot accumulator
              and lights up as it deepens. The scanner&apos;s-view companion is at <Link href="/briefing" className="text-[var(--text)] hover:text-[var(--accent)]">/briefing</Link>.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
