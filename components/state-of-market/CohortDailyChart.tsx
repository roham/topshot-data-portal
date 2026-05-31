"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { CohortDayRow } from "@/lib/supabase/queries/cohort-daily";

const COLORS = ["#2dd4bf", "#f5b14b", "#a78bfa", "#60a5fa", "#f87171", "#34d399", "#f0abfc", "#c4cad3"];

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(d: string, spanDays: number): string {
  const dt = new Date(d + "T00:00:00Z");
  // Tighter windows show day; long windows show month so ticks don't crowd.
  return spanDays <= 90
    ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : dt.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

const short = (c: string) => c.replace("Tier · ", "").replace("Scarcity · ", "");

export function CohortDailyChart({ rows, cohorts }: { rows: CohortDayRow[]; cohorts: string[] }) {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const spanDays = dates.length;

  // O(1) lookup keyed cohort|date instead of a nested find per cell.
  const byKey = new Map<string, number>();
  for (const r of rows) byKey.set(`${r.cohort}|${r.date}`, r.cap);

  const data = dates.map((d) => {
    const pt: Record<string, number | string> = { date: d };
    for (const c of cohorts) {
      const v = byKey.get(`${c}|${d}`);
      if (v != null) pt[c] = v;
    }
    return pt;
  });

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 10, right: 18, left: 6, bottom: 4 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => fmtDate(String(d), spanDays)}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={(v) => fmtUSD(Number(v))}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 11 }}
          labelFormatter={(d) => new Date(String(d) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
          formatter={(v, name) => [fmtUSD(Number(v)), short(String(name))]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => short(String(v))} />
        {cohorts.map((c, i) => (
          <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
