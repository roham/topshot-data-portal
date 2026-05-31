// /team/[id] — per-team surface. Players whose most-recent team is this one,
// ranked by floor market cap, with team logo + colors. Real marks only
// (cdn.nba.com logos + headshots). Aggregated from mv_player_market_cap.

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getTeamDetail } from "@/lib/supabase/queries/team-detail";
import { NBA_HEADSHOT, NBA_TEAM_LOGO_DARK, colorsForTeamFullName } from "@/lib/nba-team-colors";

export const revalidate = 300;
export const maxDuration = 30;

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

async function TeamBody({ teamId }: { teamId: string }) {
  const d = await getTeamDetail(teamId);
  const colors = colorsForTeamFullName(d.team_name);
  const accent = colors?.text ?? "var(--accent)";

  if (d.players.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-12 text-center">
        <p className="text-[14px] text-[var(--text-dim)]">No players with attributable market cap for this team.</p>
        <p className="text-[11px] text-[var(--text-faint)] mt-2">
          Team id {teamId}. Player→team attribution comes from each player&apos;s most-recent known team.
        </p>
      </div>
    );
  }

  const maxCap = d.players[0].market_cap_usd || 1;
  const top = d.players[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Team market cap", v: fmtUSD(d.totalCapUsd), s: "floor basis · attributed players" },
          { l: "Players", v: d.playerCount.toLocaleString(), s: "with attributable mcap" },
          { l: "Moments in circulation", v: d.totalCirculation.toLocaleString(), s: "across these players" },
          { l: "Top player", v: top.player_name ?? top.player_id, s: fmtUSD(top.market_cap_usd) },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">{k.l}</p>
            <p className="text-[16px] font-semibold mt-1 tabular-nums truncate">{k.v}</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5 truncate">{k.s}</p>
          </div>
        ))}
      </div>

      {/* Ranked roster — headshot + proportional market-cap bar in team color. */}
      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] text-[11px] font-mono tracking-data-label text-[var(--text-faint)] uppercase">
          Roster by market cap · top {Math.min(d.players.length, 30)}
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {d.players.slice(0, 30).map((p, i) => (
            <Link
              key={p.player_id}
              href={`/player/${p.player_id}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="w-5 text-right text-[11px] tabular-nums text-[var(--text-faint)]">{i + 1}</span>
              <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                <Image src={NBA_HEADSHOT(p.player_id)} alt={p.player_name ?? "player"} fill sizes="36px" className="object-cover object-top" unoptimized />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-[var(--text)]">{p.player_name ?? p.player_id}</span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: accent }}>{fmtUSD(p.market_cap_usd)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(1, (p.market_cap_usd / maxCap) * 100)}%`, background: accent, opacity: 0.55 }} />
                </div>
              </div>
              <span className="shrink-0 w-20 text-right text-[10px] font-mono text-[var(--text-faint)]">
                {p.circulation.toLocaleString()} circ
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

async function TeamHeading({ teamId }: { teamId: string }) {
  const d = await getTeamDetail(teamId);
  return <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text)]">{d.team_name ?? "Team"}</h1>;
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={NBA_TEAM_LOGO_DARK(id)} alt="" width={40} height={40} className="w-10 h-10 object-contain" />
        <div>
          <Suspense fallback={<h1 className="text-[20px] font-semibold tracking-tight">Team</h1>}>
            <TeamHeading teamId={id} />
          </Suspense>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">Players ranked by floor market cap · click any player for their editions.</p>
        </div>
      </div>
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <TeamBody teamId={id} />
      </Suspense>
    </main>
  );
}
