import Link from "next/link";
import { chronologicalTxBackfill, recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { timeAgo } from "@/lib/utils";
import type { MarketplaceTransaction, MomentTier } from "@/lib/topshot/types";

// V3 iter-17 — J-P5 watched-wallet activity feed (discovery surface).
// Server-rendered chronological feed of recent marketplace trades, filtered
// to rows where at least one party (buyer OR seller) has a public username.
// Source: chronologicalTxBackfill (sorted UPDATED_AT_DESC, exposes updatedAt
// timestamps required for the time-ago column) with a recentSalesBulk(500)
// fallback when the chronological pull returns empty. Both are public-API
// GraphQL pulls cached at 60–90s TTL; the route ships at revalidate=60.
//
// Voice: senior research analyst — observational, source-cited, no marketing.
// Honest-absence: when the named-entity filter strips below 5 rows, render
// a single warming caption instead of an em-dash table.

// Force dynamic — the feed is the freshest-data surface in the portal and
// build-time prerender risks empty / stale data (the upstream rate-limits
// concurrent prerender calls). revalidate=60 still bounds upstream load
// because gqlFetch caches the chronologicalTxBackfill page-1 result at 30s
// TTL inside the process.
export const dynamic = "force-dynamic";
export const revalidate = 60;
export const metadata = { title: "Activity feed · TS·PORTAL" };

interface FeedRow {
  txId: string;
  updatedAt: string | null;
  priceUsd: number;
  playerName: string;
  setFlowName: string;
  tier: string | null;
  serial: number | null;
  circulation: number | null;
  flowId: string | null;
  buyerUsername: string | null;
  buyerFlow: string | null;
  sellerUsername: string | null;
  sellerFlow: string | null;
}

function shortFlow(addr: string | null | undefined): string {
  if (!addr) return "—";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function pickTier(t: MarketplaceTransaction): string | null {
  const m = t.moment;
  if (!m) return null;
  return (m.edition?.tier ?? m.tier ?? null) as string | null;
}

function toFeedRow(t: MarketplaceTransaction): FeedRow {
  const m = t.moment;
  return {
    txId: t.id,
    updatedAt: t.updatedAt ?? null,
    priceUsd: Number(t.price ?? 0),
    playerName: m?.play?.stats?.playerName ?? "—",
    setFlowName: m?.set?.flowName ?? "—",
    tier: pickTier(t),
    serial: m?.flowSerialNumber != null ? Number(m.flowSerialNumber) : null,
    circulation: m?.edition?.circulationCount ?? null,
    flowId: m?.flowId ?? null,
    buyerUsername: t.buyer?.username ?? null,
    buyerFlow: t.buyer?.flowAddress ?? null,
    sellerUsername: t.seller?.username ?? null,
    sellerFlow: t.seller?.flowAddress ?? null,
  };
}

function PartyCell({ username, flow }: { username: string | null; flow: string | null }) {
  if (username) {
    return (
      <Link
        href={`/u/${encodeURIComponent(username)}`}
        className="text-[var(--accent)] hover:underline"
      >
        {username}
      </Link>
    );
  }
  return <span className="text-[var(--text-faint)] font-mono text-[10px]">{shortFlow(flow)}</span>;
}

export default async function FeedPage() {
  // Primary: chronological backfill (UPDATED_AT_DESC, exposes updatedAt).
  // 48h window is generous; the named-entity filter will trim hard.
  let bulk: MarketplaceTransaction[] = await chronologicalTxBackfill(
    48 * 60 * 60 * 1000,
    500,
  ).catch(() => [] as MarketplaceTransaction[]);

  // Fallback: if chronological pull returned empty (cursor-pagination edge),
  // fall back to recentSalesBulk(500). It lacks updatedAt timestamps but
  // returns newest-first; the time-ago cell will em-dash in that branch.
  if (bulk.length === 0) {
    bulk = await recentSalesBulk(500).catch(() => [] as MarketplaceTransaction[]);
  }

  // Named-entity filter — keep rows where at least one party has a username.
  const named = bulk.filter((t) => !!(t.buyer?.username || t.seller?.username));
  const rows = named.slice(0, 50).map(toFeedRow);

  // Window stats for the methodology caption.
  let oldestMs = Infinity;
  let newestMs = -Infinity;
  for (const t of bulk) {
    const ts = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
    if (!isFinite(ts)) continue;
    if (ts < oldestMs) oldestMs = ts;
    if (ts > newestMs) newestMs = ts;
  }
  const windowHours =
    isFinite(oldestMs) && isFinite(newestMs) && newestMs > oldestMs
      ? Math.max(1, Math.round((newestMs - oldestMs) / 3_600_000))
      : null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="space-y-1">
        <h1 className="text-[20px] font-semibold tracking-tight">Activity feed</h1>
        <p className="text-[11px] text-[var(--text-faint)]">
          Chronological named-buyer + named-seller activity
        </p>
      </header>

      <p className="text-[11px] text-[var(--text-faint)] px-1">
        {bulk.length} trades pulled · {named.length} pass the named-entity filter ·{" "}
        showing newest {rows.length}
        {windowHours != null ? ` · approx ${windowHours}h window` : ""} · 60s ISR
      </p>

      {rows.length < 5 ? (
        <Card>
          <p className="text-[12px] text-[var(--text-faint)] leading-relaxed">
            Feed warming — fewer than 5 named-entity trades in the recent bulk window.
            Re-pull in ~60s. The named-entity filter keeps only rows where at least one
            of buyer / seller has a public Top Shot username; anonymous flow-address-only
            trades are dropped to keep this surface useful for the watched-wallet JTBD.
          </p>
        </Card>
      ) : (
        <Card
          methodology={
            "Source: recentSalesBulk(500) from the public Top Shot GraphQL endpoint, " +
            "cached 60s. Rows are filtered to those where at least one party has a " +
            "public username — anonymous flow-address-only trades are dropped. " +
            "Newest first. This surface is the discovery layer for the watched-wallet " +
            "JTBD (J-P5); persistent watchlists ship in a later iter."
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] tnum">
              <thead className="text-[10px] tracking-data-label text-[var(--text-faint)] uppercase">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left py-1.5 pr-3 font-normal">Time</th>
                  <th className="text-right py-1.5 pr-3 font-normal">Price</th>
                  <th className="text-left py-1.5 pr-3 font-normal">Player</th>
                  <th className="text-left py-1.5 pr-3 font-normal">Set</th>
                  <th className="text-left py-1.5 pr-3 font-normal">Tier</th>
                  <th className="text-left py-1.5 pr-3 font-normal">Buyer</th>
                  <th className="text-left py-1.5 pr-3 font-normal">Seller</th>
                  <th className="text-right py-1.5 pr-1 font-normal">Serial</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ago = r.updatedAt ? `${timeAgo(r.updatedAt)} ago` : "—";
                  return (
                    <tr
                      key={r.txId}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)]"
                    >
                      <td className="py-1.5 pr-3 text-[var(--text-dim)] font-mono text-[11px] whitespace-nowrap">
                        {ago}
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        <Num value={r.priceUsd} format="usd" />
                      </td>
                      <td className="py-1.5 pr-3">
                        {r.flowId ? (
                          <Link
                            href={`/moment/${r.flowId}`}
                            className="text-[var(--text)] hover:underline"
                          >
                            {r.playerName}
                          </Link>
                        ) : (
                          <span>{r.playerName}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-[var(--text-dim)]">{r.setFlowName}</td>
                      <td className="py-1.5 pr-3">
                        <TierChip tier={r.tier as MomentTier} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <PartyCell username={r.buyerUsername} flow={r.buyerFlow} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <PartyCell username={r.sellerUsername} flow={r.sellerFlow} />
                      </td>
                      <td className="py-1.5 pr-1 text-right text-[var(--text-faint)] font-mono text-[10px] whitespace-nowrap">
                        {r.serial != null && r.circulation != null
                          ? `#${r.serial} / ${r.circulation.toLocaleString("en-US")}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
