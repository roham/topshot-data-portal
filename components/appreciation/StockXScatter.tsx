"use client";

// StockXScatter — every individual cleared sale as a dot, over time, with a
// smoothed trend line through them (StockX / Card-Ladder house style). Dots
// fade with age so the recent market reads loudest; the trend line is a rolling
// median. Tooltip names the exact sale (date, price, serial).

import {
  ComposedChart,
  Scatter,
  Line,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import type { SaleDot } from "@/lib/supabase/queries/trending-scatter";

const TEAL = "#5eead4";

function fmtUsd(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(v)}`;
}
function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
function fmtFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Pt { t: number; price: number; serial: number | null; type: string | null; trend?: number }

function rollingMedian(points: Pt[], window = 7): (number | undefined)[] {
  return points.map((_, i) => {
    const lo = Math.max(0, i - Math.floor(window / 2));
    const hi = Math.min(points.length, i + Math.ceil(window / 2));
    const slice = points.slice(lo, hi).map((p) => p.price).sort((a, b) => a - b);
    if (!slice.length) return undefined;
    const m = Math.floor(slice.length / 2);
    return slice.length % 2 ? slice[m] : (slice[m - 1] + slice[m]) / 2;
  });
}

interface TipProps { active?: boolean; payload?: Array<{ payload?: Pt }> }
function Tip({ active, payload }: TipProps) {
  const p = payload?.find((x) => x.payload)?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono text-[11px]">
      <div className="text-[10px] text-[var(--text-faint)]">{fmtFullDate(p.t)}</div>
      <div className="font-semibold tabular-nums text-[var(--text)]">${p.price.toLocaleString("en-US")}</div>
      {p.serial != null && <div className="text-[9px] text-[var(--text-faint)]">#{p.serial}{p.type ? ` · ${p.type}` : ""}</div>}
    </div>
  );
}

export function StockXScatter({ sales, height = 220 }: { sales: SaleDot[]; height?: number }) {
  const { data, now } = useMemo(() => {
    const pts: Pt[] = sales
      .map((s) => ({ t: s.t, price: s.price, serial: s.serial, type: s.type }))
      .sort((a, b) => a.t - b.t);
    const trend = rollingMedian(pts, Math.max(5, Math.round(pts.length / 12)));
    pts.forEach((p, i) => (p.trend = trend[i]));
    return { data: pts, now: Date.now() };
  }, [sales]);

  if (data.length < 2) {
    return <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-dim)]">Not enough sales to plot.</div>;
  }

  const oldest = data[0].t;
  const span = Math.max(1, now - oldest);
  // age-based opacity: recent sales bright, old sales faint
  const dotOpacity = (t: number) => 0.25 + 0.6 * ((t - oldest) / span);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 10, left: 2, bottom: 2 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time"
          tickFormatter={fmtDate} stroke="var(--text-faint)" tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} minTickGap={40}
        />
        <YAxis
          dataKey="price" tickFormatter={fmtUsd} stroke="var(--text-faint)"
          tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} width={40} domain={["auto", "auto"]}
        />
        <ZAxis range={[18, 18]} />
        <Tooltip content={<Tip />} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "2 3" }} />
        <Scatter dataKey="price" isAnimationActive={false}>
          {data.map((p, i) => (
            <Cell key={i} fill={TEAL} fillOpacity={dotOpacity(p.t)} />
          ))}
        </Scatter>
        <Line dataKey="trend" stroke={TEAL} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
