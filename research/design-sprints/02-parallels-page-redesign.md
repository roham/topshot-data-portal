# Design Sprint 02 — /parallels redesign (after failed v1)

**Date opened:** 2026-05-17 17:35Z
**Trigger:** v1 of /parallels (commit `e17bfd6`) shipped with bad information architecture. Roham reviewed and was rightly furious. Quote: *"it doesn't get across the point at all. This is generally a page that shows a deep misunderstanding of good information architecture."*

This is the meta-analysis Roham asked for.

---

## What went wrong with v1 — failure pattern, not just failure

### Surface failures (specific things that were bad)
1. **Hardcoded 8-player picker.** Curry / LeBron / Podziemski / SGA / Cooper Flagg / Wembanyama / Luka / Angel Reese — picked arbitrarily, with zero product reason. The page should not have a player picker at all (see below); even if it did, it shouldn't be 8 names baked in code.
2. **Defaulted to a player (Curry).** /parallels is a cross-cutting concept. Defaulting to a per-player view treats it like a drill-down, which is a category error.
3. **One row per `subedition_id` UUID.** Hundreds-to-thousands of rows of `<set name> · <tier> · <12-char UUID prefix>·…`, with no human-readable parallel name. Massively repetitive. The user can't tell what they're looking at.
4. **The 1-of-1 Podziemski Ultimate I was using as an example wasn't even visible.** The reason was a real data gap, but the user-facing experience was: "the very thing you're trying to demonstrate to me isn't even there."
5. **"NEW DROP" tag applied uniformly, including to dead/empty rows that have no circulation at all.** The opportunistic framing was right; the application was indiscriminate.

### Why each one happened — the failure shapes
1. **Picker hardcoding:** I wanted a way to test the page quickly during dev. I baked in the seed list instead of building a search input. Then I forgot to remove the hardcoded list before shipping. Pattern: dev-scaffolding leaking into production surfaces.
2. **Player-default-on-cross-cutting-route:** I was anchored to the existing `/player/<id>` pattern and accidentally inherited its grain when defining `/parallels`. Pattern: failure to question the route's own identity.
3. **Subedition UUID rows:** I read `subedition_id` as a foreign key to a non-existent parallels table and assumed each unique value was a "parallel instance." I never queried the actual distribution. Pattern: schema-from-imagination, not schema-from-data — the exact failure shape from the 2026-05-17 voice-DNA entry about treating given artifacts as black boxes.
4. **Podziemski Ultimate missing:** I assumed `topshot.moments` was complete coverage of `topshot.editions × topshot.market_caps`. It isn't. Pattern: assumption of data-table consistency without verifying.
5. **Indiscriminate "NEW DROP":** I applied the visual treatment to any row with zero listings, including ones where circulation is also zero or one. Pattern: applying a rule globally without conditioning on whether the rule applies.

### The shared generator
Every failure has the same root: **I jumped to UI before reading the data.**

The correct order is:
1. Read the schema.
2. Query the actual data to understand semantics.
3. Look for lookup tables / naming dimensions.
4. THEN design the page.
5. THEN code.

I inverted steps 1–3 and 4–5. This is the canonical build-agent substrate-default per voice-DNA entry 2026-05-16 22:30 (`author-when-supposed-to-be-orchestrator`). The orchestrator pause didn't apply because Roham explicitly told me to author the variants, but the data-investigation-first discipline applies regardless.

---

## What the data actually says (the meta-analysis)

Queries run between 17:25Z and 17:32Z:

| Question | Finding |
|---|---|
| How many moments? | 3,494,001 |
| What % have `subedition_id`? | 100.0% — every moment has one |
| What does `subedition_id` look like? | Small integer-as-string — `"0"`, `"16"`, etc. |
| In a 1,000-moment sample, how many distinct values? | **2** (`"0"` and `"16"`) |
| Is there a name mapping for parallel types? | **NO.** Probed `topshot.sub_editions`, `subeditions`, `parallels`, `parallel_types` — all return "schema cache not found." |
| Where does `"0"` appear? | Across Base Set / WNBA / Series 3 — appears to be the "no-parallel / base" sentinel value |
| Where does `"16"` appear? | Series 8 only (Base Set - 8 with specific 2026-01–02 plays). Likely a specific parallel variant. |
| Does Podziemski's 1-of-1 Ultimate moment exist in `topshot.moments`? | **NO.** `editions` row exists, `market_caps` shows circ=1 + ask=$5M for 3 consecutive dates, but `topshot.moments` has zero rows for that edition_id. Real ETL completeness gap. |

So the parallel system in the live data is: **an integer enumeration of unknown cardinality (possibly small) with no name mapping in the warehouse**. The name dimension (Base / Crystal / Anthology / etc.) lives somewhere we don't currently read — likely the Top Shot GraphQL schema or the BQ source ETL.

---

## What /parallels SHOULD be — the redesign

The page exists to answer the question: **"How do parallels segment the Top Shot market?"** It's a cross-cutting market lens, not a per-player drill-down.

### The right unit of analysis
The primary row is a **parallel TYPE**, not a per-set instance. Likely 5–20 rows total (the full enumeration of `subedition_id` values), each named (once we source the names).

### Proposed page structure
```
PARALLELS · cross-cutting market dimension

                  Moments    Avg circ    Floor range     30d $ vol     Top players
─────────────────────────────────────────────────────────────────────────────────────
0 — Base parallel  3.4M       ~10K        $0.75 – $99K   $X.YM         Curry / LeBron / SGA…
16 — ?? (S8)      5,300      ~250        $50 – $5K      $X.YM         Podziemski / Flagg…
…
```

Each row: parallel type (with name when sourced, "(unnamed #N)" otherwise) × counts × floor range × 30d transaction volume × top players by mcap in that parallel. Click a row → drill down to a (parallel × set × tier) breakdown showing where this parallel lives across the catalog.

### Secondary surfaces this enables
- Per-player view: instead of `/parallels?player=X`, this becomes a tab/column on `/player/<id>` — "Curry across parallels" — showing Curry's footprint per parallel type, derived from the same data.
- Cross-tier: "all Common parallels," "all Rare parallels" — filter rail on /parallels.
- Calendar: which parallels were introduced when (Series 8 introducing new ones is part of the story).

### What needs to land before this ships

**ARCHITECTURE PRINCIPLE (Roham clarified 2026-05-17 17:45Z):** the portal reads only from `topshot.*` Supabase tables. BQ is the FILL source via batch ETL — never queried at request time. Top Shot GraphQL, if used, is also FILL-side (one-time/periodic pull → write to Supabase) — never query-time. Everything below is fill-side work that lands in Supabase, then the portal reads Supabase only.

1. **Parallel-type names — fill-side.** Three options:
   - **(a) One-time Top Shot GraphQL pull** → write to a new Supabase table `topshot.parallel_types` (columns: `subedition_id`, `parallel_name`, `description`, `image_url`). Periodic batch refresh as Top Shot introduces new parallels. Portal JOINs this at read time. Recommended.
   - **(b) Hand-curated lookup table** — write the 5–20 names manually into `topshot.parallel_types`. Cheap but fragile (Top Shot can add new ones; we'd lag).
   - **(c) Ship v1 without names** — render "Type 0 / Type 16 / Type N" labels with a methodology note that the name dimension is pending fill-side work. Worst UX; rejected unless 1 and 2 both blocked.
2. **Full enumeration of `subedition_id` values — read-side audit.** A `SELECT DISTINCT subedition_id` over `topshot.moments`. Postgres-via-PostgREST distinct is fragile; needs either a small read-side RPC (defined in a migration) or a one-shot Node aggregation iterating the table in pages. Output gets cached in `topshot.parallel_types` as part of fill (1).
3. **`topshot.moments` completeness — fill-side.** The Podziemski Ultimate row exists in `topshot.editions` + `topshot.market_caps` but is missing from `topshot.moments`. Audit how many `edition_id`s have `market_caps` rows but zero `moments` rows. Likely a moments-fill predicate is dropping low-circulation editions. Fix at fill time; the portal reads `topshot.moments` after fill catches up.

### What does NOT need to land for v1
- subedition-keyed offer aggregation (the original `subedition-keyed-market-cap-etl` feature is still real, but v1 of /parallels can ship without it using edition-level offers)
- The 4 player-page variants (a/b/c/d) — those are downstream of getting parallels named first
- Backfill of the missing Podziemski Ultimate moment

---

## Action sequence

1. ✅ `/parallels` route replaced with "under reconstruction" placeholder (`commit pending`)
2. ⏳ Source parallel-type names (Top Shot GraphQL probe → name lookup or hand-curated)
3. ⏳ Run full `SELECT DISTINCT subedition_id` to enumerate the parallel-type space
4. ⏳ Author redesigned `/parallels` per the structure above
5. ⏳ Re-think the 4 player-page variants in light of the redesigned `/parallels`

Items 2 and 3 are data work. Item 4 is UI work that follows. Item 5 is design work that follows item 4.

---

## What I'm taking from this

The pattern this exposes — schema-from-imagination, UI-before-data-investigation — is the third recurrence in voice-DNA. Adding a personal discipline gate: **before writing a NEW route or NEW data-shape component, I produce a 5-line data investigation report and check it in alongside the code.** Not a long doc — a small reality check that I read the table before I wrote against it. Cost: 2–5 minutes. Benefit: avoiding the kind of "embarrassing" surface that costs trust to fix.
