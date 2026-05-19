// /editions — directory of editions ranked by current market cap.
//
// Pulls top-50 from topshot.market_caps + edition metadata, links each row
// into /edition/[setFlowID]-[playFlowID]. Honest empty state if the
// market_caps table hasn't been populated yet.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export const metadata = {
  title: "Editions · TS·PORTAL",
  description: "Top editions on Top Shot ranked by current market cap.",
};

export const revalidate = 300; // 5 min

interface EditionDirRow {
  edition_id: string;
  set_flow_id: string | null;
  play_flow_id: string | null;
  player_name: string | null;
  set_name: string | null;
  tier_name: string | null;
  parallel_id: number | null;
  market_cap: number;
  circulation: number | null;
  floor: number | null;
}

const ROW_LIMIT = 50;

async function fetchTopEditions(): Promise<{ rows: EditionDirRow[]; asOfDate: string | null }> {
  const sb = getSupabaseServerAnon();
  if (!sb) return { rows: [], asOfDate: null };

  const { data: latestRow } = await sb
    .from("market_caps")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const asOfDate = (latestRow as { date: string } | null)?.date ?? null;
  if (!asOfDate) return { rows: [], asOfDate: null };

  const { data: capRows } = await sb
    .from("market_caps")
    .select("edition_id, market_cap, num_moments_in_circulation, lowest_ask_price")
    .eq("date", asOfDate)
    .not("market_cap", "is", null)
    .gt("market_cap", 0)
    .order("market_cap", { ascending: false })
    .limit(ROW_LIMIT);

  type CapRow = {
    edition_id: string;
    market_cap: number | string;
    num_moments_in_circulation: number | null;
    lowest_ask_price: number | string | null;
  };
  const caps = (capRows as CapRow[] | null) ?? [];
  if (caps.length === 0) return { rows: [], asOfDate };
  const editionIds = caps.map((c) => c.edition_id);

  const { data: edRows } = await sb
    .from("editions")
    .select("edition_id, set_flow_id, play_flow_id, player_name, set_name, tier_name, parallel_id")
    .in("edition_id", editionIds);
  type EdRow = {
    edition_id: string;
    set_flow_id: string | null;
    play_flow_id: string | null;
    player_name: string | null;
    set_name: string | null;
    tier_name: string | null;
    parallel_id: number | null;
  };
  const edMap = new Map<string, EdRow>();
  for (const e of (edRows as EdRow[] | null) ?? []) edMap.set(e.edition_id, e);

  const rows: EditionDirRow[] = caps.map((c) => {
    const ed = edMap.get(c.edition_id);
    return {
      edition_id: c.edition_id,
      set_flow_id: ed?.set_flow_id ?? null,
      play_flow_id: ed?.play_flow_id ?? null,
      player_name: ed?.player_name ?? null,
      set_name: ed?.set_name ?? null,
      tier_name: ed?.tier_name ?? null,
      parallel_id: ed?.parallel_id ?? null,
      market_cap: Number(c.market_cap) || 0,
      circulation: c.num_moments_in_circulation ?? null,
      floor: c.lowest_ask_price === null ? null : Number(c.lowest_ask_price) || null,
    };
  });

  return { rows, asOfDate };
}

async function EditionsTable() {
  const { rows, asOfDate } = await fetchTopEditions();

  if (rows.length === 0) {
    return (
      <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">
        Market caps haven&apos;t been ingested yet. The /editions directory will populate as soon as
        the first ETL snapshot lands.
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-data-label text-[var(--text-faint)] uppercase">
          As of
        </span>
        <span className="font-mono text-[11px] text-[var(--text-dim)]">{asOfDate}</span>
        <span className="ml-auto font-mono text-[10px] text-[var(--text-faint)]">
          Showing top {rows.length} by market cap
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)] uppercase tracking-data-label text-[9px]">
              <th className="px-3 py-1.5 text-left w-8">#</th>
              <th className="px-3 py-1.5 text-left">Player</th>
              <th className="px-3 py-1.5 text-left">Set</th>
              <th className="px-3 py-1.5 text-left">Tier</th>
              <th className="px-3 py-1.5 text-right">Floor</th>
              <th className="px-3 py-1.5 text-right">Circulation</th>
              <th className="px-3 py-1.5 text-right">Market cap</th>
              <th className="px-3 py-1.5 text-right w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const editionLink =
                r.set_flow_id && r.play_flow_id
                  ? `/edition/${r.set_flow_id}-${r.play_flow_id}`
                  : null;
              return (
                <tr
                  key={r.edition_id}
                  className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    {editionLink ? (
                      <Link href={editionLink} className="text-[var(--text)] hover:text-[var(--accent)]">
                        {r.player_name ?? <span className="text-[var(--text-faint)]">—</span>}
                      </Link>
                    ) : (
                      <span className="text-[var(--text)]">
                        {r.player_name ?? <span className="text-[var(--text-faint)]">—</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-dim)]">
                    {r.set_name ?? <span className="text-[var(--text-faint)]">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.tier_name ? <TierChip tier={r.tier_name} /> : <span className="text-[var(--text-faint)]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                    {r.floor !== null ? <Num value={r.floor} format="usd" /> : <span className="text-[var(--text-faint)]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                    {r.circulation !== null ? r.circulation.toLocaleString() : <span className="text-[var(--text-faint)]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                    <Num value={r.market_cap} format="usdCompact" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editionLink && (
                      <Link href={editionLink} className="text-[var(--text-faint)] hover:text-[var(--accent)]">
                        →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading editions…</div>
  );
}

export default function Page() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="font-mono text-[14px] tracking-section-header text-[var(--text)]">
          EDITIONS · DIRECTORY
        </h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1 leading-relaxed max-w-2xl">
          Top {ROW_LIMIT} editions by current market cap. Click any row for the per-edition
          deep dive — depth ladder, recent sales, listed serials, and parallels.
        </p>
      </header>

      <Card variant="inset">
        <Suspense fallback={<TableSkeleton />}>
          <EditionsTable />
        </Suspense>
      </Card>

      <p className="text-[10px] text-[var(--text-faint)] mt-6 leading-snug max-w-2xl">
        Market cap = circulation × current floor, computed daily from{" "}
        <code className="text-[var(--text-dim)]">topshot.market_caps</code>. Editions with no
        listed serials show market cap = 0 and are excluded. See{" "}
        <Link href="/methodology" className="hover:text-[var(--text)] underline decoration-dotted">
          /methodology
        </Link>{" "}
        for the full definition.
      </p>
    </div>
  );
}
