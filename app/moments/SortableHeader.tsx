"use client";

// Click-to-sort column header. Toggles via the URL `sort` param so the server
// component re-renders with the new ordering. Display the current sort
// indicator (↑ asc, ↓ desc) when this column is the active sort.

import { useQueryState, parseAsStringEnum } from "nuqs";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

type SortKey =
  | "listing_price_asc"
  | "listing_price_desc"
  | "serial_asc"
  | "serial_desc"
  | "ts_score_desc"
  | "released_desc";

const SORT_KEYS: SortKey[] = [
  "listing_price_asc",
  "listing_price_desc",
  "serial_asc",
  "serial_desc",
  "ts_score_desc",
  "released_desc",
];

interface SortableHeaderProps {
  label: string;
  ascKey: SortKey;
  descKey: SortKey;
  className?: string;
  align?: "left" | "right";
  "data-testid"?: string;
}

export function SortableHeader({ label, ascKey, descKey, className, align = "left", "data-testid": testid }: SortableHeaderProps) {
  const [, startTransition] = useTransition();
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringEnum(SORT_KEYS).withDefault("listing_price_asc").withOptions({
      history: "replace",
      shallow: false,
      startTransition,
    }),
  );
  const isAsc = sort === ascKey;
  const isDesc = sort === descKey;
  const active = isAsc || isDesc;

  function onClick() {
    if (isAsc) {
      setSort(descKey);
    } else if (isDesc) {
      setSort(ascKey);
    } else {
      setSort(descKey); // first click on a new column → DESC (highest first)
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] tracking-data-label uppercase hover:text-[var(--text)]",
        active ? "text-[var(--text)]" : "text-[var(--text-dim)]",
        align === "right" ? "justify-end w-full" : "",
        className,
      )}
      data-testid={testid}
    >
      <span>{label}</span>
      <span className={cn("text-[9px]", active ? "text-[var(--accent)]" : "text-transparent")}>
        {isAsc ? "↑" : isDesc ? "↓" : "↕"}
      </span>
    </button>
  );
}
