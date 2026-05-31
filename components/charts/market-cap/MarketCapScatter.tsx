"use client";

// Market-cap × circulation bubble scatter — "the shape of the player economy."
// x = floor market cap (log), y = moments in circulation (log), bubble = edition
// count, color = 30D market-cap move (green up / red down / slate flat·unknown).
// Reveals the structure a ranked bar can't: scarce high-cap players (top-left)
// vs abundant low-cap supply (bottom-right), and who's moving. Missing viz kind
// (scatter) per the Pillar-1 vocabulary; doctrine P9 "market cap vs distribution".

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export interface ScatterPlayer {
  player_name: string | null;
  player_id: string;
  team_name: string | null;
  market_cap_usd: number;
  total_in_circulation: number;
  edition_count: number;
  delta_pct_30d: number | null;
}

const UP = "#34d399";
const DOWN = "#f87171";
const FLAT = "#64748b";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function colorForDelta(d: number | null): string {
  if (d == null) return FLAT;
  if (d > 1) return UP;
  if (d < -1) return DOWN;
  return FLAT;
}

interface Pt {
  x: number;
  y: number;
  z: number;
  name: string;
  team: string;
  delta: number | null;
}

export function MarketCapScatter({ rows }: { rows: ScatterPlayer[] }) {
  const data: Pt[] = rows
    .filter((r) => r.market_cap_usd > 0 && r.total_in_circulation > 0)
    .map((r) => ({
      x: r.market_cap_usd,
      y: r.total_in_circulation,
      z: Math.max(1, r.edition_count),
      name: r.player_name ?? r.player_id,
      team: r.team_name ?? "",
      delta: r.delta_pct_30d,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center text-[12px] text-[var(--text-faint)]">
        No player market-cap data.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ScatterChart margin={{ top: 8, right: 20, bottom: 28, left: 8 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" />
        <XAxis
          type="number"
          dataKey="x"
          name="Market cap"
          scale="log"
          domain={["auto", "auto"]}
          tickFormatter={fmtUSD}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          label={{
            value: "Floor market cap (log)",
            position: "insideBottom",
            offset: -16,
            style: { fill: "var(--text-faint)", fontSize: 10 },
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Circulation"
          scale="log"
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
          stroke="var(--text-faint)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          width={48}
          label={{
            value: "Moments in circulation (log)",
            angle: -90,
            position: "insideLeft",
            style: { fill: "var(--text-faint)", fontSize: 10, textAnchor: "middle" },
          }}
        />
        <ZAxis type="number" dataKey="z" range={[24, 420]} name="Editions" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--border-strong)" }}
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
            borderRadius: 8,
          }}
          formatter={(value, name) => {
            if (name === "Market cap") return [fmtUSD(Number(value)), name];
            if (name === "Circulation") return [Number(value).toLocaleString(), name];
            if (name === "Editions") return [Number(value).toLocaleString(), name];
            return [String(value), name];
          }}
          labelFormatter={() => ""}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Pt;
            return (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2 text-[11px] font-mono">
                <div className="font-semibold text-[var(--text)]">{p.name}</div>
                {p.team && <div className="text-[var(--text-faint)]">{p.team}</div>}
                <div className="mt-1 text-[var(--text-dim)]">
                  cap {fmtUSD(p.x)} · circ {p.y.toLocaleString()} · {p.z} editions
                </div>
                {p.delta != null && (
                  <div style={{ color: colorForDelta(p.delta) }}>
                    {p.delta >= 0 ? "+" : ""}
                    {p.delta.toFixed(1)}% · 30D
                  </div>
                )}
              </div>
            );
          }}
        />
        <Scatter data={data} fillOpacity={0.72}>
          {data.map((p, i) => (
            <Cell key={i} fill={colorForDelta(p.delta)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
