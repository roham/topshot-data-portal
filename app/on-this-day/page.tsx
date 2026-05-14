import { paginatedPlays } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";

export const revalidate = 3600;

export default async function OnThisDayPage() {
  // Today UTC month-day
  const now = new Date();
  const todayMd = `${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;
  const plays = await paginatedPlays(5, 100); // up to 500 most-recent plays
  const matches = plays
    .filter((p) => p.stats?.dateOfMoment)
    .filter((p) => {
      const d = new Date(p.stats!.dateOfMoment!);
      const md = `${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
      return md === todayMd;
    })
    .sort((a, b) => (b.stats?.dateOfMoment ?? "").localeCompare(a.stats?.dateOfMoment ?? ""));

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">On this day</h1>
        <p className="text-[var(--text-dim)] text-sm">
          A2 · Plays whose dateOfMoment matches today ({todayMd}) across years. Sampled from the {plays.length} most-recent plays.
        </p>
      </header>
      {matches.length === 0 ? (
        <Card title="No matches in sample">
          <div className="px-4 py-3 text-sm text-[var(--text-dim)]">
            No plays in the recent {plays.length}-play sample fall on today's calendar date. The public API
            doesn't expose a byDate filter on searchPlays — a deeper-sample pass would require pagination
            the cache can't justify on every render.
          </div>
        </Card>
      ) : (
        <Card title={`${matches.length} plays match today (${todayMd})`} subtitle="A2 · across years">
          <div className="divide-y divide-[var(--border)]">
            {matches.map((p) => (
              <div key={p.id} className="px-4 py-2 flex items-baseline gap-3 text-sm">
                <span className="tnum text-xs text-[var(--text-faint)] w-20">
                  {p.stats?.dateOfMoment?.slice(0, 10)}
                </span>
                <span className="flex-1 truncate font-medium">{p.stats?.playerName ?? "—"}</span>
                <span className="tnum text-xs text-[var(--text-dim)] truncate">{p.stats?.teamAtMoment ?? "—"}</span>
                <span className="text-xs text-[var(--accent)]">{p.stats?.playCategory ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
