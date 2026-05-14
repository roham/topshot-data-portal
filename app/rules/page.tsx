"use client";
import { useState } from "react";
import { DEFAULT_RULES } from "@/lib/valuation/rules";
import { valueMoment } from "@/lib/valuation";
import type { MintedMoment } from "@/lib/topshot/types";
import { Card } from "@/components/Card";
import { formatUsd } from "@/lib/utils";

const SAMPLE_MOMENTS: Array<{ label: string; moment: MintedMoment }> = [
  {
    label: "Common base — generic serial",
    moment: {
      flowId: "1",
      flowSerialNumber: "1234",
      tier: "MOMENT_TIER_COMMON",
      edition: { circulationCount: 12000, parallelID: 0, tier: "MOMENT_TIER_COMMON" },
      play: { stats: { playerName: "Generic Common", jerseyNumber: "23" } },
      set: { flowName: "Base Set" },
      lowAsk: 4,
    },
  },
  {
    label: "Jersey match — Tatum #0",
    moment: {
      flowId: "2",
      flowSerialNumber: "0",
      tier: "MOMENT_TIER_COMMON",
      edition: { circulationCount: 4000, parallelID: 0, tier: "MOMENT_TIER_COMMON" },
      play: { stats: { playerName: "Jayson Tatum", jerseyNumber: "0" } },
      set: { flowName: "Base Set" },
      lowAsk: 12,
    },
  },
  {
    label: "Serial #1 — LeBron Cosmic Legendary",
    moment: {
      flowId: "3",
      flowSerialNumber: "1",
      tier: "MOMENT_TIER_LEGENDARY",
      edition: { circulationCount: 45, parallelID: 0, tier: "MOMENT_TIER_LEGENDARY" },
      play: { stats: { playerName: "LeBron James", jerseyNumber: "23" } },
      set: { flowName: "Holo Icon" },
      lowAsk: 3500,
    },
  },
  {
    label: "Low-serial top-10 — Wemby",
    moment: {
      flowId: "4",
      flowSerialNumber: "7",
      tier: "MOMENT_TIER_RARE",
      edition: { circulationCount: 999, parallelID: 0, tier: "MOMENT_TIER_RARE" },
      play: { stats: { playerName: "Victor Wembanyama", jerseyNumber: "1" } },
      set: { flowName: "Rookie Debut" },
      lowAsk: 250,
    },
  },
  {
    label: "Parallel #2 (Holo) on Anthology",
    moment: {
      flowId: "5",
      flowSerialNumber: "55",
      tier: "MOMENT_TIER_RARE",
      edition: { circulationCount: 250, parallelID: 2, tier: "MOMENT_TIER_RARE" },
      play: { stats: { playerName: "Cooper Flagg", jerseyNumber: "32" } },
      set: { flowName: "Anthology" },
      lowAsk: 100,
    },
  },
  {
    label: "Last serial — final mint of an Ultimate",
    moment: {
      flowId: "6",
      flowSerialNumber: "99",
      tier: "MOMENT_TIER_ULTIMATE",
      edition: { circulationCount: 99, parallelID: 0, tier: "MOMENT_TIER_ULTIMATE" },
      play: { stats: { playerName: "Stephen Curry", jerseyNumber: "30" } },
      set: { flowName: "MGLE" },
      lowAsk: 8000,
    },
  },
];

export default function RulesPage() {
  const [rules, setRules] = useState(DEFAULT_RULES);

  function setNum(key: keyof typeof rules, v: number) {
    setRules({ ...rules, [key]: v });
  }

  function setEditionMult(t: keyof typeof rules.editionTierMultipliers, v: number) {
    setRules({ ...rules, editionTierMultipliers: { ...rules.editionTierMultipliers, [t]: v } });
  }

  function setParallelMult(id: number, v: number) {
    setRules({ ...rules, parallelMultipliers: { ...rules.parallelMultipliers, [id]: v } });
  }

  function reset() {
    setRules(DEFAULT_RULES);
  }

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <header className="mb-4">
        <div className="text-xs uppercase tracking-wider text-[var(--text-faint)]">Valuation rules</div>
        <h1 className="text-3xl font-semibold tracking-tight">How the fair-value number is computed</h1>
        <p className="text-[var(--text-dim)] text-sm max-w-3xl mt-2">
          Tune the rules below and watch every sample moment re-value live. Every adjustment is auditable — no black box.
          This page exists because the financial-gambler-collector deserves to see the math, not be told it.
        </p>
      </header>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <Card title="Rules" subtitle="multipliers · live-edit">
          <div className="px-4 py-3 space-y-4 text-sm">
            <RuleRow label="Jersey serial premium" hint="+0.5 = +50%">
              <NumIn value={rules.jerseyPremium} onChange={(v) => setNum("jerseyPremium", v)} step={0.05} />
            </RuleRow>
            <RuleRow label="Serial #1 premium" hint="+1.0 = +100%">
              <NumIn value={rules.serial1Premium} onChange={(v) => setNum("serial1Premium", v)} step={0.05} />
            </RuleRow>
            <RuleRow label="Last serial premium" hint="last mint in a circulation">
              <NumIn value={rules.lastSerialPremium} onChange={(v) => setNum("lastSerialPremium", v)} step={0.05} />
            </RuleRow>
            <div>
              <div className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider mb-1">Low-serial tier ladder</div>
              {rules.lowSerialTiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs my-1">
                  <span className="text-[var(--text-dim)] w-14">≤ {t.threshold}</span>
                  <NumIn
                    value={t.premium}
                    step={0.05}
                    onChange={(v) => {
                      const copy = rules.lowSerialTiers.slice();
                      copy[i] = { ...copy[i], premium: v };
                      setRules({ ...rules, lowSerialTiers: copy });
                    }}
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider mb-1">Edition tier multipliers</div>
              {(Object.keys(rules.editionTierMultipliers) as Array<keyof typeof rules.editionTierMultipliers>).map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs my-1">
                  <span className="text-[var(--text-dim)] w-24">{t.replace("MOMENT_TIER_", "")}</span>
                  <NumIn
                    value={rules.editionTierMultipliers[t]}
                    step={0.05}
                    onChange={(v) => setEditionMult(t, v)}
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="text-[var(--text-faint)] text-[10px] uppercase tracking-wider mb-1">Parallel multipliers</div>
              {Object.keys(rules.parallelMultipliers).map((idStr) => {
                const id = Number(idStr);
                return (
                  <div key={id} className="flex items-center gap-2 text-xs my-1">
                    <span className="text-[var(--text-dim)] w-24">Parallel #{id}</span>
                    <NumIn
                      value={rules.parallelMultipliers[id]}
                      step={0.05}
                      onChange={(v) => setParallelMult(id, v)}
                    />
                  </div>
                );
              })}
            </div>
            <button
              onClick={reset}
              className="w-full mt-2 text-xs border border-[var(--border)] rounded px-3 py-1.5 hover:bg-[var(--bg-elev)]"
            >
              Reset defaults
            </button>
          </div>
        </Card>

        <Card title="Sample valuations" subtitle="Live-recompute on rule changes">
          <div className="divide-y divide-[var(--border)]">
            {SAMPLE_MOMENTS.map(({ label, moment }) => {
              const v = valueMoment(moment, { recentSales: [] }, rules);
              return (
                <div key={moment.flowId} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-[11px] text-[var(--text-faint)] tnum">
                        {moment.play?.stats?.playerName} · #{moment.flowSerialNumber}/{moment.edition?.circulationCount} · base {formatUsd(v.base ?? 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold tnum text-[var(--accent)]">{formatUsd(v.fairValue)}</div>
                      <div className={`text-[10px] conf-${v.confidence}`}>confidence · {v.confidence}</div>
                    </div>
                  </div>
                  {v.adjustments.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[11px]">
                      {v.adjustments.map((a) => (
                        <li key={a.rule} className="flex gap-2">
                          <span className="text-[var(--accent)] font-mono w-28">{a.rule}</span>
                          <span className="tnum text-[var(--text-dim)] w-12">×{a.multiplier.toFixed(2)}</span>
                          <span className="text-[var(--text-dim)] flex-1">{a.rationale}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RuleRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div>
        <div className="text-[var(--text)]">{label}</div>
        {hint && <div className="text-[10px] text-[var(--text-faint)]">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function NumIn({ value, onChange, step = 0.05 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
      className="bg-[var(--bg-elev)] border border-[var(--border)] rounded px-2 py-1 w-24 text-xs tnum text-right outline-none focus:border-[var(--accent)]"
    />
  );
}
