"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TimeWindowSelector } from "./global/TimeWindowSelector";

// Five-lane IA per the 2026-05-19 senior-designer pass:
// - Market    — the macro view (homepage, indices, market-cap, volume, movers, trends, per-tier, per-series, per-team rollups)
// - Browse    — find a specific thing (players, sets, editions, moments, packs, parallels)
// - Trade     — active decisions (sniper, feed, sales, portfolio, collectors, whales, compare, leaderboards, locking)
// - Editorial — narrative + history (on-this-day, briefing, per-game retrospectives)
// - Methodology — model + rules transparency
//
// The /misc page (intentionally NOT in nav) catalogs orphan-but-real surfaces
// (retired homepage variants etc) for discoverability without polluting nav.

const TABS = [
  {
    label: "Market",
    href: "/",
    match: (p: string) =>
      p === "/" ||
      p.startsWith("/indices") ||
      p.startsWith("/market-cap") ||
      p.startsWith("/volume") ||
      p.startsWith("/movers") ||
      p.startsWith("/trends") ||
      p === "/parallels" ||
      p.startsWith("/tier/") ||
      p.startsWith("/series/") ||
      p.startsWith("/team/"),
  },
  {
    label: "Browse",
    href: "/players",
    match: (p: string) =>
      p === "/players" ||
      p.startsWith("/player/") ||
      p === "/sets" ||
      p.startsWith("/set/") ||
      p === "/editions" ||
      p.startsWith("/edition/") ||
      p === "/moments" ||
      p.startsWith("/moment/") ||
      p === "/packs" ||
      p.startsWith("/packs/"),
  },
  {
    label: "Trade",
    href: "/sniper",
    match: (p: string) =>
      p === "/sniper" ||
      p === "/feed" ||
      p === "/sales" ||
      p === "/portfolio" ||
      p === "/collectors" ||
      p === "/whales" ||
      p === "/compare" ||
      p === "/leaderboards" ||
      p === "/locking" ||
      p.startsWith("/u/"),
  },
  {
    label: "Editorial",
    href: "/on-this-day",
    match: (p: string) =>
      p === "/on-this-day" ||
      p === "/briefing" ||
      p.startsWith("/game/"),
  },
  {
    label: "Methodology",
    href: "/methodology",
    match: (p: string) => p === "/methodology" || p === "/rules",
  },
];

// Command bar — placeholder for ⌘K. For now: a username/flow-address resolver
// that submits to /u/{value}. Richer search (player/set/edition/team) lands
// in a subsequent iter.
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
        placeholder="username · address · player →"
        className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded text-[11px] px-2.5 py-1 w-[240px] focus:border-[var(--border-strong)] outline-none font-mono"
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
