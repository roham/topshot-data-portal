import Link from "next/link";
import { FEATURED_PLAYERS } from "@/lib/topshot/teams";
import { Card } from "@/components/Card";

export const dynamic = "force-static";

export default function PlayersIndex() {
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Players</h1>
      <p className="text-[var(--text-dim)] text-sm mb-6">Featured player surfaces — each shows recent mints + the anonymous score ladder.</p>
      <Card title="Featured">
        <div className="divide-y divide-[var(--border)]">
          {FEATURED_PLAYERS.map((p) => (
            <Link key={p.id} href={`/player/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elev)]">
              <span className="text-sm">{p.name}</span>
              <span className="text-xs font-mono text-[var(--text-faint)]">id {p.id} →</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
