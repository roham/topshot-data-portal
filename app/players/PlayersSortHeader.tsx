"use client";

// Click-to-sort column header for the players leaderboard.
// Drives ?sort=<column>&?dir=<asc|desc> URL state via nuqs so the server
// component re-renders with the new ordering. Signature move from the
// TradingView Screener comparable: active column text brightens + sort-caret
// shows beneath the label.

import { useQueryState, parseAsString } from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

interface PlayersSortHeaderProps {
  label: string;
  column: string;
  /** Which direction to default to on first click of an inactive column. */
  defaultDir?: "asc" | "desc";
  align?: "left" | "right";
  className?: string;
  "data-testid"?: string;
}

export function PlayersSortHeader({
  label,
  column,
  defaultDir = "desc",
  align = "right",
  className,
  "data-testid": testid,
}: PlayersSortHeaderProps) {
  const [, startTransition] = useTransition();
  const opts = {
    history: "replace" as const,
    shallow: false,
    startTransition,
  };

  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("market_cap").withOptions(opts),
  );
  const [dir, setDir] = useQueryState(
    "dir",
    parseAsString.withDefault("desc").withOptions(opts),
  );

  const isActive = sort === column;

  function onClick() {
    if (!isActive) {
      // First click on a new column — jump to defaultDir for that column.
      setSort(column);
      setDir(defaultDir);
    } else if (dir === "desc") {
      setDir("asc");
    } else {
      setDir("desc");
    }
  }

  const caret = isActive ? (dir === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] tracking-data-label uppercase hover:text-[var(--text)] transition-colors",
        isActive ? "text-[var(--text)]" : "text-[var(--text-dim)]",
        align === "right" ? "justify-end w-full" : "justify-start",
        className,
      )}
      data-testid={testid}
    >
      <span>{label}</span>
      <span
        className={cn(
          "text-[9px]",
          isActive ? "text-[var(--accent)]" : "text-transparent",
        )}
      >
        {caret}
      </span>
    </button>
  );
}
