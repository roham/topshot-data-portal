import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserByFlow, getUserByUsername, fetchBagPage, teamShare, editionsInSet, allSets } from "@/lib/topshot/queries";
import { TEAM_NAMES } from "@/lib/topshot/teams";
import { formatNumber, formatUsd, mediaUrl, shortAddr, timeAgo } from "@/lib/utils";
import { TierPill } from "@/components/Tier";
import { Card } from "@/components/Card";
import { WatchToggle } from "@/components/WatchToggle";
import { HoldingsGrid } from "@/components/HoldingsGrid";
import type { MintedMoment, UserPublicInfo } from "@/lib/topshot/types";
import { valueMoment } from "@/lib/valuation";

export const revalidate = 120;

interface PortfolioAgg {
  totalCount: number | null;
  byPlayer: Array<{ name: string; count: number }>;
  byTeam: Array<{ name: string; count: number }>;
  bySet: Array<{ name: string; count: number }>;
  bySeries: Array<{ name: string; count: number }>;
  tiers: Record<string, number>;
  oldestAcquired: string | null;
  newestAcquired: string | null;
  lastPurchaseSum: number;
  countWithPrice: number;
}

function aggregate(items: MintedMoment[], totalCount: number | null): PortfolioAgg {
  const byPlayer: Record<string, number> = {};
  const byTeam: Record<string, number> = {};
  const bySet: Record<string, number> = {};
  const bySeries: Record<string, number> = {};
  const tiers: Record<string, number> = {};
  let oldest: string | null = null;
  let newest: string | null = null;
  let lastPurchaseSum = 0;
  let countWithPrice = 0;
  for (const m of items) {
    const p = m.play?.stats?.playerName ?? "Unknown";
    byPlayer[p] = (byPlayer[p] ?? 0) + 1;
    const t = m.play?.stats?.teamAtMoment;
    if (t) byTeam[t] = (byTeam[t] ?? 0) + 1;
    const s = m.set?.flowName ?? "Unknown";
    bySet[s] = (bySet[s] ?? 0) + 1;
    const sr = m.set?.flowSeriesNumber != null ? `Series ${m.set.flowSeriesNumber}` : "Unknown";
    bySeries[sr] = (bySeries[sr] ?? 0) + 1;
    const tier = (m.tier ?? "MOMENT_TIER_COMMON").replace("MOMENT_TIER_", "");
    tiers[tier] = (tiers[tier] ?? 0) + 1;
    if (m.acquiredAt) {
      if (!oldest || m.acquiredAt < oldest) oldest = m.acquiredAt;
      if (!newest || m.acquiredAt > newest) newest = m.acquiredAt;
    }
    if (m.lastPurchasePrice != null) {
      const lp = Number(m.lastPurchasePrice);
      if (isFinite(lp)) {
        lastPurchaseSum += lp;
        countWithPrice++;
      }
    }
  }
  const sortDesc = (a: { count: number }, b: { count: number }) => b.count - a.count;
  return {
    totalCount,
    byPlayer: Object.entries(byPlayer).map(([name, count]) => ({ name, count })).sort(sortDesc),
    byTeam: Object.entries(byTeam).map(([name, count]) => ({ name, count })).sort(sortDesc),
    bySet: Object.entries(bySet).map(([name, count]) => ({ name, count })).sort(sortDesc),
    bySeries: Object.entries(bySeries).map(([name, count]) => ({ name, count })).sort(sortDesc),
    tiers,
    oldestAcquired: oldest,
    newestAcquired: newest,
    lastPurchaseSum,
    countWithPrice,
  };
}

function archetypeEcho(agg: PortfolioAgg, totalSeen: number): { label: string; body: string } | null {
  if (!agg.byPlayer.length) return null;
  const top = agg.byPlayer[0];
  const topShare = top.count / totalSeen;
  const topTeam = agg.byTeam[0];
  const teamShareLocal = topTeam ? topTeam.count / totalSeen : 0;
  if (topShare >= 0.6) {
    return {
      label: `Most of this bag is ${top.name}`,
      body: `${Math.round(topShare * 100)}% concentration. This is a single-player deep dive — A2 register: Set Completionist / Fan-First Curator.`,
    };
  }
  if (teamShareLocal >= 0.6 && topTeam) {
    return {
      label: `Team-loyalty pattern — ${topTeam.name}`,
      body: `${Math.round(teamShareLocal * 100)}% of the visible bag plays for ${topTeam.name}. Classic A2 single-team Completionist.`,
    };
  }
  if (agg.byPlayer.length >= 6 && topShare < 0.25) {
    return {
      label: "Diversified bag — Market Strategist pattern",
      body: `Top player only ${Math.round(topShare * 100)}% of the bag. Spread across ${agg.byPlayer.length}+ players — A4 register: spreadsheet-first collecting.`,
    };
  }
  return null;
}

async function resolveProfile(idOrAddr: string): Promise<{ profile: UserPublicInfo | null; flowAddress: string | null }> {
  // Address path: 16-hex (possibly 0x-prefixed)
  const addr = idOrAddr.startsWith("0x") ? idOrAddr.slice(2) : idOrAddr;
  if (/^[0-9a-fA-F]{16}$/.test(addr)) {
    const profile = await getUserByFlow(addr);
    return { profile, flowAddress: addr };
  }
  // Username path
  const profile = await getUserByUsername(idOrAddr);
  return { profile, flowAddress: profile?.flowAddress ?? null };
}

const VISIBLE_CAP = 200;
const PAGE_SIZE = 100;

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const { profile, flowAddress } = await resolveProfile(decoded);

  if (!flowAddress) {
    return (
      <div className="max-w-portal mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">No bag found.</h1>
        <p className="text-[var(--text-dim)] text-sm">
          Could not resolve <span className="font-mono">{decoded}</span>.
          Try a username exactly as it appears on Top Shot, or a 16-character Flow address (with or without
          <span className="font-mono"> 0x</span>).
        </p>
        <Link href="/" className="inline-block mt-4 text-[var(--accent)] underline">← back to market</Link>
      </div>
    );
  }

  // Pull up to VISIBLE_CAP moments across pages
  const pages: MintedMoment[] = [];
  let cursor = "";
  let total: number | null = null;
  for (let i = 0; i < Math.ceil(VISIBLE_CAP / PAGE_SIZE); i++) {
    const page = await fetchBagPage(flowAddress, cursor, PAGE_SIZE);
    if (total == null) total = page.totalCount;
    pages.push(...page.items);
    cursor = page.rightCursor ?? "";
    if (!cursor || pages.length >= VISIBLE_CAP) break;
  }
  const visible = pages.slice(0, VISIBLE_CAP);
  const agg = aggregate(visible, total);
  const favTeamId = profile?.favoriteTeamID;
  const favTeamName = favTeamId ? TEAM_NAMES[favTeamId] : null;
  const favShare = favTeamId ? await teamShare(flowAddress, favTeamId) : null;
  const echo = archetypeEcho(agg, visible.length);

  // V4 — set value rollup: per-set sum of valuation across visible moments.
  // Built alongside the portfolio rollup pass below.
  const valueBySet = new Map<string, number>();
  // P&L proxy: for each moment with BOTH a cost basis (lastPurchasePrice)
  // and a current floor signal (lowAsk OR fair value), compute the diff.
  let portfolioValue = 0;
  let portfolioValuedCount = 0;
  let plBasisSum = 0;
  let plCurrentSum = 0;
  let plCount = 0;
  for (const m of visible) {
    const v = valueMoment(m, { recentSales: [] });
    if (v.fairValue != null) {
      portfolioValue += v.fairValue;
      portfolioValuedCount++;
      const setKey = m.set?.flowName ?? "Unknown";
      valueBySet.set(setKey, (valueBySet.get(setKey) ?? 0) + v.fairValue);
    }
    const basis = m.lastPurchasePrice != null ? Number(m.lastPurchasePrice) : null;
    const current = v.fairValue;
    if (basis != null && isFinite(basis) && basis > 0 && current != null) {
      plBasisSum += basis;
      plCurrentSum += current;
      plCount++;
    }
  }
  const plDelta = plCurrentSum - plBasisSum;
  const plPct = plBasisSum > 0 ? (plDelta / plBasisSum) * 100 : null;

  // PC4 — set-completion math for the top 5 sets in the user's bag.
  // Map set flowName → flowId via the visible moments, then look up the set UUID
  // via allSets(), then count total editions in the set.
  const setsCatalog = await allSets(200);
  const flowIdToUuid = new Map<number, string>();
  for (const s of setsCatalog) flowIdToUuid.set(s.flowId, s.id);
  // Count user's UNIQUE editions per set (count distinct edition.id within a set)
  const setHoldings = new Map<string, { setName: string; flowId: number; uuid: string; uniqueEditions: Set<string>; totalHeld: number }>();
  for (const m of visible) {
    if (!m.set?.flowId || !m.edition?.id) continue;
    const uuid = flowIdToUuid.get(m.set.flowId);
    if (!uuid) continue;
    const key = uuid;
    const e = setHoldings.get(key) ?? {
      setName: m.set.flowName,
      flowId: m.set.flowId,
      uuid,
      uniqueEditions: new Set<string>(),
      totalHeld: 0,
    };
    e.uniqueEditions.add(m.edition.id);
    e.totalHeld += 1;
    setHoldings.set(key, e);
  }
  const topSets = [...setHoldings.values()].sort((a, b) => b.totalHeld - a.totalHeld).slice(0, 6);
  const setCompletions = await Promise.all(
    topSets.map(async (s) => {
      const editions = await editionsInSet(s.uuid);
      const total = editions.length;
      const held = s.uniqueEditions.size;
      const pct = total > 0 ? (held / total) * 100 : 0;
      return { ...s, totalEditions: total, heldEditions: held, pct };
    })
  );

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 pb-4 border-b border-[var(--border)]">
        {profile?.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.profileImageUrl} width={72} height={72} alt={profile.username} className="w-16 h-16 rounded-full ring-1 ring-[var(--border)] bg-[var(--bg-elev)]" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elev)] flex items-center justify-center text-[var(--text-faint)] text-2xl">◇</div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile?.username ?? <span className="font-mono">{shortAddr(flowAddress)}</span>}
            {!profile?.username && <span className="ml-2 text-xs text-[var(--text-faint)]">self-custody</span>}
          </h1>
          <div className="text-[var(--text-dim)] text-sm font-mono mt-1">
            {flowAddress} {favTeamName && <span className="ml-2">· favorite {favTeamName}</span>}
          </div>
          {profile?.username && (
            <div className="mt-2"><WatchToggle username={profile.username} /></div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-right">
          <div>
            <div className="text-2xl font-semibold tnum">{formatNumber(total ?? 0)}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Moments</div>
          </div>
          <div>
            <div className="text-2xl font-semibold tnum">
              {formatUsd(portfolioValue)}
              <span className="text-xs text-[var(--text-faint)] ml-1">/ {portfolioValuedCount}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Visible-bag value*</div>
          </div>
          <div>
            <div
              className={`text-2xl font-semibold tnum ${plDelta >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}
            >
              {plCount > 0
                ? `${plDelta >= 0 ? "+" : ""}${formatUsd(plDelta)}`
                : "—"}
              {plPct != null && (
                <span className="text-xs text-[var(--text-faint)] ml-1">
                  {plDelta >= 0 ? "+" : ""}{plPct.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">Unrealized P/L · {plCount} priced</div>
          </div>
        </div>
      </header>

      {echo && (
        <div className="bg-[var(--accent)]/8 border-l-2 border-[var(--accent)] px-4 py-3 mb-6 text-sm">
          <div className="font-semibold mb-0.5">{echo.label}</div>
          <div className="text-[var(--text-dim)]">{echo.body}</div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card title="By player" subtitle={`PC2 · top ${Math.min(agg.byPlayer.length, 10)}`}>
          <div className="divide-y divide-[var(--border)]">
            {agg.byPlayer.slice(0, 10).map((p) => {
              const pct = total ? (p.count / visible.length) * 100 : 0;
              return (
                <div key={p.name} className="px-4 py-1.5 flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{p.name}</span>
                  <span className="tnum text-xs text-[var(--text-dim)]">{p.count}</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="By team" subtitle="Concentration (visible)">
          <div className="divide-y divide-[var(--border)]">
            {agg.byTeam.slice(0, 10).map((t) => {
              const pct = (t.count / visible.length) * 100;
              return (
                <div key={t.name} className="px-4 py-1.5 flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{t.name}</span>
                  <span className="tnum text-xs text-[var(--text-dim)]">{t.count}</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="By tier" subtitle="Distribution">
          <div className="divide-y divide-[var(--border)]">
            {Object.entries(agg.tiers).map(([tier, count]) => (
              <div key={tier} className="px-4 py-1.5 flex items-center gap-2">
                <TierPill tier={`MOMENT_TIER_${tier}`} />
                <span className="tnum text-xs text-[var(--text-dim)] ml-auto">{count}</span>
                <span className="tnum text-xs text-[var(--text-faint)] w-10 text-right">
                  {((count / visible.length) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* V4 — set value rollup */}
      {valueBySet.size > 0 && (
        <Card title="Value by set" subtitle="V4 · sum of valuation per set across visible moments" className="mb-6">
          <div className="divide-y divide-[var(--border)]">
            {[...valueBySet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([set, val]) => (
              <div key={set} className="px-4 py-2 flex items-baseline gap-3 text-sm">
                <span className="flex-1 truncate">{set}</span>
                <span className="tnum text-[var(--accent)] font-semibold">{formatUsd(val)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PC4 — set-completion strip */}
      {setCompletions.length > 0 && (
        <Card title="Set completion" subtitle={`PC4 · top ${setCompletions.length} sets by held count · unique editions vs total`} className="mb-6">
          <div className="divide-y divide-[var(--border)]">
            {setCompletions.map((s) => (
              <div key={s.uuid} className="px-4 py-2">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="flex-1 truncate font-medium">{s.setName}</span>
                  <span className="tnum text-xs text-[var(--text-dim)]">
                    {s.heldEditions}/{s.totalEditions} editions
                  </span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-12 text-right">{s.pct.toFixed(0)}%</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-16 text-right">{s.totalHeld} held</span>
                </div>
                <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
                  <div
                    className="h-1 rounded"
                    style={{
                      width: `${s.pct}%`,
                      background: s.pct >= 80 ? "var(--up)" : s.pct >= 30 ? "var(--accent)" : "var(--text-faint)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-faint)] px-4 pb-3">
            Each parallel + tier within a set counts as a distinct edition. 100% means you hold one of every edition. WNBA / older sets may have fewer editions than recent ones.
          </p>
        </Card>
      )}

      {/* Holdings grid w/ filters (Tradeblock-style) */}
      <Card
        title="Holdings"
        subtitle={`Showing ${visible.length} of ${formatNumber(total ?? 0)} · acquired ${timeAgo(agg.newestAcquired)} ago → ${timeAgo(agg.oldestAcquired)} ago · filterable + sortable`}
      >
        <HoldingsGrid items={visible} />
        <p className="text-[10px] text-[var(--text-faint)] px-3 pb-3">
          * Visible-bag value sums the valuation engine across the first {VISIBLE_CAP} moments shown. Bags larger than {VISIBLE_CAP} are not fully revalued at this layer — see /methodology for the load-tradeoff explanation.
        </p>
      </Card>
    </div>
  );
}
