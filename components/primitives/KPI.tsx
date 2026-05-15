import { cn } from "@/lib/cn";
import { Num } from "./Num";
import type { ReactNode } from "react";

interface KPIProps {
  label: string;
  value: number | null | undefined;
  format?: "usd" | "usdCompact" | "int" | "pct";
  size?: "md" | "lg" | "xl";
  delta?: number | null;
  deltaFormat?: "delta" | "deltaPct";
  sub?: ReactNode;
  hint?: string;
  className?: string;
}

// Stripe-dashboard KPI card content: label (10px tracking-data-label),
// big number (22 / 28 / 32px mono), optional delta below colorized.
// The wrapping <Card> is the responsibility of the page; KPI is the
// content, not the container.
export function KPI({
  label,
  value,
  format = "usdCompact",
  size = "md",
  delta,
  deltaFormat = "deltaPct",
  sub,
  hint,
  className,
}: KPIProps) {
  const sizeClass =
    size === "xl" ? "text-[32px] leading-none" : size === "lg" ? "text-[28px] leading-none" : "text-[22px] leading-none";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">{label}</span>
      <span className={cn("tnum font-semibold text-[var(--text)]", sizeClass)}>
        <Num value={value} format={format} />
      </span>
      <div className="flex items-baseline gap-2 text-[11px]">
        {delta != null && (
          <Num value={delta} format={deltaFormat} colorize />
        )}
        {hint && <span className="text-[var(--text-faint)] tnum">{hint}</span>}
      </div>
      {sub && <div className="text-[11px] text-[var(--text-dim)]">{sub}</div>}
    </div>
  );
}
