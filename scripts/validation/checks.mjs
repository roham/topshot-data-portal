// Validation check definitions. Each check has:
//   name         — short slug stored in DB
//   description  — human-readable, surfaced in dashboard tooltips
//   metric       — 'spearman' | 'pct_delta' | 'abs_delta' | 'ratio'
//   threshold    — number; comparator is implied by metric (see below)
//   passComparator — '>=' or '<=' explicitly so the runner doesn't have to
//                    infer.
//   bqSql        — BigQuery SQL string
//   sbSql        — Postgres SQL string (executed via exec_sql RPC)
//   compute(bq, sb) — returns { metricValue, bqValue, sbValue, notes? }
//
// Adding a check: append to CHECKS below. The dashboard will pick it up on
// the next run automatically.

import {
  spearmanCorrelation,
  pctDelta,
  absDelta,
  ratio,
} from "./lib/metrics.mjs";

// Comparator helpers. `passes` returns true when the metric is within threshold.
function passes(metricValue, threshold, comparator) {
  if (metricValue == null || !Number.isFinite(Number(metricValue))) return false;
  const v = Number(metricValue);
  const t = Number(threshold);
  if (comparator === ">=") return v >= t;
  if (comparator === "<=") return v <= t;
  throw new Error(`unknown comparator: ${comparator}`);
}

// ─── Top players: rank correlation ───────────────────────────────────────
// Compare top-10 player names by total_volume_usd. Names are joined via the
// player_id → full_name path in BQ; Supabase MV stores player_name as
// pl.full_name. So both sides yield the same identifier space.

const TOP_PLAYERS_24H = {
  name: "top_players_24h_spearman",
  description: "Top-10 players by volume (24h) — Spearman rank vs BQ.",
  metric: "spearman",
  threshold: 0.7,
  passComparator: ">=",
  bqSql: `
    SELECT pl.full_name AS player_name,
           COALESCE(SUM(t.gross_amount_usd), 0) AS total_volume_usd
    FROM \`dapperlabs-data.production_sem_open.transaction\` t
    JOIN \`dapperlabs-data.production_sem_open.asset_nba_moment\` m
      ON m.moment_id = t.product_specific_asset_id
    JOIN \`dapperlabs-data.production_sem_open.asset_nba_edition\` e
      ON e.edition_id = m.edition_id
    JOIN \`dapperlabs-data.production_sem_open.asset_nba_player\` pl
      ON pl.player_id = e.player_id
    WHERE t.transaction_state_id = 'SUCCEEDED'
      AND t.client_safe_name    = 'nba_top_shot'
      AND DATE(t.updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    GROUP BY pl.full_name
    ORDER BY total_volume_usd DESC
    LIMIT 10
  `,
  sbSql: `
    SELECT player_name, total_volume_usd
    FROM topshot.mv_player_24h_volume
    ORDER BY total_volume_usd DESC NULLS LAST
    LIMIT 10
  `,
  compute(bqRows, sbRows) {
    const bqList = bqRows.map((r) => r.player_name).filter(Boolean);
    const sbList = sbRows.map((r) => r.player_name).filter(Boolean);
    const r = spearmanCorrelation(bqList, sbList);
    return {
      metricValue: r,
      bqValue: bqList,
      sbValue: sbList,
      notes: r == null ? "fewer than 2 names intersect — likely empty MV or BQ window" : null,
    };
  },
};

const TOP_PLAYERS_7D = {
  name: "top_players_7d_spearman",
  description: "Top-10 players by volume (7d) — Spearman rank vs BQ.",
  metric: "spearman",
  threshold: 0.7,
  passComparator: ">=",
  bqSql: `
    SELECT pl.full_name AS player_name,
           COALESCE(SUM(t.gross_amount_usd), 0) AS total_volume_usd
    FROM \`dapperlabs-data.production_sem_open.transaction\` t
    JOIN \`dapperlabs-data.production_sem_open.asset_nba_moment\` m
      ON m.moment_id = t.product_specific_asset_id
    JOIN \`dapperlabs-data.production_sem_open.asset_nba_edition\` e
      ON e.edition_id = m.edition_id
    JOIN \`dapperlabs-data.production_sem_open.asset_nba_player\` pl
      ON pl.player_id = e.player_id
    WHERE t.transaction_state_id = 'SUCCEEDED'
      AND t.client_safe_name    = 'nba_top_shot'
      AND DATE(t.updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY pl.full_name
    ORDER BY total_volume_usd DESC
    LIMIT 10
  `,
  sbSql: `
    SELECT player_name, total_volume_usd
    FROM topshot.mv_player_7d_volume
    ORDER BY total_volume_usd DESC NULLS LAST
    LIMIT 10
  `,
  compute(bqRows, sbRows) {
    const bqList = bqRows.map((r) => r.player_name).filter(Boolean);
    const sbList = sbRows.map((r) => r.player_name).filter(Boolean);
    const r = spearmanCorrelation(bqList, sbList);
    return {
      metricValue: r,
      bqValue: bqList,
      sbValue: sbList,
      notes: r == null ? "fewer than 2 names intersect — likely empty MV or BQ window" : null,
    };
  },
};

// ─── Market totals: pct_delta ────────────────────────────────────────────

const TOTAL_VOLUME_24H = {
  name: "total_volume_24h_pct_delta",
  description: "Total marketplace volume (24h, USD) — % delta vs BQ.",
  metric: "pct_delta",
  threshold: 0.05,
  passComparator: "<=",
  bqSql: `
    SELECT COALESCE(SUM(gross_amount_usd), 0) AS total_volume_usd
    FROM \`dapperlabs-data.production_sem_open.transaction\`
    WHERE transaction_state_id = 'SUCCEEDED'
      AND client_safe_name    = 'nba_top_shot'
      AND DATE(updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  `,
  sbSql: `
    SELECT total_volume_usd
    FROM topshot.mv_market_summary_24h
    WHERE singleton_id = 1
  `,
  compute(bqRows, sbRows) {
    const bq = Number(bqRows[0]?.total_volume_usd ?? 0);
    const sb = Number(sbRows[0]?.total_volume_usd ?? 0);
    return {
      metricValue: pctDelta(sb, bq),
      bqValue: bq,
      sbValue: sb,
    };
  },
};

const TOTAL_TX_COUNT_24H = {
  name: "total_tx_count_24h_pct_delta",
  description: "Total transaction count (24h) — % delta vs BQ.",
  metric: "pct_delta",
  threshold: 0.02,
  passComparator: "<=",
  bqSql: `
    SELECT COUNT(*) AS tx_count
    FROM \`dapperlabs-data.production_sem_open.transaction\`
    WHERE transaction_state_id = 'SUCCEEDED'
      AND client_safe_name    = 'nba_top_shot'
      AND DATE(updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  `,
  sbSql: `
    SELECT total_tx_count
    FROM topshot.mv_market_summary_24h
    WHERE singleton_id = 1
  `,
  compute(bqRows, sbRows) {
    const bq = Number(bqRows[0]?.tx_count ?? 0);
    const sb = Number(sbRows[0]?.total_tx_count ?? 0);
    return {
      metricValue: pctDelta(sb, bq),
      bqValue: bq,
      sbValue: sb,
    };
  },
};

const DISTINCT_MOMENTS_TRADED_24H = {
  name: "distinct_moments_traded_24h_pct_delta",
  description: "Distinct moments traded (24h) — % delta vs BQ. Looser threshold while moments backfill catches up.",
  metric: "pct_delta",
  threshold: 0.1,
  passComparator: "<=",
  bqSql: `
    SELECT COUNT(DISTINCT product_specific_asset_id) AS distinct_moments
    FROM \`dapperlabs-data.production_sem_open.transaction\`
    WHERE transaction_state_id = 'SUCCEEDED'
      AND client_safe_name    = 'nba_top_shot'
      AND DATE(updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  `,
  sbSql: `
    SELECT unique_moments_traded
    FROM topshot.mv_market_summary_24h
    WHERE singleton_id = 1
  `,
  compute(bqRows, sbRows) {
    const bq = Number(bqRows[0]?.distinct_moments ?? 0);
    const sb = Number(sbRows[0]?.unique_moments_traded ?? 0);
    return {
      metricValue: pctDelta(sb, bq),
      bqValue: bq,
      sbValue: sb,
    };
  },
};

// ─── Largest sale: dollar-level equality ─────────────────────────────────

const LARGEST_SALE_24H = {
  name: "largest_sale_24h_abs_delta",
  description: "Largest single sale (24h, USD) — within $1.",
  metric: "abs_delta",
  threshold: 1,
  passComparator: "<=",
  bqSql: `
    SELECT MAX(gross_amount_usd) AS max_sale_usd
    FROM \`dapperlabs-data.production_sem_open.transaction\`
    WHERE transaction_state_id = 'SUCCEEDED'
      AND client_safe_name    = 'nba_top_shot'
      AND DATE(updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  `,
  sbSql: `
    SELECT gross_amount_usd
    FROM topshot.mv_largest_sales_24h
    ORDER BY gross_amount_usd DESC NULLS LAST
    LIMIT 1
  `,
  compute(bqRows, sbRows) {
    const bq = bqRows[0]?.max_sale_usd != null ? Number(bqRows[0].max_sale_usd) : null;
    const sb = sbRows[0]?.gross_amount_usd != null ? Number(sbRows[0].gross_amount_usd) : null;
    return {
      metricValue: absDelta(sb, bq),
      bqValue: bq,
      sbValue: sb,
    };
  },
};

// ─── Coverage: ratio ─────────────────────────────────────────────────────

const MOMENTS_COVERAGE = {
  name: "moments_table_coverage_ratio",
  description: "Supabase topshot.moments count / BQ non-burned moments — must be ≥95%.",
  metric: "ratio",
  threshold: 0.95,
  passComparator: ">=",
  bqSql: `
    SELECT COUNT(*) AS bq_count
    FROM \`dapperlabs-data.production_sem_open.asset_nba_moment\`
    WHERE moment_status != 'BURNED' OR moment_status IS NULL
  `,
  sbSql: `
    SELECT COUNT(*) AS sb_count FROM topshot.moments
  `,
  compute(bqRows, sbRows) {
    const bq = Number(bqRows[0]?.bq_count ?? 0);
    const sb = Number(sbRows[0]?.sb_count ?? 0);
    return {
      metricValue: ratio(sb, bq),
      bqValue: bq,
      sbValue: sb,
    };
  },
};

const TRANSACTIONS_COVERAGE_7D = {
  name: "transactions_coverage_7d_ratio",
  description: "Supabase transactions (7d) / BQ transactions (7d) — must be ≥95%.",
  metric: "ratio",
  threshold: 0.95,
  passComparator: ">=",
  bqSql: `
    SELECT COUNT(*) AS bq_count
    FROM \`dapperlabs-data.production_sem_open.transaction\`
    WHERE transaction_state_id = 'SUCCEEDED'
      AND client_safe_name    = 'nba_top_shot'
      AND DATE(updated_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  `,
  sbSql: `
    SELECT COUNT(*) AS sb_count
    FROM topshot.transactions
    WHERE transaction_state_id = 'SUCCEEDED'
      AND source_updated_at >= NOW() - INTERVAL '7 days'
  `,
  compute(bqRows, sbRows) {
    const bq = Number(bqRows[0]?.bq_count ?? 0);
    const sb = Number(sbRows[0]?.sb_count ?? 0);
    return {
      metricValue: ratio(sb, bq),
      bqValue: bq,
      sbValue: sb,
    };
  },
};

export const CHECKS = [
  TOP_PLAYERS_24H,
  TOP_PLAYERS_7D,
  TOTAL_VOLUME_24H,
  TOTAL_TX_COUNT_24H,
  DISTINCT_MOMENTS_TRADED_24H,
  LARGEST_SALE_24H,
  MOMENTS_COVERAGE,
  TRANSACTIONS_COVERAGE_7D,
];

// Exposed for the runner so it doesn't have to re-implement comparator logic.
export function checkPasses(check, metricValue) {
  return passes(metricValue, check.threshold, check.passComparator);
}
