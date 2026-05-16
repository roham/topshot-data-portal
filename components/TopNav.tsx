"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TimeWindowSelector } from "./global/TimeWindowSelector";

const TABS = [
  { label: "Market", href: "/", match: (p: string) => p === "/" },
  { label: "Moments", href: "/moments", match: (p: string) => p === "/moments" || p.startsWith("/moments?") },
  { label: "Indices", href: "/indices", match: (p: string) => p.startsWith("/indices") },
  { label: "Editions", href: "/editions", match: (p: string) => p.startsWith("/edition") },
  { label: "Collectors", href: "/collectors", match: (p: string) => p.startsWith("/collectors") || p.startsWith("/u/") },
  { label: "Methodology", href: "/methodology", match: (p: string) => p === "/methodology" },
];

// Username / flow-address resolver — submits to /u/{value}. Live resolve
// happens server-side on /u; here we just navigate.
function SearchResolver() {
  const router = useRouter();
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = v.trim();
        if (!trimmed) return;
        router.push(`/u/${encodeURIComponent(trimmed)}`);
        setV("");
      }}
      className="hidden md:flex items-center"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="username or 0x address →"
        className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded text-[11px] px-2.5 py-1 w-[220px] focus:border-[var(--border-strong)] outline-none font-mono"
        spellCheck={false}
      />
    </form>
  );
}

export function TopNav({ freshness }: { freshness?: ReactNode } = {}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border-subtle)]">
      <div className="max-w-[1440px] mx-auto px-4 h-12 flex items-center gap-6">
        <Link href="/" className="font-mono text-[12px] font-semibold tracking-tight whitespace-nowrap flex items-center gap-1">
          <span className="text-[var(--text)]">TS</span>
          <span className="text-[var(--accent)]">·</span>
          <span className="text-[var(--text)]">PORTAL</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "px-2.5 py-1 text-[12px] tracking-[0.02em] transition-colors",
                  active
                    ? "text-[var(--text)] border-b-2 border-[var(--accent)] -mb-px"
                    : "text-[var(--text-dim)] hover:text-[var(--text)]"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchResolver />
          <TimeWindowSelector />
          <kbd className="hidden lg:inline px-1.5 py-0.5 border border-[var(--border-subtle)] rounded text-[10px] font-mono text-[var(--text-dim)]">
            / or ⌘K
          </kbd>
          {freshness ?? (
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)] font-mono">
              <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[var(--up)] inline-block" />
              <span className="hidden sm:inline tracking-data-label">live</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
