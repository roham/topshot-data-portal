# Supabase Schema Ground Truth — `topshot.*`

**Generated:** 2026-05-18T01:58:36.097Z
**Supabase project:** `wewmolsrxrpajrzjqvim`
**Schema:** `topshot`
**Probe source:** PostgREST OpenAPI introspection + REST sample queries

**Why this exists:** to give every Loop A agent a current ground-truth view of what's in our DB,
so portal queries that reference nonexistent columns fail fast at audit time.

---

## Table inventory (50 tables)

- `topshot._etl_cursors`
- `topshot._etl_heartbeat`
- `topshot._validation_runs`
- `topshot.drops`
- `topshot.editions`
- `topshot.etl_runs`
- `topshot.market_caps`
- `topshot.moments`
- `topshot.mv_edition_1y_activity`
- `topshot.mv_edition_24h_activity`
- `topshot.mv_edition_30d_activity`
- `topshot.mv_edition_7d_activity`
- `topshot.mv_edition_all_time_activity`
- `topshot.mv_largest_sales_1y`
- `topshot.mv_largest_sales_24h`
- `topshot.mv_largest_sales_30d`
- `topshot.mv_largest_sales_7d`
- `topshot.mv_largest_sales_all_time`
- `topshot.mv_market_summary_1y`
- `topshot.mv_market_summary_24h`
- `topshot.mv_market_summary_30d`
- `topshot.mv_market_summary_7d`
- `topshot.mv_market_summary_90d`
- `topshot.mv_market_summary_all_time`
- `topshot.mv_player_1y_volume`
- `topshot.mv_player_24h_volume`
- `topshot.mv_player_30d_volume`
- `topshot.mv_player_7d_volume`
- `topshot.mv_player_90d_volume`
- `topshot.mv_player_all_time_volume`
- `topshot.mv_player_market_cap`
- `topshot.mv_player_movers_15d`
- `topshot.mv_player_movers_30d`
- `topshot.mv_set_24h_activity`
- `topshot.mv_set_completion_distribution`
- `topshot.packs`
- `topshot.parallel_types`
- `topshot.play_categories`
- `topshot.play_statuses`
- `topshot.play_types`
- `topshot.players`
- `topshot.plays`
- `topshot.positions`
- `topshot.seasons`
- `topshot.series`
- `topshot.sets`
- `topshot.team_history`
- `topshot.teams`
- `topshot.transactions`
- `topshot.v_validation_latest`

---

## `topshot._etl_cursors`

**Description:** High-watermark cursor per source table for BQ→Supabase incremental sync.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `table_name` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `last_cursor_at` | string | timestamp with time zone | yes | MAX(row_updated_at) of the last successful sync; next run picks up here minus overlap window. |
| `last_row_count` | integer | bigint | yes |  |
| `last_run_at` | string | timestamp with time zone | yes |  |
| `last_error` | string | text | yes | Last error message if the most recent run failed; cleared on success. |
| `created_at` | string | timestamp with time zone | yes |  |

### Row count

```
10
```

### Sample (5 rows)

```json
[
  {
    "table_name": "sets",
    "last_cursor_at": "2026-05-16T13:03:18.4+00:00",
    "last_row_count": 268,
    "last_run_at": "2026-05-16T13:57:22.755+00:00",
    "last_error": null,
    "created_at": "2026-05-16T00:38:44.275374+00:00"
  },
  {
    "table_name": "plays",
    "last_cursor_at": "2026-05-16T13:04:13.332+00:00",
    "last_row_count": 9556,
    "last_run_at": "2026-05-16T13:57:40.516+00:00",
    "last_error": null,
    "created_at": "2026-05-16T00:40:33.530902+00:00"
  },
  {
    "table_name": "editions",
    "last_cursor_at": "2026-05-16T13:04:19.065+00:00",
    "last_row_count": 11904,
    "last_run_at": "2026-05-16T13:57:59.648+00:00",
    "last_error": null,
    "created_at": "2026-05-16T00:41:40.260946+00:00"
  },
  {
    "table_name": "moments",
    "last_cursor_at": "2026-05-16T13:12:04.956+00:00",
    "last_row_count": 278754,
    "last_run_at": "2026-05-16T14:03:12.564+00:00",
    "last_error": null,
    "created_at": "2026-05-16T00:43:02.792084+00:00"
  },
  {
    "table_name": "transactions",
    "last_cursor_at": "2026-05-16T12:59:56.211+00:00",
    "last_row_count": 2231856,
    "last_run_at": "2026-05-16T14:29:17.472+00:00",
    "last_error": null,
    "created_at": "2026-05-16T00:44:05.574703+00:00"
  }
]
```

---

## `topshot._etl_heartbeat`

**Description:** Single-row heartbeat. Stale row = ETL pipeline is dead. Monitor last_success_at.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `id` | integer | smallint | NO | Note: This is a Primary Key.<pk/> |
| `last_success_at` | string | timestamp with time zone | yes |  |
| `last_run_duration_ms` | integer | bigint | yes |  |
| `tables_synced_count` | integer | integer | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "id": 1,
    "last_success_at": "2026-05-17T23:05:40.795+00:00",
    "last_run_duration_ms": 0,
    "tables_synced_count": 1
  }
]
```

---

## `topshot._validation_runs`

**Description:** One row per (check_name, ran_at). Compares Supabase MV output to BQ ground truth. Powers /admin/data-quality.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `id` | string | uuid | NO | Note: This is a Primary Key.<pk/> |
| `check_name` | string | text | NO |  |
| `ran_at` | string | timestamp with time zone | NO |  |
| `bq_value` | ? | jsonb | yes |  |
| `sb_value` | ? | jsonb | yes |  |
| `metric` | string | text | NO | Comparison metric kind: spearman (rank correlation), pct_delta (\|sb-bq\|/bq), abs_delta (\|sb-bq\|), ratio (sb/bq). |
| `metric_value` | number | numeric | yes | Computed metric. Comparison to threshold depends on metric kind — caller embeds the right comparator (>= for spearman/ratio; <= for deltas). |
| `threshold` | number | numeric | yes |  |
| `passed` | boolean | boolean | NO |  |
| `notes` | string | text | yes |  |

### Row count

```
104
```

### Sample (5 rows)

```json
[
  {
    "id": "a4c36878-369b-488f-84be-3863a052c1a9",
    "check_name": "top_players_24h_spearman",
    "ran_at": "2026-05-16T03:32:36.037208+00:00",
    "bq_value": null,
    "sb_value": null,
    "metric": "spearman",
    "metric_value": null,
    "threshold": 0.7,
    "passed": false,
    "notes": "error: Supabase exec_sql returned non-array: {\"ok\":true,\"rows_affected\":\"3\"}"
  },
  {
    "id": "61c69244-528a-45ab-aafe-2fcc12acee7e",
    "check_name": "top_players_7d_spearman",
    "ran_at": "2026-05-16T03:32:37.610736+00:00",
    "bq_value": null,
    "sb_value": null,
    "metric": "spearman",
    "metric_value": null,
    "threshold": 0.7,
    "passed": false,
    "notes": "error: Supabase exec_sql returned non-array: {\"ok\":true,\"rows_affected\":\"3\"}"
  },
  {
    "id": "b0a99158-b94a-4d3a-82e5-5cb3ab3611c8",
    "check_name": "total_volume_24h_pct_delta",
    "ran_at": "2026-05-16T03:32:38.247385+00:00",
    "bq_value": null,
    "sb_value": null,
    "metric": "pct_delta",
    "metric_value": null,
    "threshold": 0.05,
    "passed": false,
    "notes": "error: Supabase exec_sql returned non-array: {\"ok\":true,\"rows_affected\":\"1\"}"
  },
  {
    "id": "2c1eae88-adcc-4c00-bc32-6c62dbb4423b",
    "check_name": "total_tx_count_24h_pct_delta",
    "ran_at": "2026-05-16T03:32:38.888312+00:00",
    "bq_value": null,
    "sb_value": null,
    "metric": "pct_delta",
    "metric_value": null,
    "threshold": 0.02,
    "passed": false,
    "notes": "error: Supabase exec_sql returned non-array: {\"ok\":true,\"rows_affected\":\"1\"}"
  },
  {
    "id": "635590c9-9b27-4789-b69a-d9dfe373f63d",
    "check_name": "distinct_moments_traded_24h_pct_delta",
    "ran_at": "2026-05-16T03:32:39.82994+00:00",
    "bq_value": null,
    "sb_value": null,
    "metric": "pct_delta",
    "metric_value": null,
    "threshold": 0.1,
    "passed": false,
    "notes": "error: Supabase exec_sql returned non-array: {\"ok\":true,\"rows_affected\":\"1\"}"
  }
]
```

---

## `topshot.drops`

**Description:** Drop events (the marketing window during which packs are sold). Source: asset_nba_drop.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `drop_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `started_at` | string | timestamp with time zone | yes |  |
| `expired_at` | string | timestamp with time zone | yes |  |
| `drop_duration_type` | string | text | yes |  |
| `is_active` | boolean | boolean | yes |  |
| `has_preorders` | boolean | boolean | yes |  |
| `total_pack_listings` | integer | integer | yes |  |
| `total_packs` | integer | integer | yes |  |
| `total_moments` | integer | integer | yes |  |
| `percent_reserved_packs` | number | numeric | yes |  |
| `is_queued` | boolean | boolean | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
1007
```

### Sample (5 rows)

```json
[
  {
    "drop_id": "4761022347623785006",
    "started_at": "2025-08-15T22:00:00+00:00",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 500,
    "total_moments": 1000,
    "percent_reserved_packs": 0.292,
    "is_queued": false,
    "inserted_at": "2026-05-16T01:21:05.943853+00:00",
    "updated_at": "2026-05-16T14:29:38.813131+00:00"
  },
  {
    "drop_id": "6497977480935409926",
    "started_at": "2025-03-11T04:00:00+00:00",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 7867,
    "total_moments": 7867,
    "percent_reserved_packs": 0.000127113,
    "is_queued": false,
    "inserted_at": "2026-05-16T01:21:05.943853+00:00",
    "updated_at": "2026-05-16T14:29:38.813131+00:00"
  },
  {
    "drop_id": "-8666412033479619584",
    "started_at": "2025-07-23T22:00:00+00:00",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 2264,
    "total_moments": 4379,
    "percent_reserved_packs": 0.58745583,
    "is_queued": false,
    "inserted_at": "2026-05-16T01:21:05.943853+00:00",
    "updated_at": "2026-05-16T14:29:38.813131+00:00"
  },
  {
    "drop_id": "544535152443950167",
    "started_at": "2025-03-10T13:00:00+00:00",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 13801,
    "total_moments": 13801,
    "percent_reserved_packs": 1,
    "is_queued": false,
    "inserted_at": "2026-05-16T01:21:05.943853+00:00",
    "updated_at": "2026-05-16T14:29:38.813131+00:00"
  },
  {
    "drop_id": "-3959311325406592403",
    "started_at": "2023-09-30T08:00:00+00:00",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 3,
    "total_moments": 12,
    "percent_reserved_packs": 1,
    "is_queued": false,
    "inserted_at": "2026-05-16T01:21:05.943853+00:00",
    "updated_at": "2026-05-16T14:29:38.813131+00:00"
  }
]
```

---

## `topshot.editions`

**Description:** Edition = (set, play) pair. The minted-card SKU. Each edition has 1..N moments (individual serials). Source: asset_nba_edition.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `edition_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `edition_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `series_name` | string | text | yes |  |
| `description` | string | text | yes |  |
| `short_description` | string | text | yes |  |
| `mint_count` | integer | integer | yes | Circulation count (max serial number). Source field is mint_count. |
| `play_focus` | string | text | yes |  |
| `league` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `team_at_moment_team_id` | string | text | yes |  |
| `team_at_moment_historical_name` | string | text | yes |  |
| `team_at_moment_current_name` | string | text | yes |  |
| `tier_id` | string | text | yes |  |
| `tier_name` | string | text | yes | Edition tier. CHECK constraint mirrors live BQ distinct values as of 2026-05-15. |
| `rarity` | integer | integer | yes |  |
| `image_urls` | array | text[] | yes |  |
| `video_urls` | ? | jsonb | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |
| `parallel_id` | integer | integer | yes | Edition's parallel variant. NULL = not yet backfilled. 0 = Base parallel (no visual parallel applied). 1..N = named parallel from topshot.parallel_types. Sourced from Top Shot GraphQL Edition.parallelID via scripts/etl/bq-backfill-parallels.mjs.  Note: This is a Foreign Key to `parallel_types.parallel_id`.<fk table='parallel_types' column='parallel_id'/> |

### Row count

```
11904
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "226e2269-f123-4034-842f-ccba9b7a1593+7d8e54fe-03ed-4783-9cbb-d7c6c9acd67e",
    "edition_name": "Adam Morrison - Charlotte Hornets - MIDRANGE - 2006-12-30 - The Tour - Series 4",
    "set_id": "226e2269-f123-4034-842f-ccba9b7a1593",
    "play_id": "7d8e54fe-03ed-4783-9cbb-d7c6c9acd67e",
    "series_name": "Series 4",
    "description": "Playing a fourth game in five days didn’t deter Adam Morrison from having the best performance of his career. The third overall selection in the 2006 NBA Draft went to work in the post against future Indiana Pacers All-Star Danny Granger, using a combination of strength and smooth footwork to gain an advantage on the low block. Following a few lateral dribbles against the capable defender, Morrison made his move and swished a difficult turnaround jumper with his right hand while drawing the foul. The Pacers had no answers for the 2006-07 All-Rookie Second Team forward, who lit them up for a career-high 30 points — 9 of 17 from the field and 10 of 11 at the stripe — along with six rebounds and two assists in a 113-102 Charlotte Bobcats victory on December 30, 2006.",
    "short_description": null,
    "mint_count": 804,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "200747",
    "player_name": "Adam Morrison",
    "team_at_moment_team_id": "1610612766",
    "team_at_moment_historical_name": "Charlotte Bobcats",
    "team_at_moment_current_name": "Charlotte Hornets",
    "tier_id": "NBA_FANDOM",
    "tier_name": "Fandom",
    "rarity": null,
    "image_urls": [
      "https://storage.googleapis.com/content-pipeline-cropped-images-prod/GettyImages-73026671.jpg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/nba-ftp-prod/nba/videos/morrison_a_hook_chavind_verdap_dec_20_2006_vertical_9x16.mp4",
        "video_length_miliseconds": 23445
      },
      {
        "url": "https://storage.googleapis.com/nba-ftp-prod/nba/videos/morrison_a_hook_chavind_sqdap_dec_20_2006_square.mp4",
        "video_length_miliseconds": 17920
      }
    ],
    "inserted_at": "2026-05-16T00:48:58.22464+00:00",
    "updated_at": "2026-05-17T17:09:41.861311+00:00",
    "parallel_id": 0
  },
  {
    "edition_id": "9e89b552-0236-4ffc-ab6b-8cf7c27d46b4+44e3fbea-f0af-4a83-984f-0caba958dff5",
    "edition_name": "Al Harrington - Atlanta Hawks - ASSIST - 2006-01-21 - Archive Set - Summer 2021",
    "set_id": "9e89b552-0236-4ffc-ab6b-8cf7c27d46b4",
    "play_id": "44e3fbea-f0af-4a83-984f-0caba958dff5",
    "series_name": "Summer 2021",
    "description": "Creative playmakers are highlight reel catalysts. After tracking down an outlet pass with a defender in check on January 20, 2006, Atlanta Hawks forward Al Harrington reaches out in front of himself and lobs a two-handed alley-oop pass back to a trailing Josh Smith.",
    "short_description": "Al Harrington tosses underhanded lob pass for reverse alley-oop",
    "mint_count": 20000,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "1733",
    "player_name": "Al Harrington",
    "team_at_moment_team_id": "1610612737",
    "team_at_moment_historical_name": "Atlanta Hawks",
    "team_at_moment_current_name": "Atlanta Hawks",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common",
    "rarity": 1,
    "image_urls": [
      "https://assets.nbatopshot.com/players/temp/gettyimages-56705229-594x594.jpg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/harrington_a_asst_milvatl_verdap_jan_20_2006_vertical_9x16.mp4",
        "video_length_miliseconds": 15360
      },
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/harrington_a_asst_milvatl_verdap_jan_20_2006_square_9x16.mp4",
        "video_length_miliseconds": 7808
      }
    ],
    "inserted_at": "2026-05-16T00:48:58.22464+00:00",
    "updated_at": "2026-05-17T17:09:45.06394+00:00",
    "parallel_id": 0
  },
  {
    "edition_id": "7b74be80-e2c9-4044-91b5-bbfd74f1dc5e+311b4d2e-c58e-420c-9dd7-ca4abaf06f00",
    "edition_name": "Andre Miller - Denver Nuggets - 3_POINTER - 2006-04-02 - Run It Back 2005-06 - Summer 2021",
    "set_id": "7b74be80-e2c9-4044-91b5-bbfd74f1dc5e",
    "play_id": "311b4d2e-c58e-420c-9dd7-ca4abaf06f00",
    "series_name": "Summer 2021",
    "description": "Count on a battle-tested floor general to make the most of any situation. With two seconds on the clock and 94-feet left to advance, Denver Nuggets guard Andre Miller calls for an inbound pass under his own net then leaps into a 75-foot heave that soars straight through the hoop against the Dallas Mavericks on April 2, 2006.",
    "short_description": "Andre Miller catches inbound, nails fullcourt heave at the end of a quarter",
    "mint_count": 990,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "1889",
    "player_name": "Andre Miller",
    "team_at_moment_team_id": "1610612743",
    "team_at_moment_historical_name": "Denver Nuggets",
    "team_at_moment_current_name": "Denver Nuggets",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare",
    "rarity": 2,
    "image_urls": [
      "https://assets.nbatopshot.com/players/temp/gettyimages-57397318-594x594.jpg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/miller_a_3_denvdal_verdap_apr_2_2006_vertical_9x16.mp4",
        "video_length_miliseconds": 18219
      },
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/miller_a_3_denvdal_verdap_apr_2_2006_square_9x16.mp4",
        "video_length_miliseconds": 8576
      }
    ],
    "inserted_at": "2026-05-16T00:48:58.22464+00:00",
    "updated_at": "2026-05-17T17:09:44.670116+00:00",
    "parallel_id": 0
  },
  {
    "edition_id": "7b74be80-e2c9-4044-91b5-bbfd74f1dc5e+3f8418fb-cc3f-4167-9872-b0051b81753d",
    "edition_name": "Andrei Kirilenko - Utah Jazz - ASSIST - 2006-03-19 - Run It Back 2005-06 - Summer 2021",
    "set_id": "7b74be80-e2c9-4044-91b5-bbfd74f1dc5e",
    "play_id": "3f8418fb-cc3f-4167-9872-b0051b81753d",
    "series_name": "Summer 2021",
    "description": "Among the most versatile forwards of his generation, there isn’t much that Andrei Kirilenko isn’t capable of. After cutting into the paint and calling for an entry pass from one teammate, Kirilenko seamlessly bounces the ball through his legs, back to a wide-open Carlos Boozer for a bucket. The do-it-all Utah Jazz star finished the March 19, 2006 contest against the Memphis Grizzlies with 16 points, six boards, four assists, four blocks and three steals.",
    "short_description": "Andre Kirilenko relays bounce pass dime through legs for easy dunk",
    "mint_count": 990,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "1905",
    "player_name": "Andrei Kirilenko",
    "team_at_moment_team_id": "1610612762",
    "team_at_moment_historical_name": "Utah Jazz",
    "team_at_moment_current_name": "Utah Jazz",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare",
    "rarity": 2,
    "image_urls": [
      "https://assets.nbatopshot.com/players/temp/gettyimages-71299741-594x594.jpg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/kirilenko_a_assist_verdap_utavmem_mar_19_2006_vertical_9x16.mp4",
        "video_length_miliseconds": 15381
      },
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/kirilenko_a_assist_verdap_utavmem_mar_19_2006_square_9x16.mp4",
        "video_length_miliseconds": 5312
      }
    ],
    "inserted_at": "2026-05-16T00:48:58.22464+00:00",
    "updated_at": "2026-05-17T17:09:44.759452+00:00",
    "parallel_id": 0
  },
  {
    "edition_id": "827f9328-03aa-4cb5-97cd-7b5f2c2386fd+878aa6c2-2a72-4037-a65f-056fc9ad2d7a",
    "edition_name": "Anderson Varejão - Cleveland Cavaliers - RIM - 2014-01-23 - Run It Back - Series 1",
    "set_id": "827f9328-03aa-4cb5-97cd-7b5f2c2386fd",
    "play_id": "878aa6c2-2a72-4037-a65f-056fc9ad2d7a",
    "series_name": "Series 1",
    "description": "Pulling out the whole bag of tricks! Center Anderson Varejão of the Cleveland Cavaliers flexes his point guard skills with a quick steal, a beautiful fake pass, and a big-time dunk against the Chicago Bulls on January 22, 2014.",
    "short_description": "Anderson Varejão runs the floor, fakes behind-back pass and slams",
    "mint_count": 275,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "2760",
    "player_name": "Anderson Varejão",
    "team_at_moment_team_id": "1610612739",
    "team_at_moment_historical_name": "Cleveland Cavaliers",
    "team_at_moment_current_name": "Cleveland Cavaliers",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare",
    "rarity": 2,
    "image_urls": [
      "https://assets.nbatopshot.com/players/No sourced image"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/varejao_a_dunk_chivcle_verdap_jan_22_2014_vertical_9x16.mp4",
        "video_length_miliseconds": 17024
      },
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/varejao_a_dunk_chivcle_verdap_jan_22_2014_square_9x16.mp4",
        "video_length_miliseconds": 7061
      }
    ],
    "inserted_at": "2026-05-16T00:48:58.22464+00:00",
    "updated_at": "2026-05-17T17:09:44.857465+00:00",
    "parallel_id": 0
  }
]
```

---

## `topshot.etl_runs`

**Description:** Audit log per ETL cron invocation. One row per (run, target_table). high_watermark stores the row_updated_at value processed up to, used as the next run cursor.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `id` | string | uuid | NO | Note: This is a Primary Key.<pk/> |
| `started_at` | string | timestamp with time zone | NO |  |
| `finished_at` | string | timestamp with time zone | yes |  |
| `status` | string | text | NO |  |
| `table_name` | string | text | yes |  |
| `rows_upserted` | integer | bigint | yes |  |
| `rows_failed` | integer | bigint | yes |  |
| `high_watermark` | string | timestamp with time zone | yes |  |
| `error_message` | string | text | yes |  |
| `notes` | string | text | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.market_caps`

**Description:** Daily per-edition market-cap snapshot. Source: asset_nba_market_caps. PK (date, edition_id).

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `date` | string | date | NO | Note: This is a Primary Key.<pk/> |
| `edition_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `num_moments_in_circulation` | integer | integer | yes |  |
| `lowest_ask_price` | number | numeric | yes |  |
| `highest_offer_price` | number | numeric | yes |  |
| `market_cap` | number | numeric | yes | Aggregate market cap for this edition on this date (typically circulation * lowest_ask). |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
6102039
```

### Sample (5 rows)

```json
[
  {
    "date": "2024-01-01",
    "edition_id": "6783b9d8-44c5-49c7-87e0-be217af963e9+da96e15f-3579-4d3e-946c-68d47e84ef65",
    "num_moments_in_circulation": 8075,
    "lowest_ask_price": 1,
    "highest_offer_price": null,
    "market_cap": 8075,
    "inserted_at": "2026-05-17T22:37:55.253817+00:00",
    "updated_at": "2026-05-17T22:37:55.253817+00:00"
  },
  {
    "date": "2024-01-01",
    "edition_id": "d391ef98-bc93-4c3f-8aed-743bdddbc74b+ac37831b-fa05-4620-a636-a0facb211906",
    "num_moments_in_circulation": 3083,
    "lowest_ask_price": 1,
    "highest_offer_price": null,
    "market_cap": 3083,
    "inserted_at": "2026-05-17T22:37:55.253817+00:00",
    "updated_at": "2026-05-17T22:37:55.253817+00:00"
  },
  {
    "date": "2024-01-01",
    "edition_id": "208ae30a-a4fe-42d4-9e51-e6fd1ad2a7a9+52c85237-7c43-42b0-98f3-3533d4d3a4ab",
    "num_moments_in_circulation": 26674,
    "lowest_ask_price": 1,
    "highest_offer_price": null,
    "market_cap": 26674,
    "inserted_at": "2026-05-17T22:37:55.253817+00:00",
    "updated_at": "2026-05-17T22:37:55.253817+00:00"
  },
  {
    "date": "2024-01-01",
    "edition_id": "e7b9646c-9997-46c8-909f-2a2b67389023+60139631-0ef1-48bd-8998-4b0b0ea729d0",
    "num_moments_in_circulation": 9094,
    "lowest_ask_price": 1,
    "highest_offer_price": null,
    "market_cap": 9094,
    "inserted_at": "2026-05-17T22:37:55.253817+00:00",
    "updated_at": "2026-05-17T22:37:55.253817+00:00"
  },
  {
    "date": "2024-01-01",
    "edition_id": "08f6dd13-c2d9-4a74-85c9-3667e37a5749+11911c69-2f46-4f97-8619-d8ec39be62fe",
    "num_moments_in_circulation": 10615,
    "lowest_ask_price": 1,
    "highest_offer_price": null,
    "market_cap": 10615,
    "inserted_at": "2026-05-17T22:37:55.253817+00:00",
    "updated_at": "2026-05-17T22:37:55.253817+00:00"
  }
]
```

---

## `topshot.moments`

**Description:** Individual NFT moments. moment_id is the Dapper-internal id; moment_flow_id is the on-chain id. owner_flow_address is the public Flow chain owner — explicitly the public on-chain identifier (renamed from BQ owner_user_id for clarity).

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `moment_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `moment_name` | string | text | yes |  |
| `moment_flow_id` | string | text | yes |  |
| `edition_id` | string | text | yes |  |
| `subedition_id` | string | text | yes |  |
| `edition_name` | string | text | yes |  |
| `serial_number` | integer | integer | yes |  |
| `owner_flow_address` | string | text | yes | Public Flow blockchain owner address. Same as BQ owner_user_id but renamed for explicitness — this value is observable on-chain. |
| `top_shot_score` | number | numeric | yes | TS Score — Dapper-published serial-quality score (lower serial / matching jersey number / first-mint bonus). |
| `moment_status` | string | text | yes | Lifecycle status. Live BQ distinct values (2026-05-15): MINTED, LOCKED, BURNED. LISTED/IN_PACK/LOCKER_ROOM/UNLOCKED reserved for derived states the ETL may compute. |
| `released_at` | string | timestamp with time zone | yes |  |
| `locked_at` | string | timestamp with time zone | yes |  |
| `lock_expires_at` | string | timestamp with time zone | yes |  |
| `unlocked_at` | string | timestamp with time zone | yes |  |
| `burned_at` | string | timestamp with time zone | yes |  |
| `listed_at` | string | timestamp with time zone | yes |  |
| `listing_price_usd` | number | numeric | yes | Active listing price in USD. NULL = not currently listed. |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `play_name` | string | text | yes |  |
| `pack_id` | string | text | yes |  |
| `pack_name` | string | text | yes |  |
| `pack_listing_id` | string | text | yes |  |
| `description` | string | text | yes |  |
| `short_description` | string | text | yes |  |
| `series_name` | string | text | yes |  |
| `league` | string | text | yes |  |
| `last_updated_at` | string | timestamp with time zone | yes | Source-system last update (BQ updated_at). Distinct from `updated_at`, which tracks Supabase row mutation. |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
3494001
```

### Sample (5 rows)

```json
[
  {
    "moment_id": "3b66e309-f8ed-4918-b1da-18ea205574fd",
    "moment_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1 - serial# 632",
    "moment_flow_id": "134149",
    "edition_id": "7b797690-5b53-45a7-b972-bd2d5152654a+be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "subedition_id": "0",
    "edition_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1",
    "serial_number": 632,
    "owner_flow_address": null,
    "top_shot_score": 19,
    "moment_status": "MINTED",
    "released_at": "2021-01-23T03:56:19.252318+00:00",
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "7b797690-5b53-45a7-b972-bd2d5152654a",
    "set_name": "Base Set - Series 1",
    "play_id": "be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "play_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13",
    "pack_id": "7dfcdc16-384a-48f0-aa97-a6b2ebcd5760",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 3/5)",
    "pack_listing_id": "938c57ce-4f89-41e7-a546-bb9e88f66e62",
    "description": "Mercy! Atlanta Hawks power forward John Collins soars over Tristan Thompson of the Cleveland Cavaliers for a thunderous one-handed slam on February 12, 2020.",
    "short_description": "John Collins rolls to the rim for alley-oop thrunk",
    "series_name": "Series 1",
    "league": "LEAGUE_NBA",
    "last_updated_at": null,
    "inserted_at": "2026-05-16T03:37:09.78865+00:00",
    "updated_at": "2026-05-16T03:46:19.47181+00:00"
  },
  {
    "moment_id": "401fece2-f967-4b65-8b19-3bb468aab170",
    "moment_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1 - serial# 626",
    "moment_flow_id": "134143",
    "edition_id": "7b797690-5b53-45a7-b972-bd2d5152654a+be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "subedition_id": "0",
    "edition_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1",
    "serial_number": 626,
    "owner_flow_address": null,
    "top_shot_score": 19,
    "moment_status": "MINTED",
    "released_at": "2022-11-29T16:36:35.756853+00:00",
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "7b797690-5b53-45a7-b972-bd2d5152654a",
    "set_name": "Base Set - Series 1",
    "play_id": "be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "play_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13",
    "pack_id": "25ac591a-1030-47b9-980e-fadd298bd03d",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 3/5)",
    "pack_listing_id": "938c57ce-4f89-41e7-a546-bb9e88f66e62",
    "description": "Mercy! Atlanta Hawks power forward John Collins soars over Tristan Thompson of the Cleveland Cavaliers for a thunderous one-handed slam on February 12, 2020.",
    "short_description": "John Collins rolls to the rim for alley-oop thrunk",
    "series_name": "Series 1",
    "league": "LEAGUE_NBA",
    "last_updated_at": null,
    "inserted_at": "2026-05-16T03:37:09.78865+00:00",
    "updated_at": "2026-05-16T03:46:19.47181+00:00"
  },
  {
    "moment_id": "6b15100c-738a-4ec5-9647-2b475255cfa5",
    "moment_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1 - serial# 625",
    "moment_flow_id": "134142",
    "edition_id": "7b797690-5b53-45a7-b972-bd2d5152654a+be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "subedition_id": "0",
    "edition_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1",
    "serial_number": 625,
    "owner_flow_address": null,
    "top_shot_score": 19,
    "moment_status": "LOCKED",
    "released_at": "2020-10-01T00:00:00+00:00",
    "locked_at": "2025-10-15T04:05:45.831139+00:00",
    "lock_expires_at": "2026-10-15T04:05:45+00:00",
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "7b797690-5b53-45a7-b972-bd2d5152654a",
    "set_name": "Base Set - Series 1",
    "play_id": "be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "play_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13",
    "pack_id": "7ab214a7-2918-4165-bf4c-54d354dfa843",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 3/5)",
    "pack_listing_id": "938c57ce-4f89-41e7-a546-bb9e88f66e62",
    "description": "Mercy! Atlanta Hawks power forward John Collins soars over Tristan Thompson of the Cleveland Cavaliers for a thunderous one-handed slam on February 12, 2020.",
    "short_description": "John Collins rolls to the rim for alley-oop thrunk",
    "series_name": "Series 1",
    "league": "LEAGUE_NBA",
    "last_updated_at": null,
    "inserted_at": "2026-05-16T03:37:09.78865+00:00",
    "updated_at": "2026-05-16T03:46:19.47181+00:00"
  },
  {
    "moment_id": "5d22f563-eb56-4d20-87e9-9cd4e5e0d4f1",
    "moment_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1 - serial# 631",
    "moment_flow_id": "134148",
    "edition_id": "7b797690-5b53-45a7-b972-bd2d5152654a+be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "subedition_id": "0",
    "edition_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1",
    "serial_number": 631,
    "owner_flow_address": null,
    "top_shot_score": 560,
    "moment_status": "MINTED",
    "released_at": "2021-01-19T07:30:10.620515+00:00",
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "7b797690-5b53-45a7-b972-bd2d5152654a",
    "set_name": "Base Set - Series 1",
    "play_id": "be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "play_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13",
    "pack_id": "e705e331-16be-40f6-ae15-8aa6abe3956a",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 3/5)",
    "pack_listing_id": "938c57ce-4f89-41e7-a546-bb9e88f66e62",
    "description": "Mercy! Atlanta Hawks power forward John Collins soars over Tristan Thompson of the Cleveland Cavaliers for a thunderous one-handed slam on February 12, 2020.",
    "short_description": "John Collins rolls to the rim for alley-oop thrunk",
    "series_name": "Series 1",
    "league": "LEAGUE_NBA",
    "last_updated_at": null,
    "inserted_at": "2026-05-16T03:37:09.78865+00:00",
    "updated_at": "2026-05-16T03:46:19.47181+00:00"
  },
  {
    "moment_id": "bb89a020-a993-4e95-9de5-0e8a999db676",
    "moment_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1 - serial# 624",
    "moment_flow_id": "134141",
    "edition_id": "7b797690-5b53-45a7-b972-bd2d5152654a+be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "subedition_id": "0",
    "edition_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13 - Base Set - Series 1",
    "serial_number": 624,
    "owner_flow_address": null,
    "top_shot_score": 19,
    "moment_status": "MINTED",
    "released_at": "2021-02-14T00:57:32.269737+00:00",
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "7b797690-5b53-45a7-b972-bd2d5152654a",
    "set_name": "Base Set - Series 1",
    "play_id": "be4f526a-e0b1-4262-a9c9-2dce82a57f2e",
    "play_name": "John Collins - Atlanta Hawks - DUNKLAYUP - 2020-02-13",
    "pack_id": "90ea6aad-f781-48b0-8797-bb59aa3db555",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 3/5)",
    "pack_listing_id": "938c57ce-4f89-41e7-a546-bb9e88f66e62",
    "description": "Mercy! Atlanta Hawks power forward John Collins soars over Tristan Thompson of the Cleveland Cavaliers for a thunderous one-handed slam on February 12, 2020.",
    "short_description": "John Collins rolls to the rim for alley-oop thrunk",
    "series_name": "Series 1",
    "league": "LEAGUE_NBA",
    "last_updated_at": null,
    "inserted_at": "2026-05-16T03:37:09.78865+00:00",
    "updated_at": "2026-05-16T03:46:19.47181+00:00"
  }
]
```

---

## `topshot.mv_edition_1y_activity`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `edition_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `edition_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |

### Row count

```
3
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+07f126a0-2d55-47de-beff-4cfdded7483f",
    "edition_name": "Chet Holmgren - Oklahoma City Thunder - RIM - 2026-05-12 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "07f126a0-2d55-47de-beff-4cfdded7483f",
    "player_id": "1631096",
    "player_name": "Chet Holmgren",
    "tier_name": "Fandom",
    "tx_count": 145,
    "total_volume_usd": 1828.55,
    "median_price_usd": 5
  },
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+35534322-c8b9-428a-926c-b5613029d9ce",
    "edition_name": "James Harden - Cleveland Cavaliers - 3_POINTER - 2026-05-09 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "35534322-c8b9-428a-926c-b5613029d9ce",
    "player_id": "201935",
    "player_name": "James Harden",
    "tier_name": "Fandom",
    "tx_count": 114,
    "total_volume_usd": 625,
    "median_price_usd": 5
  },
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+b76a4113-2be3-4ad6-ba84-6654cada75fb",
    "edition_name": "Keldon Johnson - San Antonio Spurs - BLOCK - 2026-05-13 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "b76a4113-2be3-4ad6-ba84-6654cada75fb",
    "player_id": "1629640",
    "player_name": "Keldon Johnson",
    "tier_name": "Fandom",
    "tx_count": 99,
    "total_volume_usd": 759.49,
    "median_price_usd": 4
  }
]
```

---

## `topshot.mv_edition_24h_activity`

**Description:** Per-edition 24-hour SUCCEEDED-trade rollup. Powers "hottest editions" leaderboard.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `edition_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `edition_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `tier_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `volume_usd` | number | numeric | yes |  |
| `unique_traders` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1501
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb+4118f6a6-45e1-4c34-be4f-8eec1fe4daee",
    "edition_name": "Jarrett Allen - Cleveland Cavaliers - RIM - 2022-01-23 - Metallic Gold LE - Series 3",
    "set_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb",
    "play_id": "4118f6a6-45e1-4c34-be4f-8eec1fe4daee",
    "player_id": "1628386",
    "tier_name": "Rare",
    "tx_count": 1,
    "volume_usd": 9,
    "unique_traders": 0,
    "median_price_usd": 9,
    "min_price_usd": 9,
    "max_price_usd": 9,
    "refreshed_at": "2026-05-16T14:30:29.378407+00:00"
  },
  {
    "edition_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb+44f47ca4-b4f4-4d7b-b2aa-ac497a005810",
    "edition_name": "Jaden McDaniels - Minnesota Timberwolves - BLOCK - 2022-02-06 - Metallic Gold LE - Series 3",
    "set_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb",
    "play_id": "44f47ca4-b4f4-4d7b-b2aa-ac497a005810",
    "player_id": "1630183",
    "tier_name": "Rare",
    "tx_count": 1,
    "volume_usd": 0,
    "unique_traders": 0,
    "median_price_usd": 0,
    "min_price_usd": 0,
    "max_price_usd": 0,
    "refreshed_at": "2026-05-16T14:30:29.378407+00:00"
  },
  {
    "edition_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb+4d0d8e86-c6d9-4edc-bb3c-b3bae0054cbc",
    "edition_name": "Marvin Bagley III - Detroit Pistons - RIM - 2022-03-27 - Metallic Gold LE - Series 3",
    "set_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb",
    "play_id": "4d0d8e86-c6d9-4edc-bb3c-b3bae0054cbc",
    "player_id": "1628963",
    "tier_name": "Rare",
    "tx_count": 1,
    "volume_usd": 5,
    "unique_traders": 0,
    "median_price_usd": 5,
    "min_price_usd": 5,
    "max_price_usd": 5,
    "refreshed_at": "2026-05-16T14:30:29.378407+00:00"
  },
  {
    "edition_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb+5c4a16f1-7932-4d12-81fb-86f8d40fcd4f",
    "edition_name": "Jordan Clarkson - Utah Jazz - 3_POINTER - 2021-11-04 - Metallic Gold LE - Series 3",
    "set_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb",
    "play_id": "5c4a16f1-7932-4d12-81fb-86f8d40fcd4f",
    "player_id": "203903",
    "tier_name": "Rare",
    "tx_count": 1,
    "volume_usd": 5,
    "unique_traders": 0,
    "median_price_usd": 5,
    "min_price_usd": 5,
    "max_price_usd": 5,
    "refreshed_at": "2026-05-16T14:30:29.378407+00:00"
  },
  {
    "edition_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb+5c4bd48c-bb76-4139-bbf7-a045ddad20ce",
    "edition_name": "Jusuf Nurkić - Portland Trail Blazers - MIDRANGE - 2022-01-22 - Metallic Gold LE - Series 3",
    "set_id": "d1289e27-b683-4cf3-9592-89adf93e6bcb",
    "play_id": "5c4bd48c-bb76-4139-bbf7-a045ddad20ce",
    "player_id": "203994",
    "tier_name": "Rare",
    "tx_count": 1,
    "volume_usd": 7,
    "unique_traders": 0,
    "median_price_usd": 7,
    "min_price_usd": 7,
    "max_price_usd": 7,
    "refreshed_at": "2026-05-16T14:30:29.378407+00:00"
  }
]
```

---

## `topshot.mv_edition_30d_activity`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `edition_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `edition_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |

### Row count

```
4942
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+07f126a0-2d55-47de-beff-4cfdded7483f",
    "edition_name": "Chet Holmgren - Oklahoma City Thunder - RIM - 2026-05-12 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "07f126a0-2d55-47de-beff-4cfdded7483f",
    "player_id": "1631096",
    "player_name": "Chet Holmgren",
    "tier_name": "Fandom",
    "tx_count": 145,
    "total_volume_usd": 1828.55,
    "median_price_usd": 5
  },
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+b76a4113-2be3-4ad6-ba84-6654cada75fb",
    "edition_name": "Keldon Johnson - San Antonio Spurs - BLOCK - 2026-05-13 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "b76a4113-2be3-4ad6-ba84-6654cada75fb",
    "player_id": "1629640",
    "player_name": "Keldon Johnson",
    "tier_name": "Fandom",
    "tx_count": 99,
    "total_volume_usd": 759.49,
    "median_price_usd": 4
  },
  {
    "edition_id": "0055c39d-724b-444f-918f-ddff017151f5+675f3c49-ab90-4f57-a24e-b0afdaab8996",
    "edition_name": "Al Horford - Boston Celtics - BLOCK - 2022-05-24 - And Then There Were Four - Series 3",
    "set_id": "0055c39d-724b-444f-918f-ddff017151f5",
    "set_name": "And Then There Were Four - Series 3",
    "play_id": "675f3c49-ab90-4f57-a24e-b0afdaab8996",
    "player_id": "201143",
    "player_name": "Al Horford",
    "tier_name": "Rare",
    "tx_count": 1,
    "total_volume_usd": 5,
    "median_price_usd": 5
  },
  {
    "edition_id": "0055c39d-724b-444f-918f-ddff017151f5+a6b7da8f-2ae7-4810-b929-047aacf986dc",
    "edition_name": "Jimmy Butler III - Miami Heat - STEAL - 2022-05-18 - And Then There Were Four - Series 3",
    "set_id": "0055c39d-724b-444f-918f-ddff017151f5",
    "set_name": "And Then There Were Four - Series 3",
    "play_id": "a6b7da8f-2ae7-4810-b929-047aacf986dc",
    "player_id": "202710",
    "player_name": "Jimmy Butler III",
    "tier_name": "Rare",
    "tx_count": 2,
    "total_volume_usd": 11,
    "median_price_usd": 5.5
  },
  {
    "edition_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d+19a98bf9-5533-4f72-947b-1509dcb99181",
    "edition_name": "Mikal Bridges - Brooklyn Nets - MIDRANGE - 2023-12-07 - For the Win - Series 2023-24",
    "set_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d",
    "set_name": "For the Win - Series 2023-24",
    "play_id": "19a98bf9-5533-4f72-947b-1509dcb99181",
    "player_id": "1628969",
    "player_name": "Mikal Bridges",
    "tier_name": "Rare",
    "tx_count": 3,
    "total_volume_usd": 18,
    "median_price_usd": 6
  }
]
```

---

## `topshot.mv_edition_7d_activity`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `edition_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `edition_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |

### Row count

```
4624
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "ee6ce723-8a68-434a-9fae-7695e61b3fed+6b382e85-b598-4619-9c29-15ae1dd77d45",
    "edition_name": "Amen Thompson - Houston Rockets - RIM - 2025-11-04 - Equinox - 8",
    "set_id": "ee6ce723-8a68-434a-9fae-7695e61b3fed",
    "set_name": "Equinox - 8",
    "play_id": "6b382e85-b598-4619-9c29-15ae1dd77d45",
    "player_id": "1641708",
    "player_name": "Amen Thompson",
    "tier_name": "Rare",
    "tx_count": 2,
    "total_volume_usd": 27,
    "median_price_usd": 13.5
  },
  {
    "edition_id": "0055c39d-724b-444f-918f-ddff017151f5+675f3c49-ab90-4f57-a24e-b0afdaab8996",
    "edition_name": "Al Horford - Boston Celtics - BLOCK - 2022-05-24 - And Then There Were Four - Series 3",
    "set_id": "0055c39d-724b-444f-918f-ddff017151f5",
    "set_name": "And Then There Were Four - Series 3",
    "play_id": "675f3c49-ab90-4f57-a24e-b0afdaab8996",
    "player_id": "201143",
    "player_name": "Al Horford",
    "tier_name": "Rare",
    "tx_count": 1,
    "total_volume_usd": 5,
    "median_price_usd": 5
  },
  {
    "edition_id": "0055c39d-724b-444f-918f-ddff017151f5+a6b7da8f-2ae7-4810-b929-047aacf986dc",
    "edition_name": "Jimmy Butler III - Miami Heat - STEAL - 2022-05-18 - And Then There Were Four - Series 3",
    "set_id": "0055c39d-724b-444f-918f-ddff017151f5",
    "set_name": "And Then There Were Four - Series 3",
    "play_id": "a6b7da8f-2ae7-4810-b929-047aacf986dc",
    "player_id": "202710",
    "player_name": "Jimmy Butler III",
    "tier_name": "Rare",
    "tx_count": 2,
    "total_volume_usd": 11,
    "median_price_usd": 5.5
  },
  {
    "edition_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d+2088b2ce-d028-42cb-a7a3-9a5384feb65c",
    "edition_name": "Saddiq Bey - Atlanta Hawks - RIM - 2024-01-28 - For the Win - Series 2023-24",
    "set_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d",
    "set_name": "For the Win - Series 2023-24",
    "play_id": "2088b2ce-d028-42cb-a7a3-9a5384feb65c",
    "player_id": "1630180",
    "player_name": "Saddiq Bey",
    "tier_name": "Rare",
    "tx_count": 1,
    "total_volume_usd": 4,
    "median_price_usd": 4
  },
  {
    "edition_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d+2313d0e6-4c06-4dd0-afb0-4b4f9a9ba0ee",
    "edition_name": "Ja Morant - Memphis Grizzlies - RIM - 2023-12-20 - For the Win - Series 2023-24",
    "set_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d",
    "set_name": "For the Win - Series 2023-24",
    "play_id": "2313d0e6-4c06-4dd0-afb0-4b4f9a9ba0ee",
    "player_id": "1629630",
    "player_name": "Ja Morant",
    "tier_name": "Rare",
    "tx_count": 3,
    "total_volume_usd": 30,
    "median_price_usd": 10
  }
]
```

---

## `topshot.mv_edition_all_time_activity`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `edition_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `edition_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `play_id` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |

### Row count

```
3
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+07f126a0-2d55-47de-beff-4cfdded7483f",
    "edition_name": "Chet Holmgren - Oklahoma City Thunder - RIM - 2026-05-12 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "07f126a0-2d55-47de-beff-4cfdded7483f",
    "player_id": "1631096",
    "player_name": "Chet Holmgren",
    "tier_name": "Fandom",
    "tx_count": 145,
    "total_volume_usd": 1828.55,
    "median_price_usd": 5
  },
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+35534322-c8b9-428a-926c-b5613029d9ce",
    "edition_name": "James Harden - Cleveland Cavaliers - 3_POINTER - 2026-05-09 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "35534322-c8b9-428a-926c-b5613029d9ce",
    "player_id": "201935",
    "player_name": "James Harden",
    "tier_name": "Fandom",
    "tx_count": 114,
    "total_volume_usd": 625,
    "median_price_usd": 5
  },
  {
    "edition_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231+b76a4113-2be3-4ad6-ba84-6654cada75fb",
    "edition_name": "Keldon Johnson - San Antonio Spurs - BLOCK - 2026-05-13 - Top Shot This: Playoffs Edition - 8",
    "set_id": "a95cedc7-53b4-4fc2-a4d4-131b10aa2231",
    "set_name": "Top Shot This: Playoffs Edition - 8",
    "play_id": "b76a4113-2be3-4ad6-ba84-6654cada75fb",
    "player_id": "1629640",
    "player_name": "Keldon Johnson",
    "tier_name": "Fandom",
    "tx_count": 99,
    "total_volume_usd": 759.49,
    "median_price_usd": 4
  }
]
```

---

## `topshot.mv_largest_sales_1y`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `transaction_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `moment_id` | string | text | yes |  |
| `gross_amount_usd` | number | numeric | yes |  |
| `net_amount_usd` | number | numeric | yes |  |
| `buyer_safe_name` | string | text | yes |  |
| `seller_safe_name` | string | text | yes |  |
| `transaction_type_id` | string | text | yes |  |
| `client_marketplace_safe_name` | string | text | yes |  |
| `sold_at` | string | timestamp with time zone | yes |  |
| `serial_number` | integer | integer | yes |  |
| `edition_id` | string | text | yes |  |
| `edition_name` | string | text | yes |  |
| `top_shot_score` | number | numeric | yes |  |
| `play_id` | string | text | yes |  |
| `play_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_id` | string | text | yes |  |
| `tier_name` | string | text | yes |  |

### Row count

```
50
```

### Sample (5 rows)

```json
[
  {
    "transaction_id": "3b0e7cd0-1e08-4489-8d5f-a1330e279cbd",
    "moment_id": "816cf7c4-34da-4901-a2bd-e9ab45ad9a80",
    "gross_amount_usd": 16000,
    "net_amount_usd": 400,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2025-06-10T03:20:02.396546+00:00",
    "serial_number": 24,
    "edition_id": "814c5183-596f-41d7-9135-c6b29faa9c6d+de32d3fb-0e6a-447e-b42a-08bbf1607b7d",
    "edition_name": "LeBron James - Los Angeles Lakers - DUNKLAYUP - 2019-11-16 - Holo MMXX - Series 1",
    "top_shot_score": 228030,
    "play_id": "de32d3fb-0e6a-447e-b42a-08bbf1607b7d",
    "play_name": "LeBron James - Los Angeles Lakers - DUNKLAYUP - 2019-11-16",
    "set_id": "814c5183-596f-41d7-9135-c6b29faa9c6d",
    "set_name": "Holo MMXX - Series 1",
    "player_id": "2544",
    "player_name": "LeBron James",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "7ee44e54-99ad-431b-a31e-f52315a45fdc",
    "moment_id": "15d5815c-a654-4be0-b389-2bc0f6b1c2a0",
    "gross_amount_usd": 1899,
    "net_amount_usd": 47.475,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2025-06-05T19:36:14.556564+00:00",
    "serial_number": 99,
    "edition_id": "ddfe1fcb-c3f5-449f-b645-5fc4d308cc64+c0362914-7d3a-49e7-aac4-3642ac65e42a",
    "edition_name": "Shai Gilgeous-Alexander - Oklahoma City Thunder - 3_POINTER - 2021-12-19 - Holo Icon - Series 3",
    "top_shot_score": 3683,
    "play_id": "c0362914-7d3a-49e7-aac4-3642ac65e42a",
    "play_name": "Shai Gilgeous-Alexander - Oklahoma City Thunder - 3_POINTER - 2021-12-19",
    "set_id": "ddfe1fcb-c3f5-449f-b645-5fc4d308cc64",
    "set_name": "Holo Icon - Series 3",
    "player_id": "1628983",
    "player_name": "Shai Gilgeous-Alexander",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "c97b837a-8339-4140-889d-fecce608d9e8",
    "moment_id": "3492fb49-118a-49ca-b7a4-3c8b853523ac",
    "gross_amount_usd": 1999,
    "net_amount_usd": 49.975,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-14T20:18:05.511957+00:00",
    "serial_number": 4,
    "edition_id": "39eb0ef6-a729-4bdb-a9ca-783e2d825ef8+c2f783fb-9ab4-4aee-b1b2-cb9d08f21e2a",
    "edition_name": "Victor Wembanyama - San Antonio Spurs - 3_POINTER - 2023-10-26 - Rookie Debut - Series 2023-24",
    "top_shot_score": 19990,
    "play_id": "c2f783fb-9ab4-4aee-b1b2-cb9d08f21e2a",
    "play_name": "Victor Wembanyama - San Antonio Spurs - 3_POINTER - 2023-10-26",
    "set_id": "39eb0ef6-a729-4bdb-a9ca-783e2d825ef8",
    "set_name": "Rookie Debut - Series 2023-24",
    "player_id": "1641705",
    "player_name": "Victor Wembanyama",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common"
  },
  {
    "transaction_id": "cf6dd1f7-b0d9-435e-b06f-7272e1d3e257",
    "moment_id": "2dc9e569-7665-4c60-b45b-73bae551a0cb",
    "gross_amount_usd": 2000,
    "net_amount_usd": 50,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2025-05-22T18:44:54.455132+00:00",
    "serial_number": 41,
    "edition_id": "814c5183-596f-41d7-9135-c6b29faa9c6d+abd4da56-b32e-4b41-baac-728a147a6e73",
    "edition_name": "Jayson Tatum - Boston Celtics - HANDLES - 2019-11-21 - Holo MMXX - Series 1",
    "top_shot_score": 13727,
    "play_id": "abd4da56-b32e-4b41-baac-728a147a6e73",
    "play_name": "Jayson Tatum - Boston Celtics - HANDLES - 2019-11-21",
    "set_id": "814c5183-596f-41d7-9135-c6b29faa9c6d",
    "set_name": "Holo MMXX - Series 1",
    "player_id": "1628369",
    "player_name": "Jayson Tatum",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "9a19040f-6c7c-46a0-8a13-de2dfcf26445",
    "moment_id": "aae985ed-bb5f-41db-bba9-f59b1613b967",
    "gross_amount_usd": 2000,
    "net_amount_usd": 50,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-16T00:13:43.749355+00:00",
    "serial_number": 18,
    "edition_id": "814c5183-596f-41d7-9135-c6b29faa9c6d+e2c09c0f-e04b-45db-9f5f-7cd0e6c5ed2b",
    "edition_name": "Luka Dončić - Dallas Mavericks - DUNKLAYUP - 2020-03-12 - Holo MMXX - Series 1",
    "top_shot_score": 40462,
    "play_id": "e2c09c0f-e04b-45db-9f5f-7cd0e6c5ed2b",
    "play_name": "Luka Dončić - Dallas Mavericks - DUNKLAYUP - 2020-03-12",
    "set_id": "814c5183-596f-41d7-9135-c6b29faa9c6d",
    "set_name": "Holo MMXX - Series 1",
    "player_id": "1629029",
    "player_name": "Luka Dončić",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  }
]
```

---

## `topshot.mv_largest_sales_24h`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `transaction_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `moment_id` | string | text | yes |  |
| `gross_amount_usd` | number | numeric | yes |  |
| `net_amount_usd` | number | numeric | yes |  |
| `buyer_safe_name` | string | text | yes |  |
| `seller_safe_name` | string | text | yes |  |
| `transaction_type_id` | string | text | yes |  |
| `client_marketplace_safe_name` | string | text | yes |  |
| `sold_at` | string | timestamp with time zone | yes |  |
| `serial_number` | integer | integer | yes |  |
| `edition_id` | string | text | yes |  |
| `edition_name` | string | text | yes |  |
| `top_shot_score` | number | numeric | yes |  |
| `play_id` | string | text | yes |  |
| `play_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_id` | string | text | yes |  |
| `tier_name` | string | text | yes |  |

### Row count

```
50
```

### Sample (5 rows)

```json
[
  {
    "transaction_id": "d457defd-a12a-4596-bc6d-49b621ddd0f7",
    "moment_id": "ee539684-29fd-42b1-99ae-8d24b2dd4c5e",
    "gross_amount_usd": 168,
    "net_amount_usd": 4.2,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-15T16:31:26.782173+00:00",
    "serial_number": 13,
    "edition_id": "d61a0227-0817-42a6-a449-089d5cab6956+31ccb1c4-1f94-49b9-853a-678d9f250e3e",
    "edition_name": "Cason Wallace - Oklahoma City Thunder - STEAL - 2025-11-16 - Mojo - 8",
    "top_shot_score": 1680,
    "play_id": "31ccb1c4-1f94-49b9-853a-678d9f250e3e",
    "play_name": "Cason Wallace - Oklahoma City Thunder - STEAL - 2025-11-16",
    "set_id": "d61a0227-0817-42a6-a449-089d5cab6956",
    "set_name": "Mojo - 8",
    "player_id": "1641717",
    "player_name": "Cason Wallace",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "7be2fe1a-1b05-4ab8-8c0c-83c4c0c50d6d",
    "moment_id": "371edf65-628f-47c8-a57d-019a05da766f",
    "gross_amount_usd": 219,
    "net_amount_usd": 5.475,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-16T12:19:39.673531+00:00",
    "serial_number": 482,
    "edition_id": "891987bc-a5c0-404e-8486-1735a330a81a+2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "edition_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22 - Rookie Debut - 8",
    "top_shot_score": 2320,
    "play_id": "2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "play_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22",
    "set_id": "891987bc-a5c0-404e-8486-1735a330a81a",
    "set_name": "Rookie Debut - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common"
  },
  {
    "transaction_id": "23fc813e-f6be-4617-aa1a-c625fa039ae7",
    "moment_id": "432e0c84-8e36-42bc-8f53-7e5cc51da752",
    "gross_amount_usd": 220,
    "net_amount_usd": 5.5,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-16T04:55:33.486636+00:00",
    "serial_number": 99,
    "edition_id": "d2d782e7-9e59-4f86-9d53-bcf6e18ca225+d2d6eb4d-0f30-4381-bc0e-8a8c2f65907d",
    "edition_name": "Stephon Castle - San Antonio Spurs - RIM - 2024-12-25 - Metallic Gold LE - Series 2024-25",
    "top_shot_score": 2045,
    "play_id": "d2d6eb4d-0f30-4381-bc0e-8a8c2f65907d",
    "play_name": "Stephon Castle - San Antonio Spurs - RIM - 2024-12-25",
    "set_id": "d2d782e7-9e59-4f86-9d53-bcf6e18ca225",
    "set_name": "Metallic Gold LE - Series 2024-25",
    "player_id": "1642264",
    "player_name": "Stephon Castle",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare"
  },
  {
    "transaction_id": "57f3725f-fa4d-4cfb-ac7c-03169a1b968e",
    "moment_id": "9119e375-54c6-4dc7-9c05-34f8847f075c",
    "gross_amount_usd": 222,
    "net_amount_usd": 5.55,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-16T12:19:00.174602+00:00",
    "serial_number": 564,
    "edition_id": "891987bc-a5c0-404e-8486-1735a330a81a+2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "edition_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22 - Rookie Debut - 8",
    "top_shot_score": 2320,
    "play_id": "2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "play_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22",
    "set_id": "891987bc-a5c0-404e-8486-1735a330a81a",
    "set_name": "Rookie Debut - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common"
  },
  {
    "transaction_id": "50d47300-581e-4cac-87ab-e61d67483937",
    "moment_id": "9581363d-c5b7-42e7-9153-25f9153ea4b0",
    "gross_amount_usd": 228.99,
    "net_amount_usd": 5.72475,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-16T08:47:01.636178+00:00",
    "serial_number": 302,
    "edition_id": "891987bc-a5c0-404e-8486-1735a330a81a+2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "edition_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22 - Rookie Debut - 8",
    "top_shot_score": 2320,
    "play_id": "2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "play_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22",
    "set_id": "891987bc-a5c0-404e-8486-1735a330a81a",
    "set_name": "Rookie Debut - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common"
  }
]
```

---

## `topshot.mv_largest_sales_30d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `transaction_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `moment_id` | string | text | yes |  |
| `gross_amount_usd` | number | numeric | yes |  |
| `net_amount_usd` | number | numeric | yes |  |
| `buyer_safe_name` | string | text | yes |  |
| `seller_safe_name` | string | text | yes |  |
| `transaction_type_id` | string | text | yes |  |
| `client_marketplace_safe_name` | string | text | yes |  |
| `sold_at` | string | timestamp with time zone | yes |  |
| `serial_number` | integer | integer | yes |  |
| `edition_id` | string | text | yes |  |
| `edition_name` | string | text | yes |  |
| `top_shot_score` | number | numeric | yes |  |
| `play_id` | string | text | yes |  |
| `play_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_id` | string | text | yes |  |
| `tier_name` | string | text | yes |  |

### Row count

```
50
```

### Sample (5 rows)

```json
[
  {
    "transaction_id": "37e1aca0-121f-431f-a74e-7246568c9bd1",
    "moment_id": "01132a67-e671-4b88-88e8-1e2475ff8d8e",
    "gross_amount_usd": 1057,
    "net_amount_usd": 26.425,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-08T18:37:41.487396+00:00",
    "serial_number": 24,
    "edition_id": "29cc8656-d78a-402a-8768-8993419012d1+e98e8f3f-2670-48e8-ab11-dc4c4ab06cff",
    "edition_name": "VJ Edgecombe - Philadelphia 76ers - 3_POINTER - 2025-12-31 - Rookie Revelation - 8",
    "top_shot_score": 10570,
    "play_id": "e98e8f3f-2670-48e8-ab11-dc4c4ab06cff",
    "play_name": "VJ Edgecombe - Philadelphia 76ers - 3_POINTER - 2025-12-31",
    "set_id": "29cc8656-d78a-402a-8768-8993419012d1",
    "set_name": "Rookie Revelation - 8",
    "player_id": "1642845",
    "player_name": "VJ Edgecombe",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "1e40fe2c-f5b9-4c51-b407-eed3475538b4",
    "moment_id": "e2b8045d-45d8-467f-94d3-72f46eb46e4a",
    "gross_amount_usd": 888,
    "net_amount_usd": 22.2,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-14T01:25:43.334668+00:00",
    "serial_number": 1,
    "edition_id": "416c19b5-dcac-4e5d-8327-f794ec7d8ee0+635a4642-8f52-460e-9307-cdb99d82f4dc",
    "edition_name": "Donovan Mitchell - Cleveland Cavaliers - STEAL - 2026-03-13 - Holo Icon - 8",
    "top_shot_score": 8880,
    "play_id": "635a4642-8f52-460e-9307-cdb99d82f4dc",
    "play_name": "Donovan Mitchell - Cleveland Cavaliers - STEAL - 2026-03-13",
    "set_id": "416c19b5-dcac-4e5d-8327-f794ec7d8ee0",
    "set_name": "Holo Icon - 8",
    "player_id": "1628378",
    "player_name": "Donovan Mitchell",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "a6bb3d90-f5e0-4c1c-a157-10e80782c87c",
    "moment_id": "c675e1d9-0a41-44df-93a4-08de8f8b655e",
    "gross_amount_usd": 600,
    "net_amount_usd": 15,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-14T17:12:08.199661+00:00",
    "serial_number": 26,
    "edition_id": "a61f2313-932a-491d-a48d-99e5e5a5d6bb+36d8f2e6-d8be-4047-9623-7a21987ff382",
    "edition_name": "Cooper Flagg - Dallas Mavericks - RIM - 2025-11-30 - Metallic Gold LE - 8",
    "top_shot_score": 6000,
    "play_id": "36d8f2e6-d8be-4047-9623-7a21987ff382",
    "play_name": "Cooper Flagg - Dallas Mavericks - RIM - 2025-11-30",
    "set_id": "a61f2313-932a-491d-a48d-99e5e5a5d6bb",
    "set_name": "Metallic Gold LE - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare"
  },
  {
    "transaction_id": "52126029-d933-41d1-a2ec-b7e2a08e74d2",
    "moment_id": "311f84ee-7169-4f60-a470-b697f868845e",
    "gross_amount_usd": 10000,
    "net_amount_usd": 250,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-08T15:04:41.804099+00:00",
    "serial_number": 9,
    "edition_id": "267ff652-8c27-4ca0-91ea-e65243bd8a39+f6ff8560-dc9f-4d1e-9b82-f0f23a5ea6a4",
    "edition_name": "Stephen Curry - Golden State Warriors - REEL - 2009-10-28 - Supernova - Series 2024-25",
    "top_shot_score": 100000,
    "play_id": "f6ff8560-dc9f-4d1e-9b82-f0f23a5ea6a4",
    "play_name": "Stephen Curry - Golden State Warriors - REEL - 2009-10-28",
    "set_id": "267ff652-8c27-4ca0-91ea-e65243bd8a39",
    "set_name": "Supernova - Series 2024-25",
    "player_id": "201939",
    "player_name": "Stephen Curry",
    "tier_id": "NBA_ULTIMATE",
    "tier_name": "Ultimate"
  },
  {
    "transaction_id": "946abf18-2622-4049-8443-257a0a2aff4f",
    "moment_id": "d931c9a2-5ea1-49ff-b605-21b0c5687dfc",
    "gross_amount_usd": 637,
    "net_amount_usd": 15.925,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-13T17:47:23.914698+00:00",
    "serial_number": 61,
    "edition_id": "891987bc-a5c0-404e-8486-1735a330a81a+2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "edition_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22 - Rookie Debut - 8",
    "top_shot_score": 6370,
    "play_id": "2fcdc853-b04c-4d74-89e4-060c6fc724fe",
    "play_name": "Cooper Flagg - Dallas Mavericks - MIDRANGE - 2025-10-22",
    "set_id": "891987bc-a5c0-404e-8486-1735a330a81a",
    "set_name": "Rookie Debut - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common"
  }
]
```

---

## `topshot.mv_largest_sales_7d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `transaction_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `moment_id` | string | text | yes |  |
| `gross_amount_usd` | number | numeric | yes |  |
| `net_amount_usd` | number | numeric | yes |  |
| `buyer_safe_name` | string | text | yes |  |
| `seller_safe_name` | string | text | yes |  |
| `transaction_type_id` | string | text | yes |  |
| `client_marketplace_safe_name` | string | text | yes |  |
| `sold_at` | string | timestamp with time zone | yes |  |
| `serial_number` | integer | integer | yes |  |
| `edition_id` | string | text | yes |  |
| `edition_name` | string | text | yes |  |
| `top_shot_score` | number | numeric | yes |  |
| `play_id` | string | text | yes |  |
| `play_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_id` | string | text | yes |  |
| `tier_name` | string | text | yes |  |

### Row count

```
50
```

### Sample (5 rows)

```json
[
  {
    "transaction_id": "3a78e2dd-000a-4e94-a77b-62f476563c6d",
    "moment_id": "38e53925-0153-4001-80ec-48422955ae78",
    "gross_amount_usd": 600,
    "net_amount_usd": 15,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-11T00:52:00.550654+00:00",
    "serial_number": 44,
    "edition_id": "a61f2313-932a-491d-a48d-99e5e5a5d6bb+36d8f2e6-d8be-4047-9623-7a21987ff382",
    "edition_name": "Cooper Flagg - Dallas Mavericks - RIM - 2025-11-30 - Metallic Gold LE - 8",
    "top_shot_score": 6000,
    "play_id": "36d8f2e6-d8be-4047-9623-7a21987ff382",
    "play_name": "Cooper Flagg - Dallas Mavericks - RIM - 2025-11-30",
    "set_id": "a61f2313-932a-491d-a48d-99e5e5a5d6bb",
    "set_name": "Metallic Gold LE - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare"
  },
  {
    "transaction_id": "3502419f-595c-4236-bda2-6b223aff0b71",
    "moment_id": "fd8b3a9f-5763-4630-9e4c-b828e58b1024",
    "gross_amount_usd": 555,
    "net_amount_usd": 13.875,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-10T12:50:56.334607+00:00",
    "serial_number": 4,
    "edition_id": "e7cabc5b-cfc9-4239-af3b-b7e42d7bb779+ba0c624f-3741-4e29-9889-76d85ab2152d",
    "edition_name": "Pascal Siakam - Indiana Pacers - REEL - 2025-06-20 - 2025 NBA Playoffs: Legendary - Series 2024-25",
    "top_shot_score": 5550,
    "play_id": "ba0c624f-3741-4e29-9889-76d85ab2152d",
    "play_name": "Pascal Siakam - Indiana Pacers - REEL - 2025-06-20",
    "set_id": "e7cabc5b-cfc9-4239-af3b-b7e42d7bb779",
    "set_name": "2025 NBA Playoffs: Legendary - Series 2024-25",
    "player_id": "1627783",
    "player_name": "Pascal Siakam",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "1e40fe2c-f5b9-4c51-b407-eed3475538b4",
    "moment_id": "e2b8045d-45d8-467f-94d3-72f46eb46e4a",
    "gross_amount_usd": 888,
    "net_amount_usd": 22.2,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-14T01:25:43.334668+00:00",
    "serial_number": 1,
    "edition_id": "416c19b5-dcac-4e5d-8327-f794ec7d8ee0+635a4642-8f52-460e-9307-cdb99d82f4dc",
    "edition_name": "Donovan Mitchell - Cleveland Cavaliers - STEAL - 2026-03-13 - Holo Icon - 8",
    "top_shot_score": 8880,
    "play_id": "635a4642-8f52-460e-9307-cdb99d82f4dc",
    "play_name": "Donovan Mitchell - Cleveland Cavaliers - STEAL - 2026-03-13",
    "set_id": "416c19b5-dcac-4e5d-8327-f794ec7d8ee0",
    "set_name": "Holo Icon - 8",
    "player_id": "1628378",
    "player_name": "Donovan Mitchell",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "a6bb3d90-f5e0-4c1c-a157-10e80782c87c",
    "moment_id": "c675e1d9-0a41-44df-93a4-08de8f8b655e",
    "gross_amount_usd": 600,
    "net_amount_usd": 15,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-14T17:12:08.199661+00:00",
    "serial_number": 26,
    "edition_id": "a61f2313-932a-491d-a48d-99e5e5a5d6bb+36d8f2e6-d8be-4047-9623-7a21987ff382",
    "edition_name": "Cooper Flagg - Dallas Mavericks - RIM - 2025-11-30 - Metallic Gold LE - 8",
    "top_shot_score": 6000,
    "play_id": "36d8f2e6-d8be-4047-9623-7a21987ff382",
    "play_name": "Cooper Flagg - Dallas Mavericks - RIM - 2025-11-30",
    "set_id": "a61f2313-932a-491d-a48d-99e5e5a5d6bb",
    "set_name": "Metallic Gold LE - 8",
    "player_id": "1642843",
    "player_name": "Cooper Flagg",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare"
  },
  {
    "transaction_id": "324ca6bd-4d32-4b10-8625-34abc695c650",
    "moment_id": "e56e0ae7-77fd-4d9e-b076-25d493a9017b",
    "gross_amount_usd": 525,
    "net_amount_usd": 13.125,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-11T18:33:11.79661+00:00",
    "serial_number": 4,
    "edition_id": "97eade76-c258-4a98-8a34-9adcb4f96b7a+198e0e06-ee28-479f-893c-03437346e6c6",
    "edition_name": "VJ Edgecombe - Philadelphia 76ers - 3_POINTER - 2026-04-21 - 2026 Playoff Premieres - 8",
    "top_shot_score": 5253,
    "play_id": "198e0e06-ee28-479f-893c-03437346e6c6",
    "play_name": "VJ Edgecombe - Philadelphia 76ers - 3_POINTER - 2026-04-21",
    "set_id": "97eade76-c258-4a98-8a34-9adcb4f96b7a",
    "set_name": "2026 Playoff Premieres - 8",
    "player_id": "1642845",
    "player_name": "VJ Edgecombe",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare"
  }
]
```

---

## `topshot.mv_largest_sales_all_time`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `transaction_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `moment_id` | string | text | yes |  |
| `gross_amount_usd` | number | numeric | yes |  |
| `net_amount_usd` | number | numeric | yes |  |
| `buyer_safe_name` | string | text | yes |  |
| `seller_safe_name` | string | text | yes |  |
| `transaction_type_id` | string | text | yes |  |
| `client_marketplace_safe_name` | string | text | yes |  |
| `sold_at` | string | timestamp with time zone | yes |  |
| `serial_number` | integer | integer | yes |  |
| `edition_id` | string | text | yes |  |
| `edition_name` | string | text | yes |  |
| `top_shot_score` | number | numeric | yes |  |
| `play_id` | string | text | yes |  |
| `play_name` | string | text | yes |  |
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `tier_id` | string | text | yes |  |
| `tier_name` | string | text | yes |  |

### Row count

```
50
```

### Sample (5 rows)

```json
[
  {
    "transaction_id": "3b0e7cd0-1e08-4489-8d5f-a1330e279cbd",
    "moment_id": "816cf7c4-34da-4901-a2bd-e9ab45ad9a80",
    "gross_amount_usd": 16000,
    "net_amount_usd": 400,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2025-06-10T03:20:02.396546+00:00",
    "serial_number": 24,
    "edition_id": "814c5183-596f-41d7-9135-c6b29faa9c6d+de32d3fb-0e6a-447e-b42a-08bbf1607b7d",
    "edition_name": "LeBron James - Los Angeles Lakers - DUNKLAYUP - 2019-11-16 - Holo MMXX - Series 1",
    "top_shot_score": 228030,
    "play_id": "de32d3fb-0e6a-447e-b42a-08bbf1607b7d",
    "play_name": "LeBron James - Los Angeles Lakers - DUNKLAYUP - 2019-11-16",
    "set_id": "814c5183-596f-41d7-9135-c6b29faa9c6d",
    "set_name": "Holo MMXX - Series 1",
    "player_id": "2544",
    "player_name": "LeBron James",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "c97b837a-8339-4140-889d-fecce608d9e8",
    "moment_id": "3492fb49-118a-49ca-b7a4-3c8b853523ac",
    "gross_amount_usd": 1999,
    "net_amount_usd": 49.975,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "P2P",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-14T20:18:05.511957+00:00",
    "serial_number": 4,
    "edition_id": "39eb0ef6-a729-4bdb-a9ca-783e2d825ef8+c2f783fb-9ab4-4aee-b1b2-cb9d08f21e2a",
    "edition_name": "Victor Wembanyama - San Antonio Spurs - 3_POINTER - 2023-10-26 - Rookie Debut - Series 2023-24",
    "top_shot_score": 19990,
    "play_id": "c2f783fb-9ab4-4aee-b1b2-cb9d08f21e2a",
    "play_name": "Victor Wembanyama - San Antonio Spurs - 3_POINTER - 2023-10-26",
    "set_id": "39eb0ef6-a729-4bdb-a9ca-783e2d825ef8",
    "set_name": "Rookie Debut - Series 2023-24",
    "player_id": "1641705",
    "player_name": "Victor Wembanyama",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common"
  },
  {
    "transaction_id": "cf6dd1f7-b0d9-435e-b06f-7272e1d3e257",
    "moment_id": "2dc9e569-7665-4c60-b45b-73bae551a0cb",
    "gross_amount_usd": 2000,
    "net_amount_usd": 50,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2025-05-22T18:44:54.455132+00:00",
    "serial_number": 41,
    "edition_id": "814c5183-596f-41d7-9135-c6b29faa9c6d+abd4da56-b32e-4b41-baac-728a147a6e73",
    "edition_name": "Jayson Tatum - Boston Celtics - HANDLES - 2019-11-21 - Holo MMXX - Series 1",
    "top_shot_score": 13727,
    "play_id": "abd4da56-b32e-4b41-baac-728a147a6e73",
    "play_name": "Jayson Tatum - Boston Celtics - HANDLES - 2019-11-21",
    "set_id": "814c5183-596f-41d7-9135-c6b29faa9c6d",
    "set_name": "Holo MMXX - Series 1",
    "player_id": "1628369",
    "player_name": "Jayson Tatum",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "9a19040f-6c7c-46a0-8a13-de2dfcf26445",
    "moment_id": "aae985ed-bb5f-41db-bba9-f59b1613b967",
    "gross_amount_usd": 2000,
    "net_amount_usd": 50,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2026-05-16T00:13:43.749355+00:00",
    "serial_number": 18,
    "edition_id": "814c5183-596f-41d7-9135-c6b29faa9c6d+e2c09c0f-e04b-45db-9f5f-7cd0e6c5ed2b",
    "edition_name": "Luka Dončić - Dallas Mavericks - DUNKLAYUP - 2020-03-12 - Holo MMXX - Series 1",
    "top_shot_score": 40462,
    "play_id": "e2c09c0f-e04b-45db-9f5f-7cd0e6c5ed2b",
    "play_name": "Luka Dončić - Dallas Mavericks - DUNKLAYUP - 2020-03-12",
    "set_id": "814c5183-596f-41d7-9135-c6b29faa9c6d",
    "set_name": "Holo MMXX - Series 1",
    "player_id": "1629029",
    "player_name": "Luka Dončić",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary"
  },
  {
    "transaction_id": "b6f03f43-6ab6-4b95-b5f0-4fdc6ce1a3df",
    "moment_id": "14c1a1cb-f2f6-4ddc-aeb4-6d89cc5431eb",
    "gross_amount_usd": 2100,
    "net_amount_usd": 52.5,
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "transaction_type_id": "OFFER",
    "client_marketplace_safe_name": null,
    "sold_at": "2025-05-31T01:48:00.762811+00:00",
    "serial_number": 10,
    "edition_id": "267ff652-8c27-4ca0-91ea-e65243bd8a39+01c9aa3a-e246-44c4-b001-20d6747ff8a5",
    "edition_name": "Russell Westbrook - Oklahoma City Thunder - REEL - 2008-10-29 - Supernova - Series 2024-25",
    "top_shot_score": 21000,
    "play_id": "01c9aa3a-e246-44c4-b001-20d6747ff8a5",
    "play_name": "Russell Westbrook - Oklahoma City Thunder - REEL - 2008-10-29",
    "set_id": "267ff652-8c27-4ca0-91ea-e65243bd8a39",
    "set_name": "Supernova - Series 2024-25",
    "player_id": "201566",
    "player_name": "Russell Westbrook",
    "tier_id": "NBA_ULTIMATE",
    "tier_name": "Ultimate"
  }
]
```

---

## `topshot.mv_market_summary_1y`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `singleton_id` | integer | integer | yes |  |
| `total_tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "singleton_id": 1,
    "total_tx_count": 225446,
    "total_volume_usd": 5807401.17,
    "unique_moments_traded": 93075,
    "median_price_usd": 8,
    "avg_price_usd": 25.7596,
    "max_price_usd": 16000,
    "min_price_usd": 0,
    "refreshed_at": "2026-05-16T04:15:00.448925+00:00"
  }
]
```

---

## `topshot.mv_market_summary_24h`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `singleton_id` | integer | integer | yes |  |
| `total_tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "singleton_id": 1,
    "total_tx_count": 4498,
    "total_volume_usd": 40704.83,
    "unique_moments_traded": 3512,
    "median_price_usd": 1,
    "avg_price_usd": 9.0495,
    "max_price_usd": 2212,
    "min_price_usd": 0,
    "refreshed_at": "2026-05-16T14:30:08.006373+00:00"
  }
]
```

---

## `topshot.mv_market_summary_30d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `singleton_id` | integer | integer | yes |  |
| `total_tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "singleton_id": 1,
    "total_tx_count": 33662,
    "total_volume_usd": 563023.67,
    "unique_moments_traded": 21237,
    "median_price_usd": 5,
    "avg_price_usd": 16.7258,
    "max_price_usd": 10000,
    "min_price_usd": 0,
    "refreshed_at": "2026-05-16T04:14:59.86068+00:00"
  }
]
```

---

## `topshot.mv_market_summary_7d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `singleton_id` | integer | integer | yes |  |
| `total_tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "singleton_id": 1,
    "total_tx_count": 28540,
    "total_volume_usd": 427910.97,
    "unique_moments_traded": 18636,
    "median_price_usd": 5,
    "avg_price_usd": 14.9934,
    "max_price_usd": 7500,
    "min_price_usd": 0,
    "refreshed_at": "2026-05-16T14:30:08.327982+00:00"
  }
]
```

---

## `topshot.mv_market_summary_90d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `singleton_id` | integer | integer | yes |  |
| `total_tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "singleton_id": 1,
    "total_tx_count": 33662,
    "total_volume_usd": 563023.67,
    "unique_moments_traded": 21237,
    "median_price_usd": 5,
    "avg_price_usd": 16.7258,
    "max_price_usd": 10000,
    "min_price_usd": 0,
    "refreshed_at": "2026-05-16T04:15:00.125667+00:00"
  }
]
```

---

## `topshot.mv_market_summary_all_time`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `singleton_id` | integer | integer | yes |  |
| `total_tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1
```

### Sample (5 rows)

```json
[
  {
    "singleton_id": 1,
    "total_tx_count": 227376,
    "total_volume_usd": 5859607.52,
    "unique_moments_traded": 93575,
    "median_price_usd": 8,
    "avg_price_usd": 25.7706,
    "max_price_usd": 16000,
    "min_price_usd": 0,
    "refreshed_at": "2026-05-16T04:15:02.227905+00:00"
  }
]
```

---

## `topshot.mv_player_1y_volume`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |

### Row count

```
3
```

### Sample (5 rows)

```json
[
  {
    "player_id": "1629640",
    "player_name": "Keldon Johnson",
    "last_known_team_id": "1610612759",
    "tx_count": 99,
    "total_volume_usd": 759.49,
    "avg_price_usd": 7.6716,
    "median_price_usd": 4,
    "max_price_usd": 80,
    "unique_moments_traded": 91
  },
  {
    "player_id": "1631096",
    "player_name": "Chet Holmgren",
    "last_known_team_id": "1610612760",
    "tx_count": 145,
    "total_volume_usd": 1828.55,
    "avg_price_usd": 12.6107,
    "median_price_usd": 5,
    "max_price_usd": 250,
    "unique_moments_traded": 137
  },
  {
    "player_id": "201935",
    "player_name": "James Harden",
    "last_known_team_id": "1610612739",
    "tx_count": 114,
    "total_volume_usd": 625,
    "avg_price_usd": 5.4825,
    "median_price_usd": 5,
    "max_price_usd": 10,
    "unique_moments_traded": 108
  }
]
```

---

## `topshot.mv_player_24h_volume`

**Description:** Per-player 24-hour SUCCEEDED-trade rollup. Refreshed every 5-15min by ETL.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `last_known_team_full_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_buyers` | integer | bigint | yes |  |
| `unique_sellers` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
657
```

### Sample (5 rows)

```json
[
  {
    "player_id": "203507",
    "player_name": "Giannis Antetokounmpo",
    "last_known_team_id": "1610612749",
    "last_known_team_full_name": "Milwaukee Bucks",
    "tx_count": 9,
    "total_volume_usd": 87.58,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 7,
    "min_price_usd": 0.49,
    "max_price_usd": 41,
    "refreshed_at": "2026-05-16T14:30:08.691993+00:00"
  },
  {
    "player_id": "203516",
    "player_name": "James Ennis III",
    "last_known_team_id": "1610612753",
    "last_known_team_full_name": "Orlando Magic",
    "tx_count": 1,
    "total_volume_usd": 0.15,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 0.15,
    "min_price_usd": 0.15,
    "max_price_usd": 0.15,
    "refreshed_at": "2026-05-16T14:30:08.691993+00:00"
  },
  {
    "player_id": "203552",
    "player_name": "Seth Curry",
    "last_known_team_id": "1610612751",
    "last_known_team_full_name": "Brooklyn Nets",
    "tx_count": 4,
    "total_volume_usd": 1.02,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 0.25,
    "min_price_usd": 0.23,
    "max_price_usd": 0.29,
    "refreshed_at": "2026-05-16T14:30:08.691993+00:00"
  },
  {
    "player_id": "203648",
    "player_name": "Thanasis Antetokounmpo",
    "last_known_team_id": "1610612749",
    "last_known_team_full_name": "Milwaukee Bucks",
    "tx_count": 5,
    "total_volume_usd": 1.25,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 0.23,
    "min_price_usd": 0.23,
    "max_price_usd": 0.33,
    "refreshed_at": "2026-05-16T14:30:08.691993+00:00"
  },
  {
    "player_id": "203823",
    "player_name": "Chiney Ogwumike",
    "last_known_team_id": "1611661320",
    "last_known_team_full_name": "Los Angeles Sparks",
    "tx_count": 2,
    "total_volume_usd": 0.64,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 0.32,
    "min_price_usd": 0.29,
    "max_price_usd": 0.35,
    "refreshed_at": "2026-05-16T14:30:08.691993+00:00"
  }
]
```

---

## `topshot.mv_player_30d_volume`

**Description:** Per-player 30-day SUCCEEDED-trade rollup. Refreshed every 5-15min by ETL.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `last_known_team_full_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_buyers` | integer | bigint | yes |  |
| `unique_sellers` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1037
```

### Sample (5 rows)

```json
[
  {
    "player_id": "78310",
    "player_name": "Reggie Theus",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 3,
    "total_volume_usd": 2,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 1,
    "min_price_usd": 0,
    "max_price_usd": 1,
    "refreshed_at": "2026-05-16T04:15:04.593284+00:00"
  },
  {
    "player_id": "78331",
    "player_name": "Mychal Thompson",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 3,
    "total_volume_usd": 24,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 7,
    "min_price_usd": 6,
    "max_price_usd": 11,
    "refreshed_at": "2026-05-16T04:15:04.593284+00:00"
  },
  {
    "player_id": "78369",
    "player_name": "Kelly Tripucka",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 7,
    "total_volume_usd": 42,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 2,
    "min_price_usd": 1,
    "max_price_usd": 27,
    "refreshed_at": "2026-05-16T04:15:04.593284+00:00"
  },
  {
    "player_id": "1630175",
    "player_name": "Cole Anthony",
    "last_known_team_id": "1610612749",
    "last_known_team_full_name": "Milwaukee Bucks",
    "tx_count": 19,
    "total_volume_usd": 52.74,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 2,
    "min_price_usd": 0,
    "max_price_usd": 7,
    "refreshed_at": "2026-05-16T04:15:04.593284+00:00"
  },
  {
    "player_id": "1719",
    "player_name": "Bonzi Wells",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 1,
    "total_volume_usd": 1,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 1,
    "min_price_usd": 1,
    "max_price_usd": 1,
    "refreshed_at": "2026-05-16T04:15:04.593284+00:00"
  }
]
```

---

## `topshot.mv_player_7d_volume`

**Description:** Per-player 7-day SUCCEEDED-trade rollup. Refreshed every 5-15min by ETL.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `last_known_team_full_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `unique_buyers` | integer | bigint | yes |  |
| `unique_sellers` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `min_price_usd` | number | numeric | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1023
```

### Sample (5 rows)

```json
[
  {
    "player_id": "938",
    "player_name": "Rony Seikaly",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 7,
    "total_volume_usd": 11,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 2,
    "min_price_usd": 0,
    "max_price_usd": 3,
    "refreshed_at": "2026-05-16T14:30:13.219718+00:00"
  },
  {
    "player_id": "947",
    "player_name": "Allen Iverson",
    "last_known_team_id": "1610612763",
    "last_known_team_full_name": "Memphis Grizzlies",
    "tx_count": 4,
    "total_volume_usd": 120,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 12.5,
    "min_price_usd": 12,
    "max_price_usd": 83,
    "refreshed_at": "2026-05-16T14:30:13.219718+00:00"
  },
  {
    "player_id": "949",
    "player_name": "Shareef Abdur-Rahim",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 10,
    "total_volume_usd": 31,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 3,
    "min_price_usd": 0,
    "max_price_usd": 4,
    "refreshed_at": "2026-05-16T14:30:13.219718+00:00"
  },
  {
    "player_id": "950",
    "player_name": "Stephon Marbury",
    "last_known_team_id": "1610612756",
    "last_known_team_full_name": "Phoenix Suns",
    "tx_count": 4,
    "total_volume_usd": 118.4,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 14,
    "min_price_usd": 0.4,
    "max_price_usd": 90,
    "refreshed_at": "2026-05-16T14:30:13.219718+00:00"
  },
  {
    "player_id": "100",
    "player_name": "Tim Legler",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "tx_count": 7,
    "total_volume_usd": 26.25,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 2,
    "min_price_usd": 1,
    "max_price_usd": 7,
    "refreshed_at": "2026-05-16T14:30:13.219718+00:00"
  }
]
```

---

## `topshot.mv_player_90d_volume`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |

### Row count

```
1037
```

### Sample (5 rows)

```json
[
  {
    "player_id": "100101",
    "player_name": "Teresa Weatherspoon",
    "last_known_team_id": null,
    "tx_count": 2,
    "total_volume_usd": 52,
    "avg_price_usd": 26,
    "median_price_usd": 26,
    "max_price_usd": 27,
    "unique_moments_traded": 2
  },
  {
    "player_id": "100234",
    "player_name": "Ticha Penicheiro",
    "last_known_team_id": null,
    "tx_count": 1,
    "total_volume_usd": 1,
    "avg_price_usd": 1,
    "median_price_usd": 1,
    "max_price_usd": 1,
    "unique_moments_traded": 1
  },
  {
    "player_id": "100263",
    "player_name": "Bill Laimbeer",
    "last_known_team_id": null,
    "tx_count": 1,
    "total_volume_usd": 20,
    "avg_price_usd": 20,
    "median_price_usd": 20,
    "max_price_usd": 20,
    "unique_moments_traded": 1
  },
  {
    "player_id": "100342",
    "player_name": "Becky Hammon",
    "last_known_team_id": null,
    "tx_count": 1,
    "total_volume_usd": 8,
    "avg_price_usd": 8,
    "median_price_usd": 8,
    "max_price_usd": 8,
    "unique_moments_traded": 1
  },
  {
    "player_id": "100356",
    "player_name": "Chamique Holdsclaw",
    "last_known_team_id": null,
    "tx_count": 2,
    "total_volume_usd": 13,
    "avg_price_usd": 6.5,
    "median_price_usd": 6.5,
    "max_price_usd": 13,
    "unique_moments_traded": 1
  }
]
```

---

## `topshot.mv_player_all_time_volume`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `total_volume_usd` | number | numeric | yes |  |
| `avg_price_usd` | number | numeric | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `max_price_usd` | number | numeric | yes |  |
| `unique_moments_traded` | integer | bigint | yes |  |

### Row count

```
3
```

### Sample (5 rows)

```json
[
  {
    "player_id": "1629640",
    "player_name": "Keldon Johnson",
    "last_known_team_id": "1610612759",
    "tx_count": 99,
    "total_volume_usd": 759.49,
    "avg_price_usd": 7.6716,
    "median_price_usd": 4,
    "max_price_usd": 80,
    "unique_moments_traded": 91
  },
  {
    "player_id": "1631096",
    "player_name": "Chet Holmgren",
    "last_known_team_id": "1610612760",
    "tx_count": 145,
    "total_volume_usd": 1828.55,
    "avg_price_usd": 12.6107,
    "median_price_usd": 5,
    "max_price_usd": 250,
    "unique_moments_traded": 137
  },
  {
    "player_id": "201935",
    "player_name": "James Harden",
    "last_known_team_id": "1610612739",
    "tx_count": 114,
    "total_volume_usd": 625,
    "avg_price_usd": 5.4825,
    "median_price_usd": 5,
    "max_price_usd": 10,
    "unique_moments_traded": 108
  }
]
```

---

## `topshot.mv_player_market_cap`

**Description:** Per-player aggregate market cap (sum of edition market caps as of latest market_caps date). Powers OTM-style "Market Cap" leaderboard.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `last_known_team_full_name` | string | text | yes |  |
| `total_market_cap_usd` | number | numeric | yes |  |
| `total_moments_in_circulation` | integer | bigint | yes |  |
| `edition_count` | integer | bigint | yes |  |
| `as_of_date` | string | date | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
1275
```

### Sample (5 rows)

```json
[
  {
    "player_id": "365",
    "player_name": "Derrick McKey",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "total_market_cap_usd": 0,
    "total_moments_in_circulation": 0,
    "edition_count": 1,
    "as_of_date": "2026-05-16",
    "refreshed_at": "2026-05-16T04:15:43.195975+00:00"
  },
  {
    "player_id": "1631243",
    "player_name": "Mouhamed Gueye",
    "last_known_team_id": "1610612737",
    "last_known_team_full_name": "Atlanta Hawks",
    "total_market_cap_usd": 4091,
    "total_moments_in_circulation": 4091,
    "edition_count": 2,
    "as_of_date": "2026-05-16",
    "refreshed_at": "2026-05-16T04:15:43.195975+00:00"
  },
  {
    "player_id": "1631241",
    "player_name": "Javon Freeman-Liberty",
    "last_known_team_id": "1610612761",
    "last_known_team_full_name": "Toronto Raptors",
    "total_market_cap_usd": 2396,
    "total_moments_in_circulation": 2396,
    "edition_count": 1,
    "as_of_date": "2026-05-16",
    "refreshed_at": "2026-05-16T04:15:43.195975+00:00"
  },
  {
    "player_id": "1631232",
    "player_name": "Keion Brooks Jr.",
    "last_known_team_id": "1610612740",
    "last_known_team_full_name": "New Orleans Pelicans",
    "total_market_cap_usd": 2510,
    "total_moments_in_circulation": 2510,
    "edition_count": 1,
    "as_of_date": "2026-05-16",
    "refreshed_at": "2026-05-16T04:15:43.195975+00:00"
  },
  {
    "player_id": "1631230",
    "player_name": "Dominick Barlow",
    "last_known_team_id": "1610612755",
    "last_known_team_full_name": "Philadelphia 76ers",
    "total_market_cap_usd": 5152,
    "total_moments_in_circulation": 817,
    "edition_count": 2,
    "as_of_date": "2026-05-16",
    "refreshed_at": "2026-05-16T04:15:43.195975+00:00"
  }
]
```

---

## `topshot.mv_player_movers_15d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `team_name` | string | text | yes |  |
| `avg_recent_usd` | number | numeric | yes |  |
| `avg_prior_usd` | number | numeric | yes |  |
| `pct_change` | number | numeric | yes |  |
| `tx_count_recent` | integer | bigint | yes |  |
| `tx_count_prior` | integer | bigint | yes |  |
| `volume_recent_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
667
```

### Sample (5 rows)

```json
[
  {
    "player_id": "100",
    "player_name": "Tim Legler",
    "team_name": null,
    "avg_recent_usd": 3.3088235294117645,
    "avg_prior_usd": 3.2083333333333335,
    "pct_change": 3.1321619556913682,
    "tx_count_recent": 17,
    "tx_count_prior": 48,
    "volume_recent_usd": 56.25,
    "refreshed_at": "2026-05-17T23:22:59.546489+00:00"
  },
  {
    "player_id": "100720",
    "player_name": "Sue Bird",
    "team_name": "Seattle Storm",
    "avg_recent_usd": 2.8333333333333335,
    "avg_prior_usd": 3.28125,
    "pct_change": -13.650793650793652,
    "tx_count_recent": 18,
    "tx_count_prior": 8,
    "volume_recent_usd": 51,
    "refreshed_at": "2026-05-17T23:22:59.546489+00:00"
  },
  {
    "player_id": "100940",
    "player_name": "Diana Taurasi",
    "team_name": "Phoenix Mercury",
    "avg_recent_usd": 10.32,
    "avg_prior_usd": 7.8,
    "pct_change": 32.30769230769231,
    "tx_count_recent": 20,
    "tx_count_prior": 5,
    "volume_recent_usd": 206.4,
    "refreshed_at": "2026-05-17T23:22:59.546489+00:00"
  },
  {
    "player_id": "101108",
    "player_name": "Chris Paul",
    "team_name": "San Antonio Spurs",
    "avg_recent_usd": 7.043275862068966,
    "avg_prior_usd": 12.03921875,
    "pct_change": -41.49723492590443,
    "tx_count_recent": 58,
    "tx_count_prior": 64,
    "volume_recent_usd": 408.51,
    "refreshed_at": "2026-05-17T23:22:59.546489+00:00"
  },
  {
    "player_id": "101122",
    "player_name": "Danny Granger",
    "team_name": null,
    "avg_recent_usd": 15.5,
    "avg_prior_usd": 11.416666666666666,
    "pct_change": 35.76642335766423,
    "tx_count_recent": 8,
    "tx_count_prior": 12,
    "volume_recent_usd": 124,
    "refreshed_at": "2026-05-17T23:22:59.546489+00:00"
  }
]
```

---

## `topshot.mv_player_movers_30d`

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `player_name` | string | text | yes |  |
| `team_name` | string | text | yes |  |
| `avg_recent_usd` | number | numeric | yes |  |
| `avg_prior_usd` | number | numeric | yes |  |
| `pct_change` | number | numeric | yes |  |
| `tx_count_recent` | integer | bigint | yes |  |
| `tx_count_prior` | integer | bigint | yes |  |
| `volume_recent_usd` | number | numeric | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
829
```

### Sample (5 rows)

```json
[
  {
    "player_id": "1517",
    "player_name": "Bobby Jackson",
    "team_name": null,
    "avg_recent_usd": 3.8275862068965516,
    "avg_prior_usd": 3.0588235294117645,
    "pct_change": 25.13262599469496,
    "tx_count_recent": 29,
    "tx_count_prior": 34,
    "volume_recent_usd": 111,
    "refreshed_at": "2026-05-17T23:24:13.3982+00:00"
  },
  {
    "player_id": "2399",
    "player_name": "Mike Dunleavy",
    "team_name": null,
    "avg_recent_usd": 3.206896551724138,
    "avg_prior_usd": 4.821428571428571,
    "pct_change": -33.486590038314176,
    "tx_count_recent": 29,
    "tx_count_prior": 28,
    "volume_recent_usd": 93,
    "refreshed_at": "2026-05-17T23:24:13.3982+00:00"
  },
  {
    "player_id": "1729",
    "player_name": "Ricky Davis",
    "team_name": null,
    "avg_recent_usd": 2.2561576354679804,
    "avg_prior_usd": 4.068581081081081,
    "pct_change": -44.54681889076458,
    "tx_count_recent": 203,
    "tx_count_prior": 148,
    "volume_recent_usd": 458,
    "refreshed_at": "2026-05-17T23:24:13.3982+00:00"
  },
  {
    "player_id": "100",
    "player_name": "Tim Legler",
    "team_name": null,
    "avg_recent_usd": 3.2346153846153847,
    "avg_prior_usd": 2.650625,
    "pct_change": 22.032176736255963,
    "tx_count_recent": 65,
    "tx_count_prior": 400,
    "volume_recent_usd": 210.25,
    "refreshed_at": "2026-05-17T23:24:13.3982+00:00"
  },
  {
    "player_id": "699",
    "player_name": "Brent Barry",
    "team_name": null,
    "avg_recent_usd": 2.486111111111111,
    "avg_prior_usd": 3.6085820895522387,
    "pct_change": -31.105596341869738,
    "tx_count_recent": 216,
    "tx_count_prior": 134,
    "volume_recent_usd": 537,
    "refreshed_at": "2026-05-17T23:24:13.3982+00:00"
  }
]
```

---

## `topshot.mv_set_24h_activity`

**Description:** Per-set 24-hour SUCCEEDED-trade rollup.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `set_id` | string | text | yes | Note: This is a Primary Key.<pk/> |
| `set_name` | string | text | yes |  |
| `series_number` | integer | integer | yes |  |
| `series_name` | string | text | yes |  |
| `set_tier_name` | string | text | yes |  |
| `tx_count` | integer | bigint | yes |  |
| `volume_usd` | number | numeric | yes |  |
| `unique_editions_traded` | integer | bigint | yes |  |
| `unique_buyers` | integer | bigint | yes |  |
| `unique_sellers` | integer | bigint | yes |  |
| `median_price_usd` | number | double precision | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
163
```

### Sample (5 rows)

```json
[
  {
    "set_id": "00ac1ba7-32f9-4d49-8603-b7456d30695d",
    "set_name": "For the Win - Series 2023-24",
    "series_number": 6,
    "series_name": "Series 2023-24",
    "set_tier_name": "Rare",
    "tx_count": 27,
    "volume_usd": 127.9,
    "unique_editions_traded": 19,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 5,
    "refreshed_at": "2026-05-16T04:15:42.766711+00:00"
  },
  {
    "set_id": "0376c036-dab9-4379-a73f-bb86bfa64949",
    "set_name": "Game Recognize Game - Series 3",
    "series_number": 4,
    "series_name": "Series 3",
    "set_tier_name": "Common",
    "tx_count": 5,
    "volume_usd": 5,
    "unique_editions_traded": 3,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 1,
    "refreshed_at": "2026-05-16T04:15:42.766711+00:00"
  },
  {
    "set_id": "05750986-0bfe-4b6b-91c2-ac000db27f2d",
    "set_name": "Video Game Numbers - Series 2023-24",
    "series_number": 6,
    "series_name": "Series 2023-24",
    "set_tier_name": "Rare",
    "tx_count": 4,
    "volume_usd": 0,
    "unique_editions_traded": 4,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 0,
    "refreshed_at": "2026-05-16T04:15:42.766711+00:00"
  },
  {
    "set_id": "071e312a-bacf-48d8-9116-a910441a87d7",
    "set_name": "WNBA Game Recognize Game - Series 4",
    "series_number": 5,
    "series_name": "Series 4",
    "set_tier_name": "Rare",
    "tx_count": 2,
    "volume_usd": 13,
    "unique_editions_traded": 2,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 6.5,
    "refreshed_at": "2026-05-16T04:15:42.766711+00:00"
  },
  {
    "set_id": "08225b1a-32ed-4253-82a6-808f54f156c0",
    "set_name": "Run It Back 1986-87 - Series 4",
    "series_number": 5,
    "series_name": "Series 4",
    "set_tier_name": "Rare",
    "tx_count": 5,
    "volume_usd": 495,
    "unique_editions_traded": 4,
    "unique_buyers": 0,
    "unique_sellers": 0,
    "median_price_usd": 23,
    "refreshed_at": "2026-05-16T04:15:42.766711+00:00"
  }
]
```

---

## `topshot.mv_set_completion_distribution`

**Description:** For each set, histogram of how-many-owners-hold-what-fraction-of-the-set. Powers "X% complete" community charts.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `set_id` | string | text | yes |  |
| `set_name` | string | text | yes |  |
| `series_number` | integer | integer | yes |  |
| `bucket` | string | text | yes |  |
| `owner_count` | integer | bigint | yes |  |
| `total_editions_in_set` | integer | bigint | yes |  |
| `refreshed_at` | string | timestamp with time zone | yes |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.packs`

**Description:** Top Shot packs (SKU level). Source: asset_nba_pack. Linked to drops via drop_id and to moments via pack_id on moments table.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `pack_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `pack_listing_id` | string | text | yes |  |
| `pack_flow_id` | string | text | yes |  |
| `drop_id` | string | text | yes |  |
| `reservation_id` | string | text | yes |  |
| `version` | string | text | yes |  |
| `pack_name` | string | text | yes |  |
| `description` | string | text | yes |  |
| `image_url` | string | text | yes |  |
| `is_starter_pack` | boolean | boolean | yes |  |
| `is_reward` | boolean | boolean | yes |  |
| `max_order_quantity` | integer | integer | yes |  |
| `moments_per_pack` | integer | integer | yes |  |
| `total_packs` | integer | integer | yes |  |
| `total_moments` | integer | integer | yes |  |
| `pack_status` | string | text | yes |  |
| `opened_at` | string | timestamp with time zone | yes |  |
| `fulfillment_tx_hash` | string | text | yes |  |
| `is_preorder` | boolean | boolean | yes |  |
| `price` | number | numeric | yes |  |
| `currency` | string | text | yes |  |
| `leagues` | array | text[] | yes |  |
| `primary_league` | string | text | yes |  |
| `secondary_league` | string | text | yes |  |
| `gated_criteria` | string | text | yes |  |
| `sale_type` | string | text | yes |  |
| `pack_tier_id` | string | text | yes |  |
| `pack_tier_name` | string | text | yes |  |
| `pack_rarity` | integer | integer | yes |  |
| `started_at` | string | timestamp with time zone | yes |  |
| `expired_at` | string | timestamp with time zone | yes |  |
| `container_pack_id` | string | text | yes |  |
| `is_container` | boolean | boolean | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
19567
```

### Sample (5 rows)

```json
[
  {
    "pack_id": "ca26d1f9-2e2f-4fd9-8431-b9e3afe9612d",
    "pack_listing_id": "938c57ce-4f89-41e7-a546-bb9e88f66e62",
    "pack_flow_id": "85761909576702",
    "drop_id": "-394057458247844948",
    "reservation_id": "745a1d59-abce-49bd-8fb0-b04083355c43",
    "version": "8",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 3/5)",
    "description": "Originally released in 2020, these Rare Packs feature Top Shot's flagship Rare Metallic Gold LE Set. Each Pack includes 1 Rare Metallic Gold LE Moment and 5 Base Set Moments.<br><br><b>\n<a href=\"https://docs.google.com/spreadsheets/d/14FjB28dA4JyW2NplEYWjjIeQmNUi5a45vPd7kF-PbUU/edit?usp=sharing\" target=\"_blank\" rel=\"noopener noreferrer\">Pack Contents</a></b>",
    "image_url": "https://assets.nbatopshot.com/packs/rare/pack_1_premium_pack_rare.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 1,
    "moments_per_pack": 6,
    "total_packs": 1492,
    "total_moments": 6,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": 24,
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "DIRECT",
    "pack_tier_id": "NBA_RARE",
    "pack_tier_name": "Rare",
    "pack_rarity": 2,
    "started_at": "2020-10-07T14:00:00+00:00",
    "expired_at": "2020-10-07T20:00:00+00:00",
    "container_pack_id": null,
    "is_container": false,
    "inserted_at": "2026-05-16T01:20:54.60098+00:00",
    "updated_at": "2026-05-13T14:50:32.161951+00:00"
  },
  {
    "pack_id": "d44de3e2-724c-42a7-ad1f-1b74064af2f0",
    "pack_listing_id": "a41994c6-b671-4d1e-901a-edf46b370ef3",
    "pack_flow_id": "85761909576682",
    "drop_id": "-5778066816072954673",
    "reservation_id": "bdab1679-d6a0-4877-8c90-a109133ce33c",
    "version": "8",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 5/5)",
    "description": "Originally released in 2020, these Rare Packs feature Top Shot's flagship Rare Metallic Gold LE Set. Each Pack includes 1 Rare Metallic Gold LE Moment and 5 Base Set Moments.<br><br><b>\n<a href=\"https://docs.google.com/spreadsheets/d/1_AdNeVS6ynHyvTgl6hc9yY7Z9zml4o8EK9d2U6mk0lE/edit#gid=81280383\" target=\"_blank\" rel=\"noopener noreferrer\">Pack Contents</a></b>",
    "image_url": "https://assets.nbatopshot.com/packs/rare/pack_1_premium_pack_rare.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 1,
    "moments_per_pack": 6,
    "total_packs": 1491,
    "total_moments": 6,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": 24,
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "DIRECT",
    "pack_tier_id": "NBA_RARE",
    "pack_tier_name": "Rare",
    "pack_rarity": 2,
    "started_at": "2020-10-07T16:00:00+00:00",
    "expired_at": "2020-10-07T22:00:00+00:00",
    "container_pack_id": null,
    "is_container": false,
    "inserted_at": "2026-05-16T01:20:54.60098+00:00",
    "updated_at": "2026-05-13T14:52:06.799156+00:00"
  },
  {
    "pack_id": "8db05f18-4455-42d6-a57d-55b958950d7a",
    "pack_listing_id": "eeb2b6b2-57dc-4b9b-bb49-848659fa8b1b",
    "pack_flow_id": "32985351437545",
    "drop_id": "-5611894588164203431",
    "reservation_id": "e139cd66-692e-4fe3-b822-13ffd7d8597a",
    "version": "8",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 1/5)",
    "description": "Originally released in 2020, these Rare Packs feature Top Shot's flagship Rare Metallic Gold LE Set. Each Pack includes 1 Rare Metallic Gold LE Moment and 5 Base Set Moments.",
    "image_url": "https://assets.nbatopshot.com/packs/rare/pack_1_premium_pack_rare.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 1,
    "moments_per_pack": 6,
    "total_packs": 1492,
    "total_moments": 6,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": 24,
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "DIRECT",
    "pack_tier_id": "NBA_RARE",
    "pack_tier_name": "Rare",
    "pack_rarity": 2,
    "started_at": "2020-10-07T12:00:00+00:00",
    "expired_at": "2020-10-07T18:00:00+00:00",
    "container_pack_id": null,
    "is_container": false,
    "inserted_at": "2026-05-16T01:20:54.60098+00:00",
    "updated_at": "2026-05-13T14:53:29.094952+00:00"
  },
  {
    "pack_id": "96171d2a-23ed-4bfd-ab11-ee9808496f4b",
    "pack_listing_id": "19245b50-0aed-44f2-9158-98de9d349e21",
    "pack_flow_id": "85761909576580",
    "drop_id": "-7078543588101815984",
    "reservation_id": "170cddd3-75a8-42c0-965b-00e5ed64ed7f",
    "version": "8",
    "pack_name": "Premium Pack (Series 1, Drop 2, Wave 2/5)",
    "description": "Originally released in 2020, these Rare Packs feature Top Shot's flagship Rare Metallic Gold LE Set. Each Pack includes 1 Rare Metallic Gold LE Moment and 5 Base Set Moments.",
    "image_url": "https://assets.nbatopshot.com/packs/rare/pack_1_premium_pack_rare.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 1,
    "moments_per_pack": 6,
    "total_packs": 1492,
    "total_moments": 6,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": 24,
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "DIRECT",
    "pack_tier_id": "NBA_RARE",
    "pack_tier_name": "Rare",
    "pack_rarity": 2,
    "started_at": "2020-10-07T13:00:00+00:00",
    "expired_at": "2020-10-07T19:00:00+00:00",
    "container_pack_id": null,
    "is_container": false,
    "inserted_at": "2026-05-16T01:20:54.60098+00:00",
    "updated_at": "2026-05-13T14:55:16.692176+00:00"
  },
  {
    "pack_id": "bc37e8dd-ba98-4cb1-bb08-df3d515fe3d4",
    "pack_listing_id": "e19c86f3-9e9e-49fa-bba4-011c0688bff0",
    "pack_flow_id": "240793049092590",
    "drop_id": null,
    "reservation_id": "5659ee60-c41e-4adb-ba31-a4bf27ece737",
    "version": "8",
    "pack_name": "Fast Break - 2025 NBA Finals - 2 Wins Pack",
    "description": "Collectors were able to earn this pack by competing in Fast Break 2025 NBA Finals run and successfully scoring 2 Wins.",
    "image_url": "https://asset-preview.nbatopshot.com/packs/common/pack_7_fast_break_nba_run_pord4_2_wins_pack.png",
    "is_starter_pack": false,
    "is_reward": true,
    "max_order_quantity": 1,
    "moments_per_pack": 1,
    "total_packs": 2590,
    "total_moments": 1,
    "pack_status": "OPENED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": 0,
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "AIRDROP",
    "pack_tier_id": "NBA_COMMON",
    "pack_tier_name": "Common",
    "pack_rarity": 1,
    "started_at": "2025-06-06T04:00:00+00:00",
    "expired_at": null,
    "container_pack_id": null,
    "is_container": false,
    "inserted_at": "2026-05-16T01:20:54.60098+00:00",
    "updated_at": "2026-05-12T15:03:52.763926+00:00"
  }
]
```

---

## `topshot.parallel_types`

**Description:** Top Shot parallel-name dimension. parallel_id 0 = "Base" (no parallel). parallel_id 1..N = named parallels from Top Shot GraphQL `{ parallels { name } }` array, 1-indexed by position. HYPOTHESIS: array order = parallel_id; needs cross-check against a moment with known non-zero parallelID before declaring canonical.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `parallel_id` | integer | integer | NO | Canonical Top Shot parallelID integer. 0 = Base/no-parallel (sentinel; not in GraphQL parallels array).  Note: This is a Primary Key.<pk/> |
| `name` | string | text | NO |  |
| `description` | string | text | yes |  |
| `source` | string | text | NO |  |
| `sourced_at` | string | timestamp with time zone | NO |  |
| `verified` | boolean | boolean | NO | Set true after Roham (or operator) confirms the name matches what shows on nbatopshot.com for at least one moment in that parallel. |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
24
```

### Sample (5 rows)

```json
[
  {
    "parallel_id": 0,
    "name": "Base",
    "description": null,
    "source": "topshot-graphql-parallels-2026-05-17",
    "sourced_at": "2026-05-17T17:05:15.471766+00:00",
    "verified": false,
    "inserted_at": "2026-05-17T17:05:15.471766+00:00",
    "updated_at": "2026-05-17T17:05:15.471766+00:00"
  },
  {
    "parallel_id": 1,
    "name": "Explosion",
    "description": null,
    "source": "topshot-graphql-parallels-2026-05-17",
    "sourced_at": "2026-05-17T17:05:15.471766+00:00",
    "verified": false,
    "inserted_at": "2026-05-17T17:05:15.471766+00:00",
    "updated_at": "2026-05-17T17:05:15.471766+00:00"
  },
  {
    "parallel_id": 2,
    "name": "Torn",
    "description": null,
    "source": "topshot-graphql-parallels-2026-05-17",
    "sourced_at": "2026-05-17T17:05:15.471766+00:00",
    "verified": false,
    "inserted_at": "2026-05-17T17:05:15.471766+00:00",
    "updated_at": "2026-05-17T17:05:15.471766+00:00"
  },
  {
    "parallel_id": 3,
    "name": "Vortex",
    "description": null,
    "source": "topshot-graphql-parallels-2026-05-17",
    "sourced_at": "2026-05-17T17:05:15.471766+00:00",
    "verified": false,
    "inserted_at": "2026-05-17T17:05:15.471766+00:00",
    "updated_at": "2026-05-17T17:05:15.471766+00:00"
  },
  {
    "parallel_id": 4,
    "name": "Rippled",
    "description": null,
    "source": "topshot-graphql-parallels-2026-05-17",
    "sourced_at": "2026-05-17T17:05:15.471766+00:00",
    "verified": false,
    "inserted_at": "2026-05-17T17:05:15.471766+00:00",
    "updated_at": "2026-05-17T17:05:15.471766+00:00"
  }
]
```

---

## `topshot.play_categories`

**Description:** Play category lookup (e.g. Handles, Jams). Source: asset_nba_play_category.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `play_category` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `play_category_name` | string | text | yes |  |
| `play_types` | array | text[] | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.play_statuses`

**Description:** Play lifecycle status lookup. Source: asset_nba_play_status.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `play_status` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `play_status_code` | integer | integer | yes |  |
| `play_status_name` | string | text | yes |  |
| `description` | string | text | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.play_types`

**Description:** Play type lookup (e.g. Block, Steal, Three-Pointer). Source: asset_nba_play_type.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `play_type` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `play_type_name` | string | text | yes |  |
| `play_category` | string | text | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.players`

**Description:** Player metadata. Source: asset_nba_player. Includes draft history and Top Shot mint span dates.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `player_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `full_name` | string | text | yes |  |
| `first_name` | string | text | yes |  |
| `last_name` | string | text | yes |  |
| `league` | string | text | yes |  |
| `last_known_team_id` | string | text | yes |  |
| `last_known_team_full_name` | string | text | yes |  |
| `last_known_primary_position` | string | text | yes |  |
| `draft_year` | string | text | yes |  |
| `draft_round` | string | text | yes |  |
| `draft_selection` | string | text | yes |  |
| `draft_team_team_id` | string | text | yes |  |
| `draft_team_full_name` | string | text | yes |  |
| `birthplace` | string | text | yes |  |
| `birthdate` | string | timestamp with time zone | yes |  |
| `date_of_first_play` | string | timestamp with time zone | yes |  |
| `date_of_last_play` | string | timestamp with time zone | yes |  |
| `first_minted_moment_date` | string | timestamp with time zone | yes | Date of the earliest Top Shot Moment minted of this player. Useful for "rookie card" / "first appearance" ranking. |
| `last_minted_moment_date` | string | timestamp with time zone | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
1287
```

### Sample (5 rows)

```json
[
  {
    "player_id": "365",
    "full_name": "Derrick McKey",
    "first_name": "Derrick",
    "last_name": "McKey",
    "league": "LEAGUE_NBA",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "last_known_primary_position": null,
    "draft_year": "1987",
    "draft_round": "1",
    "draft_selection": "9",
    "draft_team_team_id": null,
    "draft_team_full_name": null,
    "birthplace": "Meridian, MS, USA",
    "birthdate": "1966-12-10T00:00:00+00:00",
    "date_of_first_play": "1989-05-05T23:00:00+00:00",
    "date_of_last_play": "1989-05-05T23:00:00+00:00",
    "first_minted_moment_date": "2026-05-15T15:35:46.046205+00:00",
    "last_minted_moment_date": "2026-05-15T15:36:05.898809+00:00",
    "inserted_at": "2026-05-16T00:45:04.809072+00:00",
    "updated_at": "2026-05-14T12:01:16.313423+00:00"
  },
  {
    "player_id": "76487",
    "full_name": "Billy Cunningham",
    "first_name": "Billy",
    "last_name": "Cunningham",
    "league": "LEAGUE_NBA",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "last_known_primary_position": null,
    "draft_year": "1965",
    "draft_round": "1",
    "draft_selection": "7",
    "draft_team_team_id": null,
    "draft_team_full_name": null,
    "birthplace": "Brooklyn, NY, USA",
    "birthdate": "1943-06-03T00:00:00+00:00",
    "date_of_first_play": "1971-01-11T00:00:00+00:00",
    "date_of_last_play": "1971-01-11T00:00:00+00:00",
    "first_minted_moment_date": "2026-02-12T00:12:24.819084+00:00",
    "last_minted_moment_date": "2026-02-12T00:12:26.331042+00:00",
    "inserted_at": "2026-05-16T00:45:04.809072+00:00",
    "updated_at": "2026-02-11T02:43:21.006134+00:00"
  },
  {
    "player_id": "934",
    "full_name": "Derrick Coleman",
    "first_name": "Derrick",
    "last_name": "Coleman",
    "league": "LEAGUE_NBA",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "last_known_primary_position": null,
    "draft_year": "1900",
    "draft_round": "1",
    "draft_selection": "1",
    "draft_team_team_id": null,
    "draft_team_full_name": null,
    "birthplace": "Mobile, AL, USA",
    "birthdate": "1967-06-21T00:00:00+00:00",
    "date_of_first_play": "1991-02-16T00:00:00+00:00",
    "date_of_last_play": "1991-02-16T00:00:00+00:00",
    "first_minted_moment_date": "2025-07-18T17:36:29.211357+00:00",
    "last_minted_moment_date": "2025-07-18T17:39:13.125172+00:00",
    "inserted_at": "2026-05-16T00:45:04.809072+00:00",
    "updated_at": "2025-07-16T14:26:43.190807+00:00"
  },
  {
    "player_id": "1517",
    "full_name": "Bobby Jackson",
    "first_name": "Bobby",
    "last_name": "Jackson",
    "league": "LEAGUE_NBA",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "last_known_primary_position": null,
    "draft_year": "1997",
    "draft_round": "1",
    "draft_selection": "23",
    "draft_team_team_id": null,
    "draft_team_full_name": null,
    "birthplace": "East Spencer, NC, USA",
    "birthdate": "1973-03-03T00:00:00+00:00",
    "date_of_first_play": "2002-11-30T00:00:00+00:00",
    "date_of_last_play": "2002-11-30T00:00:00+00:00",
    "first_minted_moment_date": "2026-01-08T17:26:39.268311+00:00",
    "last_minted_moment_date": "2026-01-08T17:29:51.309479+00:00",
    "inserted_at": "2026-05-16T00:45:04.809072+00:00",
    "updated_at": "2025-12-23T14:20:33.151479+00:00"
  },
  {
    "player_id": "1630283",
    "full_name": "Kylor Kelley",
    "first_name": "Kylor",
    "last_name": "Kelley",
    "league": "LEAGUE_NBA",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "last_known_primary_position": null,
    "draft_year": null,
    "draft_round": null,
    "draft_selection": null,
    "draft_team_team_id": null,
    "draft_team_full_name": null,
    "birthplace": "Logan, UT, USA",
    "birthdate": "1997-08-26T00:00:00+00:00",
    "date_of_first_play": "2025-02-02T20:30:00+00:00",
    "date_of_last_play": "2025-02-02T20:30:00+00:00",
    "first_minted_moment_date": null,
    "last_minted_moment_date": null,
    "inserted_at": "2026-05-16T00:45:04.809072+00:00",
    "updated_at": "2025-03-19T21:10:47.343179+00:00"
  }
]
```

---

## `topshot.plays`

**Description:** Source highlight-play record. One play may back many editions (Common + Rare + Legendary parallels). Source: asset_nba_play.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `play_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `play_name` | string | text | yes |  |
| `play_focus` | string | text | yes |  |
| `play_category` | string | text | yes |  |
| `play_type` | string | text | yes |  |
| `play_status` | string | text | yes | Lifecycle status from data team. PUBLISHED = live in app. |
| `version` | string | text | yes |  |
| `date_of_play` | string | timestamp with time zone | yes |  |
| `league` | string | text | yes |  |
| `season_code` | string | text | yes |  |
| `season_name` | string | text | yes |  |
| `description` | string | text | yes |  |
| `short_description` | string | text | yes |  |
| `override_headline` | string | text | yes |  |
| `player_id` | string | text | yes |  |
| `player_name` | string | text | yes |  |
| `player_first_name` | string | text | yes |  |
| `player_last_name` | string | text | yes |  |
| `player_last_known_team_id` | string | text | yes |  |
| `player_last_known_current_team_name` | string | text | yes |  |
| `jersey_number_at_moment` | string | text | yes |  |
| `primary_position_at_moment` | string | text | yes |  |
| `team_at_moment_team_id` | string | text | yes |  |
| `team_at_moment_historical_name` | string | text | yes |  |
| `team_at_moment_current_name` | string | text | yes |  |
| `home_team_team_id` | string | text | yes |  |
| `home_team_historical_name` | string | text | yes |  |
| `home_team_current_name` | string | text | yes |  |
| `away_team_team_id` | string | text | yes |  |
| `away_team_historical_name` | string | text | yes |  |
| `away_team_current_name` | string | text | yes |  |
| `home_team_score` | integer | integer | yes |  |
| `away_team_score` | integer | integer | yes |  |
| `key_stats` | array | text[] | yes | Stat lines from the play (BQ REPEATED STRING). |
| `image_urls` | array | text[] | yes |  |
| `video_urls` | ? | jsonb | yes | BQ REPEATED RECORD<url, video_length_miliseconds>. Stored as jsonb array of objects. |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
9556
```

### Sample (5 rows)

```json
[
  {
    "play_id": "d5363794-412d-4fe4-8c17-96a431a5f2ba",
    "play_name": null,
    "play_focus": "TEAM",
    "play_category": "",
    "play_type": "",
    "play_status": "RECEIVED",
    "version": "2",
    "date_of_play": null,
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "player_id": null,
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "team_at_moment_current_name": null,
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "home_team_current_name": null,
    "away_team_team_id": null,
    "away_team_historical_name": null,
    "away_team_current_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "inserted_at": "2026-05-16T00:48:38.713433+00:00",
    "updated_at": "2026-05-16T13:57:38.683399+00:00"
  },
  {
    "play_id": "a16dccee-37be-4b02-af51-f5987d8d9ead",
    "play_name": null,
    "play_focus": "TEAM",
    "play_category": "",
    "play_type": "",
    "play_status": "RECEIVED",
    "version": "2",
    "date_of_play": null,
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "player_id": null,
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "team_at_moment_current_name": null,
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "home_team_current_name": null,
    "away_team_team_id": null,
    "away_team_historical_name": null,
    "away_team_current_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "inserted_at": "2026-05-16T00:48:38.713433+00:00",
    "updated_at": "2026-05-16T13:57:38.683399+00:00"
  },
  {
    "play_id": "bad2265a-854e-45e6-bcb0-fa02b93b3612",
    "play_name": null,
    "play_focus": "TEAM",
    "play_category": "PLAY_COMING_SOON",
    "play_type": "PLAY_COMING_SOON",
    "play_status": "RECEIVED",
    "version": "2",
    "date_of_play": null,
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "player_id": null,
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "team_at_moment_current_name": null,
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "home_team_current_name": null,
    "away_team_team_id": null,
    "away_team_historical_name": null,
    "away_team_current_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "inserted_at": "2026-05-16T00:48:38.713433+00:00",
    "updated_at": "2026-05-16T13:57:38.683399+00:00"
  },
  {
    "play_id": "522d91c8-738b-4811-a5f6-0538b7724940",
    "play_name": null,
    "play_focus": "TEAM",
    "play_category": "",
    "play_type": "",
    "play_status": "RECEIVED",
    "version": "2",
    "date_of_play": null,
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "player_id": null,
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "team_at_moment_current_name": null,
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "home_team_current_name": null,
    "away_team_team_id": null,
    "away_team_historical_name": null,
    "away_team_current_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "inserted_at": "2026-05-16T00:48:38.713433+00:00",
    "updated_at": "2026-05-16T13:57:38.683399+00:00"
  },
  {
    "play_id": "ea466143-88bc-4150-8afe-509472d82506",
    "play_name": null,
    "play_focus": "TEAM",
    "play_category": "",
    "play_type": "",
    "play_status": "RECEIVED",
    "version": "2",
    "date_of_play": null,
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "player_id": null,
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "team_at_moment_current_name": null,
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "home_team_current_name": null,
    "away_team_team_id": null,
    "away_team_historical_name": null,
    "away_team_current_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "inserted_at": "2026-05-16T00:48:38.713433+00:00",
    "updated_at": "2026-05-16T13:57:38.683399+00:00"
  }
]
```

---

## `topshot.positions`

**Description:** Player position lookup (PG, SG, SF, PF, C, etc.). Source: asset_nba_position.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `position` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `position_name` | string | text | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.seasons`

**Description:** Season lookup (e.g. 2020-21, 2021-22). Source: asset_nba_season.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `season_code` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `season_name` | string | text | yes |  |
| `league` | string | text | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.series`

**Description:** Top Shot series (e.g. Series 1, 2, 3, 4). Source: asset_nba_series.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `series_number` | integer | integer | NO | Note: This is a Primary Key.<pk/> |
| `series_name` | string | text | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.sets`

**Description:** Top Shot Sets (e.g. "Base Set", "Metallic Gold LE", "Anthology"). Source: asset_nba_set.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `set_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `set_name` | string | text | yes |  |
| `set_flow_id` | string | text | yes |  |
| `series_number` | integer | integer | yes |  |
| `series_name` | string | text | yes |  |
| `version` | string | text | yes |  |
| `primary_league` | string | text | yes |  |
| `secondary_league` | string | text | yes |  |
| `leagues` | array | text[] | yes |  |
| `description` | string | text | yes |  |
| `is_locked` | boolean | boolean | yes |  |
| `is_minted` | boolean | boolean | yes |  |
| `is_hidden` | boolean | boolean | yes |  |
| `set_tier_id` | string | text | yes |  |
| `set_tier_name` | string | text | yes | Tier label of the set itself (distinct from per-edition tier). Examples: Common, Fandom, Rare, Legendary, Ultimate, Anthology. |
| `set_rarity` | integer | integer | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
268
```

### Sample (5 rows)

```json
[
  {
    "set_id": "a156f083-e902-49d3-a113-bd61702c336a",
    "set_name": "Denied! - Series 1",
    "set_flow_id": "10",
    "series_number": 1,
    "series_name": "Series 1",
    "version": "4",
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "leagues": [
      "LEAGUE_NBA"
    ],
    "description": null,
    "is_locked": true,
    "is_minted": true,
    "is_hidden": false,
    "set_tier_id": "NBA_RARE",
    "set_tier_name": "Rare",
    "set_rarity": 2,
    "inserted_at": "2026-05-16T00:45:06.6535+00:00",
    "updated_at": "2026-05-16T13:57:22.704973+00:00"
  },
  {
    "set_id": "891987bc-a5c0-404e-8486-1735a330a81a",
    "set_name": "Rookie Debut - 8",
    "set_flow_id": "219",
    "series_number": 8,
    "series_name": "8",
    "version": "6",
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "leagues": [
      "LEAGUE_NBA"
    ],
    "description": null,
    "is_locked": false,
    "is_minted": true,
    "is_hidden": false,
    "set_tier_id": "NBA_COMMON",
    "set_tier_name": "Common",
    "set_rarity": 1,
    "inserted_at": "2026-05-16T00:45:06.6535+00:00",
    "updated_at": "2026-05-16T13:57:22.704973+00:00"
  },
  {
    "set_id": "dbcccc63-a84b-46c0-b759-a1c39d67ab2f",
    "set_name": "Vintage Vibes - 8",
    "set_flow_id": "225",
    "series_number": 8,
    "series_name": "8",
    "version": "6",
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "leagues": [
      "LEAGUE_NBA"
    ],
    "description": null,
    "is_locked": false,
    "is_minted": true,
    "is_hidden": false,
    "set_tier_id": "NBA_COMMON",
    "set_tier_name": "Common",
    "set_rarity": 1,
    "inserted_at": "2026-05-16T00:45:06.6535+00:00",
    "updated_at": "2026-05-16T13:57:22.704973+00:00"
  },
  {
    "set_id": "a494c64e-9e93-418c-8934-f331ee47a39b",
    "set_name": "From the Top - Series 1",
    "set_flow_id": "12",
    "series_number": 1,
    "series_name": "Series 1",
    "version": "3",
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "leagues": [
      "LEAGUE_NBA"
    ],
    "description": null,
    "is_locked": true,
    "is_minted": true,
    "is_hidden": false,
    "set_tier_id": "NBA_LEGENDARY",
    "set_tier_name": "Legendary",
    "set_rarity": 3,
    "inserted_at": "2026-05-16T00:45:06.6535+00:00",
    "updated_at": "2026-05-16T13:57:22.704973+00:00"
  },
  {
    "set_id": "cb6bf463-78cf-4603-ac71-19cdd4cb08fd",
    "set_name": "Extra Spice - 8",
    "set_flow_id": "240",
    "series_number": 8,
    "series_name": "8",
    "version": "9",
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "leagues": [
      "LEAGUE_NBA"
    ],
    "description": "Extra Spice is a set that could only happen in basketball. No helmets, no pads, just personality pouring through every play. Featuring Wembanyama, LeBron, Curry, Luka, Morant, and Giannis, this set is full of the handles that broke ankles, the deep threes that had no business going in, the passes that defied geometry, and the celebrations that remind you there's nothing else like this game. Twenty moments of pure flavor.",
    "is_locked": true,
    "is_minted": true,
    "is_hidden": false,
    "set_tier_id": "NBA_COMMON",
    "set_tier_name": "Common",
    "set_rarity": 1,
    "inserted_at": "2026-05-16T00:45:06.6535+00:00",
    "updated_at": "2026-05-16T13:57:22.704973+00:00"
  }
]
```

---

## `topshot.team_history`

**Description:** Historical team names. A single team_id may have multiple rows across rename eras (e.g., Charlotte Bobcats → Hornets). Source: asset_nba_team_history.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `team_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `full_name` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `alternate_name` | string | text | yes |  |
| `current_full_name` | string | text | yes |  |
| `safe_name` | string | text | yes |  |
| `league` | string | text | yes |  |
| `first_year` | integer | integer | yes |  |
| `last_year` | integer | integer | yes |  |
| `is_current_name` | boolean | boolean | yes |  |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
0
```

### Sample (5 rows)

```json
[]
```

---

## `topshot.teams`

**Description:** NBA teams (current roster). Source: asset_nba_team. team_id is stable across renames.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `team_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `league` | string | text | yes |  |
| `team_name` | string | text | yes |  |
| `team_alternate_name` | string | text | yes |  |
| `team_safe_name` | string | text | yes | Big Query safe name — stable URL-friendly slug for the team. |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
58
```

### Sample (5 rows)

```json
[
  {
    "team_id": "1610612737",
    "league": "LEAGUE_NBA",
    "team_name": null,
    "team_alternate_name": null,
    "team_safe_name": null,
    "inserted_at": "2026-05-16T00:45:01.993522+00:00",
    "updated_at": "2020-05-26T22:39:41.778345+00:00"
  },
  {
    "team_id": "1610612739",
    "league": "LEAGUE_NBA",
    "team_name": null,
    "team_alternate_name": null,
    "team_safe_name": null,
    "inserted_at": "2026-05-16T00:45:01.993522+00:00",
    "updated_at": "2020-05-26T22:39:41.778345+00:00"
  },
  {
    "team_id": "1610612745",
    "league": "LEAGUE_NBA",
    "team_name": null,
    "team_alternate_name": null,
    "team_safe_name": null,
    "inserted_at": "2026-05-16T00:45:01.993522+00:00",
    "updated_at": "2020-05-26T22:55:33.33498+00:00"
  },
  {
    "team_id": "1610612756",
    "league": "LEAGUE_NBA",
    "team_name": null,
    "team_alternate_name": null,
    "team_safe_name": null,
    "inserted_at": "2026-05-16T00:45:01.993522+00:00",
    "updated_at": "2020-05-26T22:55:40.64397+00:00"
  },
  {
    "team_id": "1610612744",
    "league": "LEAGUE_NBA",
    "team_name": null,
    "team_alternate_name": null,
    "team_safe_name": null,
    "inserted_at": "2026-05-16T00:45:01.993522+00:00",
    "updated_at": "2020-05-26T22:55:40.64397+00:00"
  }
]
```

---

## `topshot.transactions`

**Description:** Transactions involving NBA Top Shot moments (P2P, OFFER, DIRECT primary, pack purchases as filtered by ETL). Source: transaction filtered to asset_type_id=MOMENT. PII (country/province/buyer_id/seller_id/buyer_type_id/buyer_is_guest) dropped at ETL time.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `transaction_id` | string | text | NO | Note: This is a Primary Key.<pk/> |
| `moment_id` | string | text | yes |  |
| `asset_type_id` | string | text | yes |  |
| `transaction_type_id` | string | text | yes | P2P=peer-to-peer secondary, OFFER=collector offer accepted, DIRECT=primary sale, TICKET=ticketed drop entry, GIFT=user-to-user transfer, AIR=airdrop. |
| `transaction_state_id` | string | text | yes | Terminal: SUCCEEDED, CANCELLED, FAILED. Non-terminal: PENDING, UNKNOWN, UNMAPPED. ETL only ingests SUCCEEDED for revenue analytics by default (other states available for forensics). |
| `platform` | string | text | yes |  |
| `buyer_safe_name` | string | text | yes | Public TS username of buyer. Already public on Top Shot site. Internal buyer_id NOT mirrored here. |
| `seller_safe_name` | string | text | yes | Public TS username of seller. Already public on Top Shot site. Internal seller_id NOT mirrored here. |
| `client_marketplace_id` | string | text | yes |  |
| `client_marketplace_safe_name` | string | text | yes | Distinguishes marketplaces (e.g. Top Shot proper vs Gaia vs Flunks). Use for marketplace-volume breakdowns. |
| `amount` | number | numeric | yes |  |
| `currency` | string | text | yes |  |
| `gross_amount_usd` | number | numeric | yes |  |
| `net_amount_usd` | number | numeric | yes |  |
| `list_price_usd` | number | numeric | yes |  |
| `discount_amount_usd` | number | numeric | yes |  |
| `discount_type` | string | text | yes |  |
| `promo_code` | string | text | yes |  |
| `is_preorder` | boolean | boolean | yes |  |
| `has_payment` | boolean | boolean | yes |  |
| `payment_type` | string | text | yes |  |
| `completed_at` | string | timestamp with time zone | yes |  |
| `offer_created_at` | string | timestamp with time zone | yes |  |
| `source_updated_at` | string | timestamp with time zone | yes | Source-system last update — when the transaction last changed in the backend (BQ updated_at). |
| `row_updated_at` | string | timestamp with time zone | yes | Data-platform ETL cursor — when the row last changed in BQ (BQ row_updated_at). USE THIS as the incremental ETL high-watermark. |
| `inserted_at` | string | timestamp with time zone | NO |  |
| `updated_at` | string | timestamp with time zone | NO |  |

### Row count

```
2487715
```

### Sample (5 rows)

```json
[
  {
    "transaction_id": "049300eb-00f1-494a-9d4e-e95c2190bb1a",
    "moment_id": "efd7bb51-6881-4af8-b9c7-33e48020ef27",
    "asset_type_id": "MOMENT",
    "transaction_type_id": "P2P",
    "transaction_state_id": "SUCCEEDED",
    "platform": "WEB",
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "client_marketplace_id": null,
    "client_marketplace_safe_name": null,
    "amount": 1400,
    "currency": "USD",
    "gross_amount_usd": 14,
    "net_amount_usd": 0.35,
    "list_price_usd": 14,
    "discount_amount_usd": null,
    "discount_type": null,
    "promo_code": null,
    "is_preorder": false,
    "has_payment": true,
    "payment_type": "DAPPER_CREDITS",
    "completed_at": "2025-05-16T01:51:13.966338+00:00",
    "offer_created_at": null,
    "source_updated_at": "2025-05-16T01:51:13.956943+00:00",
    "row_updated_at": "2026-05-16T02:18:54.651875+00:00",
    "inserted_at": "2026-05-16T03:01:58.340045+00:00",
    "updated_at": "2026-05-16T03:01:58.340045+00:00"
  },
  {
    "transaction_id": "a69efa29-b365-43a9-aa8e-ebe88eb74f3b",
    "moment_id": "b6c90ca7-0f76-4846-a71b-e51bb1f75d5b",
    "asset_type_id": "MOMENT",
    "transaction_type_id": "OFFER",
    "transaction_state_id": "SUCCEEDED",
    "platform": "WEB",
    "buyer_safe_name": null,
    "seller_safe_name": null,
    "client_marketplace_id": null,
    "client_marketplace_safe_name": null,
    "amount": 100,
    "currency": "USD",
    "gross_amount_usd": 1,
    "net_amount_usd": 0.025,
    "list_price_usd": null,
    "discount_amount_usd": null,
    "discount_type": null,
    "promo_code": null,
    "is_preorder": false,
    "has_payment": true,
    "payment_type": "DAPPER_CREDITS",
    "completed_at": "2025-05-16T01:51:23.216123+00:00",
    "offer_created_at": "2025-03-09T07:39:31.230882+00:00",
    "source_updated_at": "2025-05-16T01:51:23.742865+00:00",
    "row_updated_at": "2026-05-16T02:18:54.651875+00:00",
    "inserted_at": "2026-05-16T03:01:58.340045+00:00",
    "updated_at": "2026-05-16T03:01:58.340045+00:00"
  },
  {
    "transaction_id": "6c206551-2759-4a45-ad84-b8c602636b5b",
    "moment_id": "e116b36c-7a97-467a-9d0a-b42e2368b229",
    "asset_type_id": "PACK",
    "transaction_type_id": "DIRECT",
    "transaction_state_id": "SUCCEEDED",
    "platform": "WEB",
    "buyer_safe_name": null,
    "seller_safe_name": "nba_top_shot",
    "client_marketplace_id": null,
    "client_marketplace_safe_name": null,
    "amount": 10000,
    "currency": "USD",
    "gross_amount_usd": 100,
    "net_amount_usd": 70,
    "list_price_usd": 100,
    "discount_amount_usd": null,
    "discount_type": null,
    "promo_code": null,
    "is_preorder": false,
    "has_payment": true,
    "payment_type": "DAPPER_CREDITS",
    "completed_at": "2025-05-16T01:51:25.143856+00:00",
    "offer_created_at": null,
    "source_updated_at": "2025-05-16T01:51:25.138779+00:00",
    "row_updated_at": "2026-05-16T02:18:54.651875+00:00",
    "inserted_at": "2026-05-16T03:01:58.340045+00:00",
    "updated_at": "2026-05-16T03:01:58.340045+00:00"
  },
  {
    "transaction_id": "fd0cc1fb-ec27-4d95-a7f5-707e3cf49fc2",
    "moment_id": "d9f39791-cbfa-4f1f-8561-77e0de0b8fa2",
    "asset_type_id": "PACK",
    "transaction_type_id": "DIRECT",
    "transaction_state_id": "SUCCEEDED",
    "platform": "WEB",
    "buyer_safe_name": null,
    "seller_safe_name": "nba_top_shot",
    "client_marketplace_id": null,
    "client_marketplace_safe_name": null,
    "amount": 5700,
    "currency": "USD",
    "gross_amount_usd": 57,
    "net_amount_usd": 39.9,
    "list_price_usd": 57,
    "discount_amount_usd": null,
    "discount_type": null,
    "promo_code": null,
    "is_preorder": false,
    "has_payment": true,
    "payment_type": "DAPPER_CREDITS",
    "completed_at": "2025-05-16T01:51:25.7802+00:00",
    "offer_created_at": null,
    "source_updated_at": "2025-05-16T01:51:25.776576+00:00",
    "row_updated_at": "2026-05-16T02:18:54.651875+00:00",
    "inserted_at": "2026-05-16T03:01:58.340045+00:00",
    "updated_at": "2026-05-16T03:01:58.340045+00:00"
  },
  {
    "transaction_id": "bf57db3c-e9bb-4333-af28-7f6243625f2b",
    "moment_id": "d9f39791-cbfa-4f1f-8561-77e0de0b8fa2",
    "asset_type_id": "PACK",
    "transaction_type_id": "DIRECT",
    "transaction_state_id": "SUCCEEDED",
    "platform": "WEB",
    "buyer_safe_name": null,
    "seller_safe_name": "nba_top_shot",
    "client_marketplace_id": null,
    "client_marketplace_safe_name": null,
    "amount": 1900,
    "currency": "USD",
    "gross_amount_usd": 19,
    "net_amount_usd": 13.3,
    "list_price_usd": 19,
    "discount_amount_usd": null,
    "discount_type": null,
    "promo_code": null,
    "is_preorder": false,
    "has_payment": true,
    "payment_type": "DAPPER_CREDITS",
    "completed_at": "2025-05-16T01:51:26.502166+00:00",
    "offer_created_at": null,
    "source_updated_at": "2025-05-16T01:51:26.497307+00:00",
    "row_updated_at": "2026-05-16T02:18:54.651875+00:00",
    "inserted_at": "2026-05-16T03:01:58.340045+00:00",
    "updated_at": "2026-05-16T03:01:58.340045+00:00"
  }
]
```

---

## `topshot.v_validation_latest`

**Description:** Most-recent run per check_name. Backs /admin/data-quality dashboard.

### Columns

| Name | Type | Format | Nullable | Description |
|---|---|---|---|---|
| `id` | string | uuid | yes | Note: This is a Primary Key.<pk/> |
| `check_name` | string | text | yes |  |
| `ran_at` | string | timestamp with time zone | yes |  |
| `bq_value` | ? | jsonb | yes |  |
| `sb_value` | ? | jsonb | yes |  |
| `metric` | string | text | yes |  |
| `metric_value` | number | numeric | yes |  |
| `threshold` | number | numeric | yes |  |
| `passed` | boolean | boolean | yes |  |
| `notes` | string | text | yes |  |

### Row count

```
8
```

### Sample (5 rows)

```json
[
  {
    "id": "ad1739be-8e95-4ddf-b19e-b063d53676a7",
    "check_name": "distinct_moments_traded_24h_pct_delta",
    "ran_at": "2026-05-16T14:30:38.903392+00:00",
    "bq_value": 4768,
    "sb_value": 3512,
    "metric": "pct_delta",
    "metric_value": 0.2634228187919463,
    "threshold": 0.1,
    "passed": false,
    "notes": null
  },
  {
    "id": "476828a2-9290-4184-8dff-af15476eb535",
    "check_name": "largest_sale_24h_abs_delta",
    "ran_at": "2026-05-16T14:30:39.678277+00:00",
    "bq_value": 2212,
    "sb_value": 2212,
    "metric": "abs_delta",
    "metric_value": 0,
    "threshold": 1,
    "passed": true,
    "notes": null
  },
  {
    "id": "b340937b-9dcb-439d-9dee-9e06e625d211",
    "check_name": "moments_table_coverage_ratio",
    "ran_at": "2026-05-16T14:30:40.553725+00:00",
    "bq_value": 19919,
    "sb_value": 17551,
    "metric": "ratio",
    "metric_value": 0.881118530046689,
    "threshold": 0.95,
    "passed": false,
    "notes": null
  },
  {
    "id": "ed32f8c9-9b67-4c96-84d6-a4d6386108a3",
    "check_name": "top_players_24h_spearman",
    "ran_at": "2026-05-16T14:30:34.271792+00:00",
    "bq_value": [
      "Luka Dončić",
      "LeBron James",
      "Anthony Edwards",
      "Cooper Flagg",
      "Victor Wembanyama",
      "Stephon Castle",
      "VJ Edgecombe",
      "Shai Gilgeous-Alexander",
      "Kevin Durant",
      "Caitlin Clark"
    ],
    "sb_value": [
      "Luka Dončić",
      "LeBron James",
      "Kevin Durant",
      "Victor Wembanyama",
      "Cooper Flagg",
      "Matas Buzelis",
      "Ace Bailey",
      "Caitlin Clark",
      "Anthony Edwards",
      "Stephon Castle"
    ],
    "metric": "spearman",
    "metric_value": 0.5,
    "threshold": 0.7,
    "passed": false,
    "notes": null
  },
  {
    "id": "02b2a484-245f-4b82-af91-0c37b2039fab",
    "check_name": "top_players_7d_spearman",
    "ran_at": "2026-05-16T14:30:36.140499+00:00",
    "bq_value": [
      "Victor Wembanyama",
      "Cooper Flagg",
      "Luka Dončić",
      "Nikola Jokić",
      "Shai Gilgeous-Alexander",
      "Dylan Harper",
      "VJ Edgecombe",
      "LeBron James",
      "Magic Johnson",
      "Cade Cunningham"
    ],
    "sb_value": [
      "Victor Wembanyama",
      "Cooper Flagg",
      "Luka Dončić",
      "Shai Gilgeous-Alexander",
      "Magic Johnson",
      "LeBron James",
      "Anthony Edwards",
      "Dylan Harper",
      "VJ Edgecombe",
      "Donovan Mitchell"
    ],
    "metric": "spearman",
    "metric_value": 0.7857142857142857,
    "threshold": 0.7,
    "passed": true,
    "notes": null
  }
]
```

---

## Probe complete.

**Finished:** 2026-05-18T01:59:41.787Z