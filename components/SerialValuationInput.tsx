// SerialValuationInput — "True Value by serial" overlay.
//
// From research/personas/pro-trader.md §Discord voice #2:
//   "I need to dump the Common Wembys with serials > 5K before EOM. Are there
//    any thinly-listed parallels with better bid support?"
//
// Acceptance (features.json[moment-detail-serial-overlay].acceptance):
//   "As a trader, I type a serial number into the 'True Value by serial' input
//    on a moment detail page and see a price estimate for that specific serial
//    (or an honest 'not enough comps' message)."
//
// Pillar 1: input-plus-chart-overlay viz kind. URL state `?s=<number>` per
//   Pillar 1 mandate (shareable permalink). Parallel context in result label
//   (Pillar 5 §6). Confidence layer always shown (Pillar 5 §4). Honest
//   EmptyState when fairValue: null (Pillar 5 §2).

"use client";

import { Suspense } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { valueMoment } from "@/lib/valuation";
import { DEFAULT_RULES } from "@/lib/valuation/rules";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Num } from "@/components/primitives/Num";
import type { MintedMoment, MomentTier } from "@/lib/topshot/types";

export interface SerialValuationInputProps {
  playerName: string;
  tier: MomentTier | undefined;
  parallelId: number;
  circulation: number;
  /** lowAsk on the moment's serial (live ask on this exact serial, if any). */
  lowAsk: number | null;
  /** lastPurchasePrice on the moment's serial. */
  lastSale: number | null;
  /** Jersey number, for jersey-serial match rule. */
  jersey: number | null;
  /** Edition floor — cheapest listing across the edition. Used as valuation base. */
  editionFloor: number | null;
  /** Recent edition sales (newest first, up to 20). */
  recentSales: Array<{ price: number }>;
  /** Server-parsed initial serial from `?s=` URL param. Passed as `defaultValue`. */
  initialSerial: number | null;
}

/** Band label string, matching DEFAULT_RULES.lowSerialTiers thresholds. */
function serialBandLabel(serial: number, circ: number): string {
  if (serial <= 10) return "band 1–10";
  if (serial <= 100) return "band 1–100";
  if (serial <= 1000) return "band 1–1,000";
  if (circ > 0) return `band 1,001–${circ.toLocaleString("en-US")}`;
  return "mid/high serial";
}

function parallelLabel(parallelId: number): string {
  if (parallelId === 0) return "Base parallel";
  return `Parallel #${parallelId}`;
}

export function SerialValuationInput(props: SerialValuationInputProps) {
  return (
    <Suspense fallback={<InputShell initialSerial={props.initialSerial} />}>
      <Inner {...props} />
    </Suspense>
  );
}

/** Fallback rendered while nuqs hydrates (SSR pass). Shows the input shell without result. */
function InputShell({ initialSerial }: { initialSerial: number | null }) {
  return (
    <div className="space-y-3 p-3">
      <label className="block">
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block mb-1">
          True Value by serial
        </span>
        <input
          type="number"
          min="1"
          step="1"
          data-testid="serial-input"
          defaultValue={initialSerial ?? ""}
          placeholder="Enter serial number…"
          className="w-full max-w-[200px] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[13px] tnum text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
        />
      </label>
    </div>
  );
}

function Inner({
  playerName,
  tier,
  parallelId,
  circulation,
  lowAsk,
  lastSale,
  jersey,
  editionFloor,
  recentSales,
  initialSerial,
}: SerialValuationInputProps) {
  const [serial, setSerial] = useQueryState("s", parseAsInteger);

  // On first render, nuqs reads `?s=` from URL, so `serial` will equal
  // `initialSerial` if set (or null if not). We don't need to initialise
  // from the prop because nuqs already reads the URL on mount.

  // Controlled value for the <input>: prefer nuqs state; fall back to
  // initialSerial for SSR/cold render.
  const displaySerial = serial ?? initialSerial ?? null;

  // Build synthetic moment for the typed serial.
  const synthMoment: MintedMoment | null =
    displaySerial != null && displaySerial > 0
      ? {
          flowId: "serial-overlay",
          flowSerialNumber: String(displaySerial),
          tier,
          edition: {
            circulationCount: circulation,
            parallelID: parallelId,
            tier,
          },
          play: {
            stats: {
              playerName,
              jerseyNumber: jersey != null ? String(jersey) : undefined,
            },
          },
          // lowAsk on the moment's serial is not passed — we're evaluating a
          // different serial; use editionFloor + recentSales as market context.
          lowAsk: undefined,
          lastPurchasePrice: lastSale ?? undefined,
        }
      : null;

  const valuation =
    synthMoment != null
      ? valueMoment(
          synthMoment,
          { editionFloor: editionFloor ?? undefined, recentSales },
          DEFAULT_RULES,
        )
      : null;

  const bandLabel =
    displaySerial != null && displaySerial > 0
      ? serialBandLabel(displaySerial, circulation)
      : null;

  return (
    <div className="space-y-3 p-3">
      {/* Input */}
      <label className="block">
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block mb-1">
          True Value by serial
        </span>
        <input
          type="number"
          min="1"
          step="1"
          data-testid="serial-input"
          value={displaySerial ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === "" || v === "0") {
              void setSerial(null);
            } else {
              const n = parseInt(v, 10);
              if (isFinite(n) && n > 0) {
                void setSerial(n);
              }
            }
          }}
          placeholder="Enter serial number…"
          className="w-full max-w-[200px] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[13px] tnum text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
        />
      </label>

      {/* Result or nothing */}
      {displaySerial != null && displaySerial > 0 && valuation != null && (
        <div data-testid="serial-valuation-result">
          {valuation.fairValue == null ? (
            <EmptyState
              title="Not enough market data for this serial"
              body={`not enough comps — ${valuation.confidenceReason} Add a floor price or wait for recent sales to build the model.`}
            />
          ) : (
            <div className="space-y-2">
              {/* Primary result row */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[20px] font-semibold tnum text-[var(--text)]">
                  <Num value={valuation.fairValue} format="usd" />
                </span>
                <span className="text-[11px] text-[var(--text-faint)] font-mono">
                  Serial #{displaySerial} · {parallelLabel(parallelId)} · confidence{" "}
                  <span className="text-[var(--text-dim)]">{valuation.confidence}</span>
                </span>
              </div>

              {/* Band context line — mirrors PSA pop-by-grade comp context. */}
              {bandLabel && (
                <div className="text-[11px] text-[var(--text-faint)]">
                  {bandLabel} · {valuation.adjustments.length === 0
                    ? "no band premium fired (mid-range serial)"
                    : valuation.adjustments
                        .filter((a) => a.rule.startsWith("lowSerial") || a.rule === "serial1" || a.rule === "lastSerial" || a.rule === "jerseyMatch")
                        .map((a) => a.rationale)
                        .join(" · ") || "standard band"}
                </div>
              )}

              {/* Confidence sub-line */}
              <div className="text-[10px] text-[var(--text-faint)] font-mono">
                {valuation.confidenceReason}
              </div>

              {/* Adjustment trace — transparent rules per Pillar 5 §5 */}
              {valuation.adjustments.length > 0 && (
                <table className="w-full text-[11px] mt-1">
                  <thead className="bg-[var(--surface-2)]">
                    <tr className="text-left">
                      <th className="px-2 py-1 text-[10px] tracking-data-label text-[var(--text-faint)]">Rule</th>
                      <th className="px-2 py-1 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">Multiplier</th>
                      <th className="px-2 py-1 text-[10px] tracking-data-label text-[var(--text-faint)]">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuation.adjustments.map((adj, i) => (
                      <tr key={i} className="border-b border-[var(--border-subtle)]">
                        <td className="px-2 py-1 font-mono text-[11px]">{adj.rule}</td>
                        <td className="px-2 py-1 text-right tnum">×{adj.multiplier.toFixed(3)}</td>
                        <td className="px-2 py-1 text-[var(--text-dim)]">{adj.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
