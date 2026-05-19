// /indices — directory anchored on the two canonical baskets: Grail and Rookies.
//
// Per the V8 handover (Tier A-1 and A-2 specs), the only first-class indices
// for collectors are GRAIL (184-edition value-weighted "blue-chip" basket
// from grail-225-with-edition-ids-2026-05-19.csv) and ROOKIES (per-class
// rookie editions). Everything in registry.ts is legacy/exploratory and is
// surfaced under "Legacy" below for context, not as the headline.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import { INDICES } from "@/lib/indices/registry";

export const metadata = {
  title: "Indices · TS·PORTAL",
  description: "Grail and Rookies — the two canonical Top Shot indices.",
};

interface CanonicalIndex {
  slug: string;
  name: string;
  oneLiner: string;
  basket: string;
  comparable: string;
  status: "live" | "computing";
}

const CANONICAL: CanonicalIndex[] = [
  {
    slug: "grail",
    name: "Grail Index",
    oneLiner:
      "The 184-edition blue-chip basket. Value-weighted, daily-grain, carry-forward on ETL gaps. The closest thing Top Shot has to a 'serious-collector' index.",
    basket:
      "Curated from research/data-schema/grail-225-with-edition-ids-2026-05-19.csv — 184 editions matched to canonical Vaultopolis IDs after de-duplication.",
    comparable: "Card Ladder Pro CL50 + Glassnode supply-distribution",
    status: "computing",
  },
  {
    slug: "rookies",
    name: "Rookies Index",
    oneLiner:
      "Floor-weighted basket of current-class rookie editions. The 'what's the rookie market doing today' single number.",
    basket:
      "Active rookie editions for the current NBA season, weighted by current floor × circulation. Refreshed daily from topshot.market_caps.",
    comparable: "PWCC Rookie Card Index",
    status: "computing",
  },
];

function CanonicalCard({ idx }: { idx: CanonicalIndex }) {
  return (
    <Link
      href={`/indices/${idx.slug}`}
      className="group block bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-md p-4 transition-colors"
    >
      <div className="flex items-baseline gap-3">
        <h2 className="font-mono text-[14px] font-semibold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)]">
          {idx.name}
        </h2>
        <span className="font-mono text-[10px] text-[var(--text-faint)]">/{idx.slug}</span>
        <span
          className={
            idx.status === "live"
              ? "ml-auto text-[9px] font-mono uppercase tracking-data-label text-[var(--up)] border border-[var(--up)]/40 rounded px-1.5 py-0.5"
              : "ml-auto text-[9px] font-mono uppercase tracking-data-label text-[var(--text-faint)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5"
          }
        >
          {idx.status}
        </span>
      </div>
      <p className="text-[12px] text-[var(--text-dim)] mt-2 leading-relaxed">{idx.oneLiner}</p>
      <dl className="mt-3 text-[10px] font-mono space-y-1">
        <div className="flex gap-2">
          <dt className="text-[var(--text-faint)] uppercase tracking-data-label w-20 shrink-0">Basket</dt>
          <dd className="text-[var(--text-dim)] flex-1">{idx.basket}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--text-faint)] uppercase tracking-data-label w-20 shrink-0">Compare</dt>
          <dd className="text-[var(--text-dim)] flex-1">{idx.comparable}</dd>
        </div>
      </dl>
    </Link>
  );
}

function LegacyRow({ slug, name, description }: { slug: string; name: string; description: string }) {
  return (
    <Link
      href={`/indices/${slug}`}
      className="group flex items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-[var(--text-dim)]">{name}</span>
          <span className="font-mono text-[10px] text-[var(--text-faint)]">/{slug}</span>
        </div>
        <p className="text-[10px] text-[var(--text-faint)] leading-snug mt-0.5">{description}</p>
      </div>
      <span className="text-[9px] font-mono uppercase tracking-data-label text-[var(--text-faint)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
        legacy
      </span>
    </Link>
  );
}

export default function Page() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="font-mono text-[14px] tracking-section-header text-[var(--text)]">
          INDICES · DIRECTORY
        </h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1 leading-relaxed max-w-2xl">
          Two indices for the trader-collector: <span className="text-[var(--text)]">Grail</span> tracks the
          blue-chip basket; <span className="text-[var(--text)]">Rookies</span> tracks the active rookie class.
          The homepage hero rotates between them. Everything else below is exploratory and pre-dates the canonical pair.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="font-mono text-[10px] uppercase tracking-data-label text-[var(--text-faint)] mb-3">
          Canonical — 2
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {CANONICAL.map((idx) => (
            <CanonicalCard key={idx.slug} idx={idx} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-data-label text-[var(--text-faint)] mb-3">
          Legacy — {INDICES.length}
        </h2>
        <p className="text-[11px] text-[var(--text-faint)] mb-3 max-w-2xl leading-relaxed">
          The earlier registry — TS500, tier rollups, series indices, team indices. Kept addressable for the historical chart routes; not the recommended entry points.
        </p>
        <Card variant="inset">
          <div className="border-t border-[var(--border-subtle)]">
            {INDICES.map((def) => (
              <LegacyRow
                key={def.slug}
                slug={def.slug}
                name={def.name}
                description={def.description}
              />
            ))}
          </div>
        </Card>
      </section>

      <p className="text-[10px] text-[var(--text-faint)] mt-6 leading-snug max-w-2xl">
        Methodology lives at <Link href="/methodology" className="hover:text-[var(--text)] underline decoration-dotted">/methodology</Link>. Grail constituents are documented in <code className="text-[var(--text-dim)]">research/data-schema/grail-225-with-edition-ids-2026-05-19.csv</code>.
      </p>
    </div>
  );
}
