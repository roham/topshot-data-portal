import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getMoment,
  editionListedSerials,
  editionRecentSales,
  editionsForPlay,
} from "@/lib/topshot/queries";
import { valueMoment } from "@/lib/valuation";
import { Card } from "@/components/primitives/Card";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { EmptyState } from "@/components/primitives/EmptyState";
import { DepthLadder } from "@/components/DepthLadder";
import { TunedValuationOverlay } from "@/components/TunedValuationOverlay";
import { MomentPriceHistory } from "@/components/MomentPriceHistory";
import {
  getMomentHistory,
  type MomentHistoryWindow,
} from "@/lib/supabase/queries/moment-detail";
import type { MintedMoment } from "@/lib/topshot/types";

const HISTORY_WINDOWS: readonly MomentHistoryWindow[] = [
  "1d",
  "7d",
  "1m",
  "3m",
  "ytd",
  "all",
];

function parseHistoryWindow(
  raw: string | string[] | undefined,
): MomentHistoryWindow {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && (HISTORY_WINDOWS as readonly string[]).includes(v)) {
    return v as MomentHistoryWindow;
  }
  return "all";
}

// V3 iter-11 — Pro Trader J-P2: per-moment market depth.
// Five sections: Hero · Valuation · Depth ladder · Recent comps · Parallels matrix.
// Senior research analyst voice; honest absence per design/00 §4.7.

export const revalidate = 60;
export const dynamic = "force-dynamic";

const TIER_SHORT: Record<string, string> = {
  MOMENT_TIER_COMMON: "Common",
  MOMENT_TIER_FANDOM: "Fandom",
  MOMENT_TIER_RARE: "Rare",
  MOMENT_TIER_LEGENDARY: "Legendary",
  MOMENT_TIER_ULTIMATE: "Ultimate",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ flowId: string }>;
}): Promise<Metadata> {
  const { flowId } = await params;
  try {
    const m = await getMoment(flowId);
    if (!m) return { title: `Moment ${flowId} · TS·PORTAL` };
    const player = m.play?.stats?.playerName ?? "Moment";
    const setName = m.set?.flowName ?? "Set";
    const serial = m.flowSerialNumber ?? "?";
    return { title: `${player} · ${setName} · #${serial} · TS·PORTAL` };
  } catch {
    return { title: `Moment ${flowId} · TS·PORTAL` };
  }
}

interface AnchorLine {
  lastSale: number | null;
  floor: number | null;
  fairValue: number | null;
}

function heroSentence(moment: MintedMoment, a: AnchorLine, valuationBand: { lo: number | null; hi: number | null }): string {
  const set = moment.set?.flowName ?? "Set unknown";
  const series = moment.set?.flowSeriesNumber != null ? `Series ${moment.set.flowSeriesNumber}` : "";
  const tier = TIER_SHORT[moment.tier ?? moment.edition?.tier ?? ""] ?? "";
  const player = moment.play?.stats?.playerName ?? "Unknown player";
  const playCat = moment.play?.stats?.playCategory ?? moment.play?.headline ?? "moment";
  const serial = moment.flowSerialNumber;
  const circ = moment.edition?.circulationCount ?? 0;
  const ofN = circ > 0 ? `1 of ${circ.toLocaleString("en-US")}` : "serial set";
  const parallel = (moment.edition?.parallelID ?? 0) > 0 ? ` (parallel #${moment.edition?.parallelID})` : "";
  const head = [series, tier].filter(Boolean).join(" ");
  const askPart =
    a.floor != null
      ? `currently asked at $${a.floor.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "no live ask";
  const fvPart =
    a.fairValue != null
      ? `vs fair value $${a.fairValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "fair value indeterminate";
  const bandPart =
    valuationBand.lo != null && valuationBand.hi != null
      ? ` (band $${valuationBand.lo.toLocaleString("en-US", { maximumFractionDigits: 0 })}–$${valuationBand.hi.toLocaleString("en-US", { maximumFractionDigits: 0 })})`
      : "";
  return `${head} ${player} ${playCat}${parallel} — serial #${serial}, ${ofN} from ${set}; ${askPart} ${fvPart}${bandPart}.`;
}

export default async function MomentPage({
  params,
  searchParams,
}: {
  params: Promise<{ flowId: string }>;
  searchParams?: Promise<{ h?: string }>;
}) {
  const { flowId } = await params;
  const sp = (await searchParams) ?? {};
  const historyWindow = parseHistoryWindow(sp.h);
  const moment = await getMoment(flowId);
  if (!moment) notFound();

  const setUuid = moment.set?.id ?? "";
  const playUuid = moment.play?.id ?? "";

  // Parallel data fetches with per-slice failure isolation. The Supabase
  // history is included in this batch — empty arrays are the honest absence
  // when the moment hasn't traded in the selected window.
  const [listedRes, recentRes, parallelsRes, historyRes] = await Promise.allSettled([
    setUuid && playUuid ? editionListedSerials(setUuid, playUuid, 50) : Promise.resolve([]),
    setUuid && playUuid ? editionRecentSales(setUuid, playUuid, 20) : Promise.resolve([]),
    playUuid ? editionsForPlay(playUuid) : Promise.resolve([]),
    getMomentHistory({ flowId, window: historyWindow }),
  ]);
  const listed = listedRes.status === "fulfilled" ? listedRes.value : [];
  const recentSales = recentRes.status === "fulfilled" ? recentRes.value : [];
  const parallels = parallelsRes.status === "fulfilled" ? parallelsRes.value : [];
  const history = historyRes.status === "fulfilled" ? historyRes.value : [];

  const editionFloor = listed.length ? Math.min(...listed.map((l) => l.lowAsk)) : null;
  const valuation = valueMoment(moment, {
    recentSales: recentSales.map((s) => ({ price: s.price })),
    editionFloor,
  });

  const lastSale =
    moment.lastPurchasePrice == null ? null : Number(moment.lastPurchasePrice);
  const anchors: AnchorLine = {
    lastSale: lastSale != null && isFinite(lastSale) && lastSale > 0 ? lastSale : null,
    floor: editionFloor,
    fairValue: valuation.fairValue,
  };
  // ±15% band per design convention; cheap proxy until rules expose explicit band.
  const fvLo = valuation.fairValue != null ? valuation.fairValue * 0.85 : null;
  const fvHi = valuation.fairValue != null ? valuation.fairValue * 1.15 : null;

  const sentence = heroSentence(moment, anchors, { lo: fvLo, hi: fvHi });

  const tier = moment.tier ?? moment.edition?.tier;
  const parallelId = moment.edition?.parallelID ?? 0;
  const serial = Number(moment.flowSerialNumber);
  const currentEditionId = moment.edition?.id ?? "";

  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-3">
      {/* ===== 1. Hero ===== */}
      <header className="space-y-2">
        <div className="text-[10px] tracking-data-label text-[var(--text-faint)] font-mono flex flex-wrap gap-x-3 gap-y-0.5">
          <span>moment · flowId {flowId}</span>
          <span>edition {currentEditionId ? currentEditionId.slice(0, 8) : "—"}</span>
          <span>set {moment.set?.flowName ?? "—"}</span>
          {moment.set?.flowSeriesNumber != null && <span>series {moment.set.flowSeriesNumber}</span>}
          {moment.play?.stats?.teamAtMoment && <span>team {moment.play.stats.teamAtMoment}</span>}
          {moment.play?.stats?.dateOfMoment && (
            <span>game {new Date(moment.play.stats.dateOfMoment).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-[20px] font-semibold tracking-tight">
            {moment.play?.stats?.playerName ?? "Unknown player"}
          </h1>
          <TierChip tier={tier} />
          {parallelId > 0 ? (
            <span className="text-[10px] text-[var(--accent)] tracking-data-label">Parallel #{parallelId}</span>
          ) : (
            <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">Base parallel</span>
          )}
          <span className="text-[11px] text-[var(--text-dim)] tnum">
            #{moment.flowSerialNumber}
            {moment.edition?.circulationCount ? ` / ${moment.edition.circulationCount.toLocaleString("en-US")}` : ""}
          </span>
        </div>
        {moment.play?.description && (
          <details className="max-w-3xl">
            <summary className="text-[10px] tracking-data-label text-[var(--text-faint)] cursor-pointer hover:text-[var(--text-dim)]">
              play description (Top Shot copy)
            </summary>
            <p className="mt-1 text-[12px] text-[var(--text-dim)] leading-snug">
              {moment.play.description}
            </p>
          </details>
        )}
        <Card variant="inset">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            <div className="p-3">
              <div className="text-[10px] text-[var(--text-faint)] tracking-data-label">Last sale</div>
              <div className="text-[22px] leading-none tnum font-semibold mt-1">
                <Num value={anchors.lastSale} format="usd" />
              </div>
              <div className="text-[10px] text-[var(--text-faint)] mt-1">lastPurchasePrice on this serial</div>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-[var(--text-faint)] tracking-data-label">Ask floor (edition)</div>
              <div className="text-[22px] leading-none tnum font-semibold mt-1">
                <Num value={anchors.floor} format="usd" />
              </div>
              <div className="text-[10px] text-[var(--text-faint)] mt-1">
                {listed.length ? `${listed.length} listed across edition` : "no listings"}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-[var(--text-faint)] tracking-data-label">Fair value</div>
              <div className="text-[22px] leading-none tnum font-semibold mt-1">
                <Num value={anchors.fairValue} format="usd" />
              </div>
              <div className="text-[10px] text-[var(--text-faint)] mt-1">
                confidence {valuation.confidence}
                {anchors.fairValue != null && fvLo != null && fvHi != null
                  ? ` · ±15% band $${fvLo.toFixed(0)}–$${fvHi.toFixed(0)}`
                  : ""}
              </div>
            </div>
          </div>
        </Card>
        <p className="text-[13px] text-[var(--text)] leading-snug max-w-4xl">{sentence}</p>
      </header>

      {/* ===== Price history · Supabase ===== */}
      <Card
        data-testid="price-history-card"
        title="Price history"
        subtitle={`${history.length} sales · this serial · Supabase`}
        variant="inset"
        methodology="topshot.transactions filtered by moment_id (resolved from moment_flow_id), state SUCCEEDED, ordered by completed_at ASC. Time-tab clicks update ?h= and re-fetch with a different WHERE clause."
      >
        <MomentPriceHistory
          data={history.map((p) => ({ ts: p.ts, price_usd: p.price_usd }))}
          active={historyWindow}
        />
      </Card>

      {/* ===== 2. Valuation block ===== */}
      <Card
        title="Valuation"
        subtitle={`base ${valuation.base != null ? `$${valuation.base.toFixed(2)}` : "—"} · ${valuation.adjustments.length} adjustment${valuation.adjustments.length === 1 ? "" : "s"}`}
        methodology={`valueMoment() · ${valuation.confidenceReason}`}
      >
        {valuation.fairValue == null ? (
          <EmptyState
            title="Fair value indeterminate"
            body={valuation.confidenceReason || "No live ask, no recent sales, no last purchase price."}
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border-subtle)] text-[12px]">
              <Cell label="Base" value={valuation.base != null ? `$${valuation.base.toFixed(2)}` : "—"} />
              <Cell label="Fair value" value={`$${valuation.fairValue.toFixed(2)}`} />
              <Cell
                label="Band ±15%"
                value={fvLo != null && fvHi != null ? `$${fvLo.toFixed(0)}–$${fvHi.toFixed(0)}` : "—"}
              />
              <Cell label="Confidence" value={valuation.confidence} />
            </div>
            {valuation.adjustments.length > 0 ? (
              <table className="w-full text-[11px]">
                <thead className="bg-[var(--surface-2)]">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Rule</th>
                    <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Multiplier</th>
                    <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {valuation.adjustments.map((adj, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)]">
                      <td className="px-2 py-1.5 font-mono text-[11px]">{adj.rule}</td>
                      <td className="px-2 py-1.5 text-right tnum">×{adj.multiplier.toFixed(3)}</td>
                      <td className="px-2 py-1.5 text-[var(--text-dim)]">{adj.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[11px] text-[var(--text-faint)] px-1">No rule adjustments fired — fair value equals base.</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== 2b. Tuned-rules overlay (V3 iter-16 — J-P7 full closure) ===== */}
      <TunedValuationOverlay
        playerName={moment.play?.stats?.playerName ?? "Unknown"}
        tier={tier}
        parallelId={parallelId}
        serial={isFinite(serial) ? serial : 0}
        circulation={moment.edition?.circulationCount ?? 0}
        lastSale={anchors.lastSale}
        lowAsk={moment.lowAsk == null ? null : Number(moment.lowAsk)}
        jersey={
          moment.play?.stats?.jerseyNumber != null
            ? Number(moment.play.stats.jerseyNumber)
            : null
        }
        canonicalFairCents={
          valuation.fairValue != null ? Math.round(valuation.fairValue * 100) : null
        }
        canonicalConfLo={fvLo}
        canonicalConfHi={fvHi}
      />

      {/* ===== 3. Depth ladder ===== */}
      <Card
        title="Depth ladder"
        subtitle={`${listed.length} listed · asks-only per public-API ceiling`}
        variant="inset"
      >
        <div className="p-3">
          {listed.length === 0 ? (
            <EmptyState
              title="No listings"
              body="No serials currently listed for sale across this edition. Floor unavailable; ladder rebuilds when liquidity returns."
            />
          ) : (
            <DepthLadder
              listed={listed}
              currentSerial={isFinite(serial) ? serial : undefined}
              fairValue={valuation.fairValue}
            />
          )}
        </div>
      </Card>

      {/* ===== 4. Recent comps ===== */}
      <Card
        title="Recent comps"
        subtitle={`${recentSales.length} most-recent · same edition`}
        variant="inset"
        methodology="searchMarketplaceTransactions(byEditions) — public API exposes price + serial; updatedAt not surfaced on this endpoint, so age is omitted."
      >
        {recentSales.length === 0 ? (
          <EmptyState
            title="No recent sales for this edition"
            body="Either the edition has not traded recently or the API returned an empty window."
          />
        ) : (
          <div>
            <div className="p-3 flex items-center gap-4 border-b border-[var(--border-subtle)]">
              <Sparkline data={[...recentSales].reverse().map((s) => s.price)} width={240} height={40} />
              <span className="text-[10px] text-[var(--text-faint)] font-mono">
                oldest → newest · {recentSales.length} samples
              </span>
            </div>
            <table className="w-full text-[11px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Serial</th>
                  <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.slice(0, 20).map((s, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)]">
                    <td className="px-2 py-1.5 tnum">#{s.serial}</td>
                    <td className="px-2 py-1.5 text-right">
                      <Num value={s.price} format="usd" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ===== 5. Parallels matrix ===== */}
      <Card
        title="Parallels matrix"
        subtitle={`${parallels.length} editions for this play`}
        variant="inset"
        methodology="editionsForPlay() · same play across every parallel × tier × series. Owner-of-lowest-serial column: public API exposes no top-holders aggregate (Ceiling 4 + 7)."
      >
        {parallels.length === 0 ? (
          <EmptyState
            title="No parallel editions returned"
            body="The play either has only this single edition, or the API returned an empty matrix."
          />
        ) : (
          <table className="w-full text-[11px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Set</th>
                <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Series</th>
                <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Tier</th>
                <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Parallel</th>
                <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Circulation</th>
                <th className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">Lowest-serial owner</th>
              </tr>
            </thead>
            <tbody>
              {parallels.map((e) => {
                const isCurrent = e.id === currentEditionId;
                return (
                  <tr
                    key={e.id}
                    className={
                      isCurrent
                        ? "bg-[var(--surface-3)] border-l-2 border-[var(--accent)] border-b border-[var(--border-subtle)]"
                        : "border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)]"
                    }
                  >
                    <td className="px-2 py-1.5 text-[var(--text-dim)]">{e.set?.flowName ?? "—"}</td>
                    <td className="px-2 py-1.5 tnum">{e.set?.flowSeriesNumber ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      <TierChip tier={e.tier} />
                    </td>
                    <td className="px-2 py-1.5 tnum">
                      {e.parallelID > 0 ? `#${e.parallelID}` : "base"}
                    </td>
                    <td className="px-2 py-1.5 text-right tnum">{e.circulationCount?.toLocaleString("en-US") ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[var(--text-faint)]">
                      <span className="tnum">—</span>
                      <span className="ml-2 text-[10px]">Owner data pending</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-1)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-base font-semibold tnum mt-0.5 truncate">{value}</div>
    </div>
  );
}
