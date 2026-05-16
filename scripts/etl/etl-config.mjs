// Shared config for all ETL scripts.
// All env vars must be set; we fail loudly if anything is missing rather than
// silently default to "production" or "main project."

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`required env var missing: ${name}`);
  return v;
}

export const CONFIG = {
  // BigQuery
  bqProjectId: process.env.BQ_PROJECT_ID ?? "dapperlabs-data",
  bqDataset: "production_sem_open",
  // Cap any single BQ query to 10 GB scan (≈ $0.05). Exceeding = job fails.
  bqMaxBytesBilled: Number(process.env.BQ_MAX_BYTES_BILLED ?? 10 * 1024 ** 3),

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // ETL behavior
  clientSafeName: "nba_top_shot",
  // 10K row batches are Supabase's ~1MB sweet spot; halved fallback on 413 in upsertChunk.
  chunkRows: Number(process.env.ETL_CHUNK_ROWS ?? 10000),
  bqPageSize: Number(process.env.BQ_PAGE_SIZE ?? 10000), // rows per BQ getQueryResults page
  cursorOverlapMinutes: Number(process.env.ETL_CURSOR_OVERLAP_MIN ?? 5), // re-pull last 5min for late-arrivers
  retryMax: Number(process.env.ETL_RETRY_MAX ?? 3),
  retryBaseMs: Number(process.env.ETL_RETRY_BASE_MS ?? 1000),

  // Per-table source mappings: BQ table → Supabase table → cursor field → PK conflict cols
  tables: {
    players: {
      bq: "asset_nba_player",
      sb: "players",
      cursor: "row_updated_at",
      pk: "player_id",
      // Static-ish; only re-sync once per N hours in incremental mode.
      staleHours: 24,
    },
    teams: {
      bq: "asset_nba_team",
      sb: "teams",
      cursor: "row_updated_at",
      pk: "team_id",
      staleHours: 24,
    },
    sets: {
      bq: "asset_nba_set",
      sb: "sets",
      cursor: "row_updated_at",
      pk: "set_id",
      staleHours: 6,
    },
    plays: {
      bq: "asset_nba_play",
      sb: "plays",
      cursor: "row_updated_at",
      pk: "play_id",
      staleHours: 6,
    },
    editions: {
      bq: "asset_nba_edition",
      sb: "editions",
      cursor: "row_updated_at",
      pk: "edition_id",
      staleHours: 1,
    },
    moments: {
      bq: "asset_nba_moment",
      sb: "moments",
      // Incremental cursor = pipeline timestamp (catches every refresh).
      cursor: "row_updated_at",
      // Backfill cursor = row's actual updated_at; row_updated_at is the
      // same value for every row (set by the BQ refresh pipeline), so any
      // historical date-range filter returns 0 rows. updated_at IS the field
      // we want to scan over historically. Aligned with the transactions
      // table's identical fix.
      backfillCursor: "updated_at",
      pk: "moment_id",
      // moment_secret is partitioned by updated_at; required for cost discipline.
      partitionField: "updated_at",
      // Parallel backfill divides date range across workers; 7-day chunks
      // inside each worker keep BQ scan cost bounded per query.
      backfillChunkDays: 7,
      staleHours: 0, // every run
    },
    transactions: {
      bq: "transaction",
      sb: "transactions",
      // BQ row_updated_at is the pipeline timestamp (recent for all rows, useless
      // for historical chunked backfill). Transactions are immutable once
      // SUCCEEDED so updated_at IS the right cursor — and it's the same field
      // MVs filter on (source_updated_at = BQ updated_at, renamed at upsert).
      cursor: "updated_at",
      pk: "id", // canonical tx id; we rename to transaction_id in Supabase target
      // Transaction view has special filters: client_safe_name + DATE(updated_at) partition prune.
      partitionField: "updated_at",
      filter: `client_safe_name = '${"nba_top_shot"}'`,
      staleHours: 0,
    },
    market_caps: {
      bq: "asset_nba_market_caps",
      sb: "market_caps",
      cursor: "date", // no row_updated_at on this view
      pk: "date,edition_id",
      staleHours: 0,
    },
    packs: {
      bq: "asset_nba_pack",
      sb: "packs",
      cursor: "row_updated_at",
      pk: "pack_id",
      // pack_secret is partitioned by updated_at (DATE(row_updated_at) scans 175MB vs DATE(updated_at) 42MB).
      partitionField: "updated_at",
      // Pack rows are heavy (image URLs, gated_criteria); chunk daily not weekly for backfill.
      backfillChunkDays: 1,
      staleHours: 1,
    },
    drops: {
      bq: "asset_nba_drop",
      sb: "drops",
      cursor: "row_updated_at",
      pk: "drop_id",
      staleHours: 1,
    },
  },

  // Order matters — FK deps dictate sync sequence.
  // teams must precede players (players FK→teams.team_id);
  // players + teams must precede plays (plays FK→both);
  // sets + plays must precede editions (editions FK→both);
  // editions must precede moments + market_caps;
  // moments must precede transactions;
  // sets must precede packs.
  syncOrder: [
    "teams",
    "players",
    "sets",
    "plays",
    "editions",
    "moments",
    "transactions",
    "market_caps",
    "packs",
    "drops",
  ],
};

export function requireSupabaseCreds() {
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");
}
