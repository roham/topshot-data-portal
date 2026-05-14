import Link from "next/link";
import { Card } from "@/components/Card";
import { teamTotalMinted } from "@/lib/topshot/queries";
import { TEAM_NAMES } from "@/lib/topshot/teams";
import { formatNumber } from "@/lib/utils";

export const revalidate = 3600;

export default async function TeamsIndex() {
  const entries = await Promise.all(
    Object.entries(TEAM_NAMES).map(async ([id, name]) => ({ id, name, total: await teamTotalMinted(id) }))
  );
  const ranked = entries
    .filter((e) => e.total != null)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const maxTotal = ranked[0]?.total ?? 1;
  const grandTotal = ranked.reduce((s, e) => s + (e.total ?? 0), 0);

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-[var(--text-dim)] text-sm">
          D2 · Every NBA team ranked by total minted moments. Aggregate across all sets + parallels + tiers.
        </p>
        <p className="text-[10px] text-[var(--text-faint)] mt-2 tnum">
          {formatNumber(grandTotal)} moments across {ranked.length} teams · cached 60min ·
          searchMintedMoments(byTeams) totalCount
        </p>
      </header>
      <Card title="Mint-share ranking">
        <div className="divide-y divide-[var(--border)]">
          {ranked.map((e, i) => {
            const pct = ((e.total ?? 0) / maxTotal) * 100;
            const share = ((e.total ?? 0) / grandTotal) * 100;
            return (
              <Link
                key={e.id}
                href={`/team/${e.id}`}
                className="block px-4 py-2 hover:bg-[var(--bg-elev)] transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="tnum text-xs text-[var(--text-faint)] w-6">{i + 1}</span>
                  <span className="text-sm flex-1 truncate">{e.name}</span>
                  <span className="tnum text-sm text-[var(--text)]">{formatNumber(e.total ?? 0)}</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-14 text-right">{share.toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
                  <div className="h-1 bg-[var(--accent)] rounded" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
