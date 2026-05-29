"use client";

import { Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { TIME_WINDOWS, WINDOW_SPECS, useTimeWindow } from "./useTimeWindow";
import { DEFAULT_WINDOW, type TimeWindow } from "./window-types";

// Wrap in Suspense to satisfy nuqs's app-router-prerender expectation
// and avoid hydration mismatch on initial paint.
export function TimeWindowSelector() {
  return (
    <Suspense fallback={<SelectorShell active={DEFAULT_WINDOW} optimistic={null} isPending={false} onSelect={undefined} />}>
      <SelectorInner />
    </Suspense>
  );
}

function SelectorInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [active, set, isPending] = useTimeWindow();
  // Optimistic target: highlight the clicked window immediately, before the
  // server round-trip commits. Cleared once the committed value catches up.
  const [optimistic, setOptimistic] = useState<TimeWindow | null>(null);
  useEffect(() => {
    if (optimistic && active === optimistic && !isPending) setOptimistic(null);
  }, [active, optimistic, isPending]);

  if (!mounted) {
    return <SelectorShell active={DEFAULT_WINDOW} optimistic={null} isPending={false} onSelect={undefined} />;
  }
  return (
    <SelectorShell
      active={active}
      optimistic={optimistic}
      isPending={isPending}
      onSelect={(w) => {
        if (w === (optimistic ?? active)) return;
        setOptimistic(w);
        set(w);
      }}
    />
  );
}

function SelectorShell({
  active,
  optimistic,
  isPending,
  onSelect,
}: {
  active: TimeWindow;
  optimistic: TimeWindow | null;
  isPending: boolean;
  onSelect: ((w: TimeWindow) => void) | undefined;
}) {
  const shown = optimistic ?? active;
  return (
    <>
      {/* instant feedback: top progress bar appears the moment a window is picked */}
      {isPending && (
        <div className="tw-progress-track" role="progressbar" aria-label="Updating market data" aria-busy="true">
          <div className="tw-progress-bar" />
        </div>
      )}
      <div
        className={cn(
          "inline-flex items-center gap-0.5 bg-[var(--surface-1)] rounded-lg p-1 transition-opacity",
          isPending && "opacity-90",
        )}
        role="radiogroup"
        aria-label="Time window"
        aria-busy={isPending}
      >
        {TIME_WINDOWS.map((w) => {
          const isActive = w === shown;
          const isLoadingTarget = isPending && w === optimistic;
          return (
            <button
              key={w}
              role="radio"
              aria-checked={isActive}
              onClick={onSelect ? () => onSelect(w) : undefined}
              disabled={!onSelect}
              className={cn(
                "px-2.5 py-1 text-[11px] tracking-data-label font-mono rounded-md transition-colors duration-150",
                isActive
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] font-semibold"
                  : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
                isLoadingTarget && "pulse-dot",
              )}
            >
              {WINDOW_SPECS[w].label}
            </button>
          );
        })}
      </div>
    </>
  );
}
