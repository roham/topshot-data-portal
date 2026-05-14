import type { EditionRow } from "@/lib/topshot/queries";
import { formatNumber, tierLabel } from "@/lib/utils";
import { TierPill } from "./Tier";

export function ParallelMatrix({ editions, current }: { editions: EditionRow[]; current?: { parallelID?: number; editionId?: string } }) {
  // Compute total circulation and base reference (parallelID 0 of any tier)
  const totalCirc = editions.reduce((s, e) => s + e.circulationCount, 0);
  const base = editions.find((e) => e.parallelID === 0);
  if (!editions || editions.length === 0) {
    return <div className="text-sm text-[var(--text-faint)] px-4 py-3">No parallel/edition data returned.</div>;
  }
  // Group by tier then sort by parallelID ascending
  const sorted = [...editions].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier.localeCompare(b.tier);
    return a.parallelID - b.parallelID;
  });
  return (
    <div>
      <div className="px-4 py-2 text-[10px] text-[var(--text-faint)] uppercase tracking-wider border-b border-[var(--border)] flex gap-3">
        <span>A5 · {editions.length} editions · {formatNumber(totalCirc)} total minted across this lineage</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {sorted.map((e) => {
          const isCurrent = current?.editionId === e.id || (current?.parallelID === e.parallelID && current?.parallelID != null);
          const scarcityVsBase = base && base.id !== e.id ? base.circulationCount / e.circulationCount : 1;
          return (
            <div
              key={e.id}
              className={`px-4 py-2 flex items-baseline gap-3 ${isCurrent ? "bg-[var(--accent)]/8" : ""}`}
            >
              <TierPill tier={e.tier} />
              <span className="text-sm font-medium">
                Parallel #{e.parallelID}
                {e.parallelID === 0 && <span className="text-[var(--text-faint)] ml-1">(base)</span>}
              </span>
              <span className="tnum text-xs text-[var(--text-faint)] flex-1">
                {e.set.flowName} · Series {e.set.flowSeriesNumber ?? "?"}
              </span>
              <span className="tnum text-sm">{formatNumber(e.circulationCount)} minted</span>
              {scarcityVsBase > 1.05 && (
                <span className="tnum text-xs text-[var(--accent)]">×{scarcityVsBase.toFixed(1)} rarer</span>
              )}
              {isCurrent && (
                <span className="text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider ml-2">this moment</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
