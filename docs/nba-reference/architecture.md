# Architecture — `nba_reference` schema

## Recommendation

Extend the existing `topshot-data-portal` Supabase project with a new `nba_reference` schema rather than standing up a separate Supabase project, a separate Postgres, or a graph database. One project, two schemas, soft cross-schema joins, RLS-isolated reads.

## Why this shape, not the alternatives I considered

**A separate Supabase project** was the obvious alternative — clean blast-radius isolation, separate keys, separate billing. I rejected it because the load-bearing query for the Pantheon agent is the Top Shot moment-join: `topshot.moments × nba_reference.nba_plays` via `nba_top_shot_moments_join`. Across-project federation in Postgres requires `postgres_fdw` and turns a single join into a network call; same-project / cross-schema is a local join and a permissions question, not a transport question. The blast-radius isolation alternative is RLS plus a separate service-role API key that has GRANT only on `nba_reference.*` — covers the actual risk (a bad migration corrupts Top Shot data) without paying the federation tax.

**Neo4j or a graph DB for the entity graph** was the second alternative. The arguments-for: a Q-number-spined encyclopedia is a graph, and award/transaction/lineup queries are graph traversals. The arguments-against won: every other lane outputs tabular data, Supabase is what we already operate, GIN-indexed text array columns on `nba_narratives` cover the multi-entity-mention case, and we have not yet hit a single query that demands traversal-shaped reasoning. Three-case rule: zero cases observed. Adding a graph DB is a future call, not a today call.

**Storing Top Shot moment cross-references inside `topshot.*`** instead of in a new `nba_reference.nba_top_shot_moments_join` was the third. Rejected — the join is encyclopedia-side metadata about a Top Shot row, not Top Shot data about itself. Keeping it on the encyclopedia side means a Top Shot ETL re-run never touches encyclopedia tables and an encyclopedia re-match never touches Top Shot tables. Cleaner ownership.

## The Wikidata Q-number choice as join spine

Source-system IDs do not interoperate. NBA stats id `2544`, BR slug `jamesle01`, ESPN id `1966`, Backpicks BPM id `lebron_james`, and `topshot.players.player_id = "0x1d4b4b0d7b8a7c"` are five identifiers for one entity. Picking one of them as the canonical join key would make four of the five lanes write awkward translation columns; picking a synthetic internal id would make all five lanes do it.

Wikidata Q-numbers (e.g. `Q36159` = LeBron James) are the only candidate that already exists upstream of all five sources. The encyclopedia stores every source-system identifier as a column on `nba_qnumber_index` and every domain table FKs to `qid`. Pre-1980 journeymen are the weak spot — Wikidata coverage is thin, and we will hit unresolved entities. The schema handles that via the `nba_reference._etl_unresolved` quarantine queue (to be added in a follow-up migration when the first miss surfaces — three-case rule applies; don't preempt).

## Composition with existing Top Shot tables

The bridge is `nba_top_shot_moments_join`. It is soft-FK on the `topshot.*` side (Postgres cannot enforce cross-schema FKs without sacrificing the independent hydration of the two schemas; ETL validates instead). The encyclopedia-side targets (`nba_games.game_id`, `nba_plays.play_id`, `nba_qnumber_index.qid`) are hard FKs. Read paths:

- *"What play does this Top Shot moment depict?"* — `topshot.moments × nba_top_shot_moments_join × nba_reference.nba_plays`.
- *"Show me every Top Shot moment from games LeBron played in 2023-24"* — `nba_reference.nba_games × nba_reference.nba_plays (filter by LeBron qid) × nba_top_shot_moments_join × topshot.moments`.
- *"What is the encyclopedia narrative for this game?"* — `topshot.plays.date_of_play → nba_games.game_date → nba_narratives WHERE game_id = ANY(linked_game_ids)`.

The two schemas share a Supabase project so these joins are local; they do not share triggers, RLS policies, or ETL plumbing. Each schema's `_etl_cursors`, `_etl_heartbeat`, `etl_runs`, and `set_updated_at()` function are scoped to that schema.

## Materialized-view surface for the Pantheon agent

The agent's query-load is denormalized lookup-by-entity. Five MVs cover the bulk:

1. `mv_player_career_summary` — per `(qid, season_id)`: team_id, games_played, awards array, milestone array. Sub-100ms target.
2. `mv_game_full_context` — per `game_id`: home + away qids, score, attendance, officials, top performers, narrative chunks (linked_game_ids GIN-keyed), associated Top Shot moments. The "I want everything about this game" endpoint.
3. `mv_player_top_shot_moments` — per `qid`: moment count, total Top Shot transaction volume joined to `topshot.transactions`. Cross-schema MV.
4. `mv_franchise_history` — per `franchise_qid`: ordered name/city/era chain joined to championships and finals_mvp_qid.
5. `mv_narrative_for_entity` — per `qid`: top-k narrative chunks where the qid appears in `linked_player_qids`, ranked by source_published_at. The Pantheon agent's lore retrieval endpoint.

These ship in `0004_nba_reference_materialized_views.sql`, mirroring topshot's `0005_topshot_materialized_views.sql` (UNIQUE INDEX on the leading column for CONCURRENT refresh; refresh function added to `nba_reference.refresh_all_materialized_views()`).

## What this schema deliberately does NOT model

- **Pre-1996 play-by-play.** Does not exist in any public dataset (verified across 4 Researcher searches; see `2026-05-16-nba-data-sources-map.md` Hard Gap #1). Any "PBP" claim about a pre-1996 game is a reconstruction, not a record. Reconstructions go in `nba_narratives` with provenance, not in `nba_plays`.
- **Hawk-Eye / Second Spectrum XYZ tracking.** League-gated; cannot license without disclosing intent. Even if we could, the contractual posture would be incompatible with the encyclopedia's internal-use boundary.
- **Sportradar live or historical data.** Contractually scoped to `nbatopshot.com` and `wnba.nbatopshot.com` only (see risks.md). No columns, no ETL path, no exception.
- **Salary / cap data.** Spotrac is the only commercially-clean source and requires custom licensing. Defer until a use-case demands it; the encyclopedia survives without compensation data.
- **Live betting odds.** Closing-line columns on `nba_games` are populated from public historical archives (SportsbookReviewsOnline) only. Live odds redistribution is a separate contract.
- **Image binaries.** Headshots, logos, photos. The schema has no `image_url` or `image_bytes` columns. Imagery lives in the Top Shot side already or is fetched from upstream at read time — never persisted here.

## Cost of this design

This couples encyclopedia and Top Shot in one Supabase project. A migration with bad RLS in `nba_reference` could in principle leak privileged data from `topshot` if the policy mistakenly references the wrong schema. Mitigation lives in risks.md ("Top Shot Supabase blast-radius if migrations run with bad RLS"). The mitigation is a separate `nba_reference_etl` service-role key with GRANT scoped to `nba_reference.*` only — and a pre-merge RLS audit checklist enforced by the migration review process.

## Kill criteria

I revisit this design if any of these triggers fire:

1. A second domain (e.g. a future MLB encyclopedia) needs the same join-spine pattern — at that point extract a shared `entity_graph` schema rather than copy-pasting Q-number tables.
2. The cross-schema join cost on `nba_top_shot_moments_join × topshot.moments × nba_reference.nba_plays` exceeds 200ms p95 — at that point promote the bridge to a materialized join inside `nba_reference`.
3. Sportradar/Genius/Elias scope expands to cover encyclopedia surfaces — at that point fold the licensed data into `nba_reference` with explicit provenance columns and per-row license tags. Until then, hard out.
4. The internal-use boundary is breached (a customer-facing surface is built on top of `nba_reference`) — at that point the entire `nba_narratives` table needs a per-row license audit before exposure.
