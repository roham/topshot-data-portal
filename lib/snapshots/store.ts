// V2 STAGE-3 — snapshot persistence layer.
//
// Snapshots are committed to a separate git repo via the GitHub Contents API
// so the main code repo stays clean and snapshot history is auditable +
// readable + diffable forever. This is the durable backing store; per-render
// reads come from a 30-60s edge cache in front of the same API.
//
// Configure on Vercel:
//   SNAPSHOTS_GH_TOKEN  — fine-grained PAT with `contents:write` on the
//                         storage repo
//   SNAPSHOTS_GH_REPO   — owner/repo (default: roham/topshot-data-portal-snapshots)
//   SNAPSHOTS_GH_BRANCH — branch (default: main)
//
// When env vars are not set (e.g. local dev), writeSnapshot is a no-op and
// logs the would-be payload size — the build keeps working.

const GH_API = "https://api.github.com";

interface WriteOpts {
  cadence: "15m" | "1h" | "30m-market" | "30m-portfolio" | "30m-player" | "6h-nba";
  key: string; // e.g. "2026-05-15T00-15"
  data: unknown;
  message?: string;
}

interface WriteResult {
  ok: boolean;
  url?: string;
  sha?: string;
  reason?: string;
  bytes: number;
}

function env(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) return process.env[name];
  return undefined;
}

function getRepo() {
  return env("SNAPSHOTS_GH_REPO") ?? "roham/topshot-data-portal-snapshots";
}
function getBranch() {
  return env("SNAPSHOTS_GH_BRANCH") ?? "main";
}
function getToken() {
  return env("SNAPSHOTS_GH_TOKEN");
}

export async function writeSnapshot(opts: WriteOpts): Promise<WriteResult> {
  const payload = JSON.stringify(opts.data, null, 0);
  const bytes = new TextEncoder().encode(payload).length;
  const token = getToken();
  const repo = getRepo();
  const branch = getBranch();
  if (!token) {
    return { ok: false, reason: "no SNAPSHOTS_GH_TOKEN — write skipped", bytes };
  }
  const path = `${opts.cadence}/${opts.key}.json`;
  const url = `${GH_API}/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const body = {
    message: opts.message ?? `[snapshot] ${opts.cadence} ${opts.key}`,
    content: btoa(payload),
    branch,
  };
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "dapper-portal/2.0",
      },
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as { content?: { html_url?: string; sha?: string }; message?: string };
    if (!res.ok) {
      return { ok: false, reason: `gh ${res.status}: ${j.message ?? "unknown"}`, bytes };
    }
    return { ok: true, url: j.content?.html_url, sha: j.content?.sha, bytes };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e), bytes };
  }
}

// Read latest N snapshots for a cadence. Lists directory, sorts by name desc,
// fetches the N freshest. Used by render-side reads for chart histories.
export async function readRecentSnapshots(
  cadence: WriteOpts["cadence"],
  limit: number = 96,
): Promise<Array<{ key: string; data: unknown }>> {
  const token = getToken();
  const repo = getRepo();
  const branch = getBranch();
  if (!token) return [];
  const listUrl = `${GH_API}/repos/${repo}/contents/${cadence}?ref=${encodeURIComponent(branch)}`;
  try {
    const res = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "dapper-portal/2.0",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const entries = (await res.json()) as Array<{ name: string; download_url: string }>;
    const picks = entries
      .filter((e) => e.name.endsWith(".json"))
      .sort((a, b) => (a.name < b.name ? 1 : -1))
      .slice(0, limit);
    const out: Array<{ key: string; data: unknown }> = [];
    for (const pick of picks) {
      try {
        const r = await fetch(pick.download_url, { next: { revalidate: 60 } });
        if (r.ok) out.push({ key: pick.name.replace(/\.json$/, ""), data: await r.json() });
      } catch {
        // skip
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function snapshotKeyNow(): string {
  // ISO-like but filesystem-safe: 2026-05-15T00-15-32Z
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");
}
