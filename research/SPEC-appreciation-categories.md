# SPEC — Appreciation Categories (managed-agents build brief)

**Repo:** `roham/topshot-data-portal` · **Target branch:** `dexter/appreciation-categories` → PR to `main`
**Owner:** Dexter (applies migrations + deploys + verifies after the PR lands)
**Status:** staged for outsourcing to managed-agents. Data need NOT be complete — the agent
builds the code + SQL against the definitions below; Dexter applies MVs to prod + deploys.

## Objective

Surface the *best* Top Shot moments, not just the liquid ones. A single line chart unfairly
buries illiquid greatness and "doom-reds" anything that debuted high. Replace the single view
with **categories** — each moment is classified by its data shape and rendered the right way.
The existing line-chart gallery stays as ONE lane. Add three event-driven lanes.

## Constraints (hard)

- **Worker scope = code + SQL authoring + PR only.** The worker has NO prod Supabase creds and
  NO Vercel access. Do NOT attempt `psql`/migration apply or `vercel deploy`. Write migration
  files under `supabase/migrations/` and read-wrappers under `lib/supabase/queries/`; Dexter
  applies + deploys after review.
- **PostgREST aggregates are DISABLED** — any per-row aggregate (median/percentile/group) must
  live in an MV or a `SECURITY DEFINER` RPC granted to `anon` (pattern: `supabase/market_cap_landing_rpc.sql`).
- **1000-row PostgREST cap** — paginate any `market_caps`/`editions`/`transactions` read with `.range()`.
- **Schema is `topshot`.** Tables: `transactions(moment_id, gross_amount_usd, completed_at)`,
  `moments(moment_id, edition_id, serial_number, pack_id)`, `editions(edition_id, player_name,
  tier_name, mint_count, parallel_id, series_name, image_urls[])`, `market_caps(date, edition_id,
  lowest_ask_price)`, `packs(pack_name, price, moments_per_pack, total_moments)`.
- **Money cross-checks are the entire purpose** — verify every displayed number against an
  independent query in the PR description.

## The four categories (data shapes → render)

Classification per edition/moment, in priority order:

1. **Liquid → line chart** (EXISTS). `mv_edition_growth_90d` + `/edition/[id]` price chart.
   No change beyond linking from the new sections.

2. **Appreciation story** — a *specific serial* resold cheap → expensive.
   - Source: `transactions` grouped by `moment_id`, joined to `moments`→`editions`.
   - Definition: `count(*) >= 2` AND `max(price)/min(price) >= 3` AND `max(price) >= 100`.
     Strong tier: `>= 5×` and `>= $250`.
   - **Validated count: 504 (218 strong).** Headliners: LeBron Ultimate $12,000→$50,420;
     Luka Legendary $2,000→$6,250; Paige Bueckers $999→$3,149; Kon Knueppel Common $444→$2,500.
   - Render: card with the sale sequence as dots/steps ($444 → $2,500), player/tier/serial,
     and the kicker — current floor vs the high sale (e.g. "last sold $2,500 · nothing listed below $X").

3. **Floor-smashed** — the low ask leapt after a sale.
   - Source: `market_caps` per edition, latest `lowest_ask_price` vs the 30d-prior min.
   - Definition: `latest_floor >= 1.5 × min_floor_30d` AND `latest_floor >= 50`.
   - **Validated count: 189.**
   - Render: celebratory "the floor just leapt $X → $Y" card. This is the "floor-smash" graphic.

4. **High-value illiquid** — expensive, rarely trades. NO chart.
   - Source: latest `market_caps.lowest_ask_price` (floor) + 90d sale count from `transactions`
     + pack pull-price from `packs` via `moments.pack_id`.
   - Definition: `floor >= 200` AND `sales_90d <= 5`.
   - **Validated count: 551.**
   - Render: "rare sales · N sales ever · pulled from a $X pack · last sold $Y" card. No line chart.

## Deliverables (files)

- `supabase/migrations/00XX_appreciation_events.sql` — MVs: `mv_serial_appreciation` (pattern 2),
  `mv_edition_floor_smash` (pattern 3), `mv_edition_illiquid_highvalue` (pattern 4). Unique index
  + a sort index each. Add all three to `scripts/etl/bq-refresh-mvs.mjs`.
- `lib/supabase/queries/appreciation-events.ts` — read wrappers (paginated, `unstable_cache` keyed `*-v1`).
- `components/appreciation/{AppreciationStoryCard,FloorSmashCard,IlliquidCard}.tsx` — the three card types.
- `app/appreciating/page.tsx` — extend with categorized sections/tabs: Trending (line, exists),
  Appreciation Stories, Floor-Smashed, High-Value (illiquid). Keep the existing visual gallery as the default lane.
- `components/MostAppreciatingHero.tsx` — optionally rotate a headliner from each category.

## Acceptance

- `npx tsc --noEmit` clean.
- Each MV's displayed numbers cross-checked vs an independent `psql` query, shown in the PR body.
- Mobile-first responsive; matches existing design tokens (`var(--surface-1)`, TierChip, Num, MiniSpark).
- PR opened from `dexter/appreciation-categories` with a numbers-verification section.
- Does NOT modify auth, ETL credentials, or anything outside the portal feature surface.
