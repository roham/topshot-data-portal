// V4-iter-3 — team index synthesizer.
//
// Pages the 30d marketplace transaction stream via chronologicalTxBackfill,
// groups by `moment.play.stats.teamAtMoment`, ranks teams by summed
// transaction price, returns top-N (default 10). For each top team, fans
// out getSetPriceHistory per contributing set-UUID and rolls up to a
// volume-weighted base-100 series.
//
// Cold-scan cost: per Researcher §1b, ~115k txns / 30d ≈ ~3 min at
// pageSize 50 (the chronologicalTxBackfill default). Cache:
// `next.revalidate = 3600` — first user per hour pays, the next ~599 read
// cached.
//
// Per design.md §Q3, team uses volume-weighting (the transaction scan
// must run to find top-N regardless, so per-team `salesCount` /
// `volumeCents` are free byproducts). Methodology aside discloses.

import {
  allSets,
  chronologicalTxBackfill,
  getSetPriceHistory,
} from "@/lib/topshot/queries";
import { rollupSetHistoriesToIndex, type IndexSeries } from "./rollup";

export interface TeamIndex extends IndexSeries {
  team: string;
  /** Team slug for /team/[slug] routing. */
  slug: string;
  /** 30d $ volume across the team's contributing sets. */
  volumeCents: number;
  /** 30d transaction count across the team's contributing sets. */
  salesCount: number;
}

function teamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const WINDOW_MS_30D = 30 * 24 * 60 * 60_000;

export async function getTeamIndices(
  days: number = 30,
  limit: number = 10,
): Promise<TeamIndex[]> {
  // 1. Scan 30d transaction stream. Hard cap is generous (50k) to cover
  //    Researcher §1b's ~115k figure with graceful early-stop if the
  //    upstream rate-limits us.
  const txns = await chronologicalTxBackfill(WINDOW_MS_30D, 50000).catch(() => []);
  if (txns.length === 0) {
    return [];
  }

  // 2. Map setFlowId → setUuid via allSets (we need the UUID for the
  //    getSetPriceHistory fan-out).
  const setRows = await allSets(250).catch(() => []);
  const flowIdToUuid = new Map<string, string>();
  for (const s of setRows) {
    if (s.flowId != null) flowIdToUuid.set(String(s.flowId), s.id);
  }

  // 3. Group transactions by team.
  interface TeamAgg {
    team: string;
    volumeCents: number;
    salesCount: number;
    setUuids: Map<string, number>; // setUuid → per-set volumeCents
  }
  const byTeam = new Map<string, TeamAgg>();
  for (const t of txns) {
    const team = t.moment?.play?.stats?.teamAtMoment;
    if (!team) continue;
    const priceCents = Math.round(Number(t.price ?? 0) * 100);
    const setFlowId = t.moment?.set?.flowId;
    const setUuid = setFlowId != null ? flowIdToUuid.get(String(setFlowId)) : undefined;
    let agg = byTeam.get(team);
    if (!agg) {
      agg = { team, volumeCents: 0, salesCount: 0, setUuids: new Map() };
      byTeam.set(team, agg);
    }
    agg.volumeCents += priceCents;
    agg.salesCount += 1;
    if (setUuid) {
      agg.setUuids.set(setUuid, (agg.setUuids.get(setUuid) ?? 0) + priceCents);
    }
  }

  // 4. Rank by volumeCents, take top-N.
  const ranked = [...byTeam.values()]
    .sort((a, b) => b.volumeCents - a.volumeCents)
    .slice(0, limit);

  // 5. For each top team, fan out getSetPriceHistory per contributing set
  //    and roll up a volume-weighted index.
  const out = await Promise.all(
    ranked.map(async (agg) => {
      const setEntries = [...agg.setUuids.entries()];
      const histories = await Promise.all(
        setEntries.map(async ([uuid, weight]) => {
          const points = await getSetPriceHistory(uuid, days).catch(() => []);
          return { id: uuid, points, weight };
        }),
      );
      const rolled = rollupSetHistoriesToIndex(histories, days);
      return {
        team: agg.team,
        slug: teamSlug(agg.team),
        volumeCents: agg.volumeCents,
        salesCount: agg.salesCount,
        ...rolled,
      };
    }),
  );
  return out;
}
