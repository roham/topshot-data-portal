import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  title,
  subtitle,
  right,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden",
        className
      )}
    >
      {(title || right) && (
        <header className="flex items-baseline justify-between px-4 py-2 border-b border-[var(--border)]">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}
