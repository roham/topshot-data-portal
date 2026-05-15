// V2 STAGE-3 (revised iter-2) — snapshot read layer.
//
// Architecture: snapshots are written by GitHub Actions workflows (one per
// cadence) directly to the repo at `.snapshots/{cadence}/{timestamp}.json`
// using the Action's implicit GITHUB_TOKEN. Vercel auto-deploys each push,
// so every accumulated snapshot ships with the next deploy.
//
// Render-side (this module) reads from raw.githubusercontent.com / the
// public GitHub Contents API — anonymous, no token required. Both are
// edge-cached. No SNAPSHOTS_GH_TOKEN, no Vercel Blob, no PAT management.
//
// The write path lives in scripts/snapshot-{cadence}.mjs and the
// .github/workflows/snapshot-{cadence}.yml workflows.

const GH_API = "https://api.github.com";
const GH_RAW = "https://raw.githubusercontent.com";

const REPO = process.env.SNAPSHOT_REPO ?? "roham/topshot-data-portal";
const BRANCH = process.env.SNAPSHOT_BRANCH ?? "main";

export type Cadence =
  | "hot"
  | "warm"
  | "market"
  | "players"
  | "portfolios"
  | "nba-games"
  // iter-16 long-window tier: each is one full aggregate over the named window
  // computed by chronologicalTxBackfill. Day every 2h, week every 12h, month every 24h.
  | "day"
  | "week"
  | "month";

interface GhEntry {
  name: string;
  download_url: string;
  size: number;
}

/**
 * List the N most-recent snapshot keys for a cadence. Filenames are ISO-8601
 * UTC with colons replaced by dashes, so lexical sort = chronological sort.
 */
export async function listRecentSnapshotKeys(
  cadence: Cadence,
  limit: number = 96,
): Promise<Array<{ name: string; downloadUrl: string; size: number }>> {
  const url = `${GH_API}/repos/${REPO}/contents/.snapshots/${cadence}?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "dapper-portal/2.0" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const entries = (await res.json()) as GhEntry[];
    return entries
      .filter((e) => e.name.endsWith(".json"))
      .sort((a, b) => (a.name < b.name ? 1 : -1))
      .slice(0, limit)
      .map((e) => ({ name: e.name, downloadUrl: e.download_url, size: e.size }));
  } catch {
    return [];
  }
}

/**
 * Read the N freshest snapshots for a cadence, fully materialized.
 * Reads via raw.githubusercontent.com (anonymous, cached). For very long
 * series prefer listRecentSnapshotKeys + on-demand fetches.
 */
export async function readRecentSnapshots<T = unknown>(
  cadence: Cadence,
  limit: number = 96,
): Promise<Array<{ key: string; data: T }>> {
  const picks = await listRecentSnapshotKeys(cadence, limit);
  if (!picks.length) return [];
  const out: Array<{ key: string; data: T }> = [];
  for (const pick of picks) {
    try {
      const r = await fetch(pick.downloadUrl, { next: { revalidate: 60 } });
      if (r.ok) {
        out.push({ key: pick.name.replace(/\.json$/, ""), data: (await r.json()) as T });
      }
    } catch {
      // skip a single bad blob; do not fail the whole read
    }
  }
  return out;
}

/**
 * Fetch a single snapshot by exact filename. Prefer raw.githubusercontent.com.
 */
export async function readSnapshotByName<T = unknown>(
  cadence: Cadence,
  name: string,
): Promise<T | null> {
  const url = `${GH_RAW}/${REPO}/${BRANCH}/.snapshots/${cadence}/${name}.json`;
  try {
    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Filesystem-safe ISO-8601 UTC: 2026-05-15T01-35-00Z (colons → dashes).
 * Lexical order matches chronological order.
 */
export function snapshotKeyNow(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");
}
