"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { CohortMonthRow } from "@/lib/supabase/queries/cohort-monthly";

const COLORS = ["#2dd4bf", "#f5b14b", "#a78bfa", "#60a5fa", "#f87171", "#34d399", "#f0abfc", "#c4cad3"];

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function CohortLineChart({ rows, cohorts, mode }: { rows: CohortMonthRow[]; cohorts: string[]; mode: "indexed" | "absolute" }) {
  const months = [...new Set(rows.map((r) => r.month))].sort();
  // base value per cohort (first non-null month) for indexing
  const base: Record<string, number> = {};
  for (const c of cohorts) {
    const first = months.map((m) => rows.find((r) => r.cohort === c && r.month === m)?.cap).find((v) => v != null && v > 0);
    base[c] = first ?? 1;
  }
  const data = months.map((m) => {
    const pt: Record<string, number | string> = { month: m };
    for (const c of cohorts) {
      const v = rows.find((r) => r.cohort === c && r.month === m)?.cap;
      if (v != null) pt[c] = mode === "indexed" ? Math.round((v / base[c]) * 100) : v;
    }
    return pt;
  });
  const short = (c: string) => c.replace("Tier · ", "").replace("Scarcity · ", "");
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 10, right: 18, left: 6, bottom: 4 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} minTickGap={20} />
        <YAxis
          tickFormatter={(v) => (mode === "indexed" ? `${v}` : fmtUSD(v))}
          stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} width={mode === "indexed" ? 36 : 52}
        />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 11 }}
          formatter={(v, name) => [mode === "indexed" ? `${v} (100=start)` : fmtUSD(Number(v)), short(String(name))]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => short(String(v))} />
        {cohorts.map((c, i) => (
          <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
