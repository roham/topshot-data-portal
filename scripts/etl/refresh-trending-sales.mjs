// refresh-trending-sales.mjs — populate topshot.trending_edition_sales (the
// StockX scatter source) PER EDITION. The full-table transactions⋈moments join
// exceeds the pooler DDL cap; a single-edition join is index-driven and fast, so
// we iterate the top-N most-traded editions and insert each. Idempotent (truncate
// + reinsert). Run after mv_edition_growth_90d is fresh.
//
// Usage: node scripts/etl/refresh-trending-sales.mjs [topN]
// Supabase via SUPABASE_DB_URL (direct SQL).

import pg from "pg";

const TOP_N = Number(process.argv[2] ?? 80);
const SINCE_DAYS = 540;
const PER_EDITION_CAP = 500;

async function main() {
  const cs = (process.env.SUPABASE_DB_URL || "").replace(/[?&]sslmode=[^&]*/, "");
  if (!cs) throw new Error("SUPABASE_DB_URL not set");
  const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query("set statement_timeout = 90000");

  const { rows: elig } = await c.query(
    `select edition_id from topshot.mv_edition_growth_90d
     where price_now >= 20 and n_sales >= 25
     order by n_sales desc limit $1`,
    [TOP_N],
  );
  console.log(`[trending-sales] ${elig.length} eligible editions`);

  await c.query("truncate topshot.trending_edition_sales");

  let total = 0;
  for (let i = 0; i < elig.length; i++) {
    const id = elig[i].edition_id;
    const { rowCount } = await c.query(
      `insert into topshot.trending_edition_sales (edition_id, completed_at, price, serial_number, tx_type)
       select m.edition_id, t.completed_at, t.gross_amount_usd, m.serial_number, t.transaction_type_id
       from topshot.transactions t
       join topshot.moments m on m.moment_id = t.moment_id
       where m.edition_id = $1
         and t.gross_amount_usd > 0
         and t.completed_at is not null
         and t.completed_at >= (select max(completed_at) from topshot.transactions) - make_interval(days => $2)
       order by t.completed_at desc
       limit $3`,
      [id, SINCE_DAYS, PER_EDITION_CAP],
    );
    total += rowCount;
    if ((i + 1) % 20 === 0) console.log(`[trending-sales] ${i + 1}/${elig.length} editions, ${total} sales`);
  }

  await c.query("notify pgrst, 'reload schema'");
  console.log(`[trending-sales] done — ${total} sales across ${elig.length} editions.`);
  await c.end();
}

main().catch((e) => {
  console.error("[trending-sales] FAILED:", e.message);
  process.exit(1);
});
