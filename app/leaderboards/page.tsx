// /leaderboards — composite landing for Trade lane. Three columns side-by-
// side: top players (by volume), most active editions (by tx count), biggest
// sales. Each links into its richer surface.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";
import { getTopPlayers } from "@/lib/supabase/queries/top-players";
import { getMostActiveEditions } from "@/lib/supabase/queries/most-active-editions";
import { getLargestSales } from "@/lib/supabase/queries/largest-sales";

export const revalidate = 120;
export const maxDuration = 30;
export const metadata = { title: "Leaderboards · TS·PORTAL" };

async function TopPlayers({ window }: { window: TimeWindow }) {
  const rows = await getTopPlayers({ window, limit: 20, minTxCount: 5 });
  return (
    <div className="px-3 py-1">
      {rows.length === 0 ? (
        <p className="text-[11px] text-[var(--text-faint)] font-mono py-3">No data in this window.</p>
      ) : (
        <ol className="text-[11px] font-mono space-y-1.5">
          {rows.map((p, i) => (
            <li key={p.player_id ?? i} className="flex items-baseline gap-2">
              <span className="text-[var(--text-faint)] w-5 text-right tabular-nums">{i + 1}</span>
              <Link
                href={p.player_id ? `/player/${p.player_id}` : "/movers"}
                className="text-[var(--text)] hover:text-[var(--accent)] flex-1 truncate"
              >
                {p.player_name ?? "—"}
              </Link>
              <span className="text-[var(--text-dim)] tabular-nums">
                <Num value={Number(p.total_volume_usd)} format="usdCompact" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

async function ActiveEditions({ window }: { window: TimeWindow }) {
  const rows = await getMostActiveEditions({ window, limit: 20, minTxCount: 2 });
  return (
    <div className="px-3 py-1">
      {rows.length === 0 ? (
        <p className="text-[11px] text-[var(--text-faint)] font-mono py-3">No data in this window.</p>
      ) : (
        <ol className="text-[11px] font-mono space-y-1.5">
          {rows.map((e, i) => {
            const editionHref = e.edition_id?.includes("+")
              ? `/edition/${e.edition_id.replace("+", "-")}`
              : null;
            return (
              <li key={e.edition_id ?? i} className="flex items-baseline gap-2">
                <span className="text-[var(--text-faint)] w-5 text-right tabular-nums">{i + 1}</span>
                {editionHref ? (
                  <Link href={editionHref} className="text-[var(--text)] hover:text-[var(--accent)] flex-1 truncate">
                    {e.player_name ?? "—"}
                  </Link>
                ) : (
                  <span className="text-[var(--text)] flex-1 truncate">{e.player_name ?? "—"}</span>
                )}
                {e.tier_name && <TierChip tier={e.tier_name} />}
                <span className="text-[var(--text-dim)] tabular-nums">
                  {Number(e.tx_count).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

async function BiggestSales({ window }: { window: TimeWindow }) {
  const rows = await getLargestSales({ window, limit: 20 });
  return (
    <div className="px-3 py-1">
      {rows.length === 0 ? (
        <p className="text-[11px] text-[var(--text-faint)] font-mono py-3">No sales in this window.</p>
      ) : (
        <ol className="text-[11px] font-mono space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.transaction_id ?? i} className="flex items-baseline gap-2">
              <span className="text-[var(--text-faint)] w-5 text-right tabular-nums">{i + 1}</span>
              <span className="text-[var(--text)] flex-1 truncate">{r.player_name ?? "—"}</span>
              <span className="text-[var(--text-dim)] tabular-nums">
                <Num value={Number(r.gross_amount_usd)} format="usd" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ w?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const { window } = parseTimeWindow(sp.w, "7d");
  const label = WINDOW_SPECS[window].label;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
      <header className="flex items-baseline gap-4">
        <h1 className="font-mono text-[14px] tracking-section-header">LEADERBOARDS · {label}</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono">
          Composite landing. Click any column for the full surface.
        </p>
        <div className="ml-auto"><TimeWindowSelector /></div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="TOP PLAYERS"
          subtitle="USD volume"
          variant="inset"
          right={<Link href="/movers" className="text-[10px] text-[var(--accent)] hover:underline font-mono">all →</Link>}
        >
          <Suspense fallback={<div className="px-3 py-3 text-[11px] text-[var(--text-faint)]">Loading…</div>}>
            <TopPlayers window={window} />
          </Suspense>
        </Card>
        <Card
          title="ACTIVE EDITIONS"
          subtitle="Trade count"
          variant="inset"
          right={<Link href="/movers" className="text-[10px] text-[var(--accent)] hover:underline font-mono">all →</Link>}
        >
          <Suspense fallback={<div className="px-3 py-3 text-[11px] text-[var(--text-faint)]">Loading…</div>}>
            <ActiveEditions window={window} />
          </Suspense>
        </Card>
        <Card
          title="BIGGEST SALES"
          subtitle="USD"
          variant="inset"
          right={<Link href="/on-this-day" className="text-[10px] text-[var(--accent)] hover:underline font-mono">archive →</Link>}
        >
          <Suspense fallback={<div className="px-3 py-3 text-[11px] text-[var(--text-faint)]">Loading…</div>}>
            <BiggestSales window={window} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
