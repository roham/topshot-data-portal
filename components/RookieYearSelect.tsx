"use client";

// Draft-year filter for the ROOKIES index. Native <select> styled to the mono
// rail aesthetic; navigates by pushing the `ry` searchParam so the RSC
// re-renders the basket for the chosen draft class. State lives in the URL
// (doctrine P4 / J-X2 — shareable filter state).

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  SELECTABLE_ROOKIE_YEARS,
  CURRENT_ROOKIE_YEAR,
  parseRookieYear,
} from "@/lib/indices/rookie-years";

export function RookieYearSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = parseRookieYear(sp?.get("ry") ?? undefined);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const y = e.target.value;
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (y === CURRENT_ROOKIE_YEAR) next.delete("ry");
    else next.set("ry", y);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <select
      value={current}
      onChange={onChange}
      aria-label="Rookie draft year"
      className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded text-[11px] font-mono text-[var(--text-dim)] px-1.5 py-0.5 hover:text-[var(--text)] focus:outline-none focus:border-[var(--border-strong)] cursor-pointer"
    >
      {SELECTABLE_ROOKIE_YEARS.map((y) => (
        <option key={y} value={y}>
          {y} class
        </option>
      ))}
    </select>
  );
}
