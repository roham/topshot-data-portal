"use client";

import { useQueryState, parseAsStringEnum } from "nuqs";
import {
  TIME_WINDOWS,
  DEFAULT_WINDOW,
  type TimeWindow,
} from "./window-types";

// Re-export server-safe pieces so client consumers can pull from one path.
export {
  TIME_WINDOWS,
  DEFAULT_WINDOW,
  WINDOW_SPECS,
  parseTimeWindow,
  windowToCadence,
} from "./window-types";
export type { TimeWindow, WindowSpec } from "./window-types";

function parserFor(def: TimeWindow) {
  // shallow: false → URL changes trigger a real navigation event so server
  // components reading searchParams re-run. Without this, the URL updates
  // but the page stays on whatever data it loaded with.
  return parseAsStringEnum<TimeWindow>([...TIME_WINDOWS])
    .withDefault(def)
    .withOptions({ shallow: false });
}

/**
 * Client-only React hook. Server components should use parseTimeWindow()
 * from `./window-types` instead.
 */
export function useTimeWindow(defaultWindow: TimeWindow = DEFAULT_WINDOW): [TimeWindow, (next: TimeWindow) => void] {
  const [value, setValue] = useQueryState("w", parserFor(defaultWindow));
  return [value, (next) => void setValue(next)];
}
