"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CommandPalette } from "@/components/CommandPalette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      {children}
      <CommandPalette />
    </NuqsAdapter>
  );
}
