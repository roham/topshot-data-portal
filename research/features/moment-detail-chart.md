# Research note — moment-detail-chart

`features.json[moment-detail-chart].acceptance` (judge success criterion, quoted verbatim):

> As a trader, I open any moment's detail page, click between time-window tabs (1D, 7D, 1M, 3M, YTD, ALL), and the chart line redraws with the corresponding sales over that window. Tab state survives a page refresh.

## 1. Trader's verbatim ask

From `research/personas/pro-trader.md` §J4 (Moment-detail research): *"I'm thinking about buying a Wemby Common. I open the moment detail page. I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually redraws. I see circulation breakdown: how many are owned, listed, in a pack, locker room, burned. I see a histogram of recent sale prices."* For THIS feature, the load-bearing clause is *"I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually redraws"* — circulation and histogram are separate features (`moment-detail-circulation`, `moment-detail-histogram`). The persona's #1 documented failure mode is `Decorative time tabs. Tabs that update the URL but don't refetch data. The original audit's #1 bug.`

## 2. OTM comparable

OTM's moment detail page lays the time tabs above a large purple price chart filling the right two-thirds of the viewport: `1D / 7D / 1M / 3M / YTD / ALL` rendered as a horizontal row of pill buttons, currently-selected tab is bold and visually emphasized, the date-range label sits top-right of the chart (e.g. `JUL 02 – JUL 08` when 7D is active). Clicking a tab redraws the line over the new window — same chart, different data, no spinner long enough to register. Below the chart sits the price-bucket histogram (separate feature). Reference: `research/otm-screenshots/09-moment-detail-low-cap.png` — that's the exact UI shape to match.

## 3. Public-API ceiling

No public-API ceiling blocks this feature. Ceiling 8 (no `priceHistory` / `volumeHistory` on the Top Shot public GraphQL) is the *reason* we maintain `topshot.transactions` ourselves via the BQ ETL — but that table exists and is the actual data source here, so the ceiling is upstream of this surface, not a constraint on it.

## 4. Thin-slice scope

The Builder must ship a `/moment/[flowId]` page where the judge can assert each of the following:

- The page renders a chart container labeled "Price history" containing a visible `<svg>` line plot whenever the active window has data.
- Six time-window tab buttons are present and labelled exactly `1D`, `7D`, `1M`, `3M`, `YTD`, `ALL` (in that order).
- Clicking a tab updates the URL to `?h=<window>` (lowercase: `1d`, `7d`, `1m`, `3m`, `ytd`, `all`) AND the chart's plotted data changes — i.e. the SVG path geometry or the rendered point count differs from the previous tab.
- The active tab has a visibly distinct style (`aria-checked="true"` on the `role="radio"` button is already wired) and the active tab persists across a hard page refresh when `?h=` is present in the URL.
- When the selected window has zero matching transactions, the panel shows the honest-absence copy `"No transactions for this moment in the selected window."` — not a spinner, not a 500, not a flat zero line.
- Default landing (no `?h=` param) selects `ALL` and renders accordingly.

## 5. Data source

- `topshot.moments` — lookup `moment_id` from `moment_flow_id = $flowId` (single row, `maybeSingle()`).
- `topshot.transactions` — `WHERE moment_id = $resolved_moment_id AND transaction_state_id = 'SUCCEEDED' AND gross_amount_usd IS NOT NULL AND source_updated_at >= $window_start`, ordered `source_updated_at ASC`.
- JOIN key: `topshot.moments.moment_id = topshot.transactions.moment_id`. Resolved client-side via two-stage pattern (first query `moments`, then `transactions` keyed on the returned `moment_id`).
- Selected columns: `transaction_id, source_updated_at, gross_amount_usd, buyer_safe_name, seller_safe_name`.

## 6. Reuse-first inventory

This feature is mostly already wired. The Builder MUST reuse, not re-implement:

- `lib/supabase/queries/moment-detail.ts` — exports `getMomentHistory({ flowId, window })` returning `MomentHistoryPoint[]`, with `windowToSince()` translating each window enum to an ISO since-cursor. `unstable_cache` with 60s revalidate and `"moment-history"` tag. Use as-is.
- `components/MomentPriceHistory.tsx` — client component with the six-tab radiogroup, nuqs `?h=` URL state binding, Recharts `LineChart` rendering. Already handles the empty-data branch correctly. Use as-is.
- `app/moment/[flowId]/page.tsx` — already declares `searchParams?: Promise<{ h?: string }>`, calls `parseHistoryWindow(sp.h)`, awaits `getMomentHistory({ flowId, window: historyWindow })` inside `Promise.allSettled`, and renders the `MomentPriceHistory` inside a `Card` titled "Price history" with methodology text. Page is currently wired; the Builder's job is to verify the end-to-end signal (URL → server fetch → chart redraw) actually works on a deployed preview against a flowId that has trade history in every window.
- `components/primitives/Card.tsx` — used for the chart container with `title`, `subtitle`, `methodology`. Do not introduce a new wrapper.
- `components/primitives/EmptyState.tsx` — for honest-absence patterns elsewhere on the page (already wired).

If the current end-to-end pipeline already passes the six bullets in §4, the Builder's deliverable is verification + screenshots, not new code.

## 7. Known gotchas

- `exec-sql-rpc-is-30x-slower-than-postgrest` → the existing `getMomentHistory` query uses native PostgREST (`supabase.from("transactions")...`); the Builder must NOT swap it to `rpc('exec_sql')`, even for a "richer" query.
- `vercel-preview-env-vars-need-per-branch-add` → the judge grades against the deployed preview URL. If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` are not present on the feature branch's Preview scope, every window will return `[]` and the judge will fail the feature for the wrong reason. Smoke-check the preview URL against a known-traded flowId before declaring the feature ready.
- `moment-status-listed-is-empty` → indirect: not a blocker for this feature because we filter on `transaction_state_id = 'SUCCEEDED'` against the transactions table, not on `moment_status`. Mentioned only so the Builder doesn't get clever and try `WHERE moment_status = 'LISTED'` to narrow the universe — that predicate is dead.
