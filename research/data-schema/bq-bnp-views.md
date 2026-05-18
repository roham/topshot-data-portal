# BigQuery Schema Ground Truth — `dapperlabs-data.production_sem_open.*`

**Generated:** 2026-05-18T01:57:14.215Z
**Project:** `dapperlabs-data`
**Dataset:** `production_sem_open`
**Auth:** Node @google-cloud/bigquery ADC (same path as ETL — compute SA on kaaos-daemon)

**Why this exists:** to eliminate the V5 schema-from-imagination failure mode.
Every column type, mode, and description below is the live ground truth at probe time.
Any portal query referencing an attribute not listed here is invalid and the audit must reject it.

---

## `asset_nba_player`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_player`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `player_id` | STRING | NULLABLE |  |
| `league` | STRING | NULLABLE |  |
| `full_name` | STRING | NULLABLE |  |
| `first_name` | STRING | NULLABLE |  |
| `last_name` | STRING | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE |  |
| `updated_at` | TIMESTAMP | NULLABLE |  |
| `draft_year` | STRING | NULLABLE |  |
| `draft_round` | STRING | NULLABLE |  |
| `draft_selection` | STRING | NULLABLE |  |
| `draft_team_team_id` | STRING | NULLABLE |  |
| `birthplace` | STRING | NULLABLE |  |
| `birthdate` | TIMESTAMP | NULLABLE |  |
| `last_known_primary_postion` | STRING | NULLABLE |  |
| `last_known_team_id` | STRING | NULLABLE |  |
| `last_known_team_full_name` | STRING | NULLABLE |  |
| `draft_team_full_name` | STRING | NULLABLE |  |
| `date_of_first_play` | TIMESTAMP | NULLABLE |  |
| `date_of_last_play` | TIMESTAMP | NULLABLE |  |
| `first_minted_moment_date` | TIMESTAMP | NULLABLE |  |
| `last_minted_moment_date` | TIMESTAMP | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`row_updated_at`)

```
{
  "min_ts": "2026-05-18 01:05:21",
  "max_ts": "2026-05-18 01:05:21"
}
```

### Row Count

```
{
  "row_count": 1287
}
```

### Sample (5 rows)

```json
[
  {
    "player_id": "2222",
    "league": "LEAGUE_NBA",
    "full_name": "Gerald Wallace",
    "first_name": "Gerald",
    "last_name": "Wallace",
    "created_at": "2021-10-13T16:34:28.307685000Z",
    "updated_at": "2021-10-13T16:34:28.307685000Z",
    "draft_year": "2001",
    "draft_round": "1",
    "draft_selection": "25",
    "draft_team_team_id": null,
    "birthplace": "Sylacauga, AL, USA",
    "birthdate": "1982-07-23T00:00:00.000Z",
    "last_known_primary_postion": "SF",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "draft_team_full_name": null,
    "date_of_first_play": "2005-11-27T00:30:00.000Z",
    "date_of_last_play": "2006-01-16T18:00:00.000Z",
    "first_minted_moment_date": "2021-10-14T01:26:10.808618000Z",
    "last_minted_moment_date": "2021-10-14T02:13:38.089564000Z",
    "row_updated_at": "2026-05-18T01:05:21.320633000Z",
    "row_created_at": "2026-05-18T01:05:21.320633000Z",
    "row_checksum": 6084615488825026000
  },
  {
    "player_id": "1719",
    "league": "LEAGUE_NBA",
    "full_name": "Bonzi Wells",
    "first_name": "Bonzi",
    "last_name": "Wells",
    "created_at": "2021-10-13T17:13:43.516444000Z",
    "updated_at": "2021-10-13T17:13:43.516444000Z",
    "draft_year": "1998",
    "draft_round": "1",
    "draft_selection": "11",
    "draft_team_team_id": null,
    "birthplace": "Muncie, IN, USA",
    "birthdate": "1976-09-28T00:00:00.000Z",
    "last_known_primary_postion": "SG",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "draft_team_full_name": null,
    "date_of_first_play": "2006-05-01T02:00:00.000Z",
    "date_of_last_play": "2006-05-01T02:00:00.000Z",
    "first_minted_moment_date": "2021-10-14T01:26:16.491369000Z",
    "last_minted_moment_date": "2021-10-14T03:00:46.990468000Z",
    "row_updated_at": "2026-05-18T01:05:21.320633000Z",
    "row_created_at": "2026-05-18T01:05:21.320633000Z",
    "row_checksum": 5738951893378840000
  },
  {
    "player_id": "204",
    "league": "LEAGUE_NBA",
    "full_name": "Jeff Hornacek",
    "first_name": "Jeff",
    "last_name": "Hornacek",
    "created_at": "2022-09-15T18:29:07.089145000Z",
    "updated_at": "2022-09-15T18:29:07.089145000Z",
    "draft_year": null,
    "draft_round": null,
    "draft_selection": null,
    "draft_team_team_id": null,
    "birthplace": null,
    "birthdate": null,
    "last_known_primary_postion": "SG",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "draft_team_full_name": null,
    "date_of_first_play": "1987-01-26T12:00:00.000Z",
    "date_of_last_play": "2000-02-12T12:00:00.000Z",
    "first_minted_moment_date": "2022-02-16T16:24:53.480094000Z",
    "last_minted_moment_date": "2022-09-16T20:36:35.348131000Z",
    "row_updated_at": "2026-05-18T01:05:21.320633000Z",
    "row_created_at": "2026-05-18T01:05:21.320633000Z",
    "row_checksum": -345292250379496060
  },
  {
    "player_id": "990",
    "league": "LEAGUE_NBA",
    "full_name": "Malik Rose",
    "first_name": "Malik",
    "last_name": "Rose",
    "created_at": "2026-05-14T12:01:15.911630000Z",
    "updated_at": "2026-05-14T12:01:15.911630000Z",
    "draft_year": "1996",
    "draft_round": "2",
    "draft_selection": "44",
    "draft_team_team_id": null,
    "birthplace": "Philadelphia, PA, USA",
    "birthdate": "1974-11-23T00:00:00.000Z",
    "last_known_primary_postion": "PF",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "draft_team_full_name": null,
    "date_of_first_play": "2003-06-08T23:00:00.000Z",
    "date_of_last_play": "2003-06-08T23:00:00.000Z",
    "first_minted_moment_date": "2026-05-15T15:35:35.867474000Z",
    "last_minted_moment_date": "2026-05-15T15:36:16.872200000Z",
    "row_updated_at": "2026-05-18T01:05:21.320633000Z",
    "row_created_at": "2026-05-18T01:05:21.320633000Z",
    "row_checksum": 5059749748028023000
  },
  {
    "player_id": "77160",
    "league": "LEAGUE_NBA",
    "full_name": "Marques Johnson",
    "first_name": "Marques",
    "last_name": "Johnson",
    "created_at": "2026-03-09T14:10:38.058999000Z",
    "updated_at": "2026-03-09T14:10:38.058999000Z",
    "draft_year": "1977",
    "draft_round": "1",
    "draft_selection": "3",
    "draft_team_team_id": null,
    "birthplace": "Los Angeles, CA, USA",
    "birthdate": "1956-02-08T00:00:00.000Z",
    "last_known_primary_postion": "SF",
    "last_known_team_id": null,
    "last_known_team_full_name": null,
    "draft_team_full_name": null,
    "date_of_first_play": "1984-05-05T23:00:00.000Z",
    "date_of_last_play": "1984-05-05T23:00:00.000Z",
    "first_minted_moment_date": "2026-03-12T16:37:37.820678000Z",
    "last_minted_moment_date": "2026-03-12T16:39:55.328035000Z",
    "row_updated_at": "2026-05-18T01:05:21.320633000Z",
    "row_created_at": "2026-05-18T01:05:21.320633000Z",
    "row_checksum": -8901136469807370000
  }
]
```

---

## `asset_nba_team`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_team`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `team_id` | STRING | NULLABLE |  |
| `league` | STRING | NULLABLE |  |
| `full_name` | STRING | NULLABLE |  |
| `alternate_name` | STRING | NULLABLE |  |
| `safe_name` | STRING | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE |  |
| `updated_at` | TIMESTAMP | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`row_updated_at`)

```
{
  "min_ts": "2026-05-18 01:04:58",
  "max_ts": "2026-05-18 01:04:58"
}
```

### Row Count

```
{
  "row_count": 58
}
```

### Sample (5 rows)

```json
[
  {
    "team_id": "1610612739",
    "league": "LEAGUE_NBA",
    "full_name": "Cleveland Cavaliers",
    "alternate_name": "Cavaliers",
    "safe_name": "cleveland_cavaliers",
    "created_at": "2020-05-26T22:39:41.778345000Z",
    "updated_at": "2020-05-26T22:39:41.778345000Z",
    "row_updated_at": "2026-05-18T01:04:58.160841000Z",
    "row_created_at": "2026-05-18T01:04:58.160841000Z",
    "row_checksum": -5861119826092909000
  },
  {
    "team_id": "1610612737",
    "league": "LEAGUE_NBA",
    "full_name": "Atlanta Hawks",
    "alternate_name": "Hawks",
    "safe_name": "atlanta_hawks",
    "created_at": "2020-05-26T22:39:41.778345000Z",
    "updated_at": "2020-05-26T22:39:41.778345000Z",
    "row_updated_at": "2026-05-18T01:04:58.160841000Z",
    "row_created_at": "2026-05-18T01:04:58.160841000Z",
    "row_checksum": -8794283930637106000
  },
  {
    "team_id": "1610612745",
    "league": "LEAGUE_NBA",
    "full_name": "Houston Rockets",
    "alternate_name": "Rockets",
    "safe_name": "houston_rockets",
    "created_at": "2020-05-26T22:55:33.334980000Z",
    "updated_at": "2020-05-26T22:55:33.334980000Z",
    "row_updated_at": "2026-05-18T01:04:58.160841000Z",
    "row_created_at": "2026-05-18T01:04:58.160841000Z",
    "row_checksum": 177046449299800400
  },
  {
    "team_id": "1610612744",
    "league": "LEAGUE_NBA",
    "full_name": "Golden State Warriors",
    "alternate_name": "Warriors",
    "safe_name": "golden_state_warriors",
    "created_at": "2020-05-26T22:55:40.643970000Z",
    "updated_at": "2020-05-26T22:55:40.643970000Z",
    "row_updated_at": "2026-05-18T01:04:58.160841000Z",
    "row_created_at": "2026-05-18T01:04:58.160841000Z",
    "row_checksum": 1542432290639553500
  },
  {
    "team_id": "1610612756",
    "league": "LEAGUE_NBA",
    "full_name": "Phoenix Suns",
    "alternate_name": "Suns",
    "safe_name": "phoenix_suns",
    "created_at": "2020-05-26T22:55:40.643970000Z",
    "updated_at": "2020-05-26T22:55:40.643970000Z",
    "row_updated_at": "2026-05-18T01:04:58.160841000Z",
    "row_created_at": "2026-05-18T01:04:58.160841000Z",
    "row_checksum": -5122170545695175000
  }
]
```

---

## `asset_nba_set`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_set`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `set_id` | STRING | NULLABLE |  |
| `set_name` | STRING | NULLABLE |  |
| `set_flow_id` | STRING | NULLABLE |  |
| `series_number` | INTEGER | NULLABLE |  |
| `series_name` | STRING | NULLABLE |  |
| `version` | STRING | NULLABLE |  |
| `primary_league` | STRING | NULLABLE |  |
| `secondary_league` | STRING | NULLABLE |  |
| `leagues` | STRING | REPEATED |  |
| `description` | STRING | NULLABLE |  |
| `is_locked` | BOOLEAN | NULLABLE |  |
| `is_minted` | BOOLEAN | NULLABLE |  |
| `is_hidden` | BOOLEAN | NULLABLE |  |
| `set_tier_id` | STRING | NULLABLE |  |
| `set_tier_name` | STRING | NULLABLE |  |
| `set_rarity` | INTEGER | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`row_updated_at`)

```
{
  "min_ts": "2026-05-18 01:05:01",
  "max_ts": "2026-05-18 01:05:01"
}
```

### Row Count

```
{
  "row_count": 268
}
```

### Sample (5 rows)

```json
[
  {
    "set_id": "a079ed79-07f7-4ba8-ac46-d08130b78e31",
    "set_name": "Hustle and Show - 8",
    "set_flow_id": "236",
    "series_number": 8,
    "series_name": "8",
    "version": "9",
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "leagues": [
      "LEAGUE_NBA"
    ],
    "description": null,
    "is_locked": true,
    "is_minted": true,
    "is_hidden": false,
    "set_tier_id": "NBA_COMMON",
    "set_tier_name": "Common",
    "set_rarity": 1,
    "row_updated_at": "2026-05-18T01:05:01.988867000Z",
    "row_created_at": "2026-05-18T01:05:01.988867000Z",
    "row_checksum": -4680662215312815000
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
    "row_updated_at": "2026-05-18T01:05:01.988867000Z",
    "row_created_at": "2026-05-18T01:05:01.988867000Z",
    "row_checksum": 1818469767432319200
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
    "row_updated_at": "2026-05-18T01:05:01.988867000Z",
    "row_created_at": "2026-05-18T01:05:01.988867000Z",
    "row_checksum": 5940605314760692000
  },
  {
    "set_id": "edbf04d6-708b-4ab6-87b2-099ede1ab4a4",
    "set_name": "2026 NBA Playoffs - 8",
    "set_flow_id": "250",
    "series_number": 8,
    "series_name": "8",
    "version": "7",
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
    "row_updated_at": "2026-05-18T01:05:01.988867000Z",
    "row_created_at": "2026-05-18T01:05:01.988867000Z",
    "row_checksum": -387284753038893200
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
    "row_updated_at": "2026-05-18T01:05:01.988867000Z",
    "row_created_at": "2026-05-18T01:05:01.988867000Z",
    "row_checksum": -833919816258913300
  }
]
```

---

## `asset_nba_play`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_play`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `play_name` | STRING | NULLABLE |  |
| `play_id` | STRING | NULLABLE |  |
| `version` | STRING | NULLABLE |  |
| `date_of_play` | TIMESTAMP | NULLABLE |  |
| `play_category` | STRING | NULLABLE |  |
| `play_type` | STRING | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE |  |
| `updated_at` | TIMESTAMP | NULLABLE |  |
| `play_focus` | STRING | NULLABLE |  |
| `league` | STRING | NULLABLE |  |
| `season_code` | STRING | NULLABLE |  |
| `season_name` | STRING | NULLABLE |  |
| `description` | STRING | NULLABLE |  |
| `short_description` | STRING | NULLABLE |  |
| `override_headline` | STRING | NULLABLE |  |
| `team_at_moment_team_id` | STRING | NULLABLE |  |
| `team_at_moment_historical_name` | STRING | NULLABLE |  |
| `home_team_team_id` | STRING | NULLABLE |  |
| `home_team_historical_name` | STRING | NULLABLE |  |
| `away_team_team_id` | STRING | NULLABLE |  |
| `away_team__historical_name` | STRING | NULLABLE |  |
| `home_team_score` | INTEGER | NULLABLE |  |
| `away_team_score` | INTEGER | NULLABLE |  |
| `player_id` | STRING | NULLABLE |  |
| `jersey_number_at_moment` | STRING | NULLABLE |  |
| `primary_position_at_moment` | STRING | NULLABLE |  |
| `key_stats` | STRING | REPEATED |  |
| `image_urls` | STRING | REPEATED |  |
| `video_urls` | RECORD | REPEATED |  |
| `video_urls.url` | STRING | NULLABLE |  |
| `video_urls.video_length_miliseconds` | INTEGER | NULLABLE |  |
| `play_status` | STRING | NULLABLE |  |
| `player_name` | STRING | NULLABLE |  |
| `player_first_name` | STRING | NULLABLE |  |
| `player_last_name` | STRING | NULLABLE |  |
| `player_last_known_team_id` | STRING | NULLABLE |  |
| `player_last_known_current_team_name` | STRING | NULLABLE |  |
| `team_at_moment_current_name` | STRING | NULLABLE |  |
| `home_team_current_name` | STRING | NULLABLE |  |
| `away_team_current_name` | STRING | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`row_updated_at`)

```
{
  "min_ts": "2026-05-18 01:05:54",
  "max_ts": "2026-05-18 01:05:54"
}
```

### Row Count

```
{
  "row_count": 9556
}
```

### Sample (5 rows)

```json
[
  {
    "play_name": null,
    "play_id": "32e623f0-9970-444c-9eee-fcd8245b96f4",
    "version": "2",
    "date_of_play": null,
    "play_category": "",
    "play_type": "",
    "created_at": "2025-05-27T18:33:22.168143000Z",
    "updated_at": "2025-06-02T17:38:58.216668000Z",
    "play_focus": "TEAM",
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "away_team_team_id": null,
    "away_team__historical_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "player_id": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "play_status": "RECEIVED",
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "team_at_moment_current_name": null,
    "home_team_current_name": null,
    "away_team_current_name": null,
    "row_updated_at": "2026-05-18T01:05:54.796922000Z",
    "row_created_at": "2026-05-18T01:05:54.796922000Z",
    "row_checksum": -3090138194270544000
  },
  {
    "play_name": null,
    "play_id": "8c1b4bc2-ba69-4841-91c9-fa89cea1ba06",
    "version": "1",
    "date_of_play": null,
    "play_category": "BLOCK",
    "play_type": "BLOCK",
    "created_at": "2024-07-01T19:39:22.157016000Z",
    "updated_at": "2024-07-01T19:39:22.157016000Z",
    "play_focus": "TEAM",
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "away_team_team_id": null,
    "away_team__historical_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "player_id": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "play_status": "RECEIVED",
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "team_at_moment_current_name": null,
    "home_team_current_name": null,
    "away_team_current_name": null,
    "row_updated_at": "2026-05-18T01:05:54.796922000Z",
    "row_created_at": "2026-05-18T01:05:54.796922000Z",
    "row_checksum": -3912068952265107500
  },
  {
    "play_name": null,
    "play_id": "171b1ee7-2714-4cf8-b217-ccd7d8638430",
    "version": "2",
    "date_of_play": null,
    "play_category": "",
    "play_type": "",
    "created_at": "2025-07-29T14:29:42.710949000Z",
    "updated_at": "2025-07-29T14:30:51.317837000Z",
    "play_focus": "TEAM",
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "away_team_team_id": null,
    "away_team__historical_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "player_id": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "play_status": "RECEIVED",
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "team_at_moment_current_name": null,
    "home_team_current_name": null,
    "away_team_current_name": null,
    "row_updated_at": "2026-05-18T01:05:54.796922000Z",
    "row_created_at": "2026-05-18T01:05:54.796922000Z",
    "row_checksum": -5473230106776887000
  },
  {
    "play_name": null,
    "play_id": "e79cd972-b090-43f5-9e86-2cc2554378c2",
    "version": "1",
    "date_of_play": null,
    "play_category": "",
    "play_type": "",
    "created_at": "2025-04-30T14:08:27.218518000Z",
    "updated_at": "2025-04-30T14:08:27.218518000Z",
    "play_focus": "TEAM",
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "away_team_team_id": null,
    "away_team__historical_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "player_id": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "play_status": "RECEIVED",
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "team_at_moment_current_name": null,
    "home_team_current_name": null,
    "away_team_current_name": null,
    "row_updated_at": "2026-05-18T01:05:54.796922000Z",
    "row_created_at": "2026-05-18T01:05:54.796922000Z",
    "row_checksum": 1962873913300303600
  },
  {
    "play_name": null,
    "play_id": "e5c2a608-8558-452d-b71f-0a6f14a2d7e4",
    "version": "2",
    "date_of_play": null,
    "play_category": "",
    "play_type": "",
    "created_at": "2025-08-26T18:55:01.692748000Z",
    "updated_at": "2025-08-26T20:15:54.760033000Z",
    "play_focus": "TEAM",
    "league": "LEAGUE_UNSPECIFIED",
    "season_code": "",
    "season_name": "",
    "description": null,
    "short_description": null,
    "override_headline": null,
    "team_at_moment_team_id": "",
    "team_at_moment_historical_name": "",
    "home_team_team_id": null,
    "home_team_historical_name": null,
    "away_team_team_id": null,
    "away_team__historical_name": null,
    "home_team_score": null,
    "away_team_score": null,
    "player_id": null,
    "jersey_number_at_moment": null,
    "primary_position_at_moment": null,
    "key_stats": [],
    "image_urls": [],
    "video_urls": [],
    "play_status": "RECEIVED",
    "player_name": null,
    "player_first_name": null,
    "player_last_name": null,
    "player_last_known_team_id": null,
    "player_last_known_current_team_name": null,
    "team_at_moment_current_name": null,
    "home_team_current_name": null,
    "away_team_current_name": null,
    "row_updated_at": "2026-05-18T01:05:54.796922000Z",
    "row_created_at": "2026-05-18T01:05:54.796922000Z",
    "row_checksum": 4858045182759038000
  }
]
```

---

## `asset_nba_edition`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_edition`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `edition_id` | STRING | NULLABLE |  |
| `edition_name` | STRING | NULLABLE |  |
| `play_id` | STRING | NULLABLE |  |
| `play_name` | STRING | NULLABLE |  |
| `set_id` | STRING | NULLABLE |  |
| `set_name` | STRING | NULLABLE |  |
| `series_name` | STRING | NULLABLE |  |
| `description` | STRING | NULLABLE |  |
| `short_description` | STRING | NULLABLE |  |
| `image_urls` | STRING | REPEATED |  |
| `video_urls` | RECORD | REPEATED |  |
| `video_urls.url` | STRING | NULLABLE |  |
| `video_urls.video_length_miliseconds` | INTEGER | NULLABLE |  |
| `mint_count` | INTEGER | NULLABLE |  |
| `play_focus` | STRING | NULLABLE |  |
| `league` | STRING | NULLABLE |  |
| `player_id` | STRING | NULLABLE |  |
| `player_name` | STRING | NULLABLE |  |
| `player_first_name` | STRING | NULLABLE |  |
| `player_last_name` | STRING | NULLABLE |  |
| `player_jersey_number_at_moment` | STRING | NULLABLE |  |
| `player_last_known_current_team_name` | STRING | NULLABLE |  |
| `player_last_known_team_id` | STRING | NULLABLE |  |
| `player_primary_position_at_moment` | STRING | NULLABLE |  |
| `team_at_moment_team_id` | STRING | NULLABLE |  |
| `team_at_moment_historical_name` | STRING | NULLABLE |  |
| `team_at_moment_current_name` | STRING | NULLABLE |  |
| `tier_id` | STRING | NULLABLE |  |
| `tier_name` | STRING | NULLABLE |  |
| `rarity` | INTEGER | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`row_updated_at`)

```
{
  "min_ts": "2026-05-18 01:06:00",
  "max_ts": "2026-05-18 01:06:00"
}
```

### Row Count

```
{
  "row_count": 11904
}
```

### Sample (5 rows)

```json
[
  {
    "edition_id": "3806ab9e-bd18-4e8e-8534-1d0b05492b2d+6b515631-beb4-4224-8f34-122ce6d10a8e",
    "edition_name": null,
    "play_id": "6b515631-beb4-4224-8f34-122ce6d10a8e",
    "play_name": null,
    "set_id": "3806ab9e-bd18-4e8e-8534-1d0b05492b2d",
    "set_name": "NBA All-Star Classics - Series 3",
    "series_name": "Series 3",
    "description": "Don’t let the calm demeanor fool you, Los Angeles Lakers center Shaquille O’Neal knows all too well his own power. After patiently tracking an opponent’s drive attempt out of a pick and roll, the towering center leaps for the rock, spikes it mercilessly off the backboard and gets right back into position in the paint. O’Neal, named co-MVP of the 2000 NBA All-Star Game, held nothing back in the contest, dropping 22 points, nine rebounds and three blocks in the affair.",
    "short_description": "Shaquille O'Neal obliterates shot attempt, wins co-MVP of 2000 All-Star Game",
    "image_urls": [
      "https://storage.googleapis.com/assets-nbatopshot/players/GettyImages-72566343.jpeg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/oneal_s_block_2000asg_verdap_feb_13_2000_v2_vertical_9x16.mp4",
        "video_length_miliseconds": 12096
      },
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/oneal_s_block_2000asg_sqdap_feb_13_2000_v2_square.mp4",
        "video_length_miliseconds": 6912
      }
    ],
    "mint_count": 30,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "406",
    "player_name": "Shaquille O'Neal",
    "player_first_name": "Shaquille",
    "player_last_name": "O'Neal",
    "player_jersey_number_at_moment": "34",
    "player_last_known_current_team_name": null,
    "player_last_known_team_id": null,
    "player_primary_position_at_moment": "C",
    "team_at_moment_team_id": "99999002",
    "team_at_moment_historical_name": "Western Conference All-Stars",
    "team_at_moment_current_name": null,
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary",
    "rarity": 3,
    "row_updated_at": "2026-05-18T01:06:00.513775000Z",
    "row_created_at": "2026-05-18T01:06:00.513775000Z",
    "row_checksum": -5648211292275888000
  },
  {
    "edition_id": "8d38aed8-3c4a-4177-8612-b392a0b55d12+6b515631-beb4-4224-8f34-122ce6d10a8e",
    "edition_name": null,
    "play_id": "6b515631-beb4-4224-8f34-122ce6d10a8e",
    "play_name": null,
    "set_id": "8d38aed8-3c4a-4177-8612-b392a0b55d12",
    "set_name": "Platinum Ice - Series 3",
    "series_name": "Series 3",
    "description": "Don’t let the calm demeanor fool you, Los Angeles Lakers center Shaquille O’Neal knows all too well his own power. After patiently tracking an opponent’s drive attempt out of a pick and roll, the towering center leaps for the rock, spikes it mercilessly off the backboard and gets right back into position in the paint. O’Neal, named co-MVP of the 2000 NBA All-Star Game, held nothing back in the contest, dropping 22 points, nine rebounds and three blocks in the affair.",
    "short_description": "Shaquille O'Neal obliterates shot attempt, wins co-MVP of 2000 All-Star Game",
    "image_urls": [
      "https://storage.googleapis.com/assets-nbatopshot/players/GettyImages-72566343.jpeg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/oneal_s_block_2000asg_verdap_feb_13_2000_v2_vertical_9x16.mp4",
        "video_length_miliseconds": 12096
      },
      {
        "url": "https://storage.googleapis.com/assets-nbatopshot/plays/oneal_s_block_2000asg_sqdap_feb_13_2000_v2_square.mp4",
        "video_length_miliseconds": 6912
      }
    ],
    "mint_count": 3,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "406",
    "player_name": "Shaquille O'Neal",
    "player_first_name": "Shaquille",
    "player_last_name": "O'Neal",
    "player_jersey_number_at_moment": "34",
    "player_last_known_current_team_name": null,
    "player_last_known_team_id": null,
    "player_primary_position_at_moment": "C",
    "team_at_moment_team_id": "99999002",
    "team_at_moment_historical_name": "Western Conference All-Stars",
    "team_at_moment_current_name": null,
    "tier_id": "NBA_ULTIMATE",
    "tier_name": "Ultimate",
    "rarity": 4,
    "row_updated_at": "2026-05-18T01:06:00.513775000Z",
    "row_created_at": "2026-05-18T01:06:00.513775000Z",
    "row_checksum": 8973544110822150000
  },
  {
    "edition_id": "226e2269-f123-4034-842f-ccba9b7a1593+7d8e54fe-03ed-4783-9cbb-d7c6c9acd67e",
    "edition_name": "Adam Morrison - Charlotte Hornets - MIDRANGE - 2006-12-30 - The Tour - Series 4",
    "play_id": "7d8e54fe-03ed-4783-9cbb-d7c6c9acd67e",
    "play_name": "Adam Morrison - Charlotte Hornets - MIDRANGE - 2006-12-30",
    "set_id": "226e2269-f123-4034-842f-ccba9b7a1593",
    "set_name": "The Tour - Series 4",
    "series_name": "Series 4",
    "description": "Playing a fourth game in five days didn’t deter Adam Morrison from having the best performance of his career. The third overall selection in the 2006 NBA Draft went to work in the post against future Indiana Pacers All-Star Danny Granger, using a combination of strength and smooth footwork to gain an advantage on the low block. Following a few lateral dribbles against the capable defender, Morrison made his move and swished a difficult turnaround jumper with his right hand while drawing the foul. The Pacers had no answers for the 2006-07 All-Rookie Second Team forward, who lit them up for a career-high 30 points — 9 of 17 from the field and 10 of 11 at the stripe — along with six rebounds and two assists in a 113-102 Charlotte Bobcats victory on December 30, 2006.",
    "short_description": null,
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
    "mint_count": 804,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "200747",
    "player_name": "Adam Morrison",
    "player_first_name": "Adam",
    "player_last_name": "Morrison",
    "player_jersey_number_at_moment": "35",
    "player_last_known_current_team_name": null,
    "player_last_known_team_id": null,
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612766",
    "team_at_moment_historical_name": "Charlotte Bobcats",
    "team_at_moment_current_name": "Charlotte Hornets",
    "tier_id": "NBA_FANDOM",
    "tier_name": "Fandom",
    "rarity": null,
    "row_updated_at": "2026-05-18T01:06:00.513775000Z",
    "row_created_at": "2026-05-18T01:06:00.513775000Z",
    "row_checksum": -3920582609755660000
  },
  {
    "edition_id": "08225b1a-32ed-4253-82a6-808f54f156c0+981c479a-9a52-40bb-a194-7f4be48e9d63",
    "edition_name": "Adrian Dantley - Detroit Pistons - RIM - 1986-11-21 - Run It Back 1986-87 - Series 4",
    "play_id": "981c479a-9a52-40bb-a194-7f4be48e9d63",
    "play_name": "Adrian Dantley - Detroit Pistons - RIM - 1986-11-21",
    "set_id": "08225b1a-32ed-4253-82a6-808f54f156c0",
    "set_name": "Run It Back 1986-87 - Series 4",
    "series_name": "Series 4",
    "description": "Anyone who thinks efficiency was boring probably never saw Adrian Dantley play. Knowing that his Detroit Pistons frontcourt mates were skilled at gobbling up defensive rebounds, Dantley instinctively races the other way in anticipation of a Philadelphia 76ers miss. After catching a long outlet pass, the six-time All-Star adds some razzle dazzle to a routine finish, badly fooling the lone defender left in front of him by wrapping the ball around his back and capping the play with a stylish deuce. A bonafide scorer, Dantley was his normal efficient self, posting 27 points, four rebounds and four assists in his squad’s 120-110 road triumph on November 21, 1986.",
    "short_description": "Adrian Dantley wraps ball around back to lose defender en route to bucket",
    "image_urls": [
      "https://storage.googleapis.com/content-pipeline-cropped-images-prod/RIB_TREATMENT_ADRIAN_DANTLEY.jpg"
    ],
    "video_urls": [
      {
        "url": "https://storage.googleapis.com/nba-ftp-prod/nba/videos/dantley_a_layup_detvphi_verdap_nov_21_1986_vertical_9x16.mp4",
        "video_length_miliseconds": 16021
      },
      {
        "url": "https://storage.googleapis.com/nba-ftp-prod/nba/videos/dantley_a_layup_detvphi_sqdap_nov_21_1986_square.mp4",
        "video_length_miliseconds": 12885
      }
    ],
    "mint_count": 499,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "76504",
    "player_name": "Adrian Dantley",
    "player_first_name": "Adrian",
    "player_last_name": "Dantley",
    "player_jersey_number_at_moment": "45",
    "player_last_known_current_team_name": null,
    "player_last_known_team_id": null,
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612765",
    "team_at_moment_historical_name": "Detroit Pistons",
    "team_at_moment_current_name": "Detroit Pistons",
    "tier_id": "NBA_RARE",
    "tier_name": "Rare",
    "rarity": 2,
    "row_updated_at": "2026-05-18T01:06:00.513775000Z",
    "row_created_at": "2026-05-18T01:06:00.513775000Z",
    "row_checksum": -8820562280387144000
  },
  {
    "edition_id": "9e89b552-0236-4ffc-ab6b-8cf7c27d46b4+44e3fbea-f0af-4a83-984f-0caba958dff5",
    "edition_name": "Al Harrington - Atlanta Hawks - ASSIST - 2006-01-21 - Archive Set - Summer 2021",
    "play_id": "44e3fbea-f0af-4a83-984f-0caba958dff5",
    "play_name": "Al Harrington - Atlanta Hawks - ASSIST - 2006-01-21",
    "set_id": "9e89b552-0236-4ffc-ab6b-8cf7c27d46b4",
    "set_name": "Archive Set - Summer 2021",
    "series_name": "Summer 2021",
    "description": "Creative playmakers are highlight reel catalysts. After tracking down an outlet pass with a defender in check on January 20, 2006, Atlanta Hawks forward Al Harrington reaches out in front of himself and lobs a two-handed alley-oop pass back to a trailing Josh Smith.",
    "short_description": "Al Harrington tosses underhanded lob pass for reverse alley-oop",
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
    "mint_count": 20000,
    "play_focus": "PLAYER",
    "league": "LEAGUE_NBA",
    "player_id": "1733",
    "player_name": "Al Harrington",
    "player_first_name": "Al",
    "player_last_name": "Harrington",
    "player_jersey_number_at_moment": "3",
    "player_last_known_current_team_name": null,
    "player_last_known_team_id": null,
    "player_primary_position_at_moment": "PF",
    "team_at_moment_team_id": "1610612737",
    "team_at_moment_historical_name": "Atlanta Hawks",
    "team_at_moment_current_name": "Atlanta Hawks",
    "tier_id": "NBA_COMMON",
    "tier_name": "Common",
    "rarity": 1,
    "row_updated_at": "2026-05-18T01:06:00.513775000Z",
    "row_created_at": "2026-05-18T01:06:00.513775000Z",
    "row_checksum": 7127428260601383000
  }
]
```

---

## `asset_nba_moment`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_moment`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `moment_name` | STRING | NULLABLE |  |
| `moment_id` | STRING | NULLABLE |  |
| `edition_id` | STRING | NULLABLE |  |
| `subedition_id` | STRING | NULLABLE |  |
| `edition_name` | STRING | NULLABLE |  |
| `moment_flow_id` | STRING | NULLABLE |  |
| `serial_number` | INTEGER | NULLABLE |  |
| `owner_user_id` | STRING | NULLABLE |  |
| `top_shot_score` | NUMERIC | NULLABLE |  |
| `moment_status` | STRING | NULLABLE |  |
| `released_at` | TIMESTAMP | NULLABLE |  |
| `locked_at` | TIMESTAMP | NULLABLE |  |
| `lock_expires_at` | TIMESTAMP | NULLABLE |  |
| `unlocked_at` | TIMESTAMP | NULLABLE |  |
| `burned_at` | TIMESTAMP | NULLABLE |  |
| `listed_at` | TIMESTAMP | NULLABLE |  |
| `listing_price_usd` | FLOAT | NULLABLE |  |
| `set_id` | STRING | NULLABLE |  |
| `set_name` | STRING | NULLABLE |  |
| `pack_id` | STRING | NULLABLE |  |
| `pack_name` | STRING | NULLABLE |  |
| `pack_listing_id` | STRING | NULLABLE |  |
| `description` | STRING | NULLABLE |  |
| `short_description` | STRING | NULLABLE |  |
| `series_name` | STRING | NULLABLE |  |
| `league` | STRING | NULLABLE |  |
| `play_id` | STRING | NULLABLE |  |
| `play_name` | STRING | NULLABLE |  |
| `play_focus` | STRING | NULLABLE |  |
| `player_id` | STRING | NULLABLE |  |
| `player_name` | STRING | NULLABLE |  |
| `player_first_name` | STRING | NULLABLE |  |
| `player_last_name` | STRING | NULLABLE |  |
| `player_jersey_number_at_moment` | STRING | NULLABLE |  |
| `player_last_known_current_team_name` | STRING | NULLABLE |  |
| `player_last_known_team_id` | STRING | NULLABLE |  |
| `player_primary_position_at_moment` | STRING | NULLABLE |  |
| `team_at_moment_team_id` | STRING | NULLABLE |  |
| `team_at_moment_historical_name` | STRING | NULLABLE |  |
| `team_at_moment_current_name` | STRING | NULLABLE |  |
| `tier_id` | STRING | NULLABLE |  |
| `tier_name` | STRING | NULLABLE |  |
| `rarity` | INTEGER | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE |  |
| `updated_at` | TIMESTAMP | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`updated_at`)

```
{
  "min_ts": "2020-05-28 16:48:18",
  "max_ts": "2026-05-15 16:09:03"
}
```

### Row Count

```
{
  "row_count": 52025452
}
```

### Sample (5 rows)

```json
[
  {
    "moment_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8 - serial# 1",
    "moment_id": "37d8c262-5e3f-4715-9ecb-24ce57fd804d",
    "edition_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de+edc35ade-42ff-4907-95fa-955630b7f976",
    "subedition_id": "22",
    "edition_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8",
    "moment_flow_id": "51756661",
    "serial_number": 1,
    "owner_user_id": null,
    "top_shot_score": null,
    "moment_status": "MINTED",
    "released_at": null,
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de",
    "set_name": "Run It Back: Playoff Classics - 8",
    "pack_id": "7bba23da-805f-4a7f-9af2-425f875a12ff",
    "pack_name": "2026 NBA Playoffs Case Topper",
    "pack_listing_id": "2ba11646-8a9d-40d6-8280-bf46fd2d433d",
    "description": "When the All-NBA First Team honors came through for Grant Hill in 1997, they validated what anyone who watched him play already knew. There was no more complete player at his position in the Eastern Conference. In Game 2 of the first-round series against the Atlanta Hawks on April 27, 1997, Hill gathered on the drive and went up with the kind of physical authority that made opposing defenses recalibrate their entire game plan around him. The dunk was forceful and deliberate, a punctuation mark on a Detroit performance in a series that would ultimately slip away from the Pistons. Hill's ability to impose himself at both ends of the floor made him the engine of a franchise that had not yet assembled the championship infrastructure to match his individual talent. His performance on April 27, 1997 captured everything the young Detroit star was capable of, even in a postseason that ended too soon.",
    "short_description": "Hill Delivers Emphatic Slam In 1997 Playoffs",
    "series_name": "8",
    "league": "LEAGUE_NBA",
    "play_id": "edc35ade-42ff-4907-95fa-955630b7f976",
    "play_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27",
    "play_focus": "PLAYER",
    "player_id": "255",
    "player_name": "Grant Hill",
    "player_first_name": "Grant",
    "player_last_name": "Hill",
    "player_jersey_number_at_moment": "33",
    "player_last_known_current_team_name": "Detroit Pistons",
    "player_last_known_team_id": "1610612765",
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612765",
    "team_at_moment_historical_name": "Detroit Pistons",
    "team_at_moment_current_name": "Detroit Pistons",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary",
    "rarity": 3,
    "created_at": "2026-05-15T15:36:22.583802000Z",
    "updated_at": "2026-05-15T15:36:22.583802000Z",
    "row_updated_at": "2026-05-18T01:13:39.301713000Z",
    "row_created_at": "2026-05-18T01:13:39.301713000Z",
    "row_checksum": 3614967466127543300
  },
  {
    "moment_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8 - serial# 1",
    "moment_id": "fd73af64-ec65-4d3b-9fff-304be8d006e8",
    "edition_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de+edc35ade-42ff-4907-95fa-955630b7f976",
    "subedition_id": "0",
    "edition_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8",
    "moment_flow_id": "51756321",
    "serial_number": 1,
    "owner_user_id": null,
    "top_shot_score": null,
    "moment_status": "MINTED",
    "released_at": null,
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de",
    "set_name": "Run It Back: Playoff Classics - 8",
    "pack_id": "b7d13623-f1f2-4e1e-8cc4-7ad085079bab",
    "pack_name": "2026 NBA Playoffs Box Topper",
    "pack_listing_id": "a8563f49-93e6-448c-9ec8-4e00a26d492f",
    "description": "When the All-NBA First Team honors came through for Grant Hill in 1997, they validated what anyone who watched him play already knew. There was no more complete player at his position in the Eastern Conference. In Game 2 of the first-round series against the Atlanta Hawks on April 27, 1997, Hill gathered on the drive and went up with the kind of physical authority that made opposing defenses recalibrate their entire game plan around him. The dunk was forceful and deliberate, a punctuation mark on a Detroit performance in a series that would ultimately slip away from the Pistons. Hill's ability to impose himself at both ends of the floor made him the engine of a franchise that had not yet assembled the championship infrastructure to match his individual talent. His performance on April 27, 1997 captured everything the young Detroit star was capable of, even in a postseason that ended too soon.",
    "short_description": "Hill Delivers Emphatic Slam In 1997 Playoffs",
    "series_name": "8",
    "league": "LEAGUE_NBA",
    "play_id": "edc35ade-42ff-4907-95fa-955630b7f976",
    "play_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27",
    "play_focus": "PLAYER",
    "player_id": "255",
    "player_name": "Grant Hill",
    "player_first_name": "Grant",
    "player_last_name": "Hill",
    "player_jersey_number_at_moment": "33",
    "player_last_known_current_team_name": "Detroit Pistons",
    "player_last_known_team_id": "1610612765",
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612765",
    "team_at_moment_historical_name": "Detroit Pistons",
    "team_at_moment_current_name": "Detroit Pistons",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary",
    "rarity": 3,
    "created_at": "2026-05-15T15:36:02.799521000Z",
    "updated_at": "2026-05-15T15:36:02.799521000Z",
    "row_updated_at": "2026-05-18T01:13:39.301713000Z",
    "row_created_at": "2026-05-18T01:13:39.301713000Z",
    "row_checksum": 1497218047467488000
  },
  {
    "moment_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8 - serial# 1",
    "moment_id": "bebae421-bd36-427d-9d4e-5a2661ddba34",
    "edition_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de+edc35ade-42ff-4907-95fa-955630b7f976",
    "subedition_id": "21",
    "edition_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8",
    "moment_flow_id": "51756096",
    "serial_number": 1,
    "owner_user_id": null,
    "top_shot_score": null,
    "moment_status": "MINTED",
    "released_at": null,
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de",
    "set_name": "Run It Back: Playoff Classics - 8",
    "pack_id": "30d20fe2-b0b6-4193-8d4a-90f2c8451c19",
    "pack_name": "2026 NBA Playoffs Case Topper",
    "pack_listing_id": "2ba11646-8a9d-40d6-8280-bf46fd2d433d",
    "description": "When the All-NBA First Team honors came through for Grant Hill in 1997, they validated what anyone who watched him play already knew. There was no more complete player at his position in the Eastern Conference. In Game 2 of the first-round series against the Atlanta Hawks on April 27, 1997, Hill gathered on the drive and went up with the kind of physical authority that made opposing defenses recalibrate their entire game plan around him. The dunk was forceful and deliberate, a punctuation mark on a Detroit performance in a series that would ultimately slip away from the Pistons. Hill's ability to impose himself at both ends of the floor made him the engine of a franchise that had not yet assembled the championship infrastructure to match his individual talent. His performance on April 27, 1997 captured everything the young Detroit star was capable of, even in a postseason that ended too soon.",
    "short_description": "Hill Delivers Emphatic Slam In 1997 Playoffs",
    "series_name": "8",
    "league": "LEAGUE_NBA",
    "play_id": "edc35ade-42ff-4907-95fa-955630b7f976",
    "play_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27",
    "play_focus": "PLAYER",
    "player_id": "255",
    "player_name": "Grant Hill",
    "player_first_name": "Grant",
    "player_last_name": "Hill",
    "player_jersey_number_at_moment": "33",
    "player_last_known_current_team_name": "Detroit Pistons",
    "player_last_known_team_id": "1610612765",
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612765",
    "team_at_moment_historical_name": "Detroit Pistons",
    "team_at_moment_current_name": "Detroit Pistons",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary",
    "rarity": 3,
    "created_at": "2026-05-15T15:35:32.401106000Z",
    "updated_at": "2026-05-15T15:35:32.401106000Z",
    "row_updated_at": "2026-05-18T01:13:39.301713000Z",
    "row_created_at": "2026-05-18T01:13:39.301713000Z",
    "row_checksum": 3422076361854178300
  },
  {
    "moment_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8 - serial# 10",
    "moment_id": "d3bf1a93-6241-4e16-8e01-a06fec5264e2",
    "edition_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de+edc35ade-42ff-4907-95fa-955630b7f976",
    "subedition_id": "0",
    "edition_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8",
    "moment_flow_id": "51756330",
    "serial_number": 10,
    "owner_user_id": null,
    "top_shot_score": null,
    "moment_status": "MINTED",
    "released_at": null,
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de",
    "set_name": "Run It Back: Playoff Classics - 8",
    "pack_id": "dfee146a-417e-48f4-ab59-c9dfef5e0005",
    "pack_name": "2026 NBA Playoffs Premium Pack",
    "pack_listing_id": "b2f3d15b-7eb1-4af1-bad9-bba0aa1c5bef",
    "description": "When the All-NBA First Team honors came through for Grant Hill in 1997, they validated what anyone who watched him play already knew. There was no more complete player at his position in the Eastern Conference. In Game 2 of the first-round series against the Atlanta Hawks on April 27, 1997, Hill gathered on the drive and went up with the kind of physical authority that made opposing defenses recalibrate their entire game plan around him. The dunk was forceful and deliberate, a punctuation mark on a Detroit performance in a series that would ultimately slip away from the Pistons. Hill's ability to impose himself at both ends of the floor made him the engine of a franchise that had not yet assembled the championship infrastructure to match his individual talent. His performance on April 27, 1997 captured everything the young Detroit star was capable of, even in a postseason that ended too soon.",
    "short_description": "Hill Delivers Emphatic Slam In 1997 Playoffs",
    "series_name": "8",
    "league": "LEAGUE_NBA",
    "play_id": "edc35ade-42ff-4907-95fa-955630b7f976",
    "play_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27",
    "play_focus": "PLAYER",
    "player_id": "255",
    "player_name": "Grant Hill",
    "player_first_name": "Grant",
    "player_last_name": "Hill",
    "player_jersey_number_at_moment": "33",
    "player_last_known_current_team_name": "Detroit Pistons",
    "player_last_known_team_id": "1610612765",
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612765",
    "team_at_moment_historical_name": "Detroit Pistons",
    "team_at_moment_current_name": "Detroit Pistons",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary",
    "rarity": 3,
    "created_at": "2026-05-15T15:36:02.799521000Z",
    "updated_at": "2026-05-15T15:36:02.799521000Z",
    "row_updated_at": "2026-05-18T01:13:39.301713000Z",
    "row_created_at": "2026-05-18T01:13:39.301713000Z",
    "row_checksum": -6411117594100468000
  },
  {
    "moment_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8 - serial# 11",
    "moment_id": "fd56bf8d-32be-4572-933b-37f55f44bde3",
    "edition_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de+edc35ade-42ff-4907-95fa-955630b7f976",
    "subedition_id": "0",
    "edition_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27 - Run It Back: Playoff Classics - 8",
    "moment_flow_id": "51756331",
    "serial_number": 11,
    "owner_user_id": null,
    "top_shot_score": null,
    "moment_status": "MINTED",
    "released_at": null,
    "locked_at": null,
    "lock_expires_at": null,
    "unlocked_at": null,
    "burned_at": null,
    "listed_at": null,
    "listing_price_usd": null,
    "set_id": "f0cd4ab8-84a1-4ee0-ab6e-e04f4ed644de",
    "set_name": "Run It Back: Playoff Classics - 8",
    "pack_id": "69ed0ee6-c10d-4bff-bdea-eb5e47ed3e97",
    "pack_name": "2026 NBA Playoffs Premium Pack",
    "pack_listing_id": "b2f3d15b-7eb1-4af1-bad9-bba0aa1c5bef",
    "description": "When the All-NBA First Team honors came through for Grant Hill in 1997, they validated what anyone who watched him play already knew. There was no more complete player at his position in the Eastern Conference. In Game 2 of the first-round series against the Atlanta Hawks on April 27, 1997, Hill gathered on the drive and went up with the kind of physical authority that made opposing defenses recalibrate their entire game plan around him. The dunk was forceful and deliberate, a punctuation mark on a Detroit performance in a series that would ultimately slip away from the Pistons. Hill's ability to impose himself at both ends of the floor made him the engine of a franchise that had not yet assembled the championship infrastructure to match his individual talent. His performance on April 27, 1997 captured everything the young Detroit star was capable of, even in a postseason that ended too soon.",
    "short_description": "Hill Delivers Emphatic Slam In 1997 Playoffs",
    "series_name": "8",
    "league": "LEAGUE_NBA",
    "play_id": "edc35ade-42ff-4907-95fa-955630b7f976",
    "play_name": "Grant Hill - Detroit Pistons - RIM - 1997-04-27",
    "play_focus": "PLAYER",
    "player_id": "255",
    "player_name": "Grant Hill",
    "player_first_name": "Grant",
    "player_last_name": "Hill",
    "player_jersey_number_at_moment": "33",
    "player_last_known_current_team_name": "Detroit Pistons",
    "player_last_known_team_id": "1610612765",
    "player_primary_position_at_moment": "SF",
    "team_at_moment_team_id": "1610612765",
    "team_at_moment_historical_name": "Detroit Pistons",
    "team_at_moment_current_name": "Detroit Pistons",
    "tier_id": "NBA_LEGENDARY",
    "tier_name": "Legendary",
    "rarity": 3,
    "created_at": "2026-05-15T15:36:02.799521000Z",
    "updated_at": "2026-05-15T15:36:02.799521000Z",
    "row_updated_at": "2026-05-18T01:13:39.301713000Z",
    "row_created_at": "2026-05-18T01:13:39.301713000Z",
    "row_checksum": -8404677258902339000
  }
]
```

---

## `transaction`

**FQN:** `dapperlabs-data.production_sem_open.transaction`

### Schema

**Table description:** __Business Entity:__ A __Transaction__ is the exchange of an asset in the Dapper Ecosystem between two parties, sometimes for payment.

This table records the information about individual transfers of assets within the Dapper Platform regardless of whether payment is required.

__Notes:__
* Each record is an individual asset transfer where the provider of the asset is a seller, and the receiver is a buyer, regardless of whether payment occurs.
* A transaction is successful if all required payment is processed and/or the asset is transferred.
Not all transactions require payment (e.g., gifts, airdrops, rewards).  There is a flag that indicates if the transaction requires payment. 
* After the fact, events that affect the revenue obtained from a transaction, such as chargebacks or late cancellations, are not reflected in this table. 
* A transaction will not change once it irrecoverably fails, or the Dapper Platform indicates the asset transfers regardless of subsequent issues with customer service or payments.
* All transactions have client information regarding which client is managing the transaction.
* When a client acts as the asset seller (e.g. NBA Pack Drop), the seller data will also contain that client's information.
* A transaction only begins when the process of a buyer being given an asset starts. The asset listing in the marketplace does not initiate a transaction, nor does entering a queue for a drop.
* This table only stores the current state of the transaction. Due to platform limitations, the Data Platform does not have a complete transaction state history.
* Transactions that are part of a presale are flagged.
* This table does not have information about the asset beyond its id and type.
* Transactions conducted using Flow are converted to USD based on the standard minute-by-minute exchange rate feed.
* Amounts in this table use the [standard Data Platform metrics calculations](https://docs.google.com/spreadsheets/d/15CJ3pGgO2w0JLj_Rvw84yttDciQEgErjlesVURGUZlo/edit#gid=371954447) and are shown when the transaction requires payment.
* Data not captured for a specific type of transaction will be null.
* Data in this table is only geolocated for country and province.
* __Always use the user id to join data from other tables in the semantic layer to this table.__  Using other user identifiers (e.g., dapper id) could lead to missing data due to guest checkout.
* All flags in this table are true boolean datatypes, not 'Y' or 'N' characters. 
* All 'N/A' and empty strings from backend data sources have been converted to nulls in this table.
* All dates in this table are timestamps where the time is midnight UTC unless otherwise noted.





__Domain:__ [transaction](https://github.com/dapperlabs/data-platform/tree/main/wranglers/dbt/models/semantic/conceptual_model/activity/transactions/README.md)

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `source_table` | STRING | NULLABLE | This column contains the code for the backend table where this transaction came from. |
| `id` | STRING | NULLABLE | This column contains the unique identifier for the thing (e.g., transaction, payment) in that row. |
| `transaction_type_id` | STRING | NULLABLE | This column contains the code for the reporting type used for this transaction. See the [Transaction Type table](/#!/model/model.dapper_data_platform.transaction_type) for details. |
| `transaction_state_id` | STRING | NULLABLE | This column contains the standardized code for the current state of a transaction. See the [Transaction State table](/#!/model/model.dapper_data_platform.transaction_state) for details. |
| `transaction_source_id` | STRING | NULLABLE | This column contains the code for what table in the backend provided the transaction information. |
| `platform` | STRING | NULLABLE |  |
| `seller_id` | STRING | NULLABLE | This column contains the unique key for the asset's sender if that sender is an actual user Dapper account. |
| `seller_type_id` | STRING | NULLABLE | TBD |
| `seller_safe_name` | STRING | NULLABLE | This column contains the client's safe name if the seller type is a client or organization. If the seller is a user, this will be null. |
| `seller_province_code` | STRING | NULLABLE | This column contains the state or province code for the asset's sender as determined by IP Address geolocation. See the [Common State Prov table](/#!/model/model.dapper_data_platform.common_state_prov) for details. |
| `seller_country_code` | STRING | NULLABLE | This column contains the country code for the asset's sender as determined by IP Address geolocation. See the [Common Country table](/#!/model/model.dapper_data_platform.common_country) for details. |
| `buyer_id` | STRING | NULLABLE | This column contains the unique user id for the asset receiver. Merged guest accounts cause this id to change. If the buyer is not a user, then this will be null. |
| `buyer_type_id` | STRING | NULLABLE | This column contains a code that indicates what type of entity was the receiver of the asset. See the [Transaction Seller Type table](/#!/model/model.dapper_data_platform.transaction_seller_type) for details. |
| `buyer_is_guest` | BOOLEAN | NULLABLE |  |
| `buyer_safe_name` | STRING | NULLABLE | This column contains the client's safe name if the buyer type is a client or organization. If the buyer is a user, this will be null. |
| `buyer_province_code` | STRING | NULLABLE | This column contains the state province code for the asset's recipient as determined by IP Address geolocation. See the [Common State Prov table](/#!/model/model.dapper_data_platform.common_state_prov) for details. |
| `buyer_country_code` | STRING | NULLABLE | This column contains the country code for the asset's recipient as determined by IP Address geolocation. See the [Common Country table](/#!/model/model.dapper_data_platform.common_country) for details. |
| `client_id` | STRING | NULLABLE | This column contains the internal identifier used for a client. Some studios use more than one physical client to perform their services and will have more than one client id.  Use the safe name if you want all the clients for a given service. |
| `client_class_id` | STRING | NULLABLE | This column contains the code for the type of client. See the [Client Class table](/#!/model/model.dapper_data_platform.client_class) for details. |
| `client_name` | STRING | NULLABLE | This column contains the displayable name of a client. |
| `client_safe_name` | STRING | NULLABLE | This column contains a Big Query safe name for all clients from a commonly named product. This column is the preferred way to filter by client. Only use the client id if you want data from a specific physical application client. |
| `asset_id` | STRING | NULLABLE | This column contains the identifier FCL uses for the asset. If there is more than one asset id, this will be one of the ids picked randomly. |
| `product_specific_asset_id` | STRING | NULLABLE |  |
| `asset_type_id` | STRING | NULLABLE | This column contains the code for what kind of asset. |
| `asset_name` | STRING | NULLABLE | This column contains the asset's name corresponding to the asset id. |
| `state` | STRING | NULLABLE | This column contains the backend code for the current state of this thing (e.g., client, p2p request, purchase) in that system. Different columns provide standardization of these states across various backends. Consult with the Data team if you need to use these original backend codes. |
| `failed_reason` | STRING | NULLABLE | TBD |
| `amount` | NUMERIC | NULLABLE | This column contains the raw amount of payment required for a transaction in the designated currency of the transaction. This value will be null for transaction types where no payment is required. |
| `currency` | STRING | NULLABLE | This column contains the code for the base currency used for a transaction. See the [Transaction Currency table](/#!/model/model.dapper_data_platform.transaction_currency) for details. |
| `gross_amount_usd` | NUMERIC | NULLABLE | This column has the total amount the buyer spent in US Dollars for a given transaction when the transaction requires payment. If the transaction was in another currency, it is converted to USD using the appropriate minute-by-minute exchange rate data. |
| `net_amount_usd` | NUMERIC | NULLABLE | This column has the US Dollars proceeds for a given transaction when the transaction requires payment. Proceeds are determined by summing the credit amounts from all client and royalty wallets, thus removing any amounts distributed to a user. If the transaction was in another currency, it is converted to USD using the appropriate minute-by-minute exchange rate data. |
| `gross_sales_volume_usd` | NUMERIC | NULLABLE | TBD |
| `gross_estimated_proceeds_usd` | NUMERIC | NULLABLE | TBD |
| `net_estimated_proceeds_usd` | NUMERIC | NULLABLE | TBD |
| `payment_type` | STRING | NULLABLE | This column contains the code for the kind of payment instrument used for a transaction. See the [Transaction Payment Type table](/#!/model/model.dapper_data_platform.transaction_payment_type) for details. |
| `is_preorder` | BOOLEAN | NULLABLE | This column is true if the transaction was part of a preorder sale. |
| `has_payment` | BOOLEAN | NULLABLE | This column is true if the transaction requires a payment. |
| `promo_code` | STRING | NULLABLE |  |
| `list_price_usd` | NUMERIC | NULLABLE |  |
| `discount_amount_usd` | NUMERIC | NULLABLE |  |
| `discount_type` | STRING | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE | This column contains the timestamp for the creation time of this data in UTC. |
| `updated_at` | TIMESTAMP | NULLABLE | This column contains the timestamp of the source system's last data update. |
| `completed_at` | TIMESTAMP | NULLABLE | This column contains the timestamp for process completion in UTC. |
| `client_marketplace_id` | STRING | NULLABLE | This column contains the internal identifier used for a client when the product uses a client from a 3rd party marketplace (e.g., Gaia, Flunks). Some studios use more than one physical client to perform their services and will have more than one client id.  Use the safe name if you want all the clients for a marketplace. |
| `client_marketplace_class_id` | STRING | NULLABLE | This column contains the code for the type of client when the product uses a client from a 3rd party marketplace (e.g., Gaia, Flunks). |
| `client_marketplace_name` | STRING | NULLABLE | This column contains the displayable name for a client when the product uses a client from a 3rd party marketplace (e.g., Gaia, Flunks). |
| `client_marketplace_safe_name` | STRING | NULLABLE | This column contains a Big Query safe name for all clients from a commonly named product when the product uses a client from a 3rd party marketplace (e.g., Gaia, Flunks). |
| `offer_created_at` | TIMESTAMP | NULLABLE | This column contains the timestamp for creating an offer by the Seller. |
| `ref_id` | STRING | NULLABLE | This column contains an identifier from the original backend system used for the thing (e.g., event, transaction, page view). |
| `is_manual` | BOOLEAN | NULLABLE | This column is true if the credit transfer associated with an AirDrop was part of a manual process. |
| `row_updated_at` | TIMESTAMP | NULLABLE | This column contains the timestamp for when the Data Platform last updated this row in UTC. |
| `row_created_at` | TIMESTAMP | NULLABLE | __DEPRECIATED__  This column is depreciated. Use row_updated_at instead. |
| `row_checksum` | INTEGER | NULLABLE | Only the data team uses this column for change auditing. |

### Date Range (`updated_at`)

```
{
  "min_ts": "2020-05-22 00:46:34",
  "max_ts": "2026-05-18 00:58:34"
}
```

### Row Count (WHERE client_safe_name = 'nba_top_shot')

```
{
  "row_count": 69136175
}
```

### Sample (5 rows)

```json
[
  {
    "source_table": "`dapperlabs-data`.`production_sem_secret`.`transaction_p2p_secret`",
    "id": "ff6af8fd-247f-405c-837e-625aaa25127e",
    "transaction_type_id": "P2P",
    "transaction_state_id": "SUCCEEDED",
    "transaction_source_id": "P2P_REQUESTS",
    "platform": "WEB",
    "seller_id": "google-oauth2|110918666504950204057",
    "seller_type_id": "USER",
    "seller_safe_name": null,
    "seller_province_code": null,
    "seller_country_code": "SI",
    "buyer_id": "auth0|5f1f86770e285c003d4ce175",
    "buyer_type_id": "USER",
    "buyer_is_guest": false,
    "buyer_safe_name": null,
    "buyer_province_code": null,
    "buyer_country_code": "ES",
    "client_id": "63020ec0-2d94-4cff-ac0c-167238397e33",
    "client_class_id": "PRIMARY",
    "client_name": "NBA Top Shot",
    "client_safe_name": "nba_top_shot",
    "asset_id": "-1634701946382464906",
    "product_specific_asset_id": "84761974-8972-452b-8aa9-d17329ee6b32",
    "asset_type_id": "PACK",
    "asset_name": "Top Shot Birthday 2025: Party Pack ",
    "state": "SUCCEEDED",
    "failed_reason": null,
    "amount": "400",
    "currency": "USD",
    "gross_amount_usd": "4",
    "net_amount_usd": "0.1",
    "gross_sales_volume_usd": "4",
    "gross_estimated_proceeds_usd": "0.2",
    "net_estimated_proceeds_usd": "0.1",
    "payment_type": "DAPPER_CREDITS",
    "is_preorder": false,
    "has_payment": true,
    "promo_code": null,
    "list_price_usd": "4",
    "discount_amount_usd": null,
    "discount_type": null,
    "created_at": "2026-05-15T07:13:40.098887000Z",
    "updated_at": "2026-05-15T07:13:51.811353000Z",
    "completed_at": "2026-05-15T07:13:51.823629000Z",
    "client_marketplace_id": null,
    "client_marketplace_class_id": null,
    "client_marketplace_name": null,
    "client_marketplace_safe_name": null,
    "offer_created_at": null,
    "ref_id": null,
    "is_manual": null,
    "row_updated_at": "2026-05-18T01:18:01.735178000Z",
    "row_created_at": "2026-05-18T01:18:01.735178000Z",
    "row_checksum": -8482924118223777000
  },
  {
    "source_table": "`dapperlabs-data`.`production_sem_secret`.`transaction_p2p_secret`",
    "id": "ff4bc769-78d9-49c3-bf0e-5c6ff1c66e9f",
    "transaction_type_id": "P2P",
    "transaction_state_id": "SUCCEEDED",
    "transaction_source_id": "P2P_REQUESTS",
    "platform": "WEB",
    "seller_id": "google-oauth2|110589441239521225795",
    "seller_type_id": "USER",
    "seller_safe_name": null,
    "seller_province_code": "ON",
    "seller_country_code": "CA",
    "buyer_id": "google-oauth2|109709350020618731777",
    "buyer_type_id": "USER",
    "buyer_is_guest": false,
    "buyer_safe_name": null,
    "buyer_province_code": null,
    "buyer_country_code": "GB",
    "client_id": "63020ec0-2d94-4cff-ac0c-167238397e33",
    "client_class_id": "PRIMARY",
    "client_name": "NBA Top Shot",
    "client_safe_name": "nba_top_shot",
    "asset_id": "-8680480825660968907",
    "product_specific_asset_id": "54a377a3-c868-40e5-beb7-af24ed444c3a",
    "asset_type_id": "PACK",
    "asset_name": "Fast Break - WNBA Run 7 - 3 Wins Pack",
    "state": "SUCCEEDED",
    "failed_reason": null,
    "amount": "400",
    "currency": "USD",
    "gross_amount_usd": "4",
    "net_amount_usd": "0.1",
    "gross_sales_volume_usd": "4",
    "gross_estimated_proceeds_usd": "0.2",
    "net_estimated_proceeds_usd": "0.1",
    "payment_type": "FIAT",
    "is_preorder": false,
    "has_payment": true,
    "promo_code": null,
    "list_price_usd": "4",
    "discount_amount_usd": null,
    "discount_type": null,
    "created_at": "2026-05-17T11:33:05.258306000Z",
    "updated_at": "2026-05-17T11:33:34.326310000Z",
    "completed_at": "2026-05-17T11:33:34.341254000Z",
    "client_marketplace_id": null,
    "client_marketplace_class_id": null,
    "client_marketplace_name": null,
    "client_marketplace_safe_name": null,
    "offer_created_at": null,
    "ref_id": null,
    "is_manual": null,
    "row_updated_at": "2026-05-18T01:18:01.735178000Z",
    "row_created_at": "2026-05-18T01:18:01.735178000Z",
    "row_checksum": 1756438083094882800
  },
  {
    "source_table": "`dapperlabs-data`.`production_sem_secret`.`transaction_p2p_secret`",
    "id": "fc644af0-90e1-4f83-af18-9cf9b6799589",
    "transaction_type_id": "P2P",
    "transaction_state_id": "SUCCEEDED",
    "transaction_source_id": "P2P_REQUESTS",
    "platform": "WEB",
    "seller_id": "google-oauth2|106661922018807479838",
    "seller_type_id": "USER",
    "seller_safe_name": null,
    "seller_province_code": null,
    "seller_country_code": "US",
    "buyer_id": "google-oauth2|109709350020618731777",
    "buyer_type_id": "USER",
    "buyer_is_guest": false,
    "buyer_safe_name": null,
    "buyer_province_code": null,
    "buyer_country_code": "GB",
    "client_id": "63020ec0-2d94-4cff-ac0c-167238397e33",
    "client_class_id": "PRIMARY",
    "client_name": "NBA Top Shot",
    "client_safe_name": "nba_top_shot",
    "asset_id": "-8680480825660968907",
    "product_specific_asset_id": "54a377a3-c868-40e5-beb7-af24ed444c3a",
    "asset_type_id": "PACK",
    "asset_name": "Fast Break - WNBA Run 7 - 3 Wins Pack",
    "state": "SUCCEEDED",
    "failed_reason": null,
    "amount": "400",
    "currency": "USD",
    "gross_amount_usd": "4",
    "net_amount_usd": "0.1",
    "gross_sales_volume_usd": "4",
    "gross_estimated_proceeds_usd": "0.2",
    "net_estimated_proceeds_usd": "0.1",
    "payment_type": "FIAT",
    "is_preorder": false,
    "has_payment": true,
    "promo_code": null,
    "list_price_usd": "4",
    "discount_amount_usd": null,
    "discount_type": null,
    "created_at": "2026-05-17T22:05:50.133929000Z",
    "updated_at": "2026-05-17T22:06:20.178292000Z",
    "completed_at": "2026-05-17T22:06:20.190613000Z",
    "client_marketplace_id": null,
    "client_marketplace_class_id": null,
    "client_marketplace_name": null,
    "client_marketplace_safe_name": null,
    "offer_created_at": null,
    "ref_id": null,
    "is_manual": null,
    "row_updated_at": "2026-05-18T01:18:01.735178000Z",
    "row_created_at": "2026-05-18T01:18:01.735178000Z",
    "row_checksum": 6621911771496587000
  },
  {
    "source_table": "`dapperlabs-data`.`production_sem_secret`.`transaction_p2p_secret`",
    "id": "fb2dfa2a-09f0-4fd6-abef-95eae907f1b1",
    "transaction_type_id": "P2P",
    "transaction_state_id": "SUCCEEDED",
    "transaction_source_id": "P2P_REQUESTS",
    "platform": "WEB",
    "seller_id": "auth0|60076a294cef850069627392",
    "seller_type_id": "USER",
    "seller_safe_name": null,
    "seller_province_code": "NJ",
    "seller_country_code": "US",
    "buyer_id": "google-oauth2|111111504628039848682",
    "buyer_type_id": "USER",
    "buyer_is_guest": false,
    "buyer_safe_name": null,
    "buyer_province_code": "NY",
    "buyer_country_code": "US",
    "client_id": "63020ec0-2d94-4cff-ac0c-167238397e33",
    "client_class_id": "PRIMARY",
    "client_name": "NBA Top Shot",
    "client_safe_name": "nba_top_shot",
    "asset_id": "7881804241295596114",
    "product_specific_asset_id": "765e42d6-c3d6-451a-89cd-c346cdfd4964",
    "asset_type_id": "PACK",
    "asset_name": "Rookie Revelation Standard Pack",
    "state": "SUCCEEDED",
    "failed_reason": null,
    "amount": "6800",
    "currency": "USD",
    "gross_amount_usd": "68",
    "net_amount_usd": "1.7",
    "gross_sales_volume_usd": "68",
    "gross_estimated_proceeds_usd": "3.4",
    "net_estimated_proceeds_usd": "1.7",
    "payment_type": "FIAT",
    "is_preorder": false,
    "has_payment": true,
    "promo_code": null,
    "list_price_usd": "68",
    "discount_amount_usd": null,
    "discount_type": null,
    "created_at": "2026-05-17T18:29:58.877996000Z",
    "updated_at": "2026-05-17T18:30:22.373243000Z",
    "completed_at": "2026-05-17T18:30:22.386460000Z",
    "client_marketplace_id": null,
    "client_marketplace_class_id": null,
    "client_marketplace_name": null,
    "client_marketplace_safe_name": null,
    "offer_created_at": null,
    "ref_id": null,
    "is_manual": null,
    "row_updated_at": "2026-05-18T01:18:01.735178000Z",
    "row_created_at": "2026-05-18T01:18:01.735178000Z",
    "row_checksum": -1065774786765570000
  },
  {
    "source_table": "`dapperlabs-data`.`production_sem_secret`.`transaction_p2p_secret`",
    "id": "fc9507b8-df40-46e0-bb5d-82e4aa077ae3",
    "transaction_type_id": "P2P",
    "transaction_state_id": "SUCCEEDED",
    "transaction_source_id": "P2P_REQUESTS",
    "platform": "WEB",
    "seller_id": "google-oauth2|106661922018807479838",
    "seller_type_id": "USER",
    "seller_safe_name": null,
    "seller_province_code": null,
    "seller_country_code": "US",
    "buyer_id": "google-oauth2|116458667187094728404",
    "buyer_type_id": "USER",
    "buyer_is_guest": false,
    "buyer_safe_name": null,
    "buyer_province_code": "CA",
    "buyer_country_code": "US",
    "client_id": "63020ec0-2d94-4cff-ac0c-167238397e33",
    "client_class_id": "PRIMARY",
    "client_name": "NBA Top Shot",
    "client_safe_name": "nba_top_shot",
    "asset_id": "4747105435098902089",
    "product_specific_asset_id": "6c83e27c-ac08-4bb5-a495-d055011032ab",
    "asset_type_id": "PACK",
    "asset_name": "WNBA Fresh Gems Quick Rip",
    "state": "SUCCEEDED",
    "failed_reason": null,
    "amount": "900",
    "currency": "USD",
    "gross_amount_usd": "9",
    "net_amount_usd": "0.225",
    "gross_sales_volume_usd": "9",
    "gross_estimated_proceeds_usd": "0.45",
    "net_estimated_proceeds_usd": "0.225",
    "payment_type": "DAPPER_CREDITS",
    "is_preorder": false,
    "has_payment": true,
    "promo_code": null,
    "list_price_usd": "9",
    "discount_amount_usd": null,
    "discount_type": null,
    "created_at": "2026-05-16T23:49:42.286457000Z",
    "updated_at": "2026-05-16T23:49:56.790514000Z",
    "completed_at": "2026-05-16T23:49:56.803258000Z",
    "client_marketplace_id": null,
    "client_marketplace_class_id": null,
    "client_marketplace_name": null,
    "client_marketplace_safe_name": null,
    "offer_created_at": null,
    "ref_id": null,
    "is_manual": null,
    "row_updated_at": "2026-05-18T01:18:01.735178000Z",
    "row_created_at": "2026-05-18T01:18:01.735178000Z",
    "row_checksum": -6737118344622110000
  }
]
```

---

## `asset_nba_market_caps`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_market_caps`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `date` | DATE | NULLABLE |  |
| `edition_id` | STRING | NULLABLE |  |
| `num_moments_in_circulation` | INTEGER | NULLABLE |  |
| `lowest_ask_price` | NUMERIC | NULLABLE |  |
| `highest_offer_price` | NUMERIC | NULLABLE |  |
| `market_cap` | NUMERIC | NULLABLE |  |

### Date Range (`date`)

```
{
  "min_ts": "2021-01-01 00:00:00",
  "max_ts": "2026-05-18 00:00:00"
}
```

### Row Count

```
{
  "row_count": 11070008
}
```

### Sample (5 rows)

```json
[
  {
    "date": "2026-05-17",
    "edition_id": "2e7c4e1e-18f7-4181-a626-858cad8e36da+a302f3ee-3334-4eaa-a1a3-bf8badba30c4",
    "num_moments_in_circulation": 1,
    "lowest_ask_price": null,
    "highest_offer_price": null,
    "market_cap": null
  },
  {
    "date": "2026-05-17",
    "edition_id": "92275b4a-cac2-4ffc-b23b-58c05ffca44e+50fde806-fe34-4a47-b48e-7c5b3dbcff4e",
    "num_moments_in_circulation": 0,
    "lowest_ask_price": null,
    "highest_offer_price": null,
    "market_cap": null
  },
  {
    "date": "2026-05-17",
    "edition_id": "92275b4a-cac2-4ffc-b23b-58c05ffca44e+1fc9b2f1-d444-4645-a12a-7d0500214fa2",
    "num_moments_in_circulation": 0,
    "lowest_ask_price": null,
    "highest_offer_price": null,
    "market_cap": null
  },
  {
    "date": "2026-05-17",
    "edition_id": "2eb47cb4-03ce-4b45-8cf0-d9f4bde8710f+73ffa5df-8969-4c97-b5d5-a40b10962037",
    "num_moments_in_circulation": 0,
    "lowest_ask_price": null,
    "highest_offer_price": null,
    "market_cap": null
  },
  {
    "date": "2026-05-17",
    "edition_id": "e3ec2177-db80-424a-aab3-1f1804439725+702ddd28-c95e-4036-b3f9-b20c7e52db47",
    "num_moments_in_circulation": 3,
    "lowest_ask_price": null,
    "highest_offer_price": null,
    "market_cap": null
  }
]
```

---

## `asset_nba_pack`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_pack`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `pack_id` | STRING | NULLABLE |  |
| `pack_listing_id` | STRING | NULLABLE |  |
| `drop_id` | STRING | NULLABLE |  |
| `pack_flow_id` | STRING | NULLABLE |  |
| `reservation_id` | STRING | NULLABLE |  |
| `version` | STRING | NULLABLE |  |
| `pack_name` | STRING | NULLABLE |  |
| `description` | STRING | NULLABLE |  |
| `image_url` | STRING | NULLABLE |  |
| `is_starter_pack` | BOOLEAN | NULLABLE |  |
| `is_reward` | BOOLEAN | NULLABLE |  |
| `max_order_quantity` | INTEGER | NULLABLE |  |
| `moments_per_pack` | INTEGER | NULLABLE |  |
| `total_packs` | INTEGER | NULLABLE |  |
| `pack_status` | STRING | NULLABLE |  |
| `opened_at` | TIMESTAMP | NULLABLE |  |
| `fulfillment_tx_hash` | STRING | NULLABLE |  |
| `is_preorder` | BOOLEAN | NULLABLE |  |
| `price` | NUMERIC | NULLABLE |  |
| `currency` | STRING | NULLABLE |  |
| `leagues` | STRING | REPEATED |  |
| `primary_league` | STRING | NULLABLE |  |
| `secondary_league` | STRING | NULLABLE |  |
| `gated_criteria` | STRING | NULLABLE |  |
| `sale_type` | STRING | NULLABLE |  |
| `pack_tier_id` | STRING | NULLABLE |  |
| `pack_tier_name` | STRING | NULLABLE |  |
| `pack_rarity` | INTEGER | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE |  |
| `updated_at` | TIMESTAMP | NULLABLE |  |
| `started_at` | TIMESTAMP | NULLABLE |  |
| `expired_at` | TIMESTAMP | NULLABLE |  |
| `container_pack_id` | STRING | NULLABLE |  |
| `is_container` | BOOLEAN | NULLABLE |  |
| `total_moments` | INTEGER | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`updated_at`)

```
{
  "min_ts": "2020-05-29 01:50:32",
  "max_ts": "2026-05-18 00:56:14"
}
```

### Row Count

```
{
  "row_count": 23177683
}
```

### Sample (5 rows)

```json
[
  {
    "pack_id": "615145e8-8c47-4b85-a3b5-c16467126158",
    "pack_listing_id": "a77e0505-a5dc-48ae-b1b0-3869d99d2f5e",
    "drop_id": "-4201540675297725573",
    "pack_flow_id": "37383397964414",
    "reservation_id": "a2f72f96-de30-4b0f-b8aa-c7d0d8626b8e",
    "version": "12",
    "pack_name": "Top Shot This Playoffs Edition: Cade Cunningham",
    "description": "Cade Cunningham drops 45 points to save the Pistons season and force Game 6! Each pack comes with 1 standard edition Moment and a shot at 1 of 6 parallels: Blockchain /99, Hardcourt /50, Hexwave /25, Jukebox /10, Galactic /5, and Omega /1!",
    "image_url": "https://asset-preview.nbatopshot.com/packs/fandom/a77e0505-a5dc-48ae-b1b0-3869d99d2f5e.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 190,
    "moments_per_pack": 1,
    "total_packs": 1165,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": "10",
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "RSVP",
    "pack_tier_id": "NBA_FANDOM",
    "pack_tier_name": "Fandom",
    "pack_rarity": null,
    "created_at": "2026-05-01T16:31:45.859062000Z",
    "updated_at": "2026-05-17T20:10:45.458912000Z",
    "started_at": "2026-04-30T16:00:00.000Z",
    "expired_at": "2026-05-01T16:00:00.000Z",
    "container_pack_id": null,
    "is_container": false,
    "total_moments": 1,
    "row_updated_at": "2026-05-18T01:05:29.981970000Z",
    "row_created_at": "2026-05-18T01:05:29.981970000Z",
    "row_checksum": -271212444861571870
  },
  {
    "pack_id": "429c6362-1452-44ed-ae78-be0b37d8fba0",
    "pack_listing_id": "a77e0505-a5dc-48ae-b1b0-3869d99d2f5e",
    "drop_id": "-4201540675297725573",
    "pack_flow_id": "108851653769857",
    "reservation_id": "a2f72f96-de30-4b0f-b8aa-c7d0d8626b8e",
    "version": "12",
    "pack_name": "Top Shot This Playoffs Edition: Cade Cunningham",
    "description": "Cade Cunningham drops 45 points to save the Pistons season and force Game 6! Each pack comes with 1 standard edition Moment and a shot at 1 of 6 parallels: Blockchain /99, Hardcourt /50, Hexwave /25, Jukebox /10, Galactic /5, and Omega /1!",
    "image_url": "https://asset-preview.nbatopshot.com/packs/fandom/a77e0505-a5dc-48ae-b1b0-3869d99d2f5e.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 190,
    "moments_per_pack": 1,
    "total_packs": 1165,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": "10",
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "RSVP",
    "pack_tier_id": "NBA_FANDOM",
    "pack_tier_name": "Fandom",
    "pack_rarity": null,
    "created_at": "2026-05-01T16:31:45.859062000Z",
    "updated_at": "2026-05-17T20:11:09.913714000Z",
    "started_at": "2026-04-30T16:00:00.000Z",
    "expired_at": "2026-05-01T16:00:00.000Z",
    "container_pack_id": null,
    "is_container": false,
    "total_moments": 1,
    "row_updated_at": "2026-05-18T01:05:29.981970000Z",
    "row_created_at": "2026-05-18T01:05:29.981970000Z",
    "row_checksum": 837747320365018400
  },
  {
    "pack_id": "10282c90-7b8b-4052-b120-d8c8044cd310",
    "pack_listing_id": "a77e0505-a5dc-48ae-b1b0-3869d99d2f5e",
    "drop_id": "-4201540675297725573",
    "pack_flow_id": "108851653769835",
    "reservation_id": "a2f72f96-de30-4b0f-b8aa-c7d0d8626b8e",
    "version": "12",
    "pack_name": "Top Shot This Playoffs Edition: Cade Cunningham",
    "description": "Cade Cunningham drops 45 points to save the Pistons season and force Game 6! Each pack comes with 1 standard edition Moment and a shot at 1 of 6 parallels: Blockchain /99, Hardcourt /50, Hexwave /25, Jukebox /10, Galactic /5, and Omega /1!",
    "image_url": "https://asset-preview.nbatopshot.com/packs/fandom/a77e0505-a5dc-48ae-b1b0-3869d99d2f5e.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 190,
    "moments_per_pack": 1,
    "total_packs": 1165,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": "10",
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "RSVP",
    "pack_tier_id": "NBA_FANDOM",
    "pack_tier_name": "Fandom",
    "pack_rarity": null,
    "created_at": "2026-05-01T16:31:45.859062000Z",
    "updated_at": "2026-05-17T20:12:29.703712000Z",
    "started_at": "2026-04-30T16:00:00.000Z",
    "expired_at": "2026-05-01T16:00:00.000Z",
    "container_pack_id": null,
    "is_container": false,
    "total_moments": 1,
    "row_updated_at": "2026-05-18T01:05:29.981970000Z",
    "row_created_at": "2026-05-18T01:05:29.981970000Z",
    "row_checksum": -8896042884681214000
  },
  {
    "pack_id": "1246ab52-dda2-4a9a-833e-c48bf74255d5",
    "pack_listing_id": "a77e0505-a5dc-48ae-b1b0-3869d99d2f5e",
    "drop_id": "-4201540675297725573",
    "pack_flow_id": "36283886331876",
    "reservation_id": "a2f72f96-de30-4b0f-b8aa-c7d0d8626b8e",
    "version": "12",
    "pack_name": "Top Shot This Playoffs Edition: Cade Cunningham",
    "description": "Cade Cunningham drops 45 points to save the Pistons season and force Game 6! Each pack comes with 1 standard edition Moment and a shot at 1 of 6 parallels: Blockchain /99, Hardcourt /50, Hexwave /25, Jukebox /10, Galactic /5, and Omega /1!",
    "image_url": "https://asset-preview.nbatopshot.com/packs/fandom/a77e0505-a5dc-48ae-b1b0-3869d99d2f5e.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 190,
    "moments_per_pack": 1,
    "total_packs": 1165,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": "10",
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "RSVP",
    "pack_tier_id": "NBA_FANDOM",
    "pack_tier_name": "Fandom",
    "pack_rarity": null,
    "created_at": "2026-05-01T16:31:45.859062000Z",
    "updated_at": "2026-05-17T20:12:41.056673000Z",
    "started_at": "2026-04-30T16:00:00.000Z",
    "expired_at": "2026-05-01T16:00:00.000Z",
    "container_pack_id": null,
    "is_container": false,
    "total_moments": 1,
    "row_updated_at": "2026-05-18T01:05:29.981970000Z",
    "row_created_at": "2026-05-18T01:05:29.981970000Z",
    "row_checksum": 4532838326761091600
  },
  {
    "pack_id": "44d86a5a-0c7d-4e15-9c80-07ca3d9bd34a",
    "pack_listing_id": "a77e0505-a5dc-48ae-b1b0-3869d99d2f5e",
    "drop_id": "-4201540675297725573",
    "pack_flow_id": "205608677018334",
    "reservation_id": "cadafd1d-9664-4805-a744-09b8533c8806",
    "version": "26",
    "pack_name": "Top Shot This Playoffs Edition: Cade Cunningham",
    "description": "Cade Cunningham drops 45 points to save the Pistons season and force Game 6! Each pack comes with 1 standard edition Moment and a shot at 1 of 6 parallels: Blockchain /99, Hardcourt /50, Hexwave /25, Jukebox /10, Galactic /5, and Omega /1!",
    "image_url": "https://asset-preview.nbatopshot.com/packs/fandom/a77e0505-a5dc-48ae-b1b0-3869d99d2f5e.png",
    "is_starter_pack": false,
    "is_reward": false,
    "max_order_quantity": 190,
    "moments_per_pack": 1,
    "total_packs": 1165,
    "pack_status": "SEALED",
    "opened_at": null,
    "fulfillment_tx_hash": null,
    "is_preorder": false,
    "price": "10",
    "currency": "USD",
    "leagues": [
      "LEAGUE_NBA"
    ],
    "primary_league": "LEAGUE_NBA",
    "secondary_league": null,
    "gated_criteria": "ALL",
    "sale_type": "RSVP",
    "pack_tier_id": "NBA_FANDOM",
    "pack_tier_name": "Fandom",
    "pack_rarity": null,
    "created_at": "2026-05-01T16:31:45.873035000Z",
    "updated_at": "2026-05-17T07:31:17.845561000Z",
    "started_at": "2026-04-30T16:00:00.000Z",
    "expired_at": "2026-05-01T16:00:00.000Z",
    "container_pack_id": null,
    "is_container": false,
    "total_moments": 1,
    "row_updated_at": "2026-05-18T01:05:29.981970000Z",
    "row_created_at": "2026-05-18T01:05:29.981970000Z",
    "row_checksum": -7440707139730487000
  }
]
```

---

## `asset_nba_drop`

**FQN:** `dapperlabs-data.production_sem_open.asset_nba_drop`

### Schema

**Total rows (BQ metadata):** `0`

**Total bytes:** `0`

**Columns:**

| Name | Type | Mode | Description |
|---|---|---|---|
| `drop_id` | STRING | NULLABLE |  |
| `started_at` | TIMESTAMP | NULLABLE |  |
| `expired_at` | TIMESTAMP | NULLABLE |  |
| `drop_duration_type` | STRING | NULLABLE |  |
| `is_active` | BOOLEAN | NULLABLE |  |
| `has_preorders` | BOOLEAN | NULLABLE |  |
| `total_pack_listings` | INTEGER | NULLABLE |  |
| `total_packs` | INTEGER | NULLABLE |  |
| `total_moments` | INTEGER | NULLABLE |  |
| `percent_reserved_packs` | NUMERIC | NULLABLE |  |
| `is_queued` | BOOLEAN | NULLABLE |  |
| `created_at` | TIMESTAMP | NULLABLE |  |
| `updated_at` | TIMESTAMP | NULLABLE |  |
| `row_updated_at` | TIMESTAMP | NULLABLE |  |
| `row_created_at` | TIMESTAMP | NULLABLE |  |
| `row_checksum` | INTEGER | NULLABLE |  |

### Date Range (`row_updated_at`)

```
{
  "min_ts": "2026-05-18 01:04:12",
  "max_ts": "2026-05-18 01:04:12"
}
```

### Row Count

```
{
  "row_count": 1007
}
```

### Sample (5 rows)

```json
[
  {
    "drop_id": "5298254165100666093",
    "started_at": "2024-11-11T19:30:00.000Z",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 224,
    "total_moments": 224,
    "percent_reserved_packs": "0.004464286",
    "is_queued": false,
    "created_at": "2024-11-11T19:57:51.140895000Z",
    "updated_at": "2024-11-11T20:50:24.579219000Z",
    "row_updated_at": "2026-05-18T01:04:12.874513000Z",
    "row_created_at": "2026-05-18T01:04:12.874513000Z",
    "row_checksum": 8927024785045645000
  },
  {
    "drop_id": "-4530258923881558667",
    "started_at": "2023-08-10T20:00:00.000Z",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 1642,
    "total_moments": 1642,
    "percent_reserved_packs": "0.000609013",
    "is_queued": false,
    "created_at": "2023-08-10T18:48:58.112744000Z",
    "updated_at": "2024-09-19T19:38:37.111758000Z",
    "row_updated_at": "2026-05-18T01:04:12.874513000Z",
    "row_created_at": "2026-05-18T01:04:12.874513000Z",
    "row_checksum": 8767308129032567000
  },
  {
    "drop_id": "-5813057775596039754",
    "started_at": "2025-05-20T18:00:00.000Z",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 3785,
    "total_moments": 11283,
    "percent_reserved_packs": "0.385997358",
    "is_queued": false,
    "created_at": "2025-05-16T23:33:54.946312000Z",
    "updated_at": "2025-05-22T20:38:43.119791000Z",
    "row_updated_at": "2026-05-18T01:04:12.874513000Z",
    "row_created_at": "2026-05-18T01:04:12.874513000Z",
    "row_checksum": -5592472311700022000
  },
  {
    "drop_id": "-3348421646906481324",
    "started_at": "2023-08-09T00:00:00.000Z",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 22591,
    "total_moments": 66797,
    "percent_reserved_packs": "0.398078881",
    "is_queued": false,
    "created_at": "2023-08-07T23:04:42.045057000Z",
    "updated_at": "2024-09-19T19:51:06.302611000Z",
    "row_updated_at": "2026-05-18T01:04:12.874513000Z",
    "row_created_at": "2026-05-18T01:04:12.874513000Z",
    "row_checksum": 6237920436017703000
  },
  {
    "drop_id": "4061670876912329047",
    "started_at": "2024-12-16T19:30:00.000Z",
    "expired_at": null,
    "drop_duration_type": "ONGOING",
    "is_active": true,
    "has_preorders": false,
    "total_pack_listings": 1,
    "total_packs": 106,
    "total_moments": 106,
    "percent_reserved_packs": "0.009433962",
    "is_queued": false,
    "created_at": "2024-12-16T16:14:34.599930000Z",
    "updated_at": "2024-12-16T19:10:14.608114000Z",
    "row_updated_at": "2026-05-18T01:04:12.874513000Z",
    "row_created_at": "2026-05-18T01:04:12.874513000Z",
    "row_checksum": -4844729943060968000
  }
]
```

---

## Probe complete.

**Finished:** 2026-05-18T01:57:32.007Z