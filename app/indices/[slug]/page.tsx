// /indices/[slug] — per-index detail page.
//
// Renders the full hero (chart + KPI rail + time-window pills) for one
// basket, plus a constituents table (top 25 by weight) and the methodology
// block. The two canonical slugs are `grail` and `rookies`. Other slugs
// fall through to a generic 404-shaped not-found.

import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TS50IndexChart } from "@/components/TS50IndexChart";
import { IndexTimeWindowPills } from "@/components/IndexTimeWindowPills";
import {
  parseTimeWindow,
  windowToDays,
  WINDOW_SPECS,
  type TimeWindow,
} from "@/components/global/window-types";
import { getGrailIndex, type GrailConstituentRow, type GrailIndexResult } from "@/lib/indices/grail-synthesizer";
import { getRookiesIndex, type RookiesConstituentRow, type RookiesIndexResult } from "@/lib/indices/rookies-synthesizer";

export const revalidate = 60 * 60;

const CONSTITUENT_LIMIT = 25;

interface IndexShape {
  slug: "grail" | "rookies";
  title: string;
  subtitle: (asOf: string | null, basketSize: number) => string;
  description: string;
  methodology: string;
  comparable: string;
}

const GRAIL_SHAPE: IndexShape = {
  slug: "grail",
  title: "GRAIL Index",
  subtitle: (asOf, n) =>
    `Vaultopolis canonical basket · ${n} editions${asOf ? ` · as of ${asOf}` : ""}`,
  description:
    "The blue-chip basket — Vaultopolis community-canonical Grail list as of April 2026 (top 225 editions by average sale price; 166 unique compound keys after dedup, all 166 resolved to live editions). Value-weighted; the largest-mcap editions move the index the most.",
  methodology:
    "Weight w_i = current mcap of edition i / Σ current mcap across the basket. Series I(d) = 100 × Σ w_i × mcap_i(d) / mcap_i(d_0), where d_0 is the first observed snapshot for each edition. Editions missing on date d carry forward last known value. Faithful — no smoothing, vanity 1-of-1s included.",
  comparable: "Card Ladder Pro CL50 + Glassnode supply-distribution",
};

const ROOKIES_SHAPE: IndexShape = {
  slug: "rookies",
  title: "ROOKIES Index",
  subtitle: (asOf) =>
    `Current draft-class basket${asOf ? ` · as of ${asOf}` : ""}`,
  description:
    "Top 30 editions by current market cap among players in the active rookie cohort. Defaults to the latest draft class with matching ETL data (2025; falls through to 2024 if 2025 has no editions yet).",
  methodology:
    "Same value-weighted math as GRAIL. Multi-line per-rookie view (each rookie one line, polymarket-style) lands as the canonical chart in a follow-up; aggregate index shown here.",
  comparable: "PWCC Rookie Card Index + Polymarket multi-line",
};

const SHAPES: Record<string, IndexShape> = {
  grail: GRAIL_SHAPE,
  rookies: ROOKIES_SHAPE,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shape = SHAPES[slug];
  if (!shape) return { title: "Index · TS·PORTAL" };
  return {
    title: `${shape.title} · TS·PORTAL`,
    description: shape.description,
  };
}

function deltaColor(pct: number): string {
  if (pct > 0) return "text-[var(--up)]";
  if (pct < 0) return "text-[var(--down)]";
  return "text-[var(--text-dim)]";
}

interface SharedConstituentRow {
  edition_id: string;
  player_name: string | null;
  set_name: string | null;
  tier_name: string | null;
  weight: number;
  current_mcap_usd: number;
}

function ConstituentsTable({ rows }: { rows: SharedConstituentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">
        No constituents with positive market cap in the current snapshot.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)] uppercase tracking-data-label text-[9px]">
            <th className="px-3 py-1.5 text-left w-8">#</th>
            <th className="px-3 py-1.5 text-left">Player</th>
            <th className="px-3 py-1.5 text-left">Tier</th>
            <th className="px-3 py-1.5 text-right">Mcap</th>
            <th className="px-3 py-1.5 text-right">Weight</th>
            <th className="px-3 py-1.5 text-right w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, CONSTITUENT_LIMIT).map((r, i) => {
            const editionHref = r.edition_id.includes("+")
              ? `/edition/${r.edition_id.replace("+", "-")}`
              : null;
            return (
              <tr
                key={r.edition_id}
                className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors"
              >
                <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  {editionHref ? (
                    <Link href={editionHref} className="text-[var(--text)] hover:text-[var(--accent)]">
                      {r.player_name ?? <span className="text-[var(--text-faint)]">—</span>}
                    </Link>
                  ) : (
                    <span className="text-[var(--text)]">
                      {r.player_name ?? <span className="text-[var(--text-faint)]">—</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.tier_name ? <TierChip tier={r.tier_name} /> : <span className="text-[var(--text-faint)]">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                  <Num value={r.current_mcap_usd} format="usdCompact" />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                  {(r.weight * 100).toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-right">
                  {editionHref && (
                    <Link href={editionHref} className="text-[var(--text-faint)] hover:text-[var(--accent)]">
                      →
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > CONSTITUENT_LIMIT && (
        <p className="px-3 py-2 text-[10px] text-[var(--text-faint)] font-mono">
          Showing top {CONSTITUENT_LIMIT} of {rows.length} constituents.
        </p>
      )}
    </div>
  );
}

interface HeroChartProps {
  series: { date: string; index_value: number; basket_mcap_usd: number }[];
  latestValue: number;
  pctChange: number;
  basketMcap: number;
  daysOfHistory: number;
  activeWindowLabel: string;
}

function HeroChart({
  series,
  latestValue,
  pctChange,
  basketMcap,
  daysOfHistory,
  activeWindowLabel,
}: HeroChartProps) {
  if (series.length === 0) {
    return (
      <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">
        No snapshots in window.
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 p-3">
      <div className="space-y-4 lg:border-r lg:border-[var(--border-subtle)] lg:pr-6">
        <div>
          <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
            Index
          </div>
          <div className="text-[44px] leading-none font-semibold tabular-nums tracking-tight">
            {latestValue.toFixed(2)}
          </div>
          <div className={`text-[14px] mt-2 font-mono tabular-nums ${deltaColor(pctChange)}`}>
            <Num value={pctChange} format="deltaPct" colorize={false} />
            <span className="text-[var(--text-faint)] ml-2">
              {activeWindowLabel} · {daysOfHistory} snapshots
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
            Basket mcap
          </div>
          <div className="text-[22px] leading-none font-semibold tabular-nums">
            <Num value={basketMcap} format="usdCompact" />
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-1 font-mono">
            current snapshot
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <TS50IndexChart series={series} />
      </div>
    </div>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ iw?: string }>;
}) {
  const { slug } = await params;
  const shape = SHAPES[slug];
  if (!shape) notFound();

  const sp = (await searchParams) ?? {};
  const { window: activeWindow } = parseTimeWindow(sp.iw, "30d");
  const lookbackDays = windowToDays(activeWindow);

  let series: { date: string; index_value: number; basket_mcap_usd: number }[] = [];
  let constituents: SharedConstituentRow[] = [];
  let latestValue = 100;
  let pctChange = 0;
  let basketMcap = 0;
  let daysOfHistory = 0;
  let asOfDate: string | null = null;
  let basketSize = 0;

  if (shape.slug === "grail") {
    const r: GrailIndexResult | null = await getGrailIndex(lookbackDays).catch(() => null);
    if (r) {
      series = r.series;
      constituents = r.constituents.map((c: GrailConstituentRow) => ({
        edition_id: c.edition_id,
        player_name: c.player_name,
        set_name: c.set_name,
        tier_name: c.tier_name,
        weight: c.weight,
        current_mcap_usd: c.current_mcap_usd,
      }));
      latestValue = r.latest_index_value;
      pctChange = r.series_pct_change;
      basketMcap = r.basket_mcap_total_usd;
      daysOfHistory = r.days_of_history;
      asOfDate = r.as_of_date;
      basketSize = r.basket_resolved_size;
    }
  } else {
    const r: RookiesIndexResult | null = await getRookiesIndex(lookbackDays).catch(() => null);
    if (r) {
      series = r.series;
      constituents = r.constituents.map((c: RookiesConstituentRow) => ({
        edition_id: c.edition_id,
        player_name: c.player_name,
        set_name: c.set_name,
        tier_name: c.tier_name,
        weight: c.weight,
        current_mcap_usd: c.current_mcap_usd,
      }));
      latestValue = r.latest_index_value;
      pctChange = r.series_pct_change;
      basketMcap = r.basket_mcap_total_usd;
      daysOfHistory = r.days_of_history;
      asOfDate = r.as_of_date;
      basketSize = constituents.length;
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="text-[11px] font-mono text-[var(--text-faint)]">
        <Link href="/indices" className="hover:text-[var(--text)]">
          indices
        </Link>{" "}
        / <span className="text-[var(--text-dim)]">{shape.slug}</span>
      </nav>

      {/* Hero card */}
      <Card
        title={shape.title}
        subtitle={shape.subtitle(asOfDate, basketSize)}
        variant="inset"
        right={
          <IndexTimeWindowPills
            basePath={`/indices/${shape.slug}`}
            active={activeWindow}
          />
        }
      >
        <HeroChart
          series={series}
          latestValue={latestValue}
          pctChange={pctChange}
          basketMcap={basketMcap}
          daysOfHistory={daysOfHistory}
          activeWindowLabel={WINDOW_SPECS[activeWindow].label}
        />
      </Card>

      {/* Description + Methodology */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="ABOUT" variant="inset">
          <div className="p-3 text-[12px] text-[var(--text-dim)] leading-relaxed">
            {shape.description}
          </div>
        </Card>
        <Card title="METHODOLOGY" variant="inset">
          <div className="p-3 text-[12px] text-[var(--text-dim)] leading-relaxed space-y-2">
            <p>{shape.methodology}</p>
            <p className="text-[10px] text-[var(--text-faint)] font-mono">
              Comparable: {shape.comparable}
            </p>
          </div>
        </Card>
      </div>

      {/* Constituents */}
      <Card
        title={`CONSTITUENTS — ${constituents.length}`}
        subtitle="Sorted by weight; click into any row for the per-edition detail."
        variant="inset"
      >
        <div className="border-t border-[var(--border-subtle)]">
          <ConstituentsTable rows={constituents} />
        </div>
      </Card>
    </div>
  );
}
