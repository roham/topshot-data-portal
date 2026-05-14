import { Card } from "@/components/Card";

export const dynamic = "force-static";

interface Iter { n: number; tag: string; summary: string }

const ITERS: Iter[] = [
  { n: 1, tag: "PC3 P&L + market stats + parallel matrix", summary: "Portfolio unrealized P/L vs lastPurchasePrice baseline. MarketStats strip on home (vol, sale count, top single, hot buyer, hot player). Parallel matrix on /moment." },
  { n: 2, tag: "/sets index + TopSales board", summary: "Sets directory grouped by series; TopSales card on home." },
  { n: 3, tag: "D2 top teams", summary: "/teams ranks all 30 NBA teams by total minted moments." },
  { n: 4, tag: "M3 volume spikes", summary: "/movement aggregates 200-tx sliding window for player-volume ranking." },
  { n: 5, tag: "PC4 set completion", summary: "/u shows top-6 sets with held/total editions percentage bars." },
  { n: 6, tag: "M2 movers down", summary: "/movement adds sales-below-per-player-median ranking." },
  { n: 7, tag: "PC5 compare-to-collector", summary: "/compare?a=&b= overlap + shared-player + edition-distinctness math." },
  { n: 8, tag: "D5 spotlight", summary: "Auto-rotating top-buyer hero strip on home." },
  { n: 9, tag: "S4 trending now", summary: "Players + sets by sale count card on home." },
  { n: 10, tag: "S2 watching", summary: "/watching localStorage list + ★ Watch toggle." },
  { n: 11, tag: "M5 + V4", summary: "Set momentum on /movement; value-by-set on /u." },
  { n: 12, tag: "A1 archive", summary: "/archive top-25 sales of all time via sortBy: PRICE_DESC." },
  { n: 13, tag: "T1 + T2 trends", summary: "/trends by player + by tier with documented data ceilings." },
  { n: 14, tag: "T3 series", summary: "/trends by series via setName→series join." },
  { n: 15, tag: "A2 on this day", summary: "/on-this-day plays matching current date across years." },
  { n: 16, tag: "A4 set retro", summary: "/set/[id] full edition list + by-tier + by-parallel." },
  { n: 17, tag: "A3 leaderboards", summary: "/leaderboards anonymous player + team ladders." },
  { n: 18, tag: "V5 confidence", summary: "Pre-fetch per-edition comps on /moment for stronger confidence labels." },
  { n: 19, tag: "Filterable holdings", summary: "HoldingsGrid client-side filter + sort on /u." },
  { n: 20, tag: "Edge board", summary: "/moment edge board listing serials w/ % vs fair." },
  { n: 21, tag: "Anomalies", summary: "/anomalies players by price coefficient of variation." },
  { n: 22, tag: "Histogram", summary: "Per-player price histogram on /player/[id]." },
  { n: 23, tag: "Watchlist activity", summary: "/watching shows recent-buys/sells per watched user." },
  { n: 24, tag: "Lineage upgrade", summary: "ParallelMatrix gains scarcity-vs-base ratio." },
  { n: 25, tag: "M4 whale watch", summary: "/whales top buyers + sellers by $ volume in window." },
  { n: 26, tag: "T4 floor compression", summary: "EdgeBoard adds 'floor compression' metric." },
  { n: 27, tag: "T5 velocity", summary: "/moment velocity card." },
  { n: 28, tag: "Serial rarity", summary: "/moment surfaces rarity flags (percentile, jersey, #1, low, last)." },
  { n: 29, tag: "Specials", summary: "/specials trophy-tier sales by category." },
  { n: 30, tag: "Archetype groups", summary: "/collectors grouped by persona archetype." },
  { n: 31, tag: "Bargain board", summary: "/movement Bargains <50% of tier median." },
  { n: 32, tag: "OG image", summary: "/api/og/u/[username] SVG og image for shares." },
  { n: 33, tag: "Nav reorg", summary: "Top nav into 5 sections separated by dots." },
  { n: 34, tag: "Team enrich", summary: "/team/[id] gets window stats." },
  { n: 35, tag: "Sparkline", summary: "Comp price trace on /moment." },
  { n: 36, tag: "Cache hardening", summary: "Detect rate-limit + serve stale; bumped TTLs." },
  { n: 37, tag: "Persona callouts", summary: "5 persona-tagged quick-jumps on home." },
  { n: 38, tag: "Tier×series matrix", summary: "/trends cross-tabulation." },
  { n: 39, tag: "JSON API", summary: "/api/stats public summary endpoint." },
  { n: 40, tag: "Tier median badge", summary: "/moment shows fair-value vs tier median delta." },
  { n: 41, tag: "Set enrich", summary: "/set/[id] gets window stats." },
  { n: 42, tag: "Prod screenshots", summary: "Capture 19+ surfaces post-iter-35-41." },
  { n: 43, tag: "Spotlight avatar", summary: "Top-buyer profile image on home strip." },
  { n: 44, tag: "Methodology table", summary: "/methodology Routes table." },
  { n: 45, tag: "Mobile burger", summary: "MobileNav drawer with all 17 routes." },
  { n: 46, tag: "/ keyboard", summary: "Press '/' to focus collector search." },
  { n: 47, tag: "Acquired filter + error resilience", summary: "HoldingsGrid acquired-recency. /u catches upstream errors." },
  { n: 48, tag: "Tri-rollup", summary: "Value by set + team + player on /u." },
  { n: 49, tag: "Scorecard", summary: "iter-final-scorecard.md captures all 36 catalog JTBDs + 23+ competitive." },
  { n: 50, tag: "Tenure", summary: "/u shows earliest-acquired year." },
  { n: 51, tag: "Rules meta", summary: "/rules header surfaces engine properties." },
  { n: 52, tag: "/players velocity", summary: "/players shows window sales + volume per featured player." },
  { n: 53, tag: "Footer links", summary: "Footer links /api/stats /methodology /rules." },
  { n: 54, tag: "Sets ranked by vol", summary: "/sets sorts each series by recent volume." },
  { n: 55, tag: "Methodology provenance", summary: "/methodology Build provenance section." },
  { n: 56, tag: "Specials avg", summary: "/specials 4-cell summary strip." },
  { n: 57, tag: "Anomaly bars", summary: "Range visuals per anomaly row." },
  { n: 58, tag: "Compare CTA", summary: "/u gets Compare ↔ button." },
  { n: 59, tag: "Confidence strip", summary: "/u confidence-band count breakdown." },
  { n: 60, tag: "Mobile activity feed", summary: "ActivityFeed hides buyer/seller cols on narrow." },
  { n: 61, tag: "/changelog", summary: "This page." },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Changelog</h1>
        <p className="text-[var(--text-dim)] text-sm">
          STAGE-7 iteration trail. {ITERS.length} entries — each maps to a commit on roham/topshot-data-portal.
        </p>
      </header>
      <Card title="Iterations" subtitle={`${ITERS.length} commits`}>
        <div className="divide-y divide-[var(--border)]">
          {[...ITERS].reverse().map((it) => (
            <div key={it.n} className="px-4 py-2 grid grid-cols-[80px_minmax(0,1fr)] gap-3 text-sm">
              <span className="tnum text-[var(--accent)] font-mono">iter-{it.n}</span>
              <div>
                <div className="font-semibold">{it.tag}</div>
                <div className="text-xs text-[var(--text-dim)]">{it.summary}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
