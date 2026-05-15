import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  methodology?: string;
  children: ReactNode;
  variant?: "default" | "inset" | "dense";
  className?: string;
}

// Section card. Surface-1 bg, subtle 1px border, 6px radius, 12px padding.
// Has an optional section header (uppercase mono, tracking 0.06em), optional
// right slot, and an optional methodology caption at the bottom (the honest-
// disclosure footer for any chart card).
export function Card({ title, subtitle, right, methodology, children, variant = "default", className }: CardProps) {
  const padding =
    variant === "inset" ? "p-0" : variant === "dense" ? "p-2" : "p-3";
  return (
    <section
      className={cn(
        "bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md",
        padding,
        className
      )}
    >
      {(title || right || subtitle) && (
        <header className={cn("flex items-baseline gap-3 mb-2", variant === "inset" && "px-3 pt-3")}>
          {title && (
            <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)]">{title}</h2>
          )}
          {subtitle && (
            <span className="text-[11px] text-[var(--text-faint)] tnum">{subtitle}</span>
          )}
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      <div className={variant === "inset" ? "" : ""}>{children}</div>
      {methodology && (
        <p className={cn("text-[10px] text-[var(--text-faint)] mt-2 leading-snug", variant === "inset" && "px-3 pb-3")}>
          {methodology}
        </p>
      )}
    </section>
  );
}
