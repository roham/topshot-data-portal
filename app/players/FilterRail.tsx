"use client";

// Players filter rail — OTM-parity persistent left rail for /players.
//
// Comparable primary: OTM Players directory with persistent left filter rail.
//   Signature moves ported:
//   · Accordion sections: League (radio), Status/Active (3-way), Team (multi-select chips)
//   · Selected teams render as dismissable inline chips (ESPN player browser move)
//   · Clear all button visible only when any filter is active (OTM UX pattern)
//   · Team accordion cascades to show only teams relevant to selected league
//
// URL state: ?league=<NBA|WNBA>&team=<comma-separated>&active=<1|0>
//   — nuqs, shallow: false triggers server re-render on each change.
//   — survives page refresh (Pillar 4 §1 mandatory URL-encoded filter state).
//
// Pillar 5 §4 — Active derivation footnote: always visible inline so the
//   trader never has to trust-me-bro the filter logic.

import { useQueryState, parseAsString, parseAsArrayOf } from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

interface FilterRailProps {
  /** All available teams derived from current league-filtered rows (server-side cascade). */
  availableTeams: string[];
  /** All distinct leagues in the dataset (e.g. ["NBA", "WNBA"]). */
  availableLeagues: string[];
}

export function PlayersFilterRail({
  availableTeams,
  availableLeagues,
}: FilterRailProps) {
  const [, startTransition] = useTransition();
  const opts = { history: "replace" as const, shallow: false, startTransition };

  const [league, setLeague] = useQueryState(
    "league",
    parseAsString.withOptions(opts),
  );
  const [teams, setTeams] = useQueryState(
    "team",
    parseAsArrayOf(parseAsString).withOptions(opts),
  );
  const [active, setActive] = useQueryState(
    "active",
    parseAsString.withOptions(opts),
  );

  const selectedTeams = teams ?? [];
  const anyActive = !!league || selectedTeams.length > 0 || active != null;

  function clearAll() {
    setLeague(null);
    setTeams(null);
    setActive(null);
  }

  function toggleTeam(team: string) {
    const next = selectedTeams.includes(team)
      ? selectedTeams.filter((t) => t !== team)
      : [...selectedTeams, team];
    setTeams(next.length === 0 ? null : next);
  }

  function onLeague(val: string | null) {
    setLeague(val);
    // Cascade: clear team selections that no longer exist in the new league's team list
    // (the server will re-derive availableTeams, but clear stale selections now)
    if (selectedTeams.length > 0) {
      setTeams(null);
    }
  }

  function onStatus(val: "1" | "0" | null) {
    setActive(val);
  }

  return (
    <aside
      className="w-[220px] shrink-0 space-y-2.5 text-[11px]"
      data-testid="players-filter-rail"
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
            data-testid="players-filters-clear"
          >
            clear all
          </button>
        )}
      </div>

      {/* ── League ──────────────────────────────────────────────────────── */}
      <FilterSection label="League">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]">
            <input
              type="radio"
              name="players-league"
              checked={!league}
              onChange={() => onLeague(null)}
              className="accent-[var(--accent)]"
              data-testid="filter-players-league-all"
            />
            <span>All</span>
          </label>
          {(availableLeagues.length > 0 ? availableLeagues : ["NBA", "WNBA"]).map(
            (lg) => (
              <label
                key={lg}
                className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]"
              >
                <input
                  type="radio"
                  name="players-league"
                  checked={league === lg}
                  onChange={() => onLeague(lg)}
                  className="accent-[var(--accent)]"
                  data-testid={`filter-players-league-${lg.toLowerCase()}`}
                />
                <span>{lg}</span>
              </label>
            ),
          )}
        </div>
      </FilterSection>

      {/* ── Status (Active / Retired) ────────────────────────────────────── */}
      <FilterSection label="Status">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]">
            <input
              type="radio"
              name="players-status"
              checked={active == null}
              onChange={() => onStatus(null)}
              className="accent-[var(--accent)]"
              data-testid="filter-players-status-all"
            />
            <span>All</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]">
            <input
              type="radio"
              name="players-status"
              checked={active === "1"}
              onChange={() => onStatus("1")}
              className="accent-[var(--accent)]"
              data-testid="filter-players-active"
            />
            <span>Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]">
            <input
              type="radio"
              name="players-status"
              checked={active === "0"}
              onChange={() => onStatus("0")}
              className="accent-[var(--accent)]"
              data-testid="filter-players-retired"
            />
            <span>Retired</span>
          </label>
        </div>
        {/* Derivation footnote — always visible per Pillar 5 §4 honest-absence */}
        <p
          className="mt-1.5 text-[9px] text-[var(--text-faint)] leading-tight"
          data-testid="filter-active-footnote"
        >
          Active = played since 2025-10-01 per{" "}
          <code className="font-mono">topshot.players.date_of_last_play</code>
        </p>
      </FilterSection>

      {/* ── Team ────────────────────────────────────────────────────────── */}
      <FilterSection label="Team">
        {/* Selected teams as dismissable chips (ESPN signature move) */}
        {selectedTeams.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {selectedTeams.map((t) => (
              <button
                key={t}
                onClick={() => toggleTeam(t)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--accent)]/20 border border-[var(--accent)]/40 rounded text-[9px] text-[var(--accent)] hover:bg-[var(--accent)]/30"
                data-testid={`players-team-chip-selected`}
              >
                <span className="truncate max-w-[140px]">{t}</span>
                <span className="text-[9px] opacity-70">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Available team list — not-yet-selected only (de-clutter) */}
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {availableTeams.length === 0 ? (
            <p className="text-[9px] text-[var(--text-faint)]">
              No teams available
            </p>
          ) : (
            availableTeams
              .filter((t) => !selectedTeams.includes(t))
              .map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTeam(t)}
                  className={cn(
                    "w-full text-left px-1.5 py-1 rounded text-[10px] truncate",
                    "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-1)] transition-colors",
                  )}
                  data-testid={`players-team-chip`}
                >
                  {t}
                </button>
              ))
          )}
        </div>
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
