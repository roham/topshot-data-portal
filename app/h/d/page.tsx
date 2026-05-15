import { recentSalesBulk, biggestSalesAllTime, allSets, getSetPriceHistory, type SetPriceHistoryPoint } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Sparkline } from "@/components/primitives/Sparkline";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import Link from "next/link";

export const revalidate = 60;
export const metadata = { title: "Variant D · Story · TS·PORTAL" };

// Variant D — story magazine. Three to five algorithmically-derived
// "headlines of the day" with prose hooks, each linking to the deep
// surface that proves the claim. FiveThirtyEight / Polymarket front-page
// model — every headline is verifiable from a single API source.
//
// Headline sources (all computable from today's data):
//  1. Biggest sale this window (recentSalesBulk + sort).
//  2. Hottest set this window (group by, sort by count).
//  3. Sharpest 30d move on a featured set (getSetPriceHistory).
//  4. Most-traded player this window (group by, sort by count).
//  5. All-time biggest sales standing (biggestSalesAllTime).

interface Headline {
  key: string;
  kicker: string;
  hed: string;
  dek: React.ReactNode;
  href: string;
  spark?: number[];
  sparkColor?: string;
  stat?: { value: number; format: "usd" | "usdCompact" | "deltaPct"; colorize?: boolean };
  tier?: string | null;
}

interface VariantData {
  headlines: Headline[];
  microStats: Array<{ label: string; value: number; format: "int" | "usd" | "usdCompact" }>;
}

const FEATURED_SETS_FOR_TREND = ["Base Set", "Metallic Gold LE", "Rookie Debut", "Run It Back: Origins", "Holo Icon"];

async function loadVariantD(): Promise<VariantData | null> {
  const [bulk, biggestAllTime, sets] = await Promise.all([
    recentSalesBulk(400).catch(() => []),
    biggestSalesAllTime(3).catch(() => []),
    allSets(200).catch(() => []),
  ]);
  if (!bulk.length) return null;

  // 1. Biggest in window
  const sorted = [...bulk].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  const biggestWindow = sorted[0];

  // 2. Hottest set (most sales count)
  const bySet = new Map<string, { count: number; samples: number[] }>();
  for (const t of bulk) {
    const sn = t.moment?.set?.flowName;
    if (!sn) continue;
    const cur = bySet.get(sn) ?? { count: 0, samples: [] };
    cur.count++; cur.samples.push(Number(t.price ?? 0));
    bySet.set(sn, cur);
  }
  const median = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const topSetEntry = [...bySet.entries()].sort((a, b) => b[1].count - a[1].count)[0];

  // 3. Sharpest 30d move on a featured set
  let sharpest: { setFlowName: string; setUuid: string; history: SetPriceHistoryPoint[]; pct: number } | null = null;
  for (const name of FEATURED_SETS_FOR_TREND) {
    const set = sets.find((s) => s.flowName === name);
    if (!set) continue;
    const history = await getSetPriceHistory(set.id, 30).catch(() => []);
    if (history.length < 2) continue;
    const first = history[0].price;
    const last = history[history.length - 1].price;
    const pct = first > 0 ? ((last - first) / first) * 100 : 0;
    if (!sharpest || Math.abs(pct) > Math.abs(sharpest.pct)) {
      sharpest = { setFlowName: set.flowName, setUuid: set.id, history, pct };
    }
  }

  // 4. Most-traded player
  const byPlayer = new Map<string, number>();
  for (const t of bulk) {
    const pn = t.moment?.play?.stats?.playerName;
    if (pn) byPlayer.set(pn, (byPlayer.get(pn) ?? 0) + 1);
  }
  const topPlayerEntry = [...byPlayer.entries()].sort((a, b) => b[1] - a[1])[0];

  const headlines: Headline[] = [];

  if (biggestWindow) {
    const price = Number(biggestWindow.price ?? 0);
    const playerName = biggestWindow.moment?.play?.stats?.playerName ?? "—";
    const serial = biggestWindow.moment?.flowSerialNumber ?? "?";
    const setName = biggestWindow.moment?.set?.flowName ?? "—";
    const flowId = biggestWindow.moment?.flowId;
    headlines.push({
      key: "biggest-window",
      kicker: "Biggest sale · window",
      hed: `$${price.toLocaleString()} for ${playerName} #${serial}`,
      dek: (
        <>
          The largest single transaction in the 400-tx window came from{" "}
          <span className="text-[var(--text)]">{setName}</span>
          {biggestWindow.buyer?.username && (
            <>
              {", bought by "}
              <Link href={`/u/${encodeURIComponent(biggestWindow.buyer.username)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{biggestWindow.buyer.username}</Link>
            </>
          )}
          {biggestWindow.seller?.username && (
            <>
              {", sold by "}
              <Link href={`/u/${encodeURIComponent(biggestWindow.seller.username)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{biggestWindow.seller.username}</Link>
            </>
          )}
          .
        </>
      ),
      href: flowId ? `/moment/${flowId}` : "#",
      stat: { value: price, format: "usd" },
      tier: biggestWindow.moment?.tier,
    });
  }

  if (topSetEntry) {
    const [name, agg] = topSetEntry;
    const medUsd = median(agg.samples);
    headlines.push({
      key: "hot-set",
      kicker: "Hot set · window",
      hed: `${name} leads with ${agg.count} sales`,
      dek: (
        <>
          The most-traded set in the current window. Median sale across those{" "}
          <span className="font-mono tnum text-[var(--text)]">{agg.count}</span> transactions:{" "}
          <span className="font-mono tnum text-[var(--text)]">${medUsd.toFixed(2)}</span>.
        </>
      ),
      href: `/sets`,
      spark: agg.samples.slice(-30),
      stat: { value: medUsd, format: "usd" },
    });
  }

  if (sharpest) {
    headlines.push({
      key: "sharp-30d",
      kicker: `30-day move · ${sharpest.setFlowName}`,
      hed: `${sharpest.setFlowName} ${sharpest.pct >= 0 ? "up" : "down"} ${Math.abs(sharpest.pct).toFixed(1)}% over 30 days`,
      dek: (
        <>
          Set-level VWAP series via the public <code className="font-mono text-[var(--text)]">getSetPriceHistory</code> endpoint.{" "}
          {sharpest.history.length} datapoints — last 30 days. The chart on the set page expands this.
        </>
      ),
      href: `/set/${sharpest.setUuid}`,
      spark: sharpest.history.map((p) => p.price),
      sparkColor: sharpest.pct >= 0 ? "var(--up)" : "var(--down)",
      stat: { value: sharpest.pct, format: "deltaPct", colorize: true },
    });
  }

  if (topPlayerEntry) {
    headlines.push({
      key: "top-player",
      kicker: "Player · window",
      hed: `${topPlayerEntry[0]} dominates with ${topPlayerEntry[1]} sales`,
      dek: (
        <>
          Most-traded player across editions in the active window. Catalog and per-edition floors at the player page.
        </>
      ),
      href: `/players`,
      stat: { value: topPlayerEntry[1], format: "int" as never as "usd" },
    });
  }

  if (biggestAllTime.length > 0) {
    const t = biggestAllTime[0];
    const price = Number(t.price ?? 0);
    const playerName = t.moment?.play?.stats?.playerName ?? "—";
    const setName = t.moment?.set?.flowName ?? "—";
    const flowId = t.moment?.flowId;
    headlines.push({
      key: "all-time",
      kicker: "All-time leaderboard",
      hed: `Top sale ever: $${price.toLocaleString()} for ${playerName}`,
      dek: (
        <>
          The standing all-time record from <code className="font-mono">biggestSalesAllTime(PRICE_DESC)</code> — set:{" "}
          <span className="text-[var(--text)]">{setName}</span>. Hasn&apos;t changed unless a bigger trade just printed.
        </>
      ),
      href: flowId ? `/moment/${flowId}` : "#",
      stat: { value: price, format: "usdCompact" },
    });
  }

  const microStats = [
    { label: "Window sales", value: bulk.length, format: "int" as const },
    { label: "Window volume", value: bulk.reduce((s, t) => s + Number(t.price ?? 0), 0), format: "usdCompact" as const },
    { label: "Sets traded", value: bySet.size, format: "int" as const },
    { label: "Players traded", value: byPlayer.size, format: "int" as const },
  ];

  return { headlines, microStats };
}

export default async function HomeVariantD() {
  const d = await loadVariantD();
  if (!d) {
    return <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">Upstream API unreachable — story feed cannot be derived.</div>;
  }
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Story</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">Variant D · algorithmic headlines</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">{d.headlines.length} headlines · refreshes every 60s</span>
      </header>

      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        {/* Headlines column */}
        <div className="space-y-4">
          {d.headlines.map((h, i) => (
            <Link
              key={h.key}
              href={h.href}
              className="block bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md p-4 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-[10px] tracking-data-label text-[var(--accent)]">{h.kicker}</span>
                {h.tier && <TierChip tier={h.tier} />}
                <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">#{i + 1}</span>
              </div>
              <h2 className={`font-semibold tracking-tight text-[var(--text)] ${i === 0 ? "text-[26px]" : "text-[18px]"} leading-tight`}>
                {h.hed}
              </h2>
              <p className="text-[12px] text-[var(--text-dim)] mt-2 leading-relaxed">{h.dek}</p>
              {h.spark && h.spark.length > 1 && (
                <div className="mt-3">
                  <Sparkline data={h.spark} width={520} height={56} color={h.sparkColor} />
                </div>
              )}
              {h.stat && (
                <div className="mt-2 text-[12px] tnum">
                  <span className="text-[10px] tracking-data-label text-[var(--text-faint)] mr-2">stat</span>
                  <Num value={h.stat.value} format={h.stat.format} colorize={h.stat.colorize ?? false} />
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Micro-stat sidebar */}
        <aside>
          <Card title="Micro stats" subtitle="raw window numbers" methodology="Computed from the 400-tx bulk pull on each render. No accumulator dependency.">
            <div className="divide-y divide-[var(--border-subtle)]">
              {d.microStats.map((m) => (
                <div key={m.label} className="px-1 py-2 flex items-baseline gap-3">
                  <span className="text-[10px] tracking-data-label text-[var(--text-faint)] flex-1">{m.label}</span>
                  <span className="text-[14px] tnum"><Num value={m.value} format={m.format} /></span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
