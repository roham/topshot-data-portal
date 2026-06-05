"use client";

// ALL / 3Y / 1Y window toggle for the supply page. <Link>-based for real
// server-component re-render (same pattern as MoverWindowToggle). The window
// crops every chart to the trailing period; cumulative values stay absolute.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const WINDOWS: Array<{ key: string; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "3y", label: "3Y" },
  { key: "1y", label: "1Y" },
];

export function SupplyWindowToggle() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp?.get("win") === "3y" ? "3y" : sp?.get("win") === "1y" ? "1y" : "all";

  function hrefFor(key: string): string {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (key === "all") next.delete("win");
    else next.set("win", key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Supply window"
      className="inline-flex items-center gap-0.5 bg-[var(--surface-1)] rounded-lg p-1"
    >
      {WINDOWS.map((w) => {
        const a = w.key === current;
        return (
          <Link
            key={w.key}
            href={hrefFor(w.key)}
            scroll={false}
            prefetch={false}
            role="radio"
            aria-checked={a}
            className={`px-2.5 py-1 text-[11px] font-mono tracking-data-label rounded-md transition-colors duration-150 ${
              a
                ? "bg-[var(--accent)]/15 text-[var(--accent)] font-semibold"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {w.label}
          </Link>
        );
      })}
    </div>
  );
}
