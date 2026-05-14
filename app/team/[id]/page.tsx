import Link from "next/link";
import { notFound } from "next/navigation";
import { teamRecentMints, teamTotalMinted } from "@/lib/topshot/queries";
import { TEAM_NAMES } from "@/lib/topshot/teams";
import { Card } from "@/components/Card";
import { TierPill } from "@/components/Tier";
import { formatNumber, mediaUrl } from "@/lib/utils";

export const revalidate = 300;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = TEAM_NAMES[id];
  if (!name) notFound();
  const data = await teamRecentMints(id, 24);
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-6 pb-4 border-b border-[var(--border)]">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">Team ID {id}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <div className="text-[var(--text-dim)] text-sm mt-1">
          {formatNumber(data.total)} moments minted across all sets · tiers · parallels
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
