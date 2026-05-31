// /movers — full ranked list of top players + most active editions for the
// global TimeWindow. The homepage strip is the partial view; this is the
// filterable, longer-tail surface.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";
import { getTopPlayers } from "@/lib/supabase/queries/top-players";
import { getMostActiveEditions } from "@/lib/supabase/queries/most-active-editions";

export const revalidate = 120;
export const maxDuration = 30;
export const metadata = { title: "Movers · TS·PORTAL" };

async function TopPlayersTable({ window }: { window: TimeWindow }) {
  const minTx = window === "24h" ? 2 : window === "7d" ? 5 : 10;
  const rows = await getTopPlayers({ window, limit: 100, minTxCount: minTx });
  if (rows.length === 0) {
    return <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">No player volume in this window.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)] uppercase tracking-data-label text-[9px]">
            <th className="px-3 py-1.5 text-left w-8">#</th>
            <th className="px-3 py-1.5 text-left">Player</th>
            <th className="px-3 py-1.5 text-right">Volume</th>
            <th className="px-3 py-1.5 text-right">Trades</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.player_id ?? `${i}-${p.player_name ?? ""}`} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)]">
              <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
              <td className="px-3 py-2">
                {p.player_id ? (
                  <Link href={`/player/${p.player_id}`} className="text-[var(--text)] hover:text-[var(--accent)]">
                    {p.player_name ?? "—"}
                  </Link>
                ) : (
                  <span className="text-[var(--text)]">{p.player_name ?? "—"}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                <Num value={Number(p.total_volume_usd)} format="usdCompact" />
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                {Number(p.tx_count).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function MostActiveTable({ window }: { window: TimeWindow }) {
  const minTx = window === "24h" ? 2 : 5;
  const rows = await getMostActiveEditions({ window, limit: 50, minTxCount: minTx });
  if (rows.length === 0) {
    return <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">No edition activity in this window.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)] uppercase tracking-data-label text-[9px]">
            <th className="px-3 py-1.5 text-left w-8">#</th>
            <th className="px-3 py-1.5 text-left">Player</th>
            <th className="px-3 py-1.5 text-left">Set</th>
            <th className="px-3 py-1.5 text-left">Tier</th>
            <th className="px-3 py-1.5 text-right">Volume</th>
            <th className="px-3 py-1.5 text-right">Trades</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => {
            const editionHref = e.edition_id?.includes("+")
              ? `/edition/${e.edition_id.replace("+", "-")}`
              : null;
            return (
              <tr key={e.edition_id ?? i} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)]">
                <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  {editionHref ? (
                    <Link href={editionHref} className="text-[var(--text)] hover:text-[var(--accent)]">
                      {e.player_name ?? "—"}
                    </Link>
                  ) : (
                    <span className="text-[var(--text)]">{e.player_name ?? "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--text-dim)]">{e.set_name ?? "—"}</td>
                <td className="px-3 py-2">{e.tier_name ? <TierChip tier={e.tier_name} /> : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                  <Num value={Number(e.volume_usd ?? 0)} format="usdCompact" />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                  {Number(e.tx_count).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ w?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const { window } = parseTimeWindow(sp.w, "30d");
  const label = WINDOW_SPECS[window].label;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
      <header className="flex items-baseline gap-4">
        <h1 className="font-mono text-[14px] tracking-section-header">MOVERS · {label}</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono">
          Players + editions ranked by trading volume.
        </p>
        <div className="ml-auto"><TimeWindowSelector /></div>
      </header>

      <Card title={`TOP PLAYERS — ${label}`} subtitle="Ranked by USD volume" variant="inset">
        <Suspense fallback={<div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading…</div>}>
          <TopPlayersTable window={window} />
        </Suspense>
      </Card>

      <Card title={`MOST ACTIVE EDITIONS — ${label}`} subtitle="Ranked by USD volume" variant="inset">
        <Suspense fallback={<div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading…</div>}>
          <MostActiveTable window={window} />
        </Suspense>
      </Card>
    </div>
  );
}
