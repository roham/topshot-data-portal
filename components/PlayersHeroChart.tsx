"use client";

// PlayersHeroChart — client sub-component of PlayersHero (V9 VIZ-001).
//
// Recharts requires a client boundary (uses createContext). The parent
// PlayersHero is an async Server Component that fetches getPlayersMarketCap;
// it computes the normalized series + merged dataset on the server and passes
// them in via props so this client component just renders the chart canvas.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export interface PlayersHeroSeries {
  player_id: string;
  player_name: string;
  color: string;
}

interface Props {
  series: PlayersHeroSeries[];
  // merged[i] = { day: number, [player_id]: normalizedValue }
  merged: Array<Record<string, number>>;
  height?: number;
}

export function PlayersHeroChart({ series, merged, height = 200 }: Props) {
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 6, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="var(--text-faint)"
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(d) => `d${d}`}
          />
          <YAxis
            stroke="var(--text-faint)"
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            width={36}
            tickFormatter={(v) => v.toFixed(0)}
          />
          <ReferenceLine y={100} stroke="var(--border-subtle)" strokeDasharray="2 4" />
          <Tooltip
            cursor={{
              stroke: "var(--text-faint)",
              strokeWidth: 1,
              strokeDasharray: "2 4",
            }}
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-strong)",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
            labelStyle={{
              color: "var(--text-faint)",
              fontSize: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
            itemStyle={{ padding: "1px 0" }}
            labelFormatter={(d) => `day ${d}`}
            formatter={(value, name) => {
              const s = series.find((x) => x.player_id === name);
              const label = s ? s.player_name : String(name);
              const n = typeof value === "number" ? value : Number(value);
              return [`${n.toFixed(1)}`, label];
            }}
          />
          {series.map((s) => (
            <Line
              key={s.player_id}
              type="monotone"
              dataKey={s.player_id}
              stroke={s.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{
                r: 3,
                fill: s.color,
                stroke: "var(--surface-1)",
                strokeWidth: 1.5,
              }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
