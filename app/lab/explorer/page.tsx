// /lab/explorer — the filterable market-cap-move explorer. Pick a dimension
// (tier / scarcity / series / team / player / cohort) and a window; see the
// floor market-cap % move per segment, ranked. All numbers from the verified
// mv_edition_cap_asof (correct carry-forward, full data) — aggregated in JS.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getEditionCapRows,
  aggregateMoves,
  WINDOW_LABEL,
  type Dimension,
  type WindowKey,
} from "@/lib/supabase/queries/edition-cap-asof";
import { Num } from "@/components/primitives/Num";

export const metadata: Metadata = { title: "Cap Explorer · TS·PORTAL" };
export const revalidate = 600;
export const maxDuration = 60;

const DIMS: { key: Dimension; label: string }[] = [
  { key: "tier", label: "Tier" },
  { key: "scarcity", label: "Scarcity" },
  { key: "series", label: "Series" },
  { key: "cohort", label: "TS-50 vs rest" },
  { key: "team", label: "Team" },
  { key: "player", label: "Player" },
];
const WINS: WindowKey[] = ["d7", "d30", "d90", "d180", "d365"];
const MAX_PCT = 40;

function Bar({ pct }: { pct: number | null }) {
  if (pct == null) return <div className="h-[14px] flex-1" />;
  const mag = Math.min(Math.abs(pct) / MAX_PCT, 1) * 50;
  const up = pct >= 0;
  return (
    <div className="relative h-[14px] flex-1 rounded bg-[var(--surface-2)]">
      <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--border-subtle)]" />
      <div className="absolute top-0 h-full rounded"
        style={{ [up ? "left" : "right"]: "50%", width: `${mag}%`, background: up ? "var(--up)" : "var(--down)" }} />
    </div>
  );
}

async function Explorer({ dim, win }: { dim: Dimension; win: WindowKey }) {
  const rows = await getEditionCapRows();
  const isRanked = dim === "player" || dim === "team";
  const { segments, total } = aggregateMoves(rows, dim, win, { topN: isRanked ? 25 : undefined });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">Total floor cap (now)</div>
          <div className="mt-1 text-[20px] font-semibold tabular-nums"><Num value={total.cap_now} format="usdCompact" /></div>
        </div>
        <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">Market move · {WINDOW_LABEL[win]}</div>
          <div className="mt-1 text-[20px] font-semibold tabular-nums"><Num value={total.pct} format="deltaPct" colorize precision={1} /></div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
        <div className="mb-3 grid grid-cols-[150px_1fr_64px_72px_44px] items-center gap-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-faint)]">
          <span>segment</span><span>{WINDOW_LABEL[win]} move</span><span className="text-right">%</span><span className="text-right">floor cap</span><span className="text-right">eds</span>
        </div>
        <div className="space-y-2">
          {segments.length === 0 && <p className="py-6 text-center text-[12px] text-[var(--text-dim)]">no segments</p>}
          {segments.map((s) => (
            <div key={s.label} className="grid grid-cols-[150px_1fr_64px_72px_44px] items-center gap-2.5">
              <span className="truncate text-[12px] text-[var(--text-dim)]" title={s.label}>{s.label}</span>
              <Bar pct={s.pct} />
              <span className="text-right font-mono text-[12px] font-semibold"><Num value={s.pct} format="deltaPct" colorize precision={1} /></span>
              <span className="text-right font-mono text-[11px] text-[var(--text-faint)]"><Num value={s.cap_now} format="usdCompact" /></span>
              <span className="text-right font-mono text-[10px] text-[var(--text-faint)]">{s.eds}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Pills({ items, active, param, dim, win }: { items: { key: string; label: string }[]; active: string; param: "dim" | "w"; dim: Dimension; win: WindowKey }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
      {items.map((it) => {
        const href = param === "dim" ? `/lab/explorer?dim=${it.key}&w=${win}` : `/lab/explorer?dim=${dim}&w=${it.key}`;
        const on = it.key === active;
        return (
          <Link key={it.key} href={href} scroll={false}
            className={`rounded-md px-[10px] py-[5px] font-mono text-[11px] transition-colors ${on ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function ExplorerPage({ searchParams }: { searchParams: Promise<{ dim?: string; w?: string }> }) {
  const sp = await searchParams;
  const dim = (DIMS.find((d) => d.key === sp.dim)?.key ?? "tier") as Dimension;
  const win = (WINS.includes(sp.w as WindowKey) ? sp.w : "d30") as WindowKey;
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Cap Explorer</h1>
      <p className="mb-4 mt-1 text-[11px] text-[var(--text-faint)]">
        Floor market-cap % move by segment × window. Green = up, red = down. Correct carry-forward, full data, matched editions.
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Pills items={DIMS} active={dim} param="dim" dim={dim} win={win} />
        <Pills items={WINS.map((w) => ({ key: w, label: WINDOW_LABEL[w] }))} active={win} param="w" dim={dim} win={win} />
      </div>
      <Suspense key={`${dim}-${win}`} fallback={<div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <Explorer dim={dim} win={win} />
      </Suspense>
    </main>
  );
}
