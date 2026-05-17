// NewDropTag — positive framing for editions with circulation > 0 but zero listings.
//
// Per Pillar 5 §2: "honest absence over fabricated presence" — but when an
// edition EXISTS and has never been listed, the frame is opportunity, not absence.
// Per features.json empty-rows-positive-framing: "make it visually positive don't
// hide, emphasize the exciting part if it exists" (Roham 2026-05-17 17:10Z).
//
// Usage: render instead of the low_ask cell when circulation > 0 AND listings === 0.

import { cn } from "@/lib/cn";

interface NewDropTagProps {
  className?: string;
}

export function NewDropTag({ className }: NewDropTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-data-label",
        "bg-[rgba(0,200,100,0.12)] text-[var(--up)] border border-[rgba(0,200,100,0.25)]",
        className,
      )}
      title="Circulation > 0 — be the first to list"
    >
      🆕 BE FIRST
    </span>
  );
}
