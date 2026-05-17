"use client";

import { Suspense } from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";

export type McapFormula = "floor" | "avg_sale";
const FORMULAS: McapFormula[] = ["floor", "avg_sale"];

const LABELS: Record<McapFormula, { label: string; sub: string }> = {
  floor: { label: "Low ask", sub: "circulation × lowest_ask" },
  avg_sale: { label: "Avg sale (30d)", sub: "circulation × 30d avg sale" },
};

function ToggleInner() {
  const [active, setActive] = useQueryState(
    "mcap",
    parseAsStringEnum<McapFormula>([...FORMULAS]).withDefault("floor"),
  );
  return (
    <div
      role="radiogroup"
      aria-label="Market cap formula"
      className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded overflow-hidden"
    >
      {FORMULAS.map((f) => {
        const a = f === active;
        return (
          <button
            key={f}
            role="radio"
            aria-checked={a}
            onClick={() => setActive(f)}
            className={`px-3 py-1.5 text-[11px] font-mono tracking-data-label transition-colors ${
              a
                ? "bg-[var(--surface-3)] text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            }`}
            title={LABELS[f].sub}
          >
            {LABELS[f].label}
          </button>
        );
      })}
    </div>
  );
}

export function McapFormulaToggle() {
  return (
    <Suspense fallback={null}>
      <ToggleInner />
    </Suspense>
  );
}

/** Server-side helper: parses ?mcap=... from searchParams without nuqs/Suspense. */
export function parseMcapFormula(value: string | undefined | null): McapFormula {
  return value === "avg_sale" ? "avg_sale" : "floor";
}
