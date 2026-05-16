// ETL helpers — PII filter, chunking, retry/backoff, cursor state I/O.
// The PII filter is the security boundary; it MUST be a pure data function with tests.

// Hard PII denylist — any of these fields, anywhere, in any table, must be stripped
// before writing to Supabase. Even if a future allowlist accidentally includes one.
export const PII_DENYLIST = [
  "buyer_country_code",
  "seller_country_code",
  "buyer_province_code",
  "seller_province_code",
  "buyer_type_id",
  "seller_type_id",
  "buyer_is_guest",
  "buyer_id",
  "seller_id",
  "buyer_name",
  "seller_name",
  "buyer_email",
  "seller_email",
  "buyer_ip",
  "seller_ip",
  "owner_user_id",
  "user_id",
  "email",
  "ip",
  "ip_address",
];

// Per-table allowlist — what survives the filter. Anything not here = dropped.
// Keep tight; expand intentionally. Schema drift = silent loss is preferred over silent leak.
export const ALLOWLISTS = {
  transactions: [
    "id", // canonical PK
    "transaction_type_id",
    "transaction_state_id",
    "transaction_source_id",
    "platform",
    "seller_safe_name",
    "buyer_safe_name",
    "client_id",
    "client_class_id",
    "client_name",
    "client_safe_name",
    "asset_id",
    "product_specific_asset_id",
    "asset_type_id",
    "asset_name",
    "state",
    "failed_reason",
    "amount",
    "currency",
    "gross_amount_usd",
    "net_amount_usd",
    "gross_sales_volume_usd",
    "gross_estimated_proceeds_usd",
    "net_estimated_proceeds_usd",
    "payment_type",
    "is_preorder",
    "has_payment",
    "list_price_usd",
    "discount_amount_usd",
    "discount_type",
    "created_at",
    "updated_at",
    "completed_at",
    "client_marketplace_id",
    "client_marketplace_class_id",
    "client_marketplace_name",
    "client_marketplace_safe_name",
    "offer_created_at",
    "is_manual",
    "updated_at", // BQ name; sync.mjs renames to source_updated_at for transactions
    "row_updated_at", // present on transactions only — kept verbatim
  ],
  moments: [
    "moment_id", // PK
    "moment_flow_id",
    "moment_name",
    "edition_id",
    "subedition_id",
    "edition_name",
    "serial_number",
    "top_shot_score",
    "moment_status",
    "released_at",
    "locked_at",
    "lock_expires_at",
    "unlocked_at",
    "burned_at",
    "listed_at",
    "listing_price_usd",
    "set_id",
    "set_name",
    "pack_id",
    "pack_name",
    "pack_listing_id",
    "description",
    "short_description",
    "series_name",
    "league",
    "play_id",
    "play_name",
    "play_focus",
    "player_id",
    "player_name",
    "player_first_name",
    "player_last_name",
    "player_jersey_number_at_moment",
    "player_last_known_current_team_name",
    "player_last_known_team_id",
    "player_primary_position_at_moment",
    "team_at_moment_team_id",
    "team_at_moment_historical_name",
    "team_at_moment_current_name",
    "tier_id",
    "tier_name",
    "rarity",
    "created_at",
    "updated_at",
  ],
  editions: [
    "edition_id", // PK
    "edition_name",
    "play_id",
    "play_name",
    "set_id",
    "set_name",
    "series_name",
    "description",
    "short_description",
    "image_urls",
    "url",
    "video_length_miliseconds",
    "video_urls",
    "mint_count",
    "play_focus",
    "league",
    "player_id",
    "player_name",
    "player_first_name",
    "player_last_name",
    "player_jersey_number_at_moment",
    "player_last_known_current_team_name",
    "player_last_known_team_id",
    "player_primary_position_at_moment",
    "team_at_moment_team_id",
    "team_at_moment_historical_name",
    "team_at_moment_current_name",
    "tier_id",
    "tier_name",
    "rarity",
  ],
  sets: [
    "set_id", // PK
    "set_name",
    "set_flow_id",
    "series_number",
    "series_name",
    "version",
    "primary_league",
    "secondary_league",
    "leagues",
    "description",
    "is_locked",
    "is_minted",
    "is_hidden",
    "set_tier_id",
    "set_tier_name",
    "set_rarity",
  ],
  plays: [
    "play_id", // PK
    "play_name",
    "version",
    "date_of_play",
    "play_category",
    "play_type",
    "created_at",
    "updated_at",
    "play_focus",
    "league",
    "season_code",
    "season_name",
    "description",
    "short_description",
    "override_headline",
    "team_at_moment_team_id",
    "team_at_moment_historical_name",
    "home_team_team_id",
    "home_team_historical_name",
    "away_team_team_id",
    "away_team__historical_name",
    "home_team_score",
    "away_team_score",
    "player_id",
    "jersey_number_at_moment",
    "primary_position_at_moment",
    "key_stats",
    "image_urls",
    "url",
    "video_length_miliseconds",
    "video_urls",
    "play_status",
    "player_name",
    "player_first_name",
    "player_last_name",
    "player_last_known_team_id",
    "player_last_known_current_team_name",
    "team_at_moment_current_name",
    "home_team_current_name",
    "away_team_current_name",
  ],
  players: [
    "player_id", // PK
    "league",
    "full_name",
    "first_name",
    "last_name",
    "created_at",
    "updated_at",
    "draft_year",
    "draft_round",
    "draft_selection",
    "draft_team_team_id",
    "birthplace",
    "birthdate",
    "last_known_primary_postion",
    "last_known_team_id",
    "last_known_team_full_name",
    "draft_team_full_name",
    "date_of_first_play",
    "date_of_last_play",
    "first_minted_moment_date",
    "last_minted_moment_date",
  ],
  teams: [
    "team_id", // PK
    "league",
    "full_name",
    "alternate_name",
    "safe_name",
    "created_at",
    "updated_at",
  ],
  market_caps: [
    "date", // composite PK with edition_id
    "edition_id",
    "num_moments_in_circulation",
    "lowest_ask_price",
    "highest_offer_price",
    "market_cap",
  ],
  packs: [
    "pack_id", // PK
    "pack_listing_id",
    "drop_id",
    "pack_flow_id",
    "reservation_id",
    "version",
    "pack_name",
    "description",
    "image_url",
    "is_starter_pack",
    "is_reward",
    "max_order_quantity",
    "moments_per_pack",
    "total_packs",
    "pack_status",
    "opened_at",
    "fulfillment_tx_hash",
    "is_preorder",
    "price",
    "currency",
    "leagues",
    "primary_league",
    "secondary_league",
    "gated_criteria",
    "sale_type",
    "pack_tier_id",
    "pack_tier_name",
    "pack_rarity",
    "created_at",
    "updated_at",
    "started_at",
    "expired_at",
    "container_pack_id",
    "is_container",
    "total_moments",
  ],
  drops: [
    "drop_id", // PK
    "started_at",
    "expired_at",
    "drop_duration_type",
    "is_active",
    "has_preorders",
    "total_pack_listings",
    "total_packs",
    "total_moments",
    "percent_reserved_packs",
    "is_queued",
    "created_at",
    "updated_at",
  ],
};

export function pii_filter(bq_row, table_name) {
  const allowed = ALLOWLISTS[table_name];
  if (!allowed) {
    throw new Error(`pii_filter: no allowlist for table "${table_name}"`);
  }
  const allowedSet = new Set(allowed);
  const denySet = new Set(PII_DENYLIST);
  const out = {};
  for (const [k, v] of Object.entries(bq_row)) {
    if (denySet.has(k)) continue; // hard deny — always strip
    if (!allowedSet.has(k)) continue; // not in allowlist — strip
    out[k] = v;
  }
  return out;
}

// Second pass — strip any column not present in the live Supabase target table.
// This eliminates per-chunk upsert retries from schema drift (ALLOWLIST may
// list columns that don't exist in Supabase, e.g. moments.player_id).
// `allowed === null` is a deliberate opt-out for tests / first run before
// columns are resolved; behaves like identity.
export function filterByColumns(row, allowed) {
  if (allowed === null || allowed === undefined) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

// Partition an ISO date range into N contiguous slices. Used by the parallel
// backfill driver; each worker handles one slice.
export function partitionRange(startIso, endIso, workers) {
  if (workers < 1) throw new Error("partitionRange: workers must be >= 1");
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!(endMs > startMs)) throw new Error("partitionRange: end must be > start");
  const total = endMs - startMs;
  const sliceMs = total / workers;
  const out = [];
  for (let i = 0; i < workers; i++) {
    const s = startMs + Math.round(i * sliceMs);
    const e = i === workers - 1 ? endMs : startMs + Math.round((i + 1) * sliceMs);
    out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
  }
  return out;
}

// One round-trip query against information_schema for every target table.
// Returns Map<table, Set<column>>. The Supabase client `sb` is the admin
// service-role client; we explicitly target the `public` schema where
// exec_sql lives (sbAdmin defaults to `topshot`).
export async function loadSupabaseColumns(sb, tableNames) {
  const list = tableNames.map((t) => `'${t.replace(/'/g, "''")}'`).join(",");
  const sql = `SELECT table_name, column_name
               FROM information_schema.columns
               WHERE table_schema = 'topshot' AND table_name IN (${list})
               ORDER BY table_name, ordinal_position`;
  const target = typeof sb.schema === "function" ? sb.schema("public") : sb;
  const { data, error } = await target.rpc("exec_sql", { sql });
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    if (!map.has(row.table_name)) map.set(row.table_name, new Set());
    map.get(row.table_name).add(row.column_name);
  }
  return map;
}

// chunkWeeks(start, end) — yields [{start, end}] weekly bands for backfill.
// Final band is clamped to `end`. Returns ISO strings.
export function* chunkWeeks(startIso, endIso) {
  yield* chunkInterval(startIso, endIso, 7);
}

// chunkInterval(start, end, days) — generic chunker.
export function* chunkInterval(startIso, endIso, days) {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  const intervalMs = days * 24 * 60 * 60 * 1000;
  let cur = startMs;
  while (cur < endMs) {
    const next = Math.min(cur + intervalMs, endMs);
    yield {
      start: new Date(cur).toISOString(),
      end: new Date(next).toISOString(),
    };
    cur = next;
  }
}

// retryWithBackoff(fn, {maxAttempts, baseMs}) — exponential backoff.
// Default maxAttempts=3, baseMs=500. Throws the last error if all attempts fail.
export async function retryWithBackoff(fn, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 500;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const delay = baseMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// Cursor state I/O against topshot._etl_cursors. Caller provides supabase admin client.
// Schema: (table_name TEXT PK, last_cursor_at TIMESTAMPTZ, last_row_count BIGINT,
//          last_run_at TIMESTAMPTZ, last_error TEXT).
export async function readCursor(sb, tableName) {
  const { data, error } = await sb
    .schema("topshot")
    .from("_etl_cursors")
    .select("*")
    .eq("table_name", tableName)
    .maybeSingle();
  if (error) throw error;
  return data; // null if no row yet
}

export async function writeCursor(sb, tableName, fields) {
  const row = {
    table_name: tableName,
    last_run_at: new Date().toISOString(),
    ...fields,
  };
  const { error } = await sb
    .schema("topshot")
    .from("_etl_cursors")
    .upsert(row, { onConflict: "table_name" });
  if (error) throw error;
}

export async function writeHeartbeat(sb, fields) {
  const row = {
    id: 1, // single-row table
    last_success_at: new Date().toISOString(),
    ...fields,
  };
  const { error } = await sb
    .schema("topshot")
    .from("_etl_heartbeat")
    .upsert(row, { onConflict: "id" });
  if (error) throw error;
}

// Try to take the per-table advisory lock. Returns true on success.
// Caller MUST release (or process exit clears it).
export async function tryAdvisoryLock(sb, lockKey) {
  const { data, error } = await sb.rpc("pg_try_advisory_lock", {
    key: hashLockKey(lockKey),
  });
  if (error) {
    // RPC may not exist; degrade open. Caller is the gate.
    return true;
  }
  return data === true;
}

export async function releaseAdvisoryLock(sb, lockKey) {
  try {
    await sb.rpc("pg_advisory_unlock", { key: hashLockKey(lockKey) });
  } catch {
    // best effort
  }
}

function hashLockKey(s) {
  // Simple 32-bit djb2 hash; pg_advisory_lock accepts int8.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

// Upsert a batch of rows into a topshot.<table> using onConflict primary key.
// Returns count upserted.
//
// If `sb._columnsByTable` is set (populated by loadSupabaseColumns at startup),
// rows are pre-filtered to the live column set — eliminating per-chunk
// self-heal retries from schema drift. Self-heal remains as a backup; if it
// fires after pre-resolution, it means the cache is stale and we ALERT.
//
// On a 413/PayloadTooLarge, we halve the batch once and retry (covers the rare
// row that bloats past 1MB at 10K rows).
//
// On transient errors (5xx, ECONNRESET, 429, fetch failures), we exponential
// backoff and retry. Up to 5 attempts; PostgREST under heavy load can return
// 520/521/524 via Cloudflare.
const TRANSIENT_HTTP = new Set([429, 502, 503, 504, 520, 521, 522, 524]);
function isTransientError(err) {
  if (!err) return false;
  if (TRANSIENT_HTTP.has(err.status)) return true;
  const msg = err.message ?? err.error ?? String(err);
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|timeout|520|521|522|524|connection reset/i.test(msg);
}

export async function upsertChunk(sb, tableName, rows, conflictCols) {
  if (!rows.length) return 0;
  // Pre-filter against live column allowlist (set once at startup).
  const liveCols = sb._columnsByTable?.get(tableName) ?? null;
  let working = liveCols
    ? rows.map((r) => filterByColumns(r, liveCols))
    : rows;
  const droppedCols = new Set();
  let payloadHalved = false;
  let transientAttempt = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    let error;
    try {
      // count: "exact" forces a separate COUNT(*) query on the affected rows —
      // measurable overhead at 10K-row batches. We trust working.length instead;
      // the upsert is atomic per call so they match unless an error fired.
      const res = await sb
        .schema("topshot")
        .from(tableName)
        .upsert(working, { onConflict: conflictCols });
      error = res.error;
    } catch (thrown) {
      // fetch failures (network) throw rather than return {error}.
      error = thrown;
    }
    if (!error) {
      if (droppedCols.size && liveCols) {
        // Pre-resolution should have caught these; fire alert.
        logRun({
          phase: "upsert_self_heal_after_preresolve",
          table: tableName,
          dropped: [...droppedCols],
          alert: true,
        });
      } else if (droppedCols.size) {
        logRun({
          phase: "upsert_dropped_unknown_cols",
          table: tableName,
          dropped: [...droppedCols],
        });
      }
      return working.length;
    }
    // Transient — exponential backoff.
    if (isTransientError(error) && transientAttempt < 5) {
      transientAttempt++;
      const delay = 1000 * 2 ** transientAttempt + Math.floor(Math.random() * 500);
      logRun({
        phase: "upsert_transient_retry",
        table: tableName,
        attempt: transientAttempt,
        delay,
        status: error.status,
        msg: (error.message ?? String(error)).slice(0, 200),
      });
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    // Payload too large → halve batch once.
    if (!payloadHalved && (error.status === 413 || /payload/i.test(error.message ?? ""))) {
      payloadHalved = true;
      const half = Math.max(1, Math.floor(working.length / 2));
      const first = working.slice(0, half);
      const rest = working.slice(half);
      logRun({ phase: "upsert_payload_halved", table: tableName, from: rows.length, to: half });
      const n1 = await upsertChunk(sb, tableName, first, conflictCols);
      const n2 = await upsertChunk(sb, tableName, rest, conflictCols);
      return n1 + n2;
    }
    const m = error.message?.match(/Could not find the '([^']+)' column/);
    if (!m) throw error;
    const badCol = m[1];
    droppedCols.add(badCol);
    working = working.map((r) => {
      const { [badCol]: _drop, ...rest } = r;
      return rest;
    });
  }
  throw new Error(`upsertChunk(${tableName}): hit retry cap; dropped: ${[...droppedCols].join(",")}`);
}

// Logs a structured ETL run record (one line per call). Captured by GH Actions.
export function logRun(record) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
}
