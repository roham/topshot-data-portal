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

## §11 — Empty-state patterns (doctrine §P8 NEW DROP)

Doctrine §P8 says empty cells are invitations, not bugs. Persona doc rejects "Coming Soon" / "Get Started" on load-bearing routes. The corrective pattern: render empty as opportunity.

### 11.1 — Empty filter result

```tsx
// When user's filter combination returns 0 rows
<EmptyState
  icon="🆕"
  primary="No moments match your filter."
  secondary="Try removing the price ceiling — there's a $40 Wemby Common one filter away."
  cta={{ label: "Clear price filter", href: "/moments?...without-maxPrice..." }}
/>
```

**Reject:** "No results found." (bare); "0 matches" (cold); spinner-on-empty-load.

### 11.2 — Empty chart card (data is genuinely absent — vs. fetch failure)

```tsx
// When a chart has NO real data for the current entity
<ChartCard title="Sibling Parallels" comparable="StockX size-as-market-segmenter">
  <EmptyChartFrame
    icon="🆕"
    primary="No sibling parallels in DB yet."
    secondary="Loop A §P2.1 will populate sibling editions. Until then, only Base parallel is shown."
    methodologyLink="/methodology#parallel-coverage"
  />
</ChartCard>
```

**Reject:** flat path rendering (D-substance probe rejects); skeleton-as-permanent-state.

### 11.3 — Empty BAG (collector with no moments)

```tsx
// /u/[username] for collector with zero moments
<div className="bag-empty">
  <h2>🆕 No moments yet — start your collection.</h2>
  <p>Search nbatopshot.com or join a drop to acquire your first moment.</p>
  <Link href="https://nbatopshot.com/" className="external">Open Top Shot →</Link>
</div>
```

**Reject:** any framing that treats the absence as a deficit ("You have no moments — get some!" — patronizing). Per doctrine §P8 — emphasize the exciting part.

---

## §12 — Sparkline-as-canvas for performance

Per /moments brief §9 risk #5 + /players brief §9 risk #5: rendering N sparklines via SVG paths is expensive when N > 30. Each SVG path forces a layout/paint. The mitigation:

### 12.1 — When SVG is fine

Page-level chart cards (8-13 charts max). SVG is the right tool — interactive, accessible, scalable. Visx works here.

### 12.2 — When canvas wins

Dense leaderboard tables with sparkline-per-row (30+ rows above fold). Each row's sparkline is ~80×24px, ~30 data points. SVG = 30+ paths per row × 30 rows = 900+ paths. Canvas = 30 row paints, one Canvas2D per row.

```tsx
// components/primitives/SparklineCanvas.tsx
import { useEffect, useRef } from "react";

export function SparklineCanvas({
  values,
  width = 80,
  height = 24,
  color = "#22d3ee",
}: { values: number[]; width?: number; height?: number; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr);

    if (values.length < 2) return;
    const min = Math.min(...values); const max = Math.max(...values);
    const range = max - min || 1;
    const xStep = width / (values.length - 1);

    ctx.strokeStyle = color; ctx.lineWidth = 1.25;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * xStep;
      const y = height - ((v - min) / range) * height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values, width, height, color]);

  return <canvas ref={ref} width={width} height={height} style={{ width, height }} />;
}
```

**When to switch:** sparkline-per-row tables with 20+ rows. Below 20, SVG via Visx is fine.

**Reject:** chart.js sparklines (heavy lib for one-line charts); animated drawing (jitter).

---

## §13 — Pagination patterns

### 13.1 — PostgREST `Range` header for total-count + pagination

```ts
// lib/supabase/queries/<page>-pagination.ts
export async function paginatedQuery<T>(
  query: any,           // a SupabaseQueryBuilder
  page: number,
  pageSize: number = 50
): Promise<{ rows: T[]; total: number; pageCount: number }> {
  const offset = (page - 1) * pageSize;
  const { data, error, count } = await query
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  const total = count ?? 0;
  return {
    rows: (data ?? []) as T[],
    total,
    pageCount: Math.ceil(total / pageSize),
  };
}
```

Always call the parent query with `{ count: 'exact' }` in `.select(..., { count: 'exact' })` before invoking — that triggers the Content-Range header that supabase-js puts in `count`.

### 13.2 — Pagination component (Link-based)

```tsx
// components/primitives/Pagination.tsx
export function Pagination({ current, total, hrefFor }: {
  current: number; total: number;
  hrefFor: (page: number) => string;
}) {
  if (total <= 1) return null;
  return (
    <nav className="flex gap-1 text-xs items-center">
      <Link href={hrefFor(Math.max(1, current - 1))} className="px-2 py-1 ...">←</Link>
      <span className="text-slate-400">Page {current} of {total}</span>
      <Link href={hrefFor(Math.min(total, current + 1))} className="px-2 py-1 ...">→</Link>
    </nav>
  );
}
```

**Reject:** infinite-scroll (defeats URL state); modal pagination; client-side state.

---

## §14 — Dense leaderboard row pattern

The Card Ladder dashboard-04 + Tensor row-density + StockX leaderboard combined pattern. Used on /players, /moments, /sets, /u/[username] BAG.

```tsx
// components/primitives/DenseTableRow.tsx
export function DenseTableRow({
  thumbnail,
  title,
  subtitle,
  badges,        // array of chips
  primaryValue,
  secondaryValue,
  delta,         // ± with color
  sparkline,     // canvas-based for performance
  href,
}: DenseTableRowProps) {
  return (
    <Link href={href}
      className="grid grid-cols-[40px_minmax(0,1fr)_auto_auto_auto_auto] gap-3 items-center
                 px-3 py-1.5 border-b border-slate-800 hover:bg-slate-900/50 transition-colors">
      {/* col 1: thumb */}
      <Avatar src={thumbnail} size={32} />
      {/* col 2: title + subtitle + badges */}
      <div className="min-w-0">
        <div className="text-sm text-slate-100 truncate">{title}</div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          {subtitle}
          {badges.map(b => <Chip key={b.label} {...b} />)}
        </div>
      </div>
      {/* col 3: primary value */}
      <div className="tabular-nums font-mono text-sm text-slate-100">{primaryValue}</div>
      {/* col 4: secondary value */}
      <div className="tabular-nums font-mono text-xs text-slate-400">{secondaryValue}</div>
      {/* col 5: delta */}
      <DeltaPill value={delta} />
      {/* col 6: sparkline */}
      <SparklineCanvas values={sparkline} width={80} height={24} />
    </Link>
  );
}
```

**Density target:** 30 rows above fold (Bloomberg-tier per §P2).

**Reject:** card-grid layout for the leaderboard (low density); rows with marketing copy; missing tabular-nums alignment.

---

## §15 — Tab navigation pattern (STATS | MOMENTS | etc.)

Per Card Ladder dashboard-02 + dapper.market detail page tabs.

```tsx
// components/primitives/TabNav.tsx
export function TabNav({ tabs, current, hrefFor }: {
  tabs: { id: string; label: string }[];
  current: string;
  hrefFor: (id: string) => string;
}) {
  return (
    <nav className="flex gap-4 border-b border-slate-800 px-3" role="tablist">
      {tabs.map(t => {
        const active = current === t.id;
        return (
          <Link key={t.id} href={hrefFor(t.id)} role="tab" aria-selected={active}
            className={cn(
              "py-2 text-xs font-mono tracking-wider uppercase transition-colors",
              "border-b-2 -mb-px",
              active
                ? "text-slate-100 border-cyan-400"
                : "text-slate-500 border-transparent hover:text-slate-300"
            )}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Reject:** shadcn-default-tabs without URL state (loses share-ability); modal tabs.

---

## §16 — KPI grid layout pattern

Per Card Ladder dashboard-02 STATS column.

```tsx
// components/primitives/KpiGrid.tsx
export function KpiGrid({ cells, columns = 2 }: { cells: KpiCell[]; columns?: number }) {
  return (
    <div className={`grid grid-cols-${columns} gap-x-6 gap-y-3`}>
      {cells.map(cell => (
        <div key={cell.label} className="flex flex-col">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{cell.label}</div>
          <div className="tabular-nums font-mono text-lg text-slate-100">{cell.value}</div>
          {cell.delta != null && <DeltaPill value={cell.delta} size="xs" />}
        </div>
      ))}
    </div>
  );
}
```

**Pattern:** 8 cells in a 2-column grid is the canonical Card Ladder shape. For /market-cap landing use 4 cells in 4-column. For /player/[id] detail use 8 cells in 2-column (Card Ladder-shape).

**Reject:** centered KPI tiles (left-align numbers); colored backgrounds per tile (too noisy); inconsistent decimal precision.

---

## §17 — Methodology footer pattern

Every page has one. Links to doctrine + comparable + caveat disclosures.

```tsx
// components/primitives/MethodologyFooter.tsx
export function MethodologyFooter({ items }: { items: { label: string; href: string }[] }) {
  return (
    <footer className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500">
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Methodology</span>
        {items.map(i => (
          <Link key={i.label} href={i.href} className="hover:text-slate-300 transition-colors">
            {i.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
```

**Standard items per page:**
- "Floor × circulation" — link to `doctrine.md#P1`
- "Parallels-first" — link to `doctrine.md#P5`
- "Default 30D" — link to `doctrine.md#P7`
- "Comparable: <name>" — link to `research/wiki/comparable/<name>-signature-moves.md` (rendered as HTML doc)
- "Data coverage limits" — link to a coverage-disclosure page

**Reject:** marketing-copy footer ("Built with love by Dapper Labs"); social-icon-overkill footer.

---

*This cookbook supersedes ad-hoc page-build instructions. When in doubt, read /market-cap's source code and clone the shape.*
