// /appreciating — four lanes, each rendering the right shape for the moment.
//   Trending   → 90d realized-price growth, sparkline gallery (liquid, line-chart-friendly)
//   Stories    → a specific serial that climbed (sold cheap → expensive)
//   Floor-Smashed → the low ask leapt after a sale
//   High-Value → expensive but rarely trades; pack-pull context, no chart
// The line chart is one lane, not the whole story.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAppreciationStories, getFloorSmash, getIlliquidHighValue, type SerialClass, type StorySort } from "@/lib/supabase/queries/appreciation-events";
import { getTrendingScatter } from "@/lib/supabase/queries/trending-scatter";
import { AppreciationStoryCard, StoryHero, FloorSmashCard, IlliquidCard } from "@/components/appreciation/EventCards";
import { TrendingScatterCard, TrendingScatterHero } from "@/components/appreciation/TrendingScatterCard";

export const metadata: Metadata = { title: "Most Appreciating · TS·PORTAL" };
export const revalidate = 600;

type Cat = "trending" | "stories" | "floor-smashed" | "high-value";
const TABS: { key: Cat; label: string; blurb: string }[] = [
  { key: "trending", label: "Trending", blurb: "The most-traded editions — every sale plotted, and the collector who owns the crown jewel." },
  { key: "stories", label: "Stories", blurb: "A serial that climbed — bought cheap, now worth a fortune — and who holds it now." },
  { key: "floor-smashed", label: "Board Smash", blurb: "The floor just leapt — and the collectors holding it are sitting pretty." },
  { key: "high-value", label: "High-Value", blurb: "The trophies — and the collectors who own them." },
];

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);
const Empty = () => <div className="flex h-[300px] items-center justify-center text-[12px] text-[var(--text-faint)]">No data yet.</div>;

async function Trending() {
  const editions = await getTrendingScatter("all", 10);
  if (!editions.length) return <Empty />;
  const [hero, ...rest] = editions;
  return (
    <>
      <TrendingScatterHero e={hero} />
      <Grid>{rest.map((e) => <TrendingScatterCard key={e.edition_id} e={e} />)}</Grid>
    </>
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
  const [hero, ...rest] = rows;
  return (
    <>
      <StoryHero r={hero} />
      <Grid>
        {rest.map((r, i) => (
          <AppreciationStoryCard key={r.moment_id} r={r} rank={i + 2} />
        ))}
      </Grid>
    </>
  );
}
async function FloorSmashed() {
  const rows = await getFloorSmash(36);
  if (!rows.length) return <Empty />;
  const [hero, ...rest] = rows;
  return (
    <>
      <div className="mb-4"><FloorSmashCard r={hero} big /></div>
      <Grid>{rest.map((r) => <FloorSmashCard key={r.edition_id} r={r} />)}</Grid>
    </>
  );
}
async function HighValue() {
  const rows = await getIlliquidHighValue(36);
  if (!rows.length) return <Empty />;
  const [hero, ...rest] = rows;
  return (
    <>
      <div className="mb-4"><IlliquidCard r={hero} big /></div>
      <Grid>{rest.map((r) => <IlliquidCard key={r.edition_id} r={r} />)}</Grid>
    </>
  );
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
