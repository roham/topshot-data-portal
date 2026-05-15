"use client";

import { useState, useMemo } from "react";
import { Num } from "./primitives/Num";
import { cn } from "@/lib/cn";

interface RollupRow {
  key: string;
  count: number;
  valueUsd: number;
}

interface PortfolioRollupProps {
  rows: import("./PortfolioBagTable").BagRow[];
}

type Dim = "player" | "set" | "tier" | "parallel" | "series";

const DIM_LABEL: Record<Dim, string> = {
  player: "By player",
  set: "By set",
  tier: "By tier",
  parallel: "By parallel",
  series: "By series",
};

function aggregate(rows: import("./PortfolioBagTable").BagRow[], dim: Dim): RollupRow[] {
  const m = new Map<string, { count: number; valueUsd: number }>();
  for (const r of rows) {
    let key: string;
    switch (dim) {
      case "player":  key = r.playerName; break;
      case "set":     key = r.setFlowName; break;
      case "tier":    key = r.tier; break;
      case "parallel": key = r.parallelID === 0 ? "Base" : `Parallel #${r.parallelID}`; break;
      case "series":  key = r.setSeries != null ? `Series ${r.setSeries}` : "Series ?"; break;
    }
    const cur = m.get(key) ?? { count: 0, valueUsd: 0 };
    cur.count++;
    if (r.lowAskUsd != null) cur.valueUsd += r.lowAskUsd;
    m.set(key, cur);
  }
  return [...m.entries()]
    .map(([key, v]) => ({ key, count: v.count, valueUsd: v.valueUsd }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

export function PortfolioRollup({ rows }: PortfolioRollupProps) {
  const [dim, setDim] = useState<Dim>("player");
  const rollup = useMemo(() => aggregate(rows, dim), [rows, dim]);
  const total = useMemo(() => rollup.reduce((s, r) => s + r.valueUsd, 0), [rollup]);
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {(Object.keys(DIM_LABEL) as Dim[]).map((d) => (
          <button
            key={d}
            onClick={() => setDim(d)}
            className={cn(
              "px-2 py-1 text-[10px] tracking-data-label rounded transition-colors",
              dim === d ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--text-dim)] hover:bg-[var(--surface-2)]",
            )}
          >
            {DIM_LABEL[d]}
          </button>
        ))}
      </div>
      <div className="divide-y divide-[var(--border-subtle)] max-h-[280px] overflow-y-auto">
        {rollup.slice(0, 50).map((r) => {
          const pct = total > 0 ? (r.valueUsd / total) * 100 : 0;
          return (
            <div key={r.key} className="grid grid-cols-[1fr_60px_80px_60px] items-baseline gap-2 py-1 px-1 text-[11px]">
              <span className="text-[var(--text)] truncate" title={r.key}>{r.key}</span>
              <span className="tnum text-[var(--text-faint)] text-right">{r.count}</span>
              <span className="tnum text-[var(--text)] text-right"><Num value={r.valueUsd} format="usdCompact" /></span>
              <span className="tnum text-[var(--text-faint)] text-right">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-[var(--text-faint)] mt-2 font-mono">
        {rollup.length} groups · {rows.length} moments · est ${Math.round(total).toLocaleString()}
      </div>
    </div>
  );
}
