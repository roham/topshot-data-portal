"use client";

// Shared time-window transition state. The TimeWindowSelector (in TopNav) and
// the page content live in separate subtrees, so a plain useTransition in the
// selector can't tell the charts "we're updating". This context lifts ONE
// transition to a common ancestor (wrapped in app/layout) so:
//   - the selector runs the URL nav through `startTransition` (→ isPending)
//   - the page's <WindowPendingVeil> reads `isPending` to dim + shimmer the
//     whole graph area on every toggle — fast or slow — which is the
//     "clearly the page is changing" cue. (Suspense skeletons still show on
//     genuinely slow/uncached loads; this guarantees the cue even when the
//     swap is fast enough that React keeps the old content.)

import { createContext, useContext, useTransition, type ReactNode, type TransitionStartFunction } from "react";

interface WindowTransitionCtx {
  isPending: boolean;
  startTransition: TransitionStartFunction;
}

const Ctx = createContext<WindowTransitionCtx>({
  isPending: false,
  startTransition: (fn: () => void) => fn(),
});

export function WindowTransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return <Ctx.Provider value={{ isPending, startTransition }}>{children}</Ctx.Provider>;
}

export function useWindowTransition() {
  return useContext(Ctx);
}
