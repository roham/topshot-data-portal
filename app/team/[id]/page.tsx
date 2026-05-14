import Link from "next/link";
import { notFound } from "next/navigation";
import { teamRecentMints, teamTotalMinted, recentSalesBulk } from "@/lib/topshot/queries";
import { TEAM_NAMES } from "@/lib/topshot/teams";
import { Card } from "@/components/Card";
import { TierPill } from "@/components/Tier";
import { formatNumber, formatUsd, mediaUrl } from "@/lib/utils";

export const revalidate = 300;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = TEAM_NAMES[id];
  if (!name) notFound();
  const [data, txns] = await Promise.all([teamRecentMints(id, 24), recentSalesBulk(200)]);
  // Filter to this team's sales — set name not enough; use team name match on play.stats.teamAtMoment
  const teamSales = txns.filter((t) => t.moment?.play?.stats?.teamAtMoment === name);
  const teamVol = teamSales.reduce((s, t) => s + Number(t.price ?? 0), 0);
  const teamPlayers = new Map<string, number>();
  for (const t of teamSales) {
    const p = t.moment?.play?.stats?.playerName;
    if (p) teamPlayers.set(p, (teamPlayers.get(p) ?? 0) + 1);
  }
  const topThree = [...teamPlayers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-6 pb-4 border-b border-[var(--border)]">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">Team ID {id}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <div className="text-[var(--text-dim)] text-sm mt-1">
          {formatNumber(data.total)} moments minted across all sets · tiers · parallels
        </div>
        <div className="grid grid-cols-3 gap-px bg-[var(--border)] rounded overflow-hidden mt-3 text-[12px]">
          <Cell label="Recent sales" value={teamSales.length.toString()} sub="200-tx window" />
          <Cell label="Recent volume" value={formatUsd(teamVol)} sub="" />
          <Cell label="Top 3 by sale count" value={topThree.map((t) => `${t[0]} (${t[1]})`).join(" · ") || "—"} sub="" />
        </div>
      </header>
      <Card title="Most recent mints" subtitle={`Showing ${data.items.length}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
          {data.items.map((m) => (
            <Link
              key={m.flowId}
              href={`/moment/${m.flowId}`}
              className="bg-[var(--bg-elev)] border border-[var(--border)] rounded overflow-hidden card-hover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(m.flowId, "hero", { width: 240 })} alt={m.play?.stats?.playerName ?? ""} className="w-full aspect-square object-cover" loading="lazy" />
              <div className="p-2">
                <div className="text-xs font-medium truncate">{m.play?.stats?.playerName ?? "—"}</div>
                <div className="text-[10px] text-[var(--text-faint)] truncate flex items-center justify-between mt-0.5">
                  <span>#{m.flowSerialNumber}/{m.edition?.circulationCount ?? "?"}</span>
                  <TierPill tier={m.tier} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-card)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-sm font-semibold tnum mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-faint)]">{sub}</div>}
    </div>
  );
}
