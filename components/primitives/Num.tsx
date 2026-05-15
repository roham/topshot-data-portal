// Tabular number cell. Single purpose: render a number in the right format,
// right-aligned by default, with sign + color when explicitly delta.
import { cn } from "@/lib/cn";

export type NumFormat = "usd" | "usdCompact" | "pct" | "int" | "delta" | "deltaPct";

interface NumProps {
  value: number | null | undefined;
  format?: NumFormat;
  colorize?: boolean;
  className?: string;
  precision?: number;
}

function fmtUsd(v: number, precision: number = 2): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(precision)}M`;
  if (Math.abs(v) >= 10_000) return `$${(v / 1000).toFixed(precision === 2 ? 1 : precision)}K`;
  if (Math.abs(v) >= 100) return `$${v.toFixed(0)}`;
  if (Math.abs(v) >= 10) return `$${v.toFixed(precision === 2 ? 1 : precision)}`;
  return `$${v.toFixed(precision)}`;
}

function fmtUsdCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("en-US");
}

function fmtPct(v: number, precision: number = 1): string {
  return `${v.toFixed(precision)}%`;
}

export function Num({ value, format = "int", colorize = false, className, precision }: NumProps) {
  if (value == null || !isFinite(value)) {
    return <span className={cn("tnum text-[var(--text-faint)]", className)}>—</span>;
  }
  let body: string;
  let color = "";
  switch (format) {
    case "usd":
      body = fmtUsd(value, precision ?? 2);
      break;
    case "usdCompact":
      body = fmtUsdCompact(value);
      break;
    case "int":
      body = fmtInt(value);
      break;
    case "pct":
      body = fmtPct(value, precision ?? 1);
      break;
    case "delta":
      body = `${value >= 0 ? "+" : ""}${fmtUsd(Math.abs(value), precision ?? 2).replace("$", "$")}`;
      body = value >= 0 ? `+${fmtUsd(value, precision ?? 2)}` : `−${fmtUsd(Math.abs(value), precision ?? 2)}`;
      if (colorize) color = value >= 0 ? "text-[var(--up)]" : "text-[var(--down)]";
      break;
    case "deltaPct":
      body = value >= 0 ? `+${fmtPct(value, precision ?? 2)}` : `−${fmtPct(Math.abs(value), precision ?? 2)}`;
      if (colorize) color = value >= 0 ? "text-[var(--up)]" : "text-[var(--down)]";
      break;
  }
  return <span className={cn("tnum", color, className)}>{body}</span>;
}
