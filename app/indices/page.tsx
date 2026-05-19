// /indices — directory of every defined index.
//
// Surfaces all 17 entries from lib/indices/registry.ts grouped by kind
// (TS500 / Tier / Series / Team). Each row links into /indices/[slug] for
// the deep view. Honest empty-state: indices without a live synthesizer are
// flagged "computing" — but the directory itself is real, not a placeholder.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import { INDICES, type IndexDef, type IndexKind } from "@/lib/indices/registry";

export const metadata = {
  title: "Indices · TS·PORTAL",
  description: "Every published Top Shot index — TS500, tier, series, and team.",
};

const KIND_LABEL: Record<IndexKind, string> = {
  ts500: "Headline",
  tier: "Tier",
  series: "Series",
  team: "Team",
};

const KIND_DESCRIPTION: Record<IndexKind, string> = {
  ts500: "The whole market in one number — every active edition weighted by circulation × floor.",
  tier: "Floor-weighted indices, one per Top Shot tier. Watch the Legendary basket vs the Rare basket.",
  series: "One index per Top Shot series. Series 1 still carries the largest dollar weight.",
  team: "Sale-weighted indices for the highest-trading NBA franchises on Top Shot.",
};

const KIND_ORDER: IndexKind[] = ["ts500", "tier", "series", "team"];

// Slugs with a live synthesizer surfaced to a chart today.
// Add slugs here as new synthesizers land so the badge flips from "computing" to "live".
const LIVE_SLUGS = new Set<string>([
  // ts50-synthesizer renders on the homepage (the canonical headline chart).
  // Per-tier/series/team rollups exist as queries but aren't yet surfaced.
]);

function IndexRow({ def }: { def: IndexDef }) {
  const live = LIVE_SLUGS.has(def.slug);
  return (
    <Link
      href={`/indices/${def.slug}`}
      className="group flex items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] text-[var(--text)] tracking-tight">
            {def.name}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-faint)]">
            /{def.slug}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-dim)] leading-snug mt-0.5">
          {def.description}
        </p>
      </div>
      <span
        className={
          live
            ? "text-[9px] font-mono uppercase tracking-data-label text-[var(--up)] border border-[var(--up)]/40 rounded px-1.5 py-0.5"
            : "text-[9px] font-mono uppercase tracking-data-label text-[var(--text-faint)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5"
        }
      >
        {live ? "live" : "computing"}
      </span>
      <span className="text-[var(--text-faint)] group-hover:text-[var(--accent)] text-[12px] font-mono">
        →
      </span>
    </Link>
  );
}

export default function Page() {
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    description: KIND_DESCRIPTION[kind],
    items: INDICES.filter((i) => i.kind === kind),
  }));

  const total = INDICES.length;
  const liveCount = INDICES.filter((i) => LIVE_SLUGS.has(i.slug)).length;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="font-mono text-[14px] tracking-section-header text-[var(--text)]">
          INDICES · DIRECTORY
        </h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1 leading-relaxed max-w-2xl">
          {total} indices defined across {KIND_ORDER.length} categories. {liveCount} live, {total - liveCount} still computing first snapshots.
          The headline TS-style index lives at the top of <Link href="/" className="text-[var(--accent)] hover:underline">the homepage</Link>; this page is the catalog.
        </p>
      </header>

      <div className="grid gap-4">
        {grouped.map((group) => (
          <Card
            key={group.kind}
            title={`${group.label.toUpperCase()} — ${group.items.length}`}
            subtitle={group.description}
            variant="inset"
          >
            <div className="border-t border-[var(--border-subtle)]">
              {group.items.map((def) => (
                <IndexRow key={def.slug} def={def} />
              ))}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-faint)] mt-6 leading-snug max-w-2xl">
        Methodology: TS500 is circulation × floor-weighted across every active edition.
        Tier and series indices are floor-weighted across their constituents. Team indices are sale-weighted by the team-at-moment field on each historical sale.
        See <Link href="/methodology" className="hover:text-[var(--text)] underline decoration-dotted">/methodology</Link> for full definitions.
      </p>
    </div>
  );
}
