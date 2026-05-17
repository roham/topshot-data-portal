// /parallels — per-subedition browse, exhaustive flat table.
//
// Roham 2026-05-17 17:10Z: "i dont know, show me." This is the v1 scaffold.
// Defaults to player_id=201939 (Curry) for first-render; ?player=<id> overrides.
// Data shape per row: (set × tier × subedition_id) cell with circulation,
// low_ask (min listing_price_usd), listings_count, and edition_id link.
//
// Open offers + avg-sale per-parallel deferred to follow-up — offer data is
// keyed at edition_id, not subedition_id, in current ETL (see design sprint 01).

import Link from "next/link";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { EmptyState } from "@/components/primitives/EmptyState";

export const revalidate = 300;

type ParallelRow = {
  player_id: string;
  player_name: string | null;
  set_id: string;
  set_name: string | null;
  series_number: number | null;
  tier_name: string | null;
  edition_id: string;
  subedition_id: string;
  circulation: number;
  listings_count: number;
  low_ask: number | null;
  highest_offer: number | null; // from edition-level market_caps, with parallel caveat
};

type EditionLite = {
  edition_id: string;
  set_id: string | null;
  tier_name: string | null;
  player_id: string | null;
  player_name: string | null;
};

async function getPlayerParallels(playerId: string): Promise<ParallelRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];

  // Player + their editions
  const { data: editionsRaw } = await sb
    .from("editions")
    .select(
      "edition_id, set_id, tier_name, player_id, player_name",
    )
    .eq("player_id", playerId);

  const editions = (editionsRaw ?? []) as EditionLite[];
  if (editions.length === 0) return [];

  const editionIds = editions.map((e) => e.edition_id);
  const editionById = new Map<string, EditionLite>(editions.map((e) => [e.edition_id, e]));

  // Sets
  type SetLite = { set_id: string; set_name: string | null; series_number: number | null };
  const setIds = Array.from(
    new Set(editions.map((e) => e.set_id).filter((x): x is string => !!x)),
  );
  const { data: setsRaw } =
    setIds.length > 0
      ? await sb
          .from("sets")
          .select("set_id, set_name, series_number")
          .in("set_id", setIds)
      : { data: [] };
  const sets = (setsRaw ?? []) as SetLite[];
  const setById = new Map<string, SetLite>(sets.map((s) => [s.set_id, s]));

  // Edition-level market_caps (for offer; caveat: not per-subedition yet)
  const { data: mcRows } = await sb
    .from("market_caps")
    .select(
      "edition_id, date, lowest_ask_price, highest_offer_price, num_moments_in_circulation",
    )
    .in("edition_id", editionIds)
    .order("date", { ascending: false })
    .limit(editionIds.length * 5);

  const latestMcByEd = new Map<string, { lowest_ask_price: number | null; highest_offer_price: number | null }>();
  for (const r of mcRows || []) {
    if (!latestMcByEd.has(r.edition_id)) {
      latestMcByEd.set(r.edition_id, {
        lowest_ask_price: r.lowest_ask_price as number | null,
        highest_offer_price: r.highest_offer_price as number | null,
      });
    }
  }

  // Moments per subedition aggregation
  // Batch by edition_id chunks to stay under PostgREST URL limits
  type Agg = { circulation: number; low_ask: number | null; listings_count: number };
  const aggBySubedition = new Map<string, Agg & { edition_id: string; subedition_id: string }>();

  for (let i = 0; i < editionIds.length; i += 50) {
    const batch = editionIds.slice(i, i + 50);
    // Fetch all moments for these editions (only fields we need)
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: mts, error } = await sb
        .from("moments")
        .select("edition_id, subedition_id, listing_price_usd")
        .in("edition_id", batch)
        .not("subedition_id", "is", null)
        .range(from, from + pageSize - 1);
      if (error || !mts || mts.length === 0) break;
      for (const m of mts) {
        const key = `${m.edition_id}::${m.subedition_id}`;
        const cur = aggBySubedition.get(key) || {
          edition_id: m.edition_id as string,
          subedition_id: m.subedition_id as string,
          circulation: 0,
          low_ask: null,
          listings_count: 0,
        };
        cur.circulation += 1;
        const lp = m.listing_price_usd as number | null;
        if (lp != null && lp > 0) {
          cur.listings_count += 1;
          if (cur.low_ask == null || lp < cur.low_ask) cur.low_ask = lp;
        }
        aggBySubedition.set(key, cur);
      }
      if (mts.length < pageSize) break;
      from += pageSize;
    }
  }

  const rows: ParallelRow[] = [];
  for (const agg of Array.from(aggBySubedition.values())) {
    const ed = editionById.get(agg.edition_id);
    if (!ed) continue;
    const set = ed.set_id ? setById.get(ed.set_id) : null;
    const mc = latestMcByEd.get(agg.edition_id);
    rows.push({
      player_id: ed.player_id ?? "",
      player_name: ed.player_name ?? null,
      set_id: ed.set_id ?? "",
      set_name: set?.set_name ?? null,
      series_number: set?.series_number ?? null,
      tier_name: ed.tier_name ?? null,
      edition_id: agg.edition_id,
      subedition_id: agg.subedition_id,
      circulation: agg.circulation,
      listings_count: agg.listings_count,
      low_ask: agg.low_ask,
      highest_offer: (mc?.highest_offer_price as number | null) ?? null,
    });
  }

  // Sort by series desc, then set name, then tier rank
  const tierOrder: Record<string, number> = {
    Ultimate: 5,
    Legendary: 4,
    Rare: 3,
    Anthology: 2.5,
    Fandom: 2,
    Common: 1,
  };
  rows.sort((a, b) => {
    const sa = b.series_number ?? 0;
    const sb_ = a.series_number ?? 0;
    if (sa !== sb_) return sa - sb_;
    const setA = a.set_name ?? "";
    const setB = b.set_name ?? "";
    if (setA !== setB) return setA.localeCompare(setB);
    return (tierOrder[b.tier_name ?? ""] ?? 0) - (tierOrder[a.tier_name ?? ""] ?? 0);
  });

  return rows;
}

export default async function ParallelsPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const params = await searchParams;
  const playerId = params.player ?? "201939"; // Curry default
  const rows = await getPlayerParallels(playerId);

  const playerName = rows[0]?.player_name ?? `player ${playerId}`;
  const totalCirc = rows.reduce((a, r) => a + r.circulation, 0);
  const totalListings = rows.reduce((a, r) => a + r.listings_count, 0);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="mb-4">
        <h1
          className="text-[20px] font-semibold tracking-tight"
          data-testid="parallels-h1"
        >
          Parallels · {playerName}
        </h1>
        <p className="text-[12px] text-[var(--text-dim)]">
          One row per (set × tier × parallel/subedition). Floor &amp; listings
          aggregated from <code>topshot.moments</code> grouped by{" "}
          <code>subedition_id</code>. Highest offer is edition-level (open
          offers not yet per-subedition in ETL — design sprint 01 follow-up).
        </p>
        <p className="text-[11px] text-[var(--text-faint)] mt-1">
          {rows.length} parallels · {totalCirc.toLocaleString()} total
          circulation · {totalListings.toLocaleString()} actively listed
        </p>
      </div>

      {/* Player picker — minimal: dropdown of known seeds (Curry, LeBron, ...) */}
      <div className="mb-4 flex flex-wrap gap-2 items-center text-[12px]">
        <span className="text-[var(--text-dim)]">player:</span>
        {[
          { id: "201939", name: "Curry" },
          { id: "2544", name: "LeBron" },
          { id: "1641764", name: "Podziemski" },
          { id: "1628983", name: "SGA" },
          { id: "1641705", name: "Cooper Flagg" },
          { id: "1641706", name: "Wembanyama" },
          { id: "1629029", name: "Luka" },
          { id: "1642291", name: "Angel Reese" },
        ].map((p) => (
          <Link
            key={p.id}
            href={`/parallels?player=${p.id}`}
            className={`px-2 py-1 rounded border ${
              p.id === playerId
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] text-[var(--text-dim)] hover:border-[var(--text-dim)]"
            }`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No parallels found"
          body={`Player ${playerId} has no editions with subedition_id in topshot.moments. Either the player has no Top Shot footprint or the ETL has not joined subedition data for this player.`}
        />
      ) : (
        <Card title="Per-parallel breakdown" subtitle="set × tier × subedition_id">
          <div className="overflow-x-auto">
            <table
              className="w-full text-[12px] font-mono border-collapse"
              data-testid="parallels-table"
            >
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    Set
                  </th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    Tier
                  </th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    Subedition (parallel)
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    Circulation
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    Listings
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    Low ask
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] uppercase text-[var(--text-dim)] tracking-data-label">
                    High offer
                    <span className="block text-[8px] text-[var(--text-faint)] normal-case">
                      edition-aggregated
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isNewDrop = r.listings_count === 0;
                  return (
                    <tr
                      key={`${r.edition_id}-${r.subedition_id}`}
                      className={`border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-2)]/20 ${
                        isNewDrop ? "bg-[var(--surface-2)]/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3">
                        {r.set_name ?? "—"}
                        {r.series_number != null && (
                          <span className="block text-[10px] text-[var(--text-faint)]">
                            S{r.series_number}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {r.tier_name ? <TierChip tier={r.tier_name as never} /> : "—"}
                      </td>
                      <td className="py-2 px-3 text-[10px] text-[var(--text-faint)]">
                        {r.subedition_id.slice(0, 12)}…
                      </td>
                      <td className="py-2 px-3 text-right">{r.circulation}</td>
                      <td className="py-2 px-3 text-right">{r.listings_count}</td>
                      <td className="py-2 px-3 text-right">
                        {isNewDrop ? (
                          <span
                            className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold"
                            title="No active listings — be first to list. Your ask sets the floor."
                          >
                            🆕 NEW DROP
                          </span>
                        ) : (
                          <Num value={r.low_ask} format="usd" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-dim)]">
                        <Num value={r.highest_offer} format="usd" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
