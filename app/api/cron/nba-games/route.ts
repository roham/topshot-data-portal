// V2 STAGE-3 — 6-hour NBA prior-day games + box scores via balldontlie.io.
// Free tier, no auth required for basic endpoints. We cache by-day and
// snapshot once. The per-player and per-game retrospective surfaces read
// this when they need to anchor a price chart's game markers.

import { NextRequest, NextResponse } from "next/server";
import { writeSnapshot, snapshotKeyNow } from "@/lib/snapshots/store";
import type { NBAGamesSnapshot } from "@/lib/snapshots/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BDL_BASE = "https://api.balldontlie.io/v1";

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface BDLGame {
  id: number;
  home_team: { abbreviation: string; full_name: string };
  visitor_team: { abbreviation: string; full_name: string };
  home_team_score: number;
  visitor_team_score: number;
  status: string;
  date: string;
}

async function bdl<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = { "User-Agent": "dapper-portal/2.0" };
  const token = process.env.BALLDONTLIE_API_KEY;
  if (token) headers["Authorization"] = token;
  try {
    const res = await fetch(`${BDL_BASE}${path}`, { headers, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const start = Date.now();
  const date = yesterday();
  const gamesRes = await bdl<{ data: BDLGame[] }>(`/games?dates[]=${date}&per_page=50`);
  const games = (gamesRes?.data ?? []).map((g) => ({
    id: g.id,
    homeTeam: g.home_team.abbreviation,
    awayTeam: g.visitor_team.abbreviation,
    homeScore: g.home_team_score,
    awayScore: g.visitor_team_score,
    status: g.status,
  }));
  const snap: NBAGamesSnapshot = { ts: Date.now(), date, games };
  const write = await writeSnapshot({
    cadence: "6h-nba",
    key: `${date}`, // one file per game-day, overwrites on retry
    data: snap,
    message: `[snapshot] 6h-nba ${date} ${games.length} games`,
  });
  return NextResponse.json({
    elapsedMs: Date.now() - start,
    date,
    gameCount: games.length,
    write,
  });
}
