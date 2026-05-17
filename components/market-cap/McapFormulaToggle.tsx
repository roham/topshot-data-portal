"use client";

// 2-state toggle for the mcap formula. URL-encoded via ?mcap=.
//
// Uses <Link> for navigation (not nuqs setQueryState) so that the URL change
// triggers a real navigation event — and the /market-cap page (a server
// component) re-renders with the new formula. nuqs by default does shallow
// routing which doesn't re-run server components.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { McapFormula } from "@/lib/market-cap/mcap-formula";

const FORMULAS: McapFormula[] = ["floor", "avg_sale"];

const LABELS: Record<McapFormula, { label: string; sub: string }> = {
  floor: { label: "Low ask", sub: "circulation × lowest_ask" },
  avg_sale: { label: "Avg sale (30d)", sub: "circulation × 30d avg sale" },
};

export function McapFormulaToggle() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp?.get("mcap") === "avg_sale" ? "avg_sale" : "floor";

  function hrefFor(formula: McapFormula): string {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (formula === "floor") {
      next.delete("mcap");
    } else {
      next.set("mcap", formula);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Market cap formula"
      className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded overflow-hidden"
    >
      {FORMULAS.map((f) => {
        const a = f === current;
        return (
          <Link
            key={f}
            href={hrefFor(f)}
            scroll={false}
            replace={false}
            prefetch={false}
            role="radio"
            aria-checked={a}
            title={LABELS[f].sub}
            className={`px-3 py-1.5 text-[11px] font-mono tracking-data-label transition-colors ${
              a
                ? "bg-[var(--surface-3)] text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {LABELS[f].label}
          </Link>
        );
      })}
    </div>
  );
}
