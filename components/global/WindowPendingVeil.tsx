"use client";

// Wraps the data-bearing region of a window-driven page. While a window change
// is in flight (shared transition pending), it dims the content and sweeps a
// shimmer across it — so every toggle clearly reads as "the graphs are
// updating," even when the swap is fast enough that React keeps the old charts
// mounted. Children are server-rendered charts; this only adds the overlay.

import type { ReactNode } from "react";
import { useWindowTransition } from "./WindowTransition";

export function WindowPendingVeil({ children }: { children: ReactNode }) {
  const { isPending } = useWindowTransition();
  return (
    <div className="relative" aria-busy={isPending}>
      <div
        className={
          isPending
            ? "opacity-45 blur-[0.5px] transition-[opacity,filter] duration-200"
            : "transition-[opacity,filter] duration-200"
        }
      >
        {children}
      </div>
      {isPending && (
        <div className="absolute inset-0 z-10 pointer-events-none window-veil-shimmer" aria-hidden="true" />
      )}
    </div>
  );
}
