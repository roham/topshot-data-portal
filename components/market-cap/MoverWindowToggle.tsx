"use client";

// 15D / 30D / 90D toggle for the movers section. <Link>-based for real
// server-component re-render (same pattern as McapFormulaToggle).

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MoverWindow } from "@/lib/supabase/queries/player-movers";

const WINDOWS: MoverWindow[] = [15, 30, 90];

export function MoverWindowToggle() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const cur = sp?.get("mw");
  const current: MoverWindow = cur === "15" ? 15 : cur === "90" ? 90 : 30;

  function hrefFor(w: MoverWindow): string {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (w === 30) {
      next.delete("mw");
    } else {
      next.set("mw", String(w));
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}#movers` : `${pathname}#movers`;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Movers window"
      className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded overflow-hidden"
    >
      {WINDOWS.map((w) => {
        const a = w === current;
        return (
          <Link
            key={w}
            href={hrefFor(w)}
            scroll={false}
            prefetch={false}
            role="radio"
            aria-checked={a}
            className={`px-2.5 py-1 text-[11px] font-mono tracking-data-label transition-colors ${
              a
                ? "bg-[var(--surface-3)] text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {w}D
          </Link>
        );
      })}
    </div>
  );
}
