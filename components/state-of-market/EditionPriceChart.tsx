"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import type { PricePoint } from "@/lib/supabase/queries/edition-price-history";

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (Math.abs(n) >= 100) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}
function fmtDate(d: string, span: number): string {
  const dt = new Date(d + "T00:00:00Z");
  return span <= 92
    ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : dt.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function EditionPriceChart({ rows, msrp }: { rows: PricePoint[]; msrp: number | null }) {
  if (rows.length === 0) {
    return <div className="flex h-[420px] items-center justify-center text-[12px] text-[var(--text-faint)]">No sales in this window.</div>;
  }
  const data = rows.map((r) => ({ d: r.d, median: r.median, n: r.n, lo: r.lo, hi: r.hi }));
  const maxSale = Math.max(...rows.map((r) => r.hi));
  // Outlier-robust y-cap: a single high sale on a thin day shouldn't flatten the
  // whole line. Cap the axis at ~1.4× the 95th-percentile daily median (spikes clip
  // gracefully; tooltip still shows the true value).
  const sortedMed = [...rows.map((r) => r.median)].sort((a, b) => a - b);
  const p95 = sortedMed[Math.floor(sortedMed.length * 0.95)] ?? sortedMed[sortedMed.length - 1] ?? 1;
  const yCap = Math.max(p95 * 1.4, 1);
  // Only draw the MSRP line if it's within the visible range; otherwise it's a stat only.
  const showMsrpLine = msrp != null && msrp <= yCap && msrp >= 0;

  return (
    <ResponsiveContainer width="100%" height={440}>
      <ComposedChart data={data} margin={{ top: 12, right: 16, left: 6, bottom: 4 }}>
        <defs>
          <linearGradient id="medFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="d" tickFormatter={(d) => fmtDate(String(d), data.length)} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} minTickGap={32} />
        <YAxis domain={[0, yCap]} allowDataOverflow tickFormatter={(v) => fmtUSD(Number(v))} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} width={52} />
        <Tooltip
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 11 }}
          labelFormatter={(d) => new Date(String(d) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
          formatter={(v, _n, p) => {
            const pt = p?.payload as { n: number; lo: number; hi: number } | undefined;
            return [`${fmtUSD(Number(v))} median · ${pt?.n ?? 0} sales · ${fmtUSD(pt?.lo ?? 0)}–${fmtUSD(pt?.hi ?? 0)}`, "Sale"];
          }}
        />
        {showMsrpLine && (
          <ReferenceLine y={msrp!} stroke="var(--tier-legendary)" strokeDasharray="4 3" strokeWidth={1.25}
            label={{ value: `MSRP ${fmtUSD(msrp!)}`, position: "insideTopLeft", fill: "var(--tier-legendary)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
        )}
        <Area type="monotone" dataKey="median" stroke="none" fill="url(#medFill)" />
        <Line type="monotone" dataKey="median" stroke="var(--accent)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
