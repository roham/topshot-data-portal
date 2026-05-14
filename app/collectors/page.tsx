import Link from "next/link";
import { Card } from "@/components/Card";
import { CollectorSearch } from "@/components/CollectorSearch";

const FEATURED_COLLECTORS: Array<{ username: string; gloss: string; archetype: string }> = [
  { username: "BostonBased", gloss: "Celtics-heavy whale — Tatum concentration anchor", archetype: "A2" },
  { username: "BigDaddaBear", gloss: "Wemby-wave onboarder turned specialist", archetype: "A5→A2" },
  { username: "Eduardo_Bean", gloss: "Diversified named-handle whale", archetype: "A1/A4" },
  { username: "MasterCollector", gloss: "Best-player-respect whale", archetype: "A1" },
  { username: "Lions_For_Breakfast", gloss: "Strategist diversification across stars", archetype: "A4" },
  { username: "TommyG2k3", gloss: "Best-player-regardless-of-team — canonical A4", archetype: "A4" },
  { username: "Rigged", gloss: "Gambler-self-aware handle, strategist behavior", archetype: "A4" },
  { username: "OGDADDY013", gloss: "OG handle + LeBron-era Cavs fan", archetype: "A1" },
  { username: "VelvetHoop", gloss: "Iowa alumni Set Completionist — public voice", archetype: "A2" },
  { username: "mostly_commons", gloss: "Philosophical handle, Timberwolves loyal", archetype: "A2" },
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
      <Card title="Reference bags by archetype" subtitle="anchors from PERSONAS research — A1 OG / A2 Completionist / A3 Re-Activator / A4 Strategist / A5 Onboarder">
        {["A1", "A2", "A1/A4", "A4", "A5→A2"].map((a) => {
          const rows = FEATURED_COLLECTORS.filter((c) => c.archetype === a);
          if (!rows.length) return null;
          return (
            <div key={a} className="border-b border-[var(--border)] last:border-b-0">
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-faint)] bg-[var(--bg-elev)]">{a}</div>
              <div className="divide-y divide-[var(--border)]">
                {rows.map((c) => (
                  <Link
                    key={c.username}
                    href={`/u/${c.username}`}
                    className="flex items-baseline justify-between gap-4 px-4 py-2 hover:bg-[var(--bg-elev)] text-sm"
                  >
                    <span className="font-semibold">{c.username}</span>
                    <span className="text-xs text-[var(--text-dim)] flex-1 text-right">{c.gloss}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
