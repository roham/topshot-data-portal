# NBA Reference — ETL DAG

Each table below names its lane owner, source(s), cadence, upsert key, transformations, and idempotency notes. Lanes correspond to the staging directories under `/Users/ro/dapper/nba-encyclopedia/lane-*`. The DAG is intentionally additive — every node's idempotency contract is "running it twice with the same input produces the same target state."

## Topology (load order)

The dependency graph is enforced at load time by sequencing lanes:

```
Lane B (Wikidata Q-numbers) ──► nba_qnumber_index (spine)
       │
       ├──► Lane A archives (free) ──► nba_seasons, nba_teams, nba_team_history,
       │                               nba_players, nba_games, nba_plays,
       │                               nba_lineups, nba_awards, nba_draft,
       │                               nba_transactions, nba_transaction_legs,
       │                               nba_injuries, nba_l2m_reports
       │
       ├──► Lane D (Basketball-Reference scrape) ──► fills 1946-1996 gap in
       │                               nba_games / nba_players / nba_awards /
       │                               nba_draft / nba_transactions
       │
       ├──► Lane B (Wikipedia dump + Wikidata notes) ──► nba_narratives
       │                               (license = CC_BY_SA_4.0, ai_training_allowed = true)
       │
       ├──► Lane E (podcasts + books) ──► nba_narratives
       │                               (license = fair_use_internal, ai_training_allowed = false)
       │
       └──► Lane F (Top Shot moment match) ──► nba_top_shot_moments_join
                                       (depends on nba_plays + topshot.moments)
```

Lane B is the bottleneck for fresh entities. Every Lane (A/D/E/F) MUST upsert a row into `nba_qnumber_index` for any entity it encounters that does not already have a row — even when the qid is unknown (use a synthetic `Q0_<bbref_slug>` placeholder constrained by a CHECK relaxation when needed, or block the row and queue an entity-resolution task).

---

## Per-table specs

### `nba_qnumber_index`
- **Owner**: Lane B
- **Sources**: Wikidata SPARQL (`query.wikidata.org/sparql`), filtered to NBA-relevant Q-numbers via `P641 = Q5372 (basketball)` and franchise-membership predicates. Cross-referenced with Lane A's `swar/nba_api` player table for `nba_stats_id`, with Lane D's BR scrape for `bbref_slug`, and with `topshot.players` for `top_shot_player_id`.
- **Frequency**: Weekly full refresh (Wikidata updates) + on-demand inserts when any other lane encounters a new entity.
- **Upsert key**: `qid`
- **Transformations**: P54 (member of sports team) qualifier dates → resolve to (team_id, season_id) ranges. P166 (award) joins to `nba_awards`. P569/P570 → `birth_date`/`death_date` on `nba_players` (which mirrors a subset).
- **Idempotency**: ON CONFLICT (qid) DO UPDATE on every column except `inserted_at`. Partial-column updates are explicit — other lanes only set their own source-system column.

### `nba_seasons`
- **Owner**: Lane A (`swar/nba_api` LeagueInfoCommon endpoints + manual seed for BAA/ABA/WNBA/G-League era boundaries)
- **Frequency**: One-shot seed + annual append for the new season.
- **Upsert key**: `season_id`
- **Transformations**: Compose `season_id` as `<league>_<YYYY-YY>` (e.g. `NBA_2024-25`). Finals winner/loser/MVP populated from Lane A endpoints post-season.
- **Idempotency**: Trivial — small fixed cardinality (~80 rows total NBA + ~30 BAA/ABA + ~30 WNBA + ~25 G-League).

### `nba_teams`, `nba_team_history`
- **Owner**: Lane A + Lane D (BR for historical relocations/renames)
- **Sources**: `swar/nba_api` `teaminfocommon` for active teams; Basketball-Reference franchise pages for full historical chain; Wikidata for `franchise_qid` glue.
- **Frequency**: One-shot historical backfill; weekly refresh of `is_active` flag + renames during off-season.
- **Upsert key**: `team_id` (teams), `(franchise_qid, first_season_year_start)` (history)
- **Transformations**: Persistent `franchise_qid` chain — e.g. Vancouver Grizzlies (1995-2001) and Memphis Grizzlies (2001+) share a franchise_qid, distinct `team_id`s. Each row in `nba_team_history` records the rename/relocation event.
- **Idempotency**: Stable PK; full upsert safe.

### `nba_players`
- **Owner**: Lane A primary (`commonallplayers`, `playerprofilev2`), Lane B enriches biographical fields from Wikidata, Lane D fills pre-1996 retroactives from BR.
- **Frequency**: Daily incremental for active players (last 30 days of activity); weekly for retired; monthly full reconciliation against `nba_qnumber_index`.
- **Upsert key**: `player_id`
- **Transformations**: `qid` is mandatory — players who can't be resolved to a Q-number go to a `nba_reference._etl_unresolved` quarantine table (added in a follow-up migration if/when this surfaces). Height/weight stored in both metric and imperial; only one is authoritative per source.
- **Idempotency**: Source-system fields are independently upserted; full-row replacement is safe but expensive — prefer column-level partial upsert.

### `nba_games`
- **Owner**: Lane A primary (`leaguegamefinder`, `boxscoresummaryv2`); Lane D backfills 1946-1996 from BR.
- **Frequency**: One-shot full historical backfill from `shufinskiy/nba_data` archives (1996+) and BR scrape (1946-1996); daily incremental for current season; monthly reconciliation.
- **Upsert key**: `game_id`
- **Transformations**: Officials list joined via Wikidata Q-numbers — only post-2000s have complete official tracking. Betting lines from `SportsbookReviewsOnline` archive (free, historical) or The Odds API (subscription, when active).
- **Idempotency**: Stable PK. Re-scraping a game updates score/attendance/officials cleanly.

### `nba_plays`
- **Owner**: Lane A (`shufinskiy/nba_data` for 1996-2024 archives; `swar/nba_api` `playbyplayv2` for current season).
- **Frequency**: One-shot historical backfill (1996-present); daily incremental for current season.
- **Upsert key**: `play_id` (synthesized as `<game_id>_<event_num>`), enforced UNIQUE on `(game_id, event_num)`.
- **Transformations**: Player references resolved to qid via `nba_qnumber_index` join on `nba_stats_id`. Shot coordinates stored in NBA stats native units (origin at hoop). `dblackrun/pbpstats` is run downstream to fix event-ordering bugs before insertion.
- **Idempotency**: Re-running a game's PBP produces an identical row set; ON CONFLICT (game_id, event_num) DO UPDATE on action/description/score fields.
- **NEVER include**: pre-1996 PBP. It does not exist. Any source claiming it (e.g., reconstruction efforts) goes in `nba_narratives` instead with provenance, not `nba_plays`.

### `nba_lineups`
- **Owner**: Lane A (`dblackrun/pbpstats` library output)
- **Frequency**: Same as `nba_plays` (depends on it) — backfill + daily incremental.
- **Upsert key**: `lineup_id` (synthesized as `<game_id>_<period>_<stint_start_event_num>_<team_id>`)
- **Transformations**: pbpstats reconstructs the 5-on-the-floor state by walking substitution events. We do NOT trust raw NBA stats lineup data prior to running through pbpstats.
- **Idempotency**: Stable; full upsert safe.

### `nba_awards`
- **Owner**: Lane B (Wikidata P166) + Lane A (`commonteamyears`, `playerawards`); Lane D for older All-Star nods.
- **Frequency**: One-shot historical backfill; annual append at season end.
- **Upsert key**: `award_id` = `<award_type>_<season_id>_<recipient_qid>`
- **Transformations**: Vote shares come only from Lane A endpoints (1980+); pre-1980 awards have `vote_share = NULL`.
- **Idempotency**: Stable PK; full upsert safe.

### `nba_draft`
- **Owner**: Lane A (`draftcombinestats`, `drafthistory`); Lane D for 1947-1989 backfill from BR.
- **Frequency**: One-shot historical + annual append at draft night.
- **Upsert key**: `draft_pick_id` = `<draft_year>_R<round>_P<pick_in_round>`
- **Transformations**: `drafting_team_id` is the team-in-era (e.g. Seattle SuperSonics for 2007 #2 Durant); `drafting_franchise_qid` is the persistent franchise (now OKC Thunder).
- **Idempotency**: Stable; full upsert safe.

### `nba_transactions`, `nba_transaction_legs`
- **Owner**: Lane D (`rsforbes/pro_sports_transactions` scraper via Unflare).
- **Frequency**: One-shot historical backfill (1976-present); daily incremental scrape of last 7 days.
- **Upsert key**: `transaction_id` = `<transaction_date>_<sha1(description)[:12]>`
- **Transformations**: Multi-team trades expand into one `nba_transactions` row (the headline) plus N `nba_transaction_legs` rows (one per asset/direction).
- **Idempotency**: Hash of description is stable across re-scrapes; legs are full-deleted-and-replaced for the parent on any change.

### `nba_injuries`
- **Owner**: Lane A (`mxufc29/nbainjuries` PDF parser).
- **Frequency**: Multi-daily — NBA publishes injury reports at 1 PM ET, 5:30 PM ET, 6:30 PM ET local game-day. ETL polls every 30 min during 12:00-23:59 ET, ingesting only new `report_published_at` timestamps.
- **Upsert key**: `injury_report_id` = `<report_published_at_unix>_<player_qid>`
- **Transformations**: PDF → parsed row stream → status normalized to the CHECK enum.
- **Idempotency**: Hash of (timestamp, player) is stable; same-PDF re-runs produce zero deltas.

### `nba_l2m_reports`
- **Owner**: Lane A (`atlhawksfanatic/L2M`).
- **Frequency**: Daily during season — NBA publishes L2M reports 24-48hrs after games.
- **Upsert key**: `l2m_call_id` = `<game_id>_<period>_<clock_seconds_remaining>_<sha1(comment)[:8]>`
- **Transformations**: Pre-Feb 2019 PDFs parsed; post-Feb 2019 JSON consumed directly.
- **Idempotency**: Hash component prevents collisions when the NBA edits a comment in a subsequent publish.

### `nba_narratives`
- **Owner**: Lane B (Wikipedia + Wikidata text) and Lane E (podcasts + books)
- **Sources**:
  - Wikipedia full XML dump (`dumps.wikimedia.org/enwiki/`) → NBA-tagged subset extracted via category traversal → chunked at ~512 tokens
  - Wikidata article-summary properties → short notes
  - yt-dlp + Whisper large-v3 on top-10 NBA podcasts → chunked at ~512 tokens
  - Internet Archive book excerpts (Simmons, FreeDarko, Total Basketball) — only for borrowable digitizations, internal-only use
- **Frequency**: Wikipedia weekly refresh; podcasts batched as new episodes drop; books one-shot.
- **Upsert key**: `narrative_id` = `<source_type>_<sha1(source_url || chunk_idx)[:16]>`
- **Transformations**: Entity linkage runs an NER + qid-resolver pass after chunking. Linked entities populate the `linked_*_qids` arrays.
- **License posture**: every row tagged with `license` AND `ai_training_allowed`. Wikipedia = `CC_BY_SA_4.0` + true. Podcast transcripts = `fair_use_internal` + false. Book excerpts = `licensed` (if directly licensed) or `fair_use_internal` (if IA-borrowed) + false.
- **Idempotency**: Hash of (url, chunk_idx) is stable; re-running a Wikipedia dump produces zero deltas unless the page changed.
- **Hard rule**: NEVER ingest Basketball-Reference content here. BR ToS explicitly prohibits AI training. Lane D scrapes BR ONLY for structured stats (games, draft, transactions); the prose body of a BR page does not enter `nba_narratives`.

### `nba_top_shot_moments_join`
- **Owner**: Lane F
- **Sources**: `topshot.moments` × `topshot.plays` × `nba_reference.nba_games` × `nba_reference.nba_plays`
- **Frequency**: One-shot match pass per Top Shot mint batch; daily incremental for any newly-minted moments.
- **Upsert key**: `top_shot_moment_id`
- **Transformations**:
  1. Pull `topshot.plays` description + date_of_play + player_id + home/away teams.
  2. Resolve `topshot.plays.player_id` → qid via `nba_qnumber_index.top_shot_player_id`.
  3. Find the corresponding `nba_games.game_id` by (date, teams).
  4. Find the specific `nba_plays.play_id` by (game_id, primary_player_qid, action ≈ topshot.plays.play_type, descriptions overlap).
  5. Emit `match_confidence` in [0,1] and a `match_method` of `exact_video` / `description_nlp` / `play_metadata` / `manual` / `unmatched`.
- **Idempotency**: Re-running with the same inputs produces identical match outputs. Manual matches override automatic; `matched_at` is bumped on every reconciliation.
- **Cross-schema**: This is the ONLY place the encyclopedia references `topshot.*`. Reads use the shared Supabase project; writes here do not touch `topshot.*`.

---

## ETL operational rules

- **Cursor table**: `nba_reference._etl_cursors` — mirrors `topshot._etl_cursors`. One row per source table; `last_cursor_at` is the high-watermark for incremental runs.
- **Heartbeat**: `nba_reference._etl_heartbeat` — single-row table; stale = pipeline dead.
- **Audit**: `nba_reference.etl_runs` — one row per (run, lane, table). `lane` column tags A/B/D/E/F/manual.
- **Advisory lock**: ETL acquires `pg_try_advisory_lock(8888001)` before any nba_reference write run. Prevents two cron pulls from racing. Lock key 8888001 is reserved for nba_reference (topshot uses a different key — confirm with topshot ETL before launching).
- **Backfill discipline**: Historical backfills run in date-chunked batches (default 30-day chunks for plays, 90-day chunks for games, 365-day for players). Chunk size lives in lane config, not in code.
- **Rate limits**:
  - `swar/nba_api` (stats.nba.com): 20 req/min absolute ceiling; cluster ETL workers behind a single rate limiter.
  - Basketball-Reference: 20 req/min absolute ceiling (Sports Reference bot policy explicit).
  - Wikidata SPARQL: 60 sec query timeout; chunk via federated joins.
  - cdn.nba.com static JSON: no published cap; throttle to 5 req/sec defensively.
- **Failure handling**: On retryable error (5xx, network), `etl_runs.status = 'partial'` and `last_error` is set; next run resumes from `_etl_cursors.last_cursor_at` minus 5-min overlap window (same pattern as topshot).
- **MV refresh**: `nba_reference.refresh_all_materialized_views()` SECURITY DEFINER function (defined in a follow-up migration when MVs are added). Run after every successful ETL tick.

## What is NOT in this DAG

- No Sportradar ingestion path. The schema has no Sportradar columns; if Lane operators encounter Sportradar-sourced data through any mechanism, it goes nowhere.
- No Second Spectrum / Hawk-Eye XYZ ingestion. Same reason.
- No Genius Sports / Elias ingestion. Those are NFL ALL DAY contracts; out of scope.
- No Getty / AP / Reuters imagery. The schema does not store image binaries; image_url columns intentionally absent.
- No live odds redistribution. `closing_*` columns on `nba_games` are populated from public historical archives only; if commercial live odds become required, that's a separate contract decision, not an ETL extension.
