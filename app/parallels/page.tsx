// /parallels — UNDER RECONSTRUCTION.
//
// The first version (2026-05-17 17:30Z) shipped a fundamentally wrong
// information architecture: one row per subedition_id UUID for a
// hardcoded set of 8 players. Roham reviewed and called it embarrassing.
// Reviewing the data revealed three things the first version got wrong:
//
//  1. subedition_id is a small integer-as-string ("0", "16", ...), NOT
//     a UUID. There are likely 5–10 distinct values total mapping to
//     parallel TYPES (Base / Crystal / Anthology / etc.).
//  2. No lookup table exists for parallel names — sub_editions /
//     subeditions / parallels / parallel_types all return "schema cache
//     not found" via PostgREST. The parallel-name dimension needs to
//     be sourced (likely from Top Shot GraphQL or the BQ source ETL).
//  3. The right unit of analysis is the parallel TYPE as a cross-cutting
//     market dimension — NOT per-player drill-down with one row per
//     (set × tier × subedition instance).
//
// Redesign in progress per research/design-sprints/02-parallels-page-redesign.md.

export const revalidate = 60;

export default function ParallelsPage() {
  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <div className="border border-[var(--border-subtle)] rounded-lg p-8 bg-[var(--surface-1)]">
        <h1 className="text-[20px] font-semibold tracking-tight mb-3">
          Parallels — under reconstruction
        </h1>
        <p className="text-[13px] text-[var(--text-dim)] leading-relaxed mb-4">
          The first cut of this page treated parallels as per-player drill-down
          with one row per subedition UUID. Wrong information architecture.
          Parallels are a cross-cutting market dimension — Base, Crystal,
          Anthology, etc. — that span every set and every player. The page is
          being redesigned around that frame.
        </p>
        <p className="text-[12px] text-[var(--text-faint)] leading-relaxed">
          Redesign brief: <code>research/design-sprints/02-parallels-page-redesign.md</code>.
          Open data work: source parallel-type names (subedition_id integer →
          human name), backfill <code>topshot.moments</code> for low-circulation
          editions where the moment row is missing.
        </p>
      </div>
    </main>
  );
}
