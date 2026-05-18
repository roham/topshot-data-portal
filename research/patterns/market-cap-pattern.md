# /market-cap Pattern — The Reference Build Cookbook

**Status:** Load-bearing reference for Loop B. Every Phase B page (/players, /moments, /sets, /u/[username]) is built by cloning this pattern.
**Source:** The actual /market-cap surface at `app/market-cap/page.tsx` reached "holy shit, that's done" grade in the 2026-05-17 hand-polished V6 session. This doc codifies the pattern so it transfers.

The pattern is **graph-first landing → drill-down detail**, per doctrine §0.1 + P2.

---

## §1 — File structure (per page)

For a hypothetical new page `/X`, the build creates:

```
app/X/
├── page.tsx                       # server component, reads ?param=…, renders Page chrome + chart grid
└── layout.tsx                     # (optional) per-route shell

components/charts/X/
├── ChartCardA.tsx                 # one component per cut
├── ChartCardB.tsx
├── ChartCardC.tsx
└── ...                            # ~8 components total per landing

components/X/
├── WindowToggle.tsx               # Link-based time-window toggle (15D / 30D / 90D pattern)
├── FormulaToggle.tsx              # Link-based metric toggle (e.g., mcap=floor|avg_sale)
└── (page-specific primitives)

lib/supabase/queries/X-landing.ts  # data layer — pagedFetch + MVs read
lib/X/formula.ts                   # server-safe parsers for URL state (e.g., parseMcapFormula)
```

Plus shared infrastructure that all pages already use:
- `components/primitives/ChartCard.tsx` — the chart-as-hero layout primitive
- `lib/chart-palette.ts` — canonical color palettes (TIER_COLOR, PARALLEL_COLOR_BY_ID, SERIES_COLOR, RANK_GRADIENT, DIRECTION_COLOR)
- `lib/supabase/queries/market-cap-landing.ts:pagedFetch<T>(...)` — bypasses PostgREST 1000-row cap via .range() pagination

---

## §2 — Page-level shape (server component)

```tsx
// app/X/page.tsx
import { ChartCardA } from "@/components/charts/X/ChartCardA";
// ... import each chart component
import { parseFormula } from "@/lib/X/formula";
import { fetchLandingData } from "@/lib/supabase/queries/X-landing";

export const dynamic = "force-dynamic"; // server re-runs on every request (URL params drive shape)

export default async function XPage({ searchParams }: { searchParams: Record<string, string> }) {
  const formula = parseFormula(searchParams);  // server-safe URL state extraction
  const data = await fetchLandingData(formula);  // ONE call returns everything needed
  
  return (
    <main className="px-6 py-4 max-w-screen-2xl mx-auto">
      <PageHeader title="X" formula={formula} kpis={data.kpis} />
      
      <div className="grid grid-cols-12 gap-4 mt-6">
        {/* PRIMARY CHART — full width */}
        <ChartCard className="col-span-12" title="..." comparable="..." >
          <ChartCardA data={data.primary} />
        </ChartCard>
        
        {/* SECONDARY ROW — two half-width */}
        <ChartCard className="col-span-6" title="..." comparable="...">
          <ChartCardB data={data.b} />
        </ChartCard>
        <ChartCard className="col-span-6" title="..." comparable="...">
          <ChartCardC data={data.c} />
        </ChartCard>
        
        {/* TERTIARY ROW — three or four quarter-width */}
        ...
        
        {/* TIME-SERIES STRIPS (movers, history) — collapsed to bottom */}
        ...
      </div>
      
      <MethodologyFooter />  {/* doctrine compliance: tells trader what they're seeing */}
    </main>
  );
}
```

**Key invariants:**
1. Server component (`dynamic = "force-dynamic"`). URL params re-run the server. NO client state for filters/toggles.
2. **One** data fetch at the page level (`fetchLandingData`). All chart cards receive props, never fetch their own data. Reduces total queries from N to 1.
3. **Grid layout** — 12-column. Primary chart = col-span-12. Secondary row = 6+6. Tertiary = 4+4+4 or 3+3+3+3. Time-series strips at bottom.
4. **ChartCard wraps every chart** — gives consistent title + comparable badge + drill-down link.
5. **MethodologyFooter** — links to doctrine.md + comparables. Tells the trader what they're seeing.

---

## §3 — ChartCard primitive (the chart-as-hero shape)

`components/primitives/ChartCard.tsx`:

```tsx
type ChartCardProps = {
  title: string;
  subtitle?: string;
  comparable?: string;          // e.g., "Polymarket sparkline-cards"
  comparablePath?: string;      // research/comparables/.../X.png (for vision-diff)
  drillHref?: string;           // /X?focused=Y (per P2: graph-first → table on click)
  drillPending?: boolean;       // honest state if drill-down not yet built
  className?: string;
  children: React.ReactNode;
};

export function ChartCard({ title, subtitle, comparable, drillHref, drillPending, className, children }: ChartCardProps) {
  return (
    <article className={cn("bg-slate-900 rounded-lg border border-slate-800 p-4", className)}>
      <header className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {comparable && <span className="text-[10px] uppercase tracking-wider text-slate-500">{comparable}</span>}
      </header>
      <div className="h-[280px]">{children}</div>
      {drillHref && !drillPending && (
        <footer className="mt-3 pt-3 border-t border-slate-800">
          <Link href={drillHref} className="text-xs text-cyan-400 hover:text-cyan-300">View details →</Link>
        </footer>
      )}
      {drillPending && (
        <footer className="mt-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">Drill-down pending</span>
        </footer>
      )}
    </article>
  );
}
```

**Honest-empty pattern (per V4 lesson):** if a chart has no data, the ChartCard children render an honest empty-state — not a flat path. The DOM substance probe (Loop B B2) will catch flat paths and reject the page.

---

## §4 — Data layer pattern (one query per page)

`lib/supabase/queries/X-landing.ts`:

```ts
import { supabaseAdmin } from "../admin";
import { pagedFetch } from "./market-cap-landing"; // shared helper

export type XLandingData = {
  kpis: { total: number; ... };
  primary: ChartData;
  b: ChartData;
  c: ChartData;
  // ... one field per chart card
};

export async function fetchLandingData(formula: XFormula): Promise<XLandingData> {
  const sb = supabaseAdmin();
  
  // PARALLEL FETCHES — each chart's data in flight at the same time.
  const [primaryRows, bRows, cRows, /*...*/] = await Promise.all([
    pagedFetch<PrimaryRow>(
      sb.from("mv_X_primary").select("*"),
      50000,
      1000  // page size
    ),
    pagedFetch<BRow>(sb.from("mv_X_b").select("*"), 50000, 1000),
    pagedFetch<CRow>(sb.from("mv_X_c").select("*"), 50000, 1000),
    // ...
  ]);
  
  // SHAPE — transform raw rows into chart-ready props
  return {
    kpis: computeKpis(primaryRows),
    primary: shapePrimary(primaryRows, formula),
    b: shapeB(bRows, formula),
    c: shapeC(cRows, formula),
  };
}
```

**Key invariants:**
1. **`pagedFetch` always — never `.limit(N)` for N > 1000.** PostgREST has a hard 1000-row cap. The helper pages via `.range()`. Always pair with `.order()` for deterministic chunks.
2. **`Promise.all` over Promise chains** — chart fetches are independent.
3. **MVs not RPCs** — heavy aggregations live in materialized views, not statement_timeout-limited RPCs. PostgREST's 8s timeout kills RPCs over 1.5M tx joins.
4. **All shaping happens after the fetch** — no SQL gymnastics; transformations in JS.

---

## §5 — URL state pattern (Link-based, not nuqs shallow)

`lib/X/formula.ts`:

```ts
export type XFormula = {
  mcap: "floor" | "avg_sale";
  window: "15d" | "30d" | "90d";
  // ... per-page formula params
};

export function parseFormula(searchParams: Record<string, string>): XFormula {
  return {
    mcap: searchParams.mcap === "avg_sale" ? "avg_sale" : "floor",
    window: ["15d", "90d"].includes(searchParams.w) ? searchParams.w as any : "30d",  // doctrine P7: default 30D
  };
}
```

`components/X/WindowToggle.tsx`:

```tsx
import Link from "next/link";

export function WindowToggle({ current }: { current: "15d" | "30d" | "90d" }) {
  return (
    <nav className="flex gap-1 text-xs">
      {(["15d", "30d", "90d"] as const).map(w => (
        <Link
          key={w}
          href={`?w=${w}`}
          className={cn(
            "px-2 py-1 rounded",
            current === w ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {w.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
```

**Why Link, not nuqs:** `useQueryState` defaults to shallow routing → URL updates but server component doesn't re-fetch. Server-component pages MUST use Link OR `useQueryState(...).withOptions({ shallow: false })`. The V6 commit `eab7cc8` audited every nuqs usage and added `shallow: false` to the 3 missing ones.

---

## §6 — The eight canonical chart cuts (per doctrine §9)

A graph-first landing has ~8 charts. They cluster into four groups:

1. **Top-N ranking** — bar chart of top X by metric. Example on /market-cap: "Top players by market cap."
2. **Distribution** — stacked area / treemap. Example: "Market cap by tier" (stacked area), "Market cap by team" (treemap).
3. **Concentration / Gini** — Lorenz-curve style with reference lines (50% / 80% concentration markers). Example: "Top-N share over time."
4. **Time series** — line chart of metric over time. Example: "Total mcap over time" (28-month series).
5. **Movers** — meme-coin-style card grid with intensity-tiered colors. Example: "15D/30D/90D top gainers + losers."

Each card has:
- `title` (per the page's domain)
- `comparable` badge (e.g., "Polymarket sparkline-card")
- Real data on a data-bearing entity
- `drillHref` to the second-click table view (P2 compliance)

---

## §7 — Chart palette (canonical colors)

`lib/chart-palette.ts`:

```ts
export const TIER_COLOR = {
  common: "#94a3b8",
  rare: "#fbbf24",
  legendary: "#a855f7",
  ultimate: "#22d3ee",
};

export const PARALLEL_COLOR_BY_ID = {
  0: "#475569",    // Base
  1: "#ef4444",    // Explosion
  // ... 22 named parallels
};

export const DIRECTION_COLOR = {
  gainer: "#10b981",
  gainer_strong: "#06d6a0",
  loser: "#fb7185",
  loser_strong: "#ef4444",
};

export const RANK_GRADIENT = [
  "#22d3ee", "#0ea5e9", "#0284c7", "#0369a1", "#075985"
];

export const SERIES_COLOR = (i: number) => SERIES_COLOR_RING[i % SERIES_COLOR_RING.length];
```

**Why centralize:** every chart on every page uses the same colors for the same dimensions. Trader's eye builds visual vocabulary. Diamond is always purple, Common is always slate, gainers are always teal-green.

---

## §8 — The 8 chart components on /market-cap (the reference set)

Per Loop B builder: when adding a new page's chart components, pattern-match the closest analog from this set:

| Component | Path | Use when |
|---|---|---|
| `TopPlayersChart.tsx` | `components/charts/market-cap/TopPlayersChart.tsx` | Top-N ranking with rank gradient |
| `ByTierChart.tsx` | `components/charts/market-cap/ByTierChart.tsx` | Stacked area by tier dimension |
| `ByParallelChart.tsx` | `components/charts/market-cap/ByParallelChart.tsx` | Stacked area by parallel dimension |
| `TopSetsChart.tsx` | `components/charts/market-cap/TopSetsChart.tsx` | Top-N bar chart with set-level data |
| `ByTeamTreemap.tsx` | `components/charts/market-cap/ByTeamTreemap.tsx` | Categorical distribution treemap |
| `TotalOverTimeChart.tsx` | `components/charts/market-cap/TotalOverTimeChart.tsx` | Long time-series line |
| `MoversCardGrid.tsx` | `components/charts/market-cap/MoversCardGrid.tsx` | Meme-coin style gainer/loser cards |
| `ConcentrationChart.tsx` | `components/charts/market-cap/ConcentrationChart.tsx` | Lorenz curve with reference lines |

When cloning to /players, /moments, /sets, /u/[username], replace the data source but keep the visual shape. The reference path: "I want a top-N ranking on /players → I clone `TopPlayersChart` + replace its data source."

---

## §9 — Verification checklist before any Loop B page ships

Per Loop B rubric §1. Every page builder runs through this before declaring complete:

- [ ] **B1** — Vision-diff to comparable screenshot scores ≥ 7. (Run vision-judge prompt.)
- [ ] **B2** — DOM substance probe passes: numeric cells ≥ expected; no placeholders; no "Coming Soon"; chart paths have substantive d="" content.
- [ ] **B3** — Every interactive element changes the data (Playwright journey assertions). URL state captures every filter.
- [ ] **B4** — Doctrine compliance: P1 (no median-sale, no smoothing); P2 (graph-first, density on drill); P3 (comparable signature move cited); P5 (parallels first-class); P7 (default 30D); P8 (opportunity framing on empties); P9 (in-scope for current Phase).
- [ ] **B5** — Layout density: above-the-fold has ≥ comparable's data points; drill-down hits Bloomberg-tier.
- [ ] **B6** — Lighthouse ≥ 80 perf, ≥ 95 a11y; LCP < 2.5s; CLS < 0.1.
- [ ] **B7** — Cross-vendor (gpt-5.5) verdict = PASS.
- [ ] **B8** — In Phase 1: Roham ✓ vote. Else: rolling 7-day approval ≥ 55%.

---

## §10 — Anti-patterns (refuse-to-ship list)

Any of these = page rebuild required, not ship:

1. **Tables-as-landing** (the V5 /players page anti-pattern). Tables are second-click only.
2. **`<button onClick>` filter UI without URL state** — defeats shareable URLs.
3. **24H default time-window anywhere on the landing** (doctrine P7).
4. **"Coming Soon" / "Get Started!" / marketing copy on a load-bearing route** (persona doc rejects).
5. **Aggregating across parallels in any display** (doctrine P5).
6. **Chart paths rendering flat** (no real data resolved at runtime).
7. **`.limit(N)` for N > 1000** — silent truncation via PostgREST cap.
8. **`nuqs useQueryState` without `shallow: false` on a server-component page** — URL updates without re-fetch.
9. **`exec_sql` RPC for heavy queries** — 30× slower than PostgREST native; statement_timeout kills.
10. **New `<svg>` chart implementations from scratch** — use Visx primitives that already work with `chart-palette.ts`.

---

*This cookbook supersedes ad-hoc page-build instructions. When in doubt, read /market-cap's source code and clone the shape.*
