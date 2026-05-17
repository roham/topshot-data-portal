"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Label,
} from "recharts";
import type { ConcentrationRow } from "@/lib/supabase/queries/market-cap-landing";

export function ConcentrationChart({ rows }: { rows: ConcentrationRow[] }) {
  const data = rows.map((r) => ({
    top_n: r.top_n,
    share: r.share_pct,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">
          Insufficient data for concentration curve.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 14, right: 20, left: 4, bottom: 4 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="top_n"
          type="number"
          scale="log"
          domain={[10, 1000]}
          ticks={[10, 25, 50, 100, 250, 500, 1000]}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          <Label
            value="Top N players"
            position="insideBottom"
            offset={-2}
            style={{ fill: "var(--text-faint)", fontSize: 10 }}
          />
        </XAxis>
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          <Label
            value="Share of total mcap"
            angle={-90}
            position="insideLeft"
            offset={10}
            style={{ fill: "var(--text-faint)", fontSize: 10 }}
          />
        </YAxis>
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "Share"]}
          labelFormatter={(label) => `Top ${label} players`}
        />
        <ReferenceLine y={50} stroke="var(--accent)" strokeDasharray="3 3" strokeOpacity={0.6}>
          <Label value="50% share" position="insideRight" style={{ fill: "var(--accent)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
        </ReferenceLine>
        <ReferenceLine y={80} stroke="var(--text-dim)" strokeDasharray="3 3" strokeOpacity={0.4}>
          <Label value="80% share" position="insideRight" style={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
        </ReferenceLine>
        <Line
          type="monotone"
          dataKey="share"
          stroke="#fcd34d"
          strokeWidth={2}
          dot={{ r: 4, fill: "#fcd34d" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
