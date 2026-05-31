"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
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
    label: "Appreciating",
    href: "/appreciating",
    match: (p: string) => p === "/appreciating" || p.startsWith("/edition/"),
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

// Command bar trigger button — opens the CommandPalette (mounted globally in
// app/layout.tsx) via the `cmdk-open` custom event. Keyboard-first users hit /
// or ⌘K directly; mouse users get this clickable affordance.
//
// The palette resolves: user/u, player/p, team/t, set/s, edition/e, moment/m,
// index/i, compare/vs, movers, watching, methodology, briefing, indices,
// editions, collectors, home. Press ? in the palette (or Shift+? anywhere)
// for the full grammar.
function SearchResolverButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("cmdk-open"))}
      className="hidden md:flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg text-[11px] px-3 py-1.5 w-[260px] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition-colors font-mono text-[var(--text-faint)] tracking-tight"
      aria-label="Open command palette"
    >
      <span className="text-[var(--text-faint)]">▶</span>
      <span className="flex-1 text-left truncate">function code · ?, player, set …</span>
      <kbd className="text-[10px] text-[var(--text-faint)] tracking-data-label">/ ⌘K</kbd>
    </button>
  );
}

export function TopNav({ freshness }: { freshness?: ReactNode } = {}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]/70">
      <div className="max-w-[1600px] mx-auto px-5 h-14 flex items-center gap-7">
        <Link href="/" className="font-mono text-[13px] font-semibold tracking-tight whitespace-nowrap flex items-center gap-1">
          <span className="text-[var(--text)]">TS</span>
          <span className="text-[var(--accent)]">·</span>
          <span className="text-[var(--text)]">PORTAL</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-0.5">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "px-3.5 py-1.5 text-[13px] rounded-lg transition-colors duration-150",
                  active
                    ? "bg-[var(--accent)]/12 text-[var(--accent)] font-semibold"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-1)]"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchResolverButton />
          <TimeWindowSelector />
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
