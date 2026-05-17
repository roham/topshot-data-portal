"use client";

// /parallels — left filter rail + player picker.
//
// Comparable primary: Tensor parallel-aware collection page.
//   Signature moves ported:
//   · Left rail with trait-value chips per dimension (tier + parallel)
//   · Every chip click writes URL param immediately (no Apply button)
//   · Player picker as a distinct section at top of rail (TabBar-style)
//   · Clear all button when any filter active
//   · Result count badge next to active chip
//
// URL state (nuqs, shallow: false → server re-renders on change):
//   ?player=<id_or_name>  — selected player
//   ?tiers=Common,Rare    — tier multi-select (comma-separated)
//   ?parallel=0,16        — parallel_id multi-select (comma-separated)
//
// Pillar 4 §1: filter state in URL; survives page refresh.

import {
  useQueryState,
  parseAsString,
  parseAsArrayOf,
} from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

const CANONICAL_TIERS = [
  "Common",
  "Fandom",
  "Rare",
  "Legendary",
  "Ultimate",
  "Anthology",
];

const PLAYER_PICKER = [
  { label: "Stephen Curry", param: "201939" },
  { label: "LeBron James", param: "2544" },
  { label: "Brandin Podziemski", param: "Brandin Podziemski" },
  { label: "SGA", param: "1628983" },
  { label: "Cooper Flagg", param: "Cooper Flagg" },
  { label: "Wembanyama", param: "1641705" },
  { label: "Luka Doncic", param: "1629029" },
  { label: "Angel Reese", param: "Angel Reese" },
] as const;

interface ParallelsFilterRailProps {
  /** Distinct parallel types from data — for chips. */
  parallelTypes: Array<{ id: string; name: string }>;
  /** Current player param (from URL). */
  currentPlayer: string;
  /** Total visible rows after server-side filter (for count badge). */
  visibleRowCount: number;
}

export function ParallelsFilterRail({
  parallelTypes,
  currentPlayer,
  visibleRowCount,
}: ParallelsFilterRailProps) {
  const [, startTransition] = useTransition();
  const opts = {
    history: "replace" as const,
    shallow: false,
    startTransition,
  };

  const [, setPlayer] = useQueryState("player", parseAsString.withOptions(opts));
  const [tiers, setTiers] = useQueryState(
    "tiers",
    parseAsArrayOf(parseAsString)
      .withDefault([])
      .withOptions(opts),
  );
  const [parallels, setParallels] = useQueryState(
    "parallel",
    parseAsArrayOf(parseAsString)
      .withDefault([])
      .withOptions(opts),
  );

  const anyFilterActive = tiers.length > 0 || parallels.length > 0;

  function clearAll() {
    setTiers(null);
    setParallels(null);
  }

  function toggleTier(t: string) {
    const next = tiers.includes(t) ? tiers.filter((x) => x !== t) : [...tiers, t];
    setTiers(next.length === 0 ? null : next);
  }

  function toggleParallel(p: string) {
    const next = parallels.includes(p)
      ? parallels.filter((x) => x !== p)
      : [...parallels, p];
    setParallels(next.length === 0 ? null : next);
  }

  return (
    <aside
      className="w-[200px] shrink-0 space-y-2.5 text-[11px]"
      data-testid="parallels-filter-rail"
    >
      {/* ── Rail header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
          Filters
        </h2>
        {anyFilterActive && (
          <button
            onClick={clearAll}
            className="text-[10px] text-[var(--text-faint)] hover:text-[var(--accent)] underline"
            data-testid="parallels-filters-clear"
          >
            clear
          </button>
        )}
      </div>

      {/* Visible count badge */}
      <div className="text-[10px] text-[var(--text-faint)] tnum">
        {visibleRowCount.toLocaleString()} row{visibleRowCount !== 1 ? "s" : ""}
      </div>

      {/* ── Player Picker ────────────────────────────────────────────────── */}
      <FilterSection label="Player">
        <div className="space-y-1">
          {PLAYER_PICKER.map((p) => (
            <button
              key={p.param}
              onClick={() => setPlayer(p.param)}
              data-testid={`player-picker-${p.param}`}
              className={cn(
                "w-full text-left px-2 py-1 rounded text-[11px] transition-colors",
                currentPlayer === p.param
                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* ── Tier Filter ──────────────────────────────────────────────────── */}
      <FilterSection label="Tier">
        <div className="flex flex-wrap gap-1">
          {CANONICAL_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTier(t)}
              data-testid={`filter-tier-${t.toLowerCase()}`}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono border transition-colors",
                tiers.includes(t)
                  ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] text-[var(--text-dim)] hover:border-[var(--text-faint)] hover:text-[var(--text)]",
              )}
              aria-pressed={tiers.includes(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* ── Parallel Type Filter ──────────────────────────────────────────── */}
      {parallelTypes.length > 0 && (
        <FilterSection label="Parallel">
          <div className="flex flex-wrap gap-1">
            {parallelTypes.map((pt) => (
              <button
                key={pt.id}
                onClick={() => toggleParallel(pt.id)}
                data-testid={`filter-parallel-${pt.id}`}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono border transition-colors",
                  parallels.includes(pt.id)
                    ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border-subtle)] text-[var(--text-dim)] hover:border-[var(--text-faint)] hover:text-[var(--text)]",
                )}
                aria-pressed={parallels.includes(pt.id)}
              >
                {pt.name}
              </button>
            ))}
          </div>
        </FilterSection>
      )}
    </aside>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--surface-1)]/40 border border-[var(--border-subtle)] rounded p-2.5 space-y-1.5">
      <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)]">
        {label}
      </div>
      {children}
    </div>
  );
}
