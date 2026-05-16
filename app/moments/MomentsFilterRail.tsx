"use client";

// Client-side filter rail for /moments — OTM-shape persistent left rail.
// Drives URL state via nuqs so the server component re-fetches on change.
// No internal data fetching here; the page's server component is the source
// of truth.

import { useQueryState, parseAsBoolean, parseAsInteger, parseAsString, parseAsArrayOf } from "nuqs";
import { useTransition, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";

const TIERS_DEFAULT = ["Common", "Fandom", "Rare", "Legendary", "Ultimate"];
const LEAGUES = ["All", "NBA", "WNBA"] as const;

export function MomentsFilterRail({
  tierOptions = TIERS_DEFAULT,
  topPlayers = [],
}: {
  tierOptions?: string[];
  topPlayers?: string[];
}) {
  const [, startTransition] = useTransition();

  const [player, setPlayer] = useQueryState("player", parseAsString.withDefault("").withOptions({ history: "replace", shallow: false, startTransition }));
  const [tiers, setTiers] = useQueryState("tiers", parseAsArrayOf(parseAsString).withDefault([]).withOptions({ history: "replace", shallow: false, startTransition }));
  const [league, setLeague] = useQueryState("league", parseAsString.withDefault("All").withOptions({ history: "replace", shallow: false, startTransition }));
  const [listedOnly, setListedOnly] = useQueryState("listed", parseAsBoolean.withDefault(true).withOptions({ history: "replace", shallow: false, startTransition }));
  const [maxPrice, setMaxPrice] = useQueryState("maxPrice", parseAsInteger.withOptions({ history: "replace", shallow: false, startTransition }));
  const [maxSerial, setMaxSerial] = useQueryState("maxSerial", parseAsInteger.withOptions({ history: "replace", shallow: false, startTransition }));
  const [setName, setSetName] = useQueryState("set", parseAsString.withDefault("").withOptions({ history: "replace", shallow: false, startTransition }));
  // Reset page when any filter changes so the user doesn't stick on page 17 with new filters.
  const [, setPage] = useQueryState("page", parseAsInteger.withOptions({ history: "replace", shallow: false, startTransition }));

  function clearAll() {
    setPlayer(null);
    setTiers(null);
    setLeague(null);
    setListedOnly(null);
    setMaxPrice(null);
    setMaxSerial(null);
    setSetName(null);
    setPage(null);
  }

  function toggleTier(t: string) {
    const next = tiers.includes(t) ? tiers.filter((x) => x !== t) : [...tiers, t];
    setTiers(next.length === 0 ? null : next);
    setPage(null);
  }

  function onPlayerInput(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setPlayer(v || null);
    setPage(null);
  }

  function onSetInput(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSetName(v || null);
    setPage(null);
  }

  function onMaxPrice(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setMaxPrice(v ? Number(v) : null);
    setPage(null);
  }

  function onMaxSerial(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setMaxSerial(v ? Number(v) : null);
    setPage(null);
  }

  function onLeague(v: string) {
    setLeague(v === "All" ? null : v);
    setPage(null);
  }

  function onListedToggle(e: ChangeEvent<HTMLInputElement>) {
    setListedOnly(e.target.checked ? null : false); // default-true; null cleans URL
    setPage(null);
  }

  const anyActive =
    !!player || tiers.length > 0 || (league && league !== "All") ||
    listedOnly === false || maxPrice != null || maxSerial != null || !!setName;

  return (
    <aside className="w-[220px] shrink-0 space-y-3 text-[11px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">Filters</h2>
        {anyActive && (
          <button
            onClick={clearAll}
            className="text-[10px] text-[var(--text-faint)] hover:text-[var(--accent)] underline"
            data-testid="filters-clear"
          >
            clear all
          </button>
        )}
      </div>

      <FilterGroup label="Player">
        <input
          list="moments-player-list"
          value={player}
          onChange={onPlayerInput}
          placeholder="e.g. Wembanyama"
          className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[11px] font-mono focus:border-[var(--border-strong)] outline-none"
          data-testid="filter-player"
        />
        {topPlayers.length > 0 && (
          <datalist id="moments-player-list">
            {topPlayers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        )}
      </FilterGroup>

      <FilterGroup label="Tier">
        <div className="space-y-1">
          {tierOptions.map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer hover:text-[var(--text)]">
              <input
                type="checkbox"
                checked={tiers.includes(t)}
                onChange={() => toggleTier(t)}
                className="accent-[var(--accent)]"
                data-testid={`filter-tier-${t.toLowerCase()}`}
              />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="League">
        <div className="flex gap-3">
          {LEAGUES.map((l) => (
            <label key={l} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="league"
                value={l}
                checked={(l === "All" && (!league || league === "All")) || league === l}
                onChange={() => onLeague(l)}
                className="accent-[var(--accent)]"
                data-testid={`filter-league-${l.toLowerCase()}`}
              />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Price">
        <label className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-dim)]">Max $</span>
          <input
            type="number"
            min={0}
            step={1}
            value={maxPrice ?? ""}
            onChange={onMaxPrice}
            placeholder="∞"
            className="w-[80px] bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[11px] font-mono text-right focus:border-[var(--border-strong)] outline-none"
            data-testid="filter-max-price"
          />
        </label>
      </FilterGroup>

      <FilterGroup label="Serial">
        <label className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-dim)]">Max #</span>
          <input
            type="number"
            min={1}
            step={1}
            value={maxSerial ?? ""}
            onChange={onMaxSerial}
            placeholder="∞"
            className="w-[80px] bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[11px] font-mono text-right focus:border-[var(--border-strong)] outline-none"
            data-testid="filter-max-serial"
          />
        </label>
        <p className="text-[10px] text-[var(--text-faint)] mt-1">low-serial sniping</p>
      </FilterGroup>

      <FilterGroup label="Set">
        <input
          value={setName}
          onChange={onSetInput}
          placeholder="e.g. Base Set"
          className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[11px] font-mono focus:border-[var(--border-strong)] outline-none"
          data-testid="filter-set"
        />
      </FilterGroup>

      <FilterGroup label="Listed">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={listedOnly !== false}
            onChange={onListedToggle}
            className="accent-[var(--accent)]"
            data-testid="filter-listed-only"
          />
          <span>Listed only</span>
        </label>
        <p className="text-[10px] text-[var(--text-faint)] mt-1">listing_price_usd ≠ ∅</p>
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-1)]/40 border border-[var(--border-subtle)] rounded p-2.5 space-y-1.5">
      <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)]">{label}</div>
      {children}
    </div>
  );
}
