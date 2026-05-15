"use client";

import { useMemo, useState } from "react";
import { valueMoment } from "@/lib/valuation";
import type { ValuationRules } from "@/lib/valuation/rules";
import type { MintedMoment, MomentTier } from "@/lib/topshot/types";
import { Card } from "@/components/primitives/Card";

interface ValuationPreviewProps {
  defaultRules: ValuationRules;
}

interface PreviewInputs {
  basePrice: number;
  tier: MomentTier;
  parallelId: number;
  serial: number;
  circulation: number;
  lowestAsk: number | "";
  lastSale: number | "";
  jersey: number | "";
}

const DEFAULTS: PreviewInputs = {
  basePrice: 215,
  tier: "MOMENT_TIER_RARE",
  parallelId: 0,
  serial: 1,
  circulation: 12000,
  lowestAsk: 215,
  lastSale: 200,
  jersey: 1,
};

const TIER_OPTIONS: Array<{ value: MomentTier; label: string }> = [
  { value: "MOMENT_TIER_COMMON", label: "Common" },
  { value: "MOMENT_TIER_FANDOM", label: "Fandom" },
  { value: "MOMENT_TIER_RARE", label: "Rare" },
  { value: "MOMENT_TIER_LEGENDARY", label: "Legendary" },
  { value: "MOMENT_TIER_ULTIMATE", label: "Ultimate" },
];

function fmtUsd(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 10_000) return `$${(v / 1000).toFixed(1)}K`;
  if (Math.abs(v) >= 100) return `$${v.toFixed(0)}`;
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

export function ValuationPreview({ defaultRules }: ValuationPreviewProps) {
  const [inputs, setInputs] = useState<PreviewInputs>(DEFAULTS);

  const result = useMemo(() => {
    const ask = inputs.lowestAsk === "" ? inputs.basePrice : Number(inputs.lowestAsk);
    const last = inputs.lastSale === "" ? inputs.basePrice : Number(inputs.lastSale);
    const jerseyStr = inputs.jersey === "" ? undefined : String(inputs.jersey);

    const synthetic: MintedMoment = {
      flowId: "preview",
      flowSerialNumber: String(inputs.serial),
      tier: inputs.tier,
      edition: {
        circulationCount: Number(inputs.circulation) || 0,
        parallelID: Number(inputs.parallelId) || 0,
        tier: inputs.tier,
      },
      play: {
        stats: {
          playerName: "Preview",
          jerseyNumber: jerseyStr,
        },
      },
      lowAsk: ask,
      lastPurchasePrice: last,
    };

    return valueMoment(synthetic, {}, defaultRules);
  }, [inputs, defaultRules]);

  function update<K extends keyof PreviewInputs>(key: K, value: PreviewInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card
      title="Preview your valuation"
      methodology="Live preview — adjusts as you type. Same rule cascade valueMoment() runs on every moment page. No persistence; refresh resets to defaults."
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
        {/* Inputs */}
        <div className="space-y-2">
          <NumField
            label="Base price (USD)"
            value={inputs.basePrice}
            onChange={(v) => update("basePrice", typeof v === "number" ? v : 0)}
          />
          <SelectField
            label="Tier"
            value={inputs.tier}
            options={TIER_OPTIONS}
            onChange={(v) => update("tier", v as MomentTier)}
          />
          <NumField
            label="Parallel ID (0 = Base)"
            value={inputs.parallelId}
            onChange={(v) => update("parallelId", typeof v === "number" ? v : 0)}
          />
          <NumField
            label="Serial number"
            value={inputs.serial}
            onChange={(v) => update("serial", typeof v === "number" ? v : 0)}
          />
          <NumField
            label="Circulation count"
            value={inputs.circulation}
            onChange={(v) => update("circulation", typeof v === "number" ? v : 0)}
          />
          <NumField
            label="Lowest ask (USD) — optional"
            value={inputs.lowestAsk}
            optional
            onChange={(v) => update("lowestAsk", v)}
          />
          <NumField
            label="Last sale (USD) — optional"
            value={inputs.lastSale}
            optional
            onChange={(v) => update("lastSale", v)}
          />
          <NumField
            label="Jersey number — optional"
            value={inputs.jersey}
            optional
            onChange={(v) => update("jersey", v)}
          />
        </div>

        {/* Output */}
        <div className="bg-[var(--surface-0)] border border-[var(--border-subtle)] rounded p-3 space-y-3">
          <div>
            <div className="text-[10px] tracking-data-label text-[var(--text-faint)]">Fair value</div>
            <div className="tnum text-[22px] font-semibold text-[var(--text)] mt-0.5">
              {result.fairValue == null ? "—" : fmtUsd(result.fairValue)}
            </div>
            <div className="text-[12px] text-[var(--text-dim)] mt-0.5">
              <span className="tnum">{result.confidence}</span>
              {result.confidenceReason ? <span> · {result.confidenceReason}</span> : null}
            </div>
            {result.base != null && (
              <div className="text-[11px] text-[var(--text-faint)] mt-0.5 tnum">
                Base: {fmtUsd(result.base)}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] tracking-data-label text-[var(--text-faint)] mb-1">
              Rules that fired ({result.adjustments.length})
            </div>
            {result.adjustments.length === 0 ? (
              <div className="text-[12px] text-[var(--text-dim)]">
                No rules fired — fair value equals base.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {result.adjustments.map((a, i) => (
                  <li key={`${a.rule}-${i}`} className="text-[12px] leading-snug">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[var(--text)]">{a.rule}</span>
                      <span className="tnum text-[var(--text)] font-semibold">
                        ×{a.multiplier.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-dim)]">{a.rationale}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface NumFieldProps {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  optional?: boolean;
}

function NumField({ label, value, onChange, optional }: NumFieldProps) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block mb-0.5">
        {label}
      </span>
      <input
        type="number"
        value={value === "" ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            onChange(optional ? "" : 0);
            return;
          }
          const n = Number(v);
          onChange(isFinite(n) ? n : 0);
        }}
        className="w-full bg-[var(--surface-0)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[13px] tnum text-[var(--text)] focus:outline-none focus:border-[var(--text-dim)]"
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-data-label text-[var(--text-faint)] block mb-0.5">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface-0)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--text-dim)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
