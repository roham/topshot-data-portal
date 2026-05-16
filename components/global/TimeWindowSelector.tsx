"use client";

import { Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { TIME_WINDOWS, WINDOW_SPECS, useTimeWindow } from "./useTimeWindow";
import type { TimeWindow } from "./window-types";

// Wrap in Suspense to satisfy nuqs's app-router-prerender expectation
// and avoid hydration mismatch on initial paint.
export function TimeWindowSelector() {
  return (
    <Suspense fallback={<SelectorShell active="24h" onSelect={undefined} />}>
      <SelectorInner />
    </Suspense>
  );
}

function SelectorInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [active, set] = useTimeWindow();
  if (!mounted) return <SelectorShell active="24h" onSelect={undefined} />;
  return <SelectorShell active={active} onSelect={set} />;
}

function SelectorShell({
  active,
  onSelect,
}: {
  active: TimeWindow;
  onSelect: ((w: TimeWindow) => void) | undefined;
}) {
  return (
    <div
      className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded overflow-hidden"
      role="radiogroup"
      aria-label="Time window"
    >
      {TIME_WINDOWS.map((w) => {
        const isActive = w === active;
        return (
          <button
            key={w}
            role="radio"
            aria-checked={isActive}
            onClick={onSelect ? () => onSelect(w) : undefined}
            disabled={!onSelect}
            className={cn(
              "px-2 py-1 text-[10px] tracking-data-label font-mono transition-colors",
              isActive
                ? "bg-[var(--surface-3)] text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
            )}
          >
            {WINDOW_SPECS[w].label}
          </button>
        );
      })}
    </div>
  );
}
