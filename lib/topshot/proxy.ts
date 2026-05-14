const UPSTREAM = "https://public-api.nbatopshot.com/graphql";
const UA = "dapper-portal/1.0 (contact: r@dapperlabs.com)";
const TIMEOUT_MS = 15000;
const BACKOFF_MS = 2000;

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

// Suppress unused warning
void BACKOFF_MS;

// In-memory cache by query+vars hash (server-side, per process).
// Cache TTLs: short for live data (listings, transactions), long for static (players, editions).
const cache = new Map<string, { ts: number; data: unknown }>();

function key(query: string, vars: unknown): string {
  return query + "::" + JSON.stringify(vars ?? {});
}

export interface FetchOpts {
  ttlMs?: number;
  noCache?: boolean;
}

export async function gqlFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: FetchOpts = {}
): Promise<T> {
  const ttl = opts.ttlMs ?? 60_000;
  const k = key(query, variables);
  if (!opts.noCache) {
    const hit = cache.get(k);
    if (hit && Date.now() - hit.ts < ttl) {
      return hit.data as T;
    }
  }

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(tid);
  }

  const text = await res.text();
  // Detect "Too Many Requests" rate-limit HTML and back off briefly.
  if (text.includes("Too Many Requests") || text.includes("Slow Down")) {
    // Mark cache with a long-lived stale-fallback if available
    const hit = cache.get(k);
    if (hit) return hit.data as T;
    throw new Error("upstream_rate_limited");
  }
  let json: GqlResponse<T>;
  try {
    json = JSON.parse(text) as GqlResponse<T>;
  } catch {
    throw new Error(`Upstream non-JSON ${res.status}: ${text.slice(0, 200)}`);
  }
  if (json.errors && json.errors.length) {
    throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Empty response");
  }
  if (!opts.noCache) {
    cache.set(k, { ts: Date.now(), data: json.data });
  }
  return json.data;
}

export function clearCache() {
  cache.clear();
}
