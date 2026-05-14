import { getLeaderboard } from "@/lib/topshot/queries";
import { FEATURED_PLAYERS, TEAM_NAMES } from "@/lib/topshot/teams";
import { Card } from "@/components/Card";
import { formatNumber } from "@/lib/utils";

export const revalidate = 3600;

export default async function LeaderboardsPage() {
  const [players, teams] = await Promise.all([
    Promise.all(
      FEATURED_PLAYERS.slice(0, 6).map(async (p) => ({
        ...p,
        entries: await getLeaderboard("PLAYER", p.id, 10),
      }))
    ),
    Promise.all(
      Object.entries(TEAM_NAMES)
        .slice(0, 6)
        .map(async ([id, name]) => ({
          id,
          name,
          entries: await getLeaderboard("TEAM", id, 10),
        }))
    ),
  ]);

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboards</h1>
        <p className="text-[var(--text-dim)] text-sm">
          A3 / D3 · Anonymous score ladders per player and per team. Public API returns rank + score only — collector identity withheld.
        </p>
        <p className="text-[10px] text-[var(--text-faint)] mt-2">
          Historical-snapshot ceiling: <code className="font-mono text-[var(--accent)]">getLeaderboard</code> exposes only the current state. Historical-leaderboard queries (date/at/snapshot parameters) all return validation errors. A3 in its full "time-series of leaderboards" interpretation requires a polling-and-storing-snapshots layer outside this portal.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Player ladders" subtitle={`Top 10 scores per player · ${players.length} featured players`}>
          <div className="divide-y divide-[var(--border)]">
            {players.map((p) => {
              const max = p.entries[0]?.score ?? 1;
              return (
                <div key={p.id} className="px-4 py-2">
                  <div className="text-sm font-semibold mb-1">{p.name}</div>
                  <div className="space-y-0.5">
                    {p.entries.slice(0, 5).map((e) => {
                      const pct = (e.score / max) * 100;
                      return (
                        <div key={e.rank}>
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="tnum text-[var(--text-faint)] w-6">#{e.rank}</span>
                            <span className="tnum text-[var(--text)] flex-1 text-right">{formatNumber(e.score)}</span>
                          </div>
                          <div className="h-0.5 bg-[var(--bg-elev)] rounded">
                            <div className="h-0.5 bg-[var(--accent)] rounded" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Team ladders" subtitle={`Top 10 scores per team · ${teams.length} teams sampled`}>
          <div className="divide-y divide-[var(--border)]">
            {teams.map((t) => {
              const max = t.entries[0]?.score ?? 1;
              return (
                <div key={t.id} className="px-4 py-2">
                  <div className="text-sm font-semibold mb-1">{t.name}</div>
                  <div className="space-y-0.5">
                    {t.entries.slice(0, 5).map((e) => {
                      const pct = (e.score / max) * 100;
                      return (
                        <div key={e.rank}>
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="tnum text-[var(--text-faint)] w-6">#{e.rank}</span>
                            <span className="tnum text-[var(--text)] flex-1 text-right">{formatNumber(e.score)}</span>
                          </div>
                          <div className="h-0.5 bg-[var(--bg-elev)] rounded">
                            <div className="h-0.5 bg-[var(--rare)] rounded" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
