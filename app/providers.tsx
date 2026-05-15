"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CommandPalette } from "@/components/CommandPalette";

// V2 STAGE-2: client providers boundary. NuqsAdapter scopes URL-encoded
// filter state to the Next app router. CommandPalette mounts the global
// `/` and Cmd-K function-code bar (cmdk).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      {children}
      <CommandPalette />
    </NuqsAdapter>
  );
}
