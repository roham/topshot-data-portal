// 6-hour prior-day NBA games + scores via balldontlie.io (free tier).
import { writeSnapshot, snapshotKeyNow } from "./_snapshot-helpers.mjs";

const BDL_BASE = "https://api.balldontlie.io/v1";

function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function bdl(path) {
  const headers = { "User-Agent": "dapper-portal/2.0" };
  const token = process.env.BALLDONTLIE_API_KEY;
  if (token) headers.Authorization = token;
  const res = await fetch(`${BDL_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`bdl ${res.status}`);
  return res.json();
}

const date = yesterday();
let games = [];
try {
  const r = await bdl(`/games?dates[]=${date}&per_page=50`);
  games = (r?.data ?? []).map((g) => ({
    id: g.id,
    homeTeam: g.home_team?.abbreviation,
    awayTeam: g.visitor_team?.abbreviation,
    homeScore: g.home_team_score,
    awayScore: g.visitor_team_score,
    status: g.status,
  }));
} catch (e) {
  console.error(`bdl fetch failed: ${e?.message ?? e}`);
  process.exit(1);
}

const snap = { ts: Date.now(), date, games };
// One file per game-day; deterministic key so re-runs overwrite cleanly.
const w = await writeSnapshot("nba-games", date, snap);
console.log(JSON.stringify({ cadence: "nba-games", date, gameCount: games.length, bytes: w.bytes, file: w.file }));
