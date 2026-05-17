"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PlayerMcapRow } from "@/lib/supabase/queries/market-cap-landing";

const palette = [
  "#7dd3fc", "#67e8f9", "#5eead4", "#86efac", "#bef264",
  "#fde047", "#fdba74", "#fca5a5", "#f9a8d4", "#c4b5fd",
  "#7dd3fc", "#67e8f9", "#5eead4", "#86efac", "#bef264",
  "#fde047", "#fdba74", "#fca5a5", "#f9a8d4", "#c4b5fd",
];

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function TopPlayersChart({ rows }: { rows: PlayerMcapRow[] }) {
  const data = rows.map((r) => ({
    name: r.player_name ?? r.player_id,
    mcap: r.total_market_cap_usd,
    team: r.team_name ?? "",
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={fmtUSD}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10 }}
          interval={0}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            const team = (payload as unknown as { team?: string })?.team;
            return [fmtUSD(Number(value)), team || "Market cap"];
          }}
        />
        <Bar dataKey="mcap" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
