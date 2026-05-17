"use client";

// Sets filter rail — persistent left rail for /sets.
//
// Comparable primary: Discogs releases directory (sortable + faceted).
//   Signature moves ported:
//   · Accordion sections: League (radio), Series (radio)
//   · Every filter selection writes a URL param immediately (no Apply button)
//   · Clear all button visible only when any filter is active
//   · Result count updates on each filter change (driven by server re-render)
//
// URL state: ?league=<NBA|WNBA>&series=<number>
//   — nuqs, shallow: false triggers server re-render on each change.
//   — survives page refresh (Pillar 4 §1 mandatory URL-encoded filter state).

import { useQueryState, parseAsString } from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

interface SetsFilterRailProps {
  /** Distinct series_number values from the dataset, sorted descending. */
  availableSeries: number[];
  /** Distinct normalized leagues (e.g. ["NBA", "WNBA"]). */
  availableLeagues: string[];
}

export function SetsFilterRail({
  availableSeries,
  availableLeagues,
}: SetsFilterRailProps) {
  const [, startTransition] = useTransition();
  const opts = {
    history: "replace" as const,
    shallow: false,
    startTransition,
  };

  const [league, setLeague] = useQueryState(
    "league",
    parseAsString.withOptions(opts),
  );
  const [series, setSeries] = useQueryState(
    "series",
    parseAsString.withOptions(opts),
  );

  const anyActive = !!league || !!series;

  function clearAll() {
    setLeague(null);
    setSeries(null);
  }

  return (
    <aside
      className="w-[220px] shrink-0 space-y-2.5 text-[11px]"
      data-testid="sets-filter-rail"
    >
      {/* Rail header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
          Filters
        </h2>
        {anyActive && (
          <button
            onClick={clearAll}
            className="text-[10px] text-[var(--text-faint)] hover:text-[var(--accent)] underline"
            data-testid="sets-filters-clear"
          >
            clear all
          </button>
        )}
      </div>

      {/* ── League ──────────────────────────────────────────────────────── */}
      <FilterSection label="League">
        <div className="space-y-1.5">
          <label
            className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]"
            data-testid="filter-sets-league-all"
          >
            <input
              type="radio"
              name="sets-league"
              checked={!league}
              onChange={() => setLeague(null)}
              className="accent-[var(--accent)]"
            />
            <span>All</span>
          </label>
          {(availableLeagues.length > 0 ? availableLeagues : ["NBA", "WNBA"]).map(
            (lg) => (
              <label
                key={lg}
                className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]"
                data-testid={`filter-sets-league-${lg.toLowerCase()}`}
              >
                <input
                  type="radio"
                  name="sets-league"
                  checked={league === lg}
                  onChange={() => setLeague(lg)}
                  className="accent-[var(--accent)]"
                />
                <span>{lg}</span>
              </label>
            ),
          )}
        </div>
      </FilterSection>

      {/* ── Series ──────────────────────────────────────────────────────── */}
      <FilterSection label="Series">
        <div className="max-h-[240px] overflow-y-auto space-y-1.5">
          <label
            className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]"
            data-testid="filter-sets-series-all"
          >
            <input
              type="radio"
              name="sets-series"
              checked={!series}
              onChange={() => setSeries(null)}
              className="accent-[var(--accent)]"
            />
            <span>All series</span>
          </label>
          {availableSeries.map((n) => (
            <label
              key={n}
              className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]"
              data-testid={`filter-sets-series-${n}`}
            >
              <input
                type="radio"
                name="sets-series"
                checked={series === String(n)}
                onChange={() => setSeries(String(n))}
                className="accent-[var(--accent)]"
              />
              <span>Series {n}</span>
            </label>
          ))}
        </div>
        <p
          className="mt-1.5 text-[9px] text-[var(--text-faint)] leading-tight"
          data-testid="filter-series-footnote"
        >
          source:{" "}
          <code className="font-mono">topshot.sets.series_number</code>
        </p>
      </FilterSection>
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
