# Research Note — `player-detail-variant-a-three-axis-matrix`

**Feature:** Player page Variant A — three-axis matrix (rows=set, cols=tier×parallel)
**Route:** `/player/[id]/v/a`
**Priority:** 4 · Beyond-OTM (design-comparison variant)
**Authored:** 2026-05-18

---

## 1. Trader's verbatim ask

From `research/personas/pro-trader.md` — Discord voice quote #2, the canonical parallel-sniping framing:

> "I need to dump the Common Wembys with serials > 5K before EOM. Are there any thinly-listed parallels with better bid support?"

The existing `/player/[id]` matrix collapses all parallels under a single "Common" column — a structure the persona doc explicitly names as an offense: *"Parallel collapse. Showing one floor for 'Wemby Common' without telling me which parallel — structurally dishonest given Top Shot's taxonomy."* Variant A answers the same diagnostic question the trader brings from the market-cap leaderboard click-through, but splits each tier into its (tier × parallel) sub-markets so Common-Base and Common-Crystal are separate columns with their own floor and listing count. This is the minimum information needed to answer "are there thinly-listed parallels with better bid support?" without drilling into each edition individually.

---

## 2. Comparables (primary + cross-domain)

**Primary — StockX size × condition grid:** StockX's signature move on a product-detail page is a 2D sparse grid where each column is a shoe size (US 7, 7.5, 8, …) and each row represents a condition tier (Deadstock, Lightly Worn, Used). Each cell displays the Lowest Ask as the dominant value; cells without active listings display "—" (not zero). Column headers are fixed-position while the body scrolls horizontally — the exact pattern `horizontal scrolling acceptable` in the acceptance text. Clicking a cell navigates into that specific (size × condition) market, making it a navigable pivot rather than a display-only table. The portal's structural translation: size → parallel, condition → tier, product → player, cell value → low_ask + listings_count. The "—" treatment for missing cells maps directly to the existing `NewDropTag` pattern (circulation > 0 but no listings) plus a plain "—" for editions that have no circulation at all. No OTM screenshot in `research/otm-screenshots/` covers the per-player variant-a surface; the nearest visual reference is `research/otm-screenshots/04-players-marketcap-leaderboard.png` for the monospaced dark-mode number style the cells must inherit.

**Cross-domain — Discogs format × region matrix (Pillar 3 learning bank, collectibles):** On a Discogs release page the "All Versions" view presents a browseable matrix of every pressing, pivoted by Format (Vinyl LP, CD, Cassette, 10", 7") and Country/Region (US, UK, DE, JP). Each cell shows pressing count + lowest marketplace price. A US 12" Vinyl and a JP CD of the same album are treated as separate markets with separate prices. The signature move the Builder should port is the *compound column header*: the header row labels are not single-dimension values but compound strings — "12", US" or "CD, JP" — formed by concatenating the two sub-dimensions with a separator. For the portal: column headers are compound labels like "Common · Base", "Common · Crystal", "Rare · Base", formed by joining `tier_name + parallel_name` with a `·` separator. This is a more readable alternative to two nested header rows, matches the acceptance text ("Common-Base, Common-Crystal, Common-Anthology, Rare-Base, etc. become separate columns"), and avoids colspan complexity.

---

## 2b. Data viz pillar

`data_viz_kind: "matrix-three-axis"` — this term is NOT yet in Pillar 1's vocabulary. The nearest entry is **heatmap** (Pillar 1 table: "player-tier matrix" is an explicit heatmap use case). The difference: a standard heatmap encodes magnitude as color; this feature encodes magnitude as explicit numeric values in cells. Propose adding `matrix-three-axis` to the vocabulary: *sparse value-grid — cells show explicit numeric values (not color bands) at the intersection of two compound dimensions; blank cell = honest absence; cross-domain origins: StockX size×condition, Discogs format×region, Basketball-Reference season×stat.*

**What this matrix plots:**
- **Rows (y-axis):** set name, sorted series DESC then set name ASC (newest sets at top — Basketball-Reference most-recent-season-first move).
- **Columns (x-axis):** flattened `(tier_name × parallel_name)` — each unique (tier, parallel) combination found in the player's editions becomes one column. Column label: `"Common · Base"`, `"Common · Crystal"`, `"Rare · Base"`, etc. Column order: sort by tier rarity ascending (Common → Fandom → Rare → Legendary → Ultimate), then parallel_name ASC within each tier.
- **Cell value:** `low_ask` (USD, dominant display) + `listings_count` (secondary, muted). No market-cap per cell (that's already in the base `/player/[id]` matrix; variant-a focuses on the depth/availability signal).
- **Filters:** `?q=` for set-name filter (URL-encoded GET param, server-side, no JS required). No time-window filter — matrix reflects current snapshot, not time-keyed data. Filter state in URL per Pillar 1 mandate.
- **Parallels treatment:** Each (tier × parallel) combination is its own column — never aggregated. A Common-Base cell and a Common-Crystal cell are distinct markets; they must never be merged or summed into a single "Common" column. Pillar 5 §6 is the hard constraint.

---

## 3. Public-API ceiling

**No applicable ceiling for this feature.** All data comes from Supabase ETL tables (`topshot.editions`, `topshot.moments`, `topshot.market_caps`, `topshot.sets`, `topshot.parallel_types`) — not from live public-API calls. The `market_caps.lowest_ask_price` column is the ETL-computed edition floor; it does not depend on the blocked `Edition.lowestAsk` public-API field (ceiling #5). Listings count uses `listing_price_usd IS NOT NULL` (the canonical listed predicate — see gotcha below), not any public-API listings endpoint.

---

## 4. Thin-slice scope

Minimum the Builder must ship for the judge journey to pass against `/player/201939/v/a`:

1. **Route exists and renders:** `GET /player/201939/v/a` returns HTTP 200 with a non-stub page body. The `[id]/v/a` sub-route must be a new file at `app/player/[id]/v/a/page.tsx`; it must NOT 404.
2. **Matrix has compound columns:** The `<table>` header row contains at least two distinct `(tier × parallel)` column labels (e.g., `Common · Base` and `Rare · Base`) as visible text in `<th>` elements. Plain `data-testid="matrix-col-*"` attributes per column label for selector coverage.
3. **Cells render low_ask + listings_count:** Every non-empty cell contains two values: a USD-formatted floor price (from `market_caps.lowest_ask_price`) as the primary value, and a listings count integer as the secondary value. Both must be non-fabricated — assertable via DOM text content (`expect(cell).toContainText("$")`).
4. **NewDropTag on unlisted editions:** Any cell where the underlying edition has `num_moments_in_circulation > 0` but `listings_count = 0` renders the `<NewDropTag />` component (or equivalent `data-testid="new-drop-tag"` element) in place of a floor price. This is the Pillar 5 empty-row fix named in the acceptance text.
5. **Horizontal scroll works:** The matrix wrapper element has `overflow-x: auto` (or `overflow-x: scroll`) so wide column sets scroll without breaking layout.
6. **Matrix renders substantive data for player 201939:** The table body contains `≥ 3` rows (sets) and `≥ 3` columns (tier×parallel combos) for Stephen Curry. The judge journey MUST assert `expect(tableBody.locator('tr').count()).toBeGreaterThan(2)` and `expect(headerRow.locator('th').count()).toBeGreaterThan(3)` — per the `judge-journeys-must-assert-data-rendered` gotcha, honest-empty-state alone does NOT pass.

---

## 5. Data source

Primary tables (all schema-qualified under `topshot`):

| Table | Columns needed | Purpose |
|---|---|---|
| `topshot.editions` | `edition_id, tier_name, parallel_id, set_id, player_id, player_name, mint_count` | One row per edition; `parallel_id` is the foreign key into `parallel_types` |
| `topshot.parallel_types` | `id, name` | Resolves `parallel_id` → human label ("Base", "Crystal", "Anthology") |
| `topshot.sets` | `set_id, set_name, series_number` | Row label (set name) + sort key (series DESC) |
| `topshot.market_caps` | `edition_id, lowest_ask_price, num_moments_in_circulation, date` | Cell floor + circulation; use latest `date` per `edition_id` (JS dedup after `.order("date", {ascending: false})`) |
| `topshot.moments` | `edition_id, listing_price_usd` | `COUNT(*) WHERE listing_price_usd IS NOT NULL` → `listings_count` per edition |

**JOIN keys:**
- `editions.set_id` → `sets.set_id`
- `editions.parallel_id` (string) → `parallel_types.id` (string cast)
- `market_caps.edition_id` → `editions.edition_id`
- `moments.edition_id` → `editions.edition_id`

**Player resolution fallback chain** (known issue — `editions.player_id` format mismatch for many top-200 market-cap players): attempt `editions.player_id = playerId` first; if 0 rows, attempt `editions.player_name = mv_player_market_cap.player_name`; if still 0, attempt `editions.player_name ilike players.full_name`. This chain is already implemented in `getPlayerDetail()` and `getParallelsData()` — reuse it.

---

## 6. Reuse-first inventory

The Builder MUST reuse these before writing new code:

- **`lib/supabase/queries/player-detail.ts` → `getPlayerDetail()`** — already fetches `editions` (with set_id, tier_name, parallel_id), `editionFloors` (market_caps batch via `.in("edition_id", ...)`), the 3-attempt player-resolution fallback chain, and the JS-side dedup for market_caps. Extend its return type to include `listings_count` per edition (add a `topshot.moments` count batch, same `.in("edition_id", ...)` pattern as market_caps).

- **`lib/supabase/queries/parallels.ts` → `getParallelsData()`** — Stage 2 of this query batch-fetches `parallel_types` and resolves `parallel_name` from `parallel_id` (including `"(Parallel #N)"` fallback and `"Base"` ultimate fallback). Copy the parallel name resolution block verbatim into the variant-a query extension — do not re-implement it.

- **`app/parallels/page.tsx`** — structural reference for the pivot pattern: how to JS-sort rows, how to build compound column keys, how to handle `overflow-x-auto` wrapper, how `ParallelsSortHeader` and `ParallelsFilterRail` attach. For variant-a, the Builder does NOT need filter rail or sort headers (thin slice) but the data-shape and overflow pattern are direct references.

- **`components/primitives/NewDropTag.tsx`** — required by acceptance text ("Empty cells with NEW-DROP visual treatment per Pillar 5 empty-row fix"). Import exactly; do not re-implement.

- **`components/primitives/Num.tsx`** — USD formatting (`format="usd"`) for floor price; `format="int"` for listings count. Tabular-nums is enforced inside `<Num>`.

- **`components/primitives/TierChip.tsx`** — use in column headers to label tier portion of the compound column key. Keeps visual tier-color coding consistent with base `/player/[id]`.

- **`components/primitives/EmptyState.tsx`** — for the case where no editions are resolved (0-row matrix), render `<EmptyState title="No editions resolved" body="..." />` rather than an empty `<table>`. Do NOT use `<ComingSoon />`.

- **`components/primitives/Card.tsx`** — wrap the matrix in a Card with a `methodology` prop (Pillar 5 §4 honest-absence; cite the source tables and the `listing_price_usd IS NOT NULL` predicate).

---

## 7. Known gotchas

- **`exec-sql-rpc-is-30x-slower-than-postgrest`** → Any new data-fetch for listings count or parallel resolution MUST use PostgREST `.from("moments").select(...).in("edition_id", editionIds).not("listing_price_usd", "is", null)` — never `rpc("exec_sql", ...)`. A player like Curry with 50+ editions hitting exec_sql would time out.

- **`moment-status-listed-is-empty`** → `listings_count` per edition MUST be computed as `COUNT(*) WHERE listing_price_usd IS NOT NULL`, not `WHERE moment_status = 'LISTED'` (that column is always 0 in production ETL).

- **`nulls-last-qualifier-defeats-partial-index`** → When ordering `market_caps` by `date DESC` to get the latest row per edition, omit `nullsFirst` from the `.order()` call (pass only `{ ascending: false }`, no `nullsFirst` key). The `market_caps.date` column is non-nullable so the qualifier is irrelevant and adding it silently defeats the index.

- **`judge-journeys-must-assert-data-rendered`** → `data_viz_kind` is `matrix-three-axis` (non-trivial viz). The judge journey MUST navigate to player `201939` (Curry — known good with 50+ editions) and assert `tableBody tr count > 2` and `th count > 3`. "Honest empty state" alone is NOT a pass for this feature.

- **`vercel-preview-env-vars-need-per-branch-add`** → The new `app/player/[id]/v/a/page.tsx` route deploys to a preview branch. After pushing, verify the preview URL returns non-empty matrix data before invoking the judge. If it shows empty state, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` to the Preview environment for the branch.
