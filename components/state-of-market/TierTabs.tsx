"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TIER_TABS, type TierTab } from "@/components/state-of-market/tier-tabs-shared";

export function TierTabs({ active }: { active: TierTab }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (t: TierTab) => {
    const next = new URLSearchParams(params.toString());
    if (t === "All") next.delete("tier");
    else next.set("tier", t);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="flex w-fit gap-1 rounded-[10px] bg-[var(--surface-1)] p-[5px]">
      {TIER_TABS.map((t) => {
        const on = t === active;
        return (
          <Link
            key={t}
            href={hrefFor(t)}
            scroll={false}
            className={`rounded-[7px] px-[13px] py-1.5 font-mono text-[11.5px] transition-colors ${
              on
                ? "bg-[#2dd4bf]/15 font-semibold text-[#2dd4bf]"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {t === "All" ? "All tiers" : t}
          </Link>
        );
      })}
    </div>
  );
}
