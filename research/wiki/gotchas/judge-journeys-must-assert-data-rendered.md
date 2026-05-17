# Judge journeys MUST assert data rendered, not just "honest empty state"

**Date filed:** 2026-05-17
**Filed by:** Dexter after Roham's visual review
**Severity:** load-bearing — caused 8 features to pass while visually broken

## The pattern

In Iter 1-12 of the v3 loop, 8 features judge-passed while looking broken in production:
- `moment-detail-chart` — chart empty (judge picked 0-sales serial)
- `set-completion-histogram` — MV had no rows for picked set; "Backfill running" placeholder shown
- `collector-bag` — header KPIs populated, table body empty (zero rows)
- `moment-detail-histogram` — empty SVG
- `moment-detail-serial-overlay` — overlay rendered but no estimate
- `moments-csv-export` — duplicate menu bars (UI bug; not viz)
- `players-marketcap` — most rows missing Total Minted / Circ% / 24H Δ%
- `packs-tracker` — page rendered but missing lowest-ask + hits-remaining columns

## Root cause

Pillar 5 #2 of `research/00-product-pillars-v3.md` says "honest absence beats fabricated presence" — and the Builder correctly implemented honest empty states. But the **judge journey treated empty-state-rendering as PASS** even when the substance of the feature IS the data rendering. So:

- Element present? ✓
- Selector matches? ✓
- "Honest empty state" caption visible? ✓
- → judge marked PASS, features.json[feature].passes = true

The feature shipped looking broken to the user.

## The fix (mandatory for all viz / data-table features)

When `features.json[feature].data_viz_kind` is anything other than `"export-only"` or `"metadata-strip-plus-link"`, the judge journey MUST:

1. **Navigate to a data-bearing entity** — for moment pages: pick a flowId with ≥5 SUCCEEDED transactions in the underlying moment_id (verify via Supabase query before journey runs). For set pages: pick a set with ≥1 row in mv_set_completion_distribution. For collector pages: pick a username with ≥100 owned moments. For player pages: pick a player with ≥10 editions.
2. **Assert on rendered DOM substance**, not just element existence:
   - For charts: `expect(svgElement.locator('path, line, rect').count()).toBeGreaterThan(N)` where N is the minimum expected data points.
   - For tables: `expect(tableBody.locator('tr').count()).toBeGreaterThan(M)` where M is the minimum expected row count for the chosen entity.
   - For histograms: `expect(barElements.count()).toBeGreaterThan(3)` AND `expect(barElements.first().boundingBox().height).toBeGreaterThan(0)`.
3. **NEVER accept "honest empty state" as PASS** when the entity-with-data exists in production. The journey fails (writes failed.md, increments fail_reasons) and the next Researcher MUST either:
   - (a) Pick a different entity that has data (preferred — usually a query issue, not a data issue), or
   - (b) Document that the underlying MV/table is empty and the feature needs backfill (flag as `blocked: true` with `blocked_reason: "<MV-name> has no rows; needs backfill"`).

## How to find a data-bearing entity at journey time

Before the journey runs, query Supabase for a known-good entity.

**Pattern A — use a Supabase view or MV that pre-aggregates counts** (preferred — cheap, indexed). The portal already has `topshot.mv_moment_30d_activity` and similar; pick from those. Example:

```ts
const { data } = await supabaseAdmin
  .schema('topshot')
  .from('mv_moment_30d_activity')
  .select('moment_id, trades_count')
  .gte('trades_count', 5)
  .order('trades_count', { ascending: false })
  .limit(1);

const KNOWN_GOOD_FLOW_ID = data[0].moment_id;
```

**Pattern B — call a Postgres RPC that returns the counted entity** (use this if no MV exists for the dimension you need). Define an RPC like:

```sql
-- migrate as needed; lives in supabase/migrations/
create or replace function topshot.moments_with_at_least_n_succeeded_tx(n int)
returns table(moment_id text, tx_count bigint)
language sql stable as $$
  select moment_id, count(*)::bigint as tx_count
  from topshot.transactions
  where status = 'SUCCEEDED'
  group by moment_id
  having count(*) >= n
  order by count(*) desc
  limit 50
$$;
```

Then in the journey:

```ts
const { data } = await supabaseAdmin.rpc('moments_with_at_least_n_succeeded_tx', { n: 5 });
const KNOWN_GOOD_FLOW_ID = data[0].moment_id;
```

**Pattern C — last resort, client-side aggregate** (only if MV and RPC are both unavailable — slower, but works without schema changes):

```ts
// Pull a window of SUCCEEDED transactions, aggregate by moment_id, pick the highest
const { data: txs } = await supabaseAdmin
  .schema('topshot')
  .from('transactions')
  .select('moment_id')
  .eq('status', 'SUCCEEDED')
  .gte('source_updated_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
  .limit(5000);

const counts = new Map<string, number>();
for (const t of txs!) counts.set(t.moment_id, (counts.get(t.moment_id) ?? 0) + 1);
const sorted = [...counts.entries()].filter(([, c]) => c >= 5).sort(([, a], [, b]) => b - a);

if (!sorted.length) throw new Error('No moment with ≥5 SUCCEEDED tx — feature genuinely lacks data, mark blocked');
const KNOWN_GOOD_FLOW_ID = sorted[0][0];
```

**Note on the prior gotcha pattern this replaces:** `.from('transactions').select('moment_id, count').gte('count', 5)` is INVALID — postgrest doesn't synthesize a count column from `.select('count')` and `.gte` against it doesn't filter on aggregated values. Use Pattern A, B, or C instead.

**For set-completion-histogram:**

```ts
const { data } = await supabaseAdmin
  .schema('topshot')
  .from('mv_set_completion_distribution')
  .select('set_id')
  .limit(1);
if (!data?.length) throw new Error('mv_set_completion_distribution empty — mark feature as blocked, not honest-empty-PASS');
const KNOWN_GOOD_SET_ID = data[0].set_id;
```

**For collector-bag:**

```ts
// Pick a username whose flow_address owns ≥100 moments
const { data } = await supabaseAdmin
  .schema('topshot')
  .from('users')
  .select('username, flow_address, moments_count')
  .gte('moments_count', 100)
  .order('moments_count', { ascending: false })
  .limit(1);
const KNOWN_GOOD_USERNAME = data[0].username;
```
(If `users.moments_count` column doesn't exist, use a `mv_user_bag_size` MV or a Pattern-B RPC.)

Hard-coding a flowId (like the prior journey did with `47863705`) is fragile — that specific serial may have 0 sales even if the moment_id has plenty. Resolve at runtime.

## What honest empty state IS appropriate for

Honest empty state PASSES the judge ONLY when:
- The chosen entity demonstrably has no data in production (e.g., a brand-new collector with 0 moments — table is empty because BAG SIZE is 0)
- A public-API ceiling blocks the data (per `research/00-foundation-v2.md` §3 — 10 ceilings)
- The feature is `data_viz_kind: "export-only"` or `"metadata-strip-plus-link"` (those don't have a viz to fail)

In every other case, "honest empty state" rendering is structurally identical to "feature is broken" — same DOM. The judge cannot distinguish; the user cannot distinguish; the trader sees nothing and leaves.

## Roham's 2026-05-17 14:40Z verbatim feedback (canonical)

> "On the moment detail page, all of the graphs are broken. The CSV export does seem to work, except there are two menu bars appearing. Player market cap does seem to work, but upon landing, for some reason, the total minted, the circular percentage, and the 24-hour change only appear for certain players, which I don't fully understand. ... The set completion histogram does not work at all. The PAX page, I'm not sure what it's trying to show. ... The collector bag also is a 404, and then the player page is also a 404."

The 404s were because Dexter passed Roham placeholder URLs (`/u/someuser`); the real routes work but the bag table is empty (real bug per the screenshot).

## Default windows

Roham's 2026-05-17 14:40Z verbatim: "24 hours is not a short enough window or not a long enough window. That's no problem. Let's just default to showing 30-day windows."

This applies to every time-window selector across the portal. The `default-window-30d-meta` feature in features.json captures this; future iterations honoring this gotcha will check both the new pillars file AND this gotcha.

## Canonical known-good seeds (provided by Roham)

When the journey needs a real entity and Supabase resolution returns nothing or the wrong shape, fall back to these. The judge journey SHOULD still query Supabase first (to catch schema drift); these are insurance.

- **Collector username:** `roham` — BAG SIZE 3,000, EST. LISTED VALUE $15.5M, 485 distinct players. Use as primary seed for `collector-bag`, `cross-collector-compare`, and any /u/<username> route.
- **Pack ID:** TBD — Roham to provide a sealed pack with active marketplace data for `packs-best-hits-scanner`.
- **Moment flowId:** resolve at runtime per Pattern A/B/C above — no hard-coded seed yet (the prior `47863705` seed was a 0-sales serial; do not reuse).
- **Set ID:** resolve at runtime via `mv_set_completion_distribution` non-empty pick — no hard-coded seed yet.
- **Player ID:** resolve at runtime via player with ≥10 editions.

When a seed is hard-coded as a "canonical known-good," it MUST be verified to still hold each iteration (Supabase ETL might evolve the schema, an entity might lose data). Pattern: query first, fall back to seed only if query fails.
