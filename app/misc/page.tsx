// /misc — catalog of orphan-but-real surfaces. Not in TopNav.
//
// Per the 2026-05-19 IA pass, retired-or-experimental pages that still
// contain real content (charts, queries, alternate layouts) live here
// instead of cluttering the five-lane nav. Pure ComingSoon placeholders
// were deleted, not moved here.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";

export const metadata = {
  title: "Misc · TS·PORTAL",
  description: "Retired and experimental surfaces, kept addressable.",
};

interface MiscEntry {
  href: string;
  label: string;
  description: string;
  status: "retired" | "experimental";
}

const ENTRIES: MiscEntry[] = [
  {
    href: "/h/a",
    label: "Homepage Variant A — market state",
    description:
      "Original market-state landing. KPI strip + recent sales + biggest sales all-time. Superseded by the canonical / homepage.",
    status: "retired",
  },
  {
    href: "/h/b",
    label: "Homepage Variant B — live feed",
    description:
      "Narrative event feed (each event is a sentence, not a table row). Explicitly retired in the file header.",
    status: "retired",
  },
  {
    href: "/h/c",
    label: "Homepage Variant C — Card Ladder pattern",
    description:
      "Indices-first landing in the Card Ladder Pro shape. The seed for the current /indices direction.",
    status: "retired",
  },
  {
    href: "/h/d",
    label: "Homepage Variant D — story",
    description:
      "Editorial-first landing — biggest sales + per-set retrospective panels.",
    status: "retired",
  },
];

export default function Page() {
  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="font-mono text-[14px] tracking-section-header text-[var(--text)]">
          MISC · ORPHAN SURFACES
        </h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1 leading-relaxed max-w-2xl">
          Real surfaces that don&apos;t belong in the five-lane navigation —
          retired explorations, A/B test variants, experimental shapes. Kept
          addressable for context and history. Pure placeholders were deleted,
          not moved here.
        </p>
      </header>

      <Card variant="inset">
        <div className="border-t border-[var(--border-subtle)]">
          {ENTRIES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="group flex items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[12px] text-[var(--text)] tracking-tight">
                    {e.label}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-faint)]">{e.href}</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] leading-snug mt-0.5">
                  {e.description}
                </p>
              </div>
              <span
                className={
                  e.status === "retired"
                    ? "text-[9px] font-mono uppercase tracking-data-label text-[var(--text-faint)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5"
                    : "text-[9px] font-mono uppercase tracking-data-label text-[var(--accent)] border border-[var(--accent)]/40 rounded px-1.5 py-0.5"
                }
              >
                {e.status}
              </span>
              <span className="text-[var(--text-faint)] group-hover:text-[var(--accent)] text-[12px] font-mono">
                →
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <p className="text-[10px] text-[var(--text-faint)] mt-6 leading-snug max-w-2xl">
        Found via the URL or this page; not surfaced in nav. To re-promote one of these, refactor it into a five-lane home and link it from the relevant section.
      </p>
    </div>
  );
}
