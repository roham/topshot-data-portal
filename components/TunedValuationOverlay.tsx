"use client";

import { useEffect, useState } from "react";
import { valueMoment } from "@/lib/valuation";
import { DEFAULT_RULES, type ValuationRules } from "@/lib/valuation/rules";
import type { MintedMoment, MomentTier } from "@/lib/topshot/types";

// V3 iter-16 — Full J-P7 closure.
// Client-side overlay: re-runs valueMoment() with the persona's tuned rules
// (read from localStorage) on top of the synthetic moment data the server
// already used. Banners only render when stored rules differ from DEFAULT_RULES
// AND when the tuned fair value differs from the canonical by ≥ $1.
// If no localStorage key or rules == defaults, renders null — zero perceived change.

const RULES_STORAGE_KEY = "topshot-portal:valuation-rules:v1";

export interface TunedValuationOverlayProps {
  playerName: string;
  tier: MomentTier | undefined;
  parallelId: number;
  serial: number;
  circulation: number;
  lastSale: number | null;
  lowAsk: number | null;
  jersey: number | null;
  /** Canonical fair value × 100 (integer cents) for diffing without float drift. */
  canonicalFairCents: number | null;
  canonicalConfLo: number | null;
  canonicalConfHi: number | null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const TUNABLE_TIERS: MomentTier[] = [
  "MOMENT_TIER_COMMON",
  "MOMENT_TIER_FANDOM",
  "MOMENT_TIER_RARE",
  "MOMENT_TIER_LEGENDARY",
  "MOMENT_TIER_ULTIMATE",
];

// Mirror of ValuationPreview's mergeStoredRules — keeps the same surface area.
function mergeStoredRules(stored: unknown, base: ValuationRules): ValuationRules {
  if (!stored || typeof stored !== "object") return base;
  const s = stored as Record<string, unknown>;
  const next: ValuationRules = {
    ...base,
    editionTierMultipliers: { ...base.editionTierMultipliers },
    parallelMultipliers: { ...base.parallelMultipliers },
    lowSerialTiers: base.lowSerialTiers.map((t) => ({ ...t })),
    confidence: { ...base.confidence },
  };
  if (isFiniteNumber(s.serial1Premium)) next.serial1Premium = s.serial1Premium;
  if (isFiniteNumber(s.jerseyPremium)) next.jerseyPremium = s.jerseyPremium;
  if (isFiniteNumber(s.lastSerialPremium)) next.lastSerialPremium = s.lastSerialPremium;
  if (s.editionTierMultipliers && typeof s.editionTierMultipliers === "object") {
    const tiers = s.editionTierMultipliers as Record<string, unknown>;
    for (const t of TUNABLE_TIERS) {
      const v = tiers[t];
      if (isFiniteNumber(v)) next.editionTierMultipliers[t] = v;
    }
  }
  if (s.parallelMultipliers && typeof s.parallelMultipliers === "object") {
    const pm = s.parallelMultipliers as Record<string, unknown>;
    for (const k of ["0", "1", "2", "3"]) {
      const v = pm[k];
      if (isFiniteNumber(v)) next.parallelMultipliers[Number(k)] = v;
    }
  }
  return next;
}

interface RuleDiff {
  rule: string;
  before: number;
  after: number;
  delta: number;
}

function diffRules(stored: ValuationRules, base: ValuationRules): RuleDiff[] {
  const diffs: RuleDiff[] = [];
  if (stored.serial1Premium !== base.serial1Premium) {
    diffs.push({
      rule: "serial1",
      before: 1 + base.serial1Premium,
      after: 1 + stored.serial1Premium,
      delta: stored.serial1Premium - base.serial1Premium,
    });
  }
  if (stored.jerseyPremium !== base.jerseyPremium) {
    diffs.push({
      rule: "jerseyMatch",
      before: 1 + base.jerseyPremium,
      after: 1 + stored.jerseyPremium,
      delta: stored.jerseyPremium - base.jerseyPremium,
    });
  }
  if (stored.lastSerialPremium !== base.lastSerialPremium) {
    diffs.push({
      rule: "lastSerial",
      before: 1 + base.lastSerialPremium,
      after: 1 + stored.lastSerialPremium,
      delta: stored.lastSerialPremium - base.lastSerialPremium,
    });
  }
  for (const t of TUNABLE_TIERS) {
    const a = stored.editionTierMultipliers[t];
    const b = base.editionTierMultipliers[t];
    if (a !== b) {
      diffs.push({
        rule: `tier:${t.replace("MOMENT_TIER_", "")}`,
        before: b,
        after: a,
        delta: a - b,
      });
    }
  }
  for (const k of [0, 1, 2, 3]) {
    const a = stored.parallelMultipliers[k];
    const b = base.parallelMultipliers[k];
    if (a != null && b != null && a !== b) {
      diffs.push({
        rule: `parallel:${k}`,
        before: b,
        after: a,
        delta: a - b,
      });
    }
  }
  return diffs;
}

function fmtUsd(cents: number): string {
  const v = cents / 100;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 10_000) return `$${(v / 1000).toFixed(1)}K`;
  if (Math.abs(v) >= 100) return `$${v.toFixed(0)}`;
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

interface OverlayState {
  tunedCents: number;
  diffs: RuleDiff[];
}

export function TunedValuationOverlay(props: TunedValuationOverlayProps) {
  const [state, setState] = useState<OverlayState | null>(null);

  useEffect(() => {
    if (props.canonicalFairCents == null) return;
    let storedRules: ValuationRules;
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(RULES_STORAGE_KEY)
          : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      storedRules = mergeStoredRules(parsed, DEFAULT_RULES);
    } catch {
      return;
    }

    const diffs = diffRules(storedRules, DEFAULT_RULES);
    if (diffs.length === 0) return;

    // Re-construct synthetic moment from props. Comps left empty — the canonical
    // call already selected the base from comps + lowAsk; we re-run the rule
    // cascade with the same base inputs to expose the tuned-rule delta.
    const synthetic: MintedMoment = {
      flowId: "overlay",
      flowSerialNumber: String(props.serial),
      tier: props.tier,
      edition: {
        circulationCount: props.circulation,
        parallelID: props.parallelId,
        tier: props.tier,
      },
      play: {
        stats: {
          playerName: props.playerName,
          jerseyNumber: props.jersey != null ? String(props.jersey) : undefined,
        },
      },
      lowAsk: props.lowAsk ?? undefined,
      lastPurchasePrice: props.lastSale ?? undefined,
    };

    const tuned = valueMoment(synthetic, {}, storedRules);
    if (tuned.fairValue == null) return;
    const tunedCents = Math.round(tuned.fairValue * 100);
    if (Math.abs(tunedCents - props.canonicalFairCents) < 100) return;

    setState({ tunedCents, diffs });
  }, [
    props.canonicalFairCents,
    props.circulation,
    props.jersey,
    props.lastSale,
    props.lowAsk,
    props.parallelId,
    props.playerName,
    props.serial,
    props.tier,
  ]);

  if (!state || props.canonicalFairCents == null) return null;

  const canonicalCents = props.canonicalFairCents;
  const deltaPct = ((state.tunedCents - canonicalCents) / canonicalCents) * 100;
  const up = state.tunedCents > canonicalCents;
  const deltaSign = up ? "+" : "";
  const deltaColor = up ? "text-[var(--accent)]" : "text-[var(--text-dim)]";

  const top = state.diffs.slice(0, 3);
  const overflow = state.diffs.length - top.length;
  const diffLine = top
    .map(
      (d) =>
        `${d.rule} ${d.before.toFixed(2)} → ${d.after.toFixed(2)} · ${
          d.delta >= 0 ? "+" : ""
        }${d.delta.toFixed(2)}`,
    )
    .join(" · ");

  return (
    <div className="rounded border border-[var(--accent)] bg-[var(--surface-1)] px-3 py-2.5 space-y-1">
      <div className="text-[10px] tracking-data-label text-[var(--accent)]">
        Using your tuned rules
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[18px] font-semibold tnum text-[var(--text)]">
          Your rules: {fmtUsd(state.tunedCents)}
        </span>
        <span className="text-[11px] text-[var(--text-dim)] tnum">
          · canonical {fmtUsd(canonicalCents)} ·{" "}
          <span className={`${deltaColor} font-semibold`}>
            {deltaSign}
            {deltaPct.toFixed(1)}%
          </span>
        </span>
      </div>
      <div className="text-[11px] text-[var(--text-dim)] font-mono leading-snug">
        {diffLine}
        {overflow > 0 ? ` · +${overflow} more` : ""}
      </div>
      <div className="text-[10px] text-[var(--text-faint)]">
        Tune at{" "}
        <a
          href="/rules"
          className="underline underline-offset-2 hover:text-[var(--text-dim)]"
        >
          /rules
        </a>
      </div>
    </div>
  );
}
