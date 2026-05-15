"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

interface Tab {
  key: string;
  label: string;
  // Optional indicator badge — e.g., to mark deferred tabs
  badge?: string;
}

interface EntityTabsProps {
  tabs: Tab[];
  defaultKey: string;
  /** URL search-param name for the active tab (defaults to `tab`). */
  param?: string;
}

export function EntityTabs({ tabs, defaultKey, param = "tab" }: EntityTabsProps) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const active = sp.get(param) ?? defaultKey;
  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] -mt-px">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const href = `${pathname}?${param}=${encodeURIComponent(t.key)}`;
        return (
          <Link
            key={t.key}
            href={href}
            scroll={false}
            className={cn(
              "px-3 h-9 inline-flex items-center text-[12px] tracking-[0.02em] transition-colors",
              isActive
                ? "text-[var(--text)] border-b-2 border-[var(--accent)] -mb-px"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            )}
          >
            {t.label}
            {t.badge && (
              <span className="ml-1.5 text-[9px] tracking-data-label text-[var(--text-faint)]">{t.badge}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
