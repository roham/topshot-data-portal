// /appreciating — four lanes, each rendering the right shape for the moment.
//   Trending   → 90d realized-price growth, sparkline gallery (liquid, line-chart-friendly)
//   Stories    → a specific serial that climbed (sold cheap → expensive)
//   Floor-Smashed → the low ask leapt after a sale
//   High-Value → expensive but rarely trades; pack-pull context, no chart
// The line chart is one lane, not the whole story.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getEditionGrowth } from "@/lib/supabase/queries/edition-growth";
import { getAppreciationStories, getStorySalePaths, getFloorSmash, getIlliquidHighValue, type SerialClass, type StorySort } from "@/lib/supabase/queries/appreciation-events";
import { AppreciationStoryCard, StoryHero, FloorSmashCard, IlliquidCard } from "@/components/appreciation/EventCards";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { MiniSpark } from "@/components/MiniSpark";

export const metadata: Metadata = { title: "Most Appreciating · TS·PORTAL" };
export const revalidate = 600;

type Cat = "trending" | "stories" | "floor-smashed" | "high-value";
const TABS: { key: Cat; label: string; blurb: string }[] = [
  { key: "trending", label: "Trending", blurb: "Real 90-day price growth from cleared sales — the liquid movers." },
  { key: "stories", label: "Stories", blurb: "A single serial that climbed — sold cheap, now sells expensive." },
  { key: "floor-smashed", label: "Floor-Smashed", blurb: "A purchase cleared the floor and the next ask leapt." },
  { key: "high-value", label: "High-Value", blurb: "Expensive and rarely trades — scarcity, not deadness." },
];
const UP = "#34d399", DOWN = "#f87171";
const fmtPct = (p: number) => `${p >= 0 ? "+" : ""}${p >= 1000 ? `${(p / 100).toFixed(0)}×` : `${Math.round(p)}%`}`;

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);
const Empty = () => <div className="flex h-[300px] items-center justify-center text-[12px] text-[var(--text-faint)]">No data yet.</div>;

async function Trending() {
  const rows = await getEditionGrowth("all", 12, 60);
  if (!rows.length) return <Empty />;
  return (
    <Grid>
      {rows.map((r) => {
        const g = r.growth_pct ?? 0; const color = g >= 0 ? UP : DOWN;
        return (
          <Link key={r.edition_id} href={`/edition/${encodeURIComponent(r.edition_id)}`} className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] transition-colors hover:border-[var(--border-strong)]">
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <div className="flex min-w-0 items-center gap-2"><span className="truncate text-[14px] font-semibold">{r.player_name ?? "—"}</span><TierChip tier={r.tier_name} /></div>
              <span className="shrink-0 text-[16px] font-bold tabular-nums" style={{ color }}>{fmtPct(g)}</span>
            </div>
            <div className="px-1 pt-1"><MiniSpark data={r.sparkline} color={color} height={52} /></div>
            <div className="flex items-baseline justify-between gap-2 px-4 pb-3">
              <span className="text-[18px] font-semibold tabular-nums"><Num value={r.price_now} format="usd" /></span>
              <span className="font-mono text-[9px] text-[var(--text-faint)]">{r.series_name ?? ""} · /{r.mint_count?.toLocaleString() ?? "—"}</span>
            </div>
          </Link>
        );
      })}
    </Grid>
  );
}

const SERIAL_TABS: { key: SerialClass; label: string }[] = [
  { key: "all", label: "All serials" },
  { key: "normal", label: "Normal only" },
  { key: "special", label: "Special (#1 / jersey / low)" },
];
const SORT_TABS: { key: StorySort; label: string }[] = [
  { key: "hot", label: "Hottest" },
  { key: "gain", label: "Biggest gain" },
  { key: "mult", label: "Highest multiple" },
  { key: "recent", label: "Most recent" },
];
async function Stories({ cls, sort }: { cls: SerialClass; sort: StorySort }) {
  const rows = await getAppreciationStories(cls, sort, 36);
  if (!rows.length) return <Empty />;
  const paths = await getStorySalePaths(rows.map((r) => r.moment_id));
  const [hero, ...rest] = rows;
  return (
    <>
      <StoryHero r={hero} path={paths[hero.moment_id] ?? []} />
      <Grid>
        {rest.map((r, i) => (
          <AppreciationStoryCard key={r.moment_id} r={r} rank={i + 2} path={paths[r.moment_id] ?? []} />
        ))}
      </Grid>
    </>
  );
}
async function FloorSmashed() {
  const rows = await getFloorSmash(48);
  return rows.length ? <Grid>{rows.map((r) => <FloorSmashCard key={r.edition_id} r={r} />)}</Grid> : <Empty />;
}
async function HighValue() {
  const rows = await getIlliquidHighValue(48);
  return rows.length ? <Grid>{rows.map((r) => <IlliquidCard key={r.edition_id} r={r} />)}</Grid> : <Empty />;
}

export default async function AppreciatingPage({ searchParams }: { searchParams: Promise<{ cat?: string; serial?: string; sort?: string }> }) {
  const sp = await searchParams;
  const cat = (TABS.some((t) => t.key === sp.cat) ? sp.cat : "trending") as Cat;
  const active = TABS.find((t) => t.key === cat)!;
  const serialCls = (["normal", "special"].includes(sp.serial ?? "") ? sp.serial : "all") as SerialClass;
  const sort = (SORT_TABS.some((t) => t.key === sp.sort) ? sp.sort : "hot") as StorySort;
  const sortLabel = SORT_TABS.find((t) => t.key === sort)!.label.toLowerCase();
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Most Appreciating</h1>
      <p className="mb-4 mt-1 text-[11px] text-[var(--text-faint)]">{active.blurb} Click any card for its price history.</p>
      <div className="mb-5 inline-flex flex-wrap gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
        {TABS.map((t) => (
          <Link key={t.key} href={`/appreciating?cat=${t.key}`} scroll={false}
            className={`rounded-md px-[12px] py-[6px] font-mono text-[11px] transition-colors ${t.key === cat ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      {cat === "stories" && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="inline-flex flex-wrap gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
            {SORT_TABS.map((t) => (
              <Link key={t.key} href={`/appreciating?cat=stories&serial=${serialCls}&sort=${t.key}`} scroll={false}
                className={`rounded-md px-[10px] py-[5px] font-mono text-[10px] transition-colors ${t.key === sort ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
                {t.label}
              </Link>
            ))}
          </div>
          <div className="inline-flex flex-wrap gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
            {SERIAL_TABS.map((t) => (
              <Link key={t.key} href={`/appreciating?cat=stories&serial=${t.key}&sort=${sort}`} scroll={false}
                className={`rounded-md px-[10px] py-[5px] font-mono text-[10px] transition-colors ${t.key === serialCls ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
                {t.label}
              </Link>
            ))}
          </div>
          <span className="font-mono text-[10px] text-[var(--text-faint)]">sorted by {sortLabel}</span>
        </div>
      )}
      <Suspense key={`${cat}-${serialCls}-${sort}`} fallback={<div className="h-[600px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        {cat === "trending" ? <Trending /> : cat === "stories" ? <Stories cls={serialCls} sort={sort} /> : cat === "floor-smashed" ? <FloorSmashed /> : <HighValue />}
      </Suspense>
    </main>
  );
}
