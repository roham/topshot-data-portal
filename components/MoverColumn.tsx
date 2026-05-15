import Link from "next/link";
import { Card } from "./primitives/Card";
import { Num } from "./primitives/Num";
import { Sparkline } from "./primitives/Sparkline";

export interface MoverRow {
  key: string;
  href: string;
  primary: string;       // top line — usually the set or edition
  secondary: string;     // sub line — player or context
  value: number;         // current price / floor
  deltaPct?: number | null;
  volumeUsd?: number | null;
  spark?: number[];
}

interface MoverColumnProps {
  title: string;
  subtitle?: string;
  methodology?: string;
  rows: MoverRow[];
  side: "up" | "down" | "volume";
}

export function MoverColumn({ title, subtitle, methodology, rows, side }: MoverColumnProps) {
  return (
    <Card title={title} subtitle={subtitle} methodology={methodology} variant="inset">
      <div className="divide-y divide-[var(--border-subtle)]">
        {rows.length === 0 && (
          <div className="px-3 py-6 text-[11px] text-[var(--text-faint)] font-mono">
            No movers in this window yet — accumulator warming.
          </div>
        )}
        {rows.map((r) => (
          <Link
            key={r.key}
            href={r.href}
            className="px-3 py-2 flex items-center gap-3 hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[var(--text)] truncate">{r.primary}</div>
              <div className="text-[10px] text-[var(--text-faint)] truncate font-mono">{r.secondary}</div>
            </div>
            {r.spark && r.spark.length > 1 && (
              <div className="flex-shrink-0">
                <Sparkline
                  data={r.spark}
                  color={side === "up" ? "var(--up)" : side === "down" ? "var(--down)" : undefined}
                />
              </div>
            )}
            <div className="text-right shrink-0 w-[88px]">
              <div className="text-[12px]">
                <Num value={r.value} format="usdCompact" />
              </div>
              {r.deltaPct != null && (
                <div className="text-[10px]">
                  <Num value={r.deltaPct} format="deltaPct" colorize />
                </div>
              )}
              {r.volumeUsd != null && side === "volume" && (
                <div className="text-[10px] text-[var(--text-faint)] font-mono">
                  vol <Num value={r.volumeUsd} format="usdCompact" />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
