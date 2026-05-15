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
  return parseAsStringEnum<TimeWindow>([...TIME_WINDOWS]).withDefault(def);
}

/**
 * Client-only React hook. Server components should use parseTimeWindow()
 * from `./window-types` instead.
 */
export function useTimeWindow(defaultWindow: TimeWindow = DEFAULT_WINDOW): [TimeWindow, (next: TimeWindow) => void] {
  const [value, setValue] = useQueryState("w", parserFor(defaultWindow));
  return [value, (next) => void setValue(next)];
}
