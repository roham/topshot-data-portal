import Link from "next/link";
import { Card } from "@/components/Card";
import { CollectorSearch } from "@/components/CollectorSearch";

const FEATURED_COLLECTORS: Array<{ username: string; gloss: string }> = [
  { username: "BostonBased", gloss: "Celtics-heavy whale — Tatum concentration anchor (A2)" },
  { username: "BigDaddaBear", gloss: "Wemby-wave onboarder turned specialist (A5→A2 migration)" },
  { username: "Eduardo_Bean", gloss: "Diversified named-handle whale (A1/A4 hybrid)" },
  { username: "MasterCollector", gloss: "Best-player-respect whale (A1)" },
  { username: "Lions_For_Breakfast", gloss: "Strategist diversification across stars (A4)" },
  { username: "TommyG2k3", gloss: "Best-player-regardless-of-team — canonical A4" },
  { username: "Rigged", gloss: "Gambler-self-aware handle, strategist behavior (A4)" },
  { username: "OGDADDY013", gloss: "OG handle + LeBron-era Cavs fan (A1)" },
  { username: "VelvetHoop", gloss: "Iowa alumni Set Completionist — public voice (A2)" },
  { username: "mostly_commons", gloss: "Philosophical handle, Timberwolves loyal (A2)" },
];

export const dynamic = "force-static";

export default function CollectorsIndex() {
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Collectors</h1>
        <p className="text-[var(--text-dim)] text-sm mb-4">
          Drop a username or 16-character Flow address. We resolve, paginate the full bag, and show the math.
        </p>
        <CollectorSearch />
      </header>
      <Card title="Reference bags" subtitle="anchors from PERSONAS research — useful for benchmarking the portal against known patterns">
        <div className="divide-y divide-[var(--border)]">
          {FEATURED_COLLECTORS.map((c) => (
            <Link
              key={c.username}
              href={`/u/${c.username}`}
              className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-[var(--bg-elev)]"
            >
              <span className="font-semibold text-sm">{c.username}</span>
              <span className="text-xs text-[var(--text-dim)] flex-1 text-right">{c.gloss}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
