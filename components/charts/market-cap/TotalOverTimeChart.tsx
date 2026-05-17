"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import type { McapOverTimeRow } from "@/lib/supabase/queries/market-cap-landing";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(d: string): string {
  // Compact MM-DD
  return d.slice(5);
}

export function TotalOverTimeChart({ rows }: { rows: McapOverTimeRow[] }) {
  const data = rows.map((r) => ({
    date: fmtDate(r.date),
    mcap: r.total_mcap,
    editions: r.edition_count,
  }));

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-[12px] text-[var(--text-dim)]">
            Only {data.length} day of mcap data available.
          </p>
          <p className="text-[10px] text-[var(--text-faint)] mt-2">
            ETL began accumulating snapshots on 2026-05-13. Time-series view
            populates after more daily snapshots accrue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="mcapGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5eead4" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#5eead4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          tickFormatter={fmtUSD}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            const eds = (payload as unknown as { editions?: number })?.editions;
            return [fmtUSD(Number(value)), eds != null ? `${eds} editions` : "Market cap"];
          }}
        />
        <Area
          type="monotone"
          dataKey="mcap"
          stroke="#14b8a6"
          strokeWidth={2}
          fill="url(#mcapGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
