// /collectors — Top Shot collector leaderboard.
//
// Per Roham 2026-05-18: "ownership of Top Shot SHOULD BE the Top Shot username
// not (just) the Flow address." This page renders the real leaderboard from
// topshot.collectors (mirrored from Top Shot GraphQL via the fandom-v3 pipeline).
//
// Doctrine §0.2 / persona doc J3-style leaderboard. Per-row links to /u/[username].

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/primitives/EmptyState";

export const metadata: Metadata = {
  title: "Collectors · TS·PORTAL",
  description: "NBA Top Shot collector leaderboard — ranked by moments held across top players.",
};

export const revalidate = 300;

interface CollectorRow {
  flow_address: string;
  username: string | null;
  dapper_id: string | null;
  profile_image_url: string | null;
  topshot_score: number | null;
  type: string;
  first_seen_holdings: number | null;
}

async function getTopCollectors(limit: number): Promise<{ rows: CollectorRow[]; total: number }> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "topshot" }, auth: { persistSession: false } },
  );

  // Named collectors first, sorted by first_seen_holdings desc
  const { data, error, count } = await sb
    .from("collectors")
    .select("*", { count: "exact" })
    .not("username", "is", null)
    .order("first_seen_holdings", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("collectors fetch error:", error);
    return { rows: [], total: 0 };
  }
  return { rows: (data as CollectorRow[]) ?? [], total: count ?? 0 };
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

export default async function CollectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const sp = await searchParams;
  const limit = Math.min(parseInt(sp.limit ?? "100", 10) || 100, 500);

  const { rows, total } = await getTopCollectors(limit);

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-4">
      <header className="mb-4">
        <h1 className="text-[18px] font-semibold tracking-tight">
          Collectors
          <span className="text-[var(--accent)] mx-1.5">·</span>
          <span className="text-[var(--text-dim)] text-[13px] tracking-normal font-normal">
            leaderboard by moments held
          </span>
        </h1>
        <p className="mt-1 text-[11px] text-[var(--text-faint)] font-mono">
          <span className="text-[var(--text)] tnum">{fmtNum(total)}</span> named collectors ·
          showing top <span className="text-[var(--text)] tnum">{rows.length}</span>
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No collector data yet."
          body="The collectors table is being populated. Refresh in a few minutes."
        />
      ) : (
        <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden bg-[var(--surface-1)]/30">
          <table className="w-full text-[12px] font-mono" data-testid="collectors-table">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/40">
                <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] w-10">#</th>
                <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Username</th>
                <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Flow address</th>
                <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Moments (sample)</th>
                <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Top Shot Score</th>
                <th className="text-left py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] w-12">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.flow_address} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)]/30 transition-colors">
                  <td className="text-right py-1.5 px-3 text-[var(--text-faint)] tnum">{i + 1}</td>
                  <td className="text-left py-1.5 px-3">
                    <Link href={`/u/${encodeURIComponent(c.username!)}`} className="text-[var(--accent)] hover:underline flex items-center gap-2">
                      {c.profile_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.profile_image_url} alt="" className="w-5 h-5 rounded-full bg-[var(--surface-2)]" />
                      )}
                      <span>{c.username}</span>
                    </Link>
                  </td>
                  <td className="text-left py-1.5 px-3 text-[var(--text-dim)] text-[10px]">
                    <code>{c.flow_address.slice(0, 8)}…{c.flow_address.slice(-4)}</code>
                  </td>
                  <td className="text-right py-1.5 px-3 tnum text-[var(--text)]">
                    {fmtNum(c.first_seen_holdings)}
                  </td>
                  <td className="text-right py-1.5 px-3 tnum text-[var(--text-dim)]">
                    {c.topshot_score != null ? fmtNum(c.topshot_score) : "—"}
                  </td>
                  <td className="text-left py-1.5 px-3 text-[10px] text-[var(--text-dim)]">{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-6 text-[10px] text-[var(--text-faint)] font-mono leading-relaxed">
        <p>
          <strong className="text-[var(--text-dim)]">Methodology.</strong>{" "}
          Ranked by sampled holdings across the top 30 NBA players. True total holdings
          across all Top Shot players are equal to or greater than the number shown. A
          full backfill is in progress; the column will become definitive once every
          player has been sampled. Non-custodial wallets are filtered out (named
          collectors only). Click any username to open their bag.
        </p>
      </footer>
    </div>
  );
}
