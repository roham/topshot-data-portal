"use client";

// Volume surface charts. Two views from one query:
//   TopVolumeBar  — top players by traded USD volume in the window (ranked bar)
//   VolumeScatter — volume × avg price, bubble = unique moments traded
//                   (liquidity shape: cheap churn vs expensive thin markets)

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  ScatterChart, Scatter, ZAxis, CartesianGrid,
} from "recharts";
import { colorForRank } from "@/lib/chart-palette";
import type { PlayerVolumeRow } from "@/lib/supabase/queries/player-volume";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function TopVolumeBar({ rows }: { rows: PlayerVolumeRow[] }) {
  const data = rows.slice(0, 25).map((r) => ({
    name: r.player_name ?? r.player_id,
    vol: r.total_volume_usd,
    team: r.team_name ?? "",
    tx: r.tx_count,
  }));
  if (!data.length) {
    return <div className="flex h-[400px] items-center justify-center text-[12px] text-[var(--text-faint)]">No volume in this window.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={520}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, left: 4, bottom: 4 }}>
        <XAxis type="number" tickFormatter={fmtUSD} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} />
        <YAxis type="category" dataKey="name" width={130} stroke="var(--text-faint)" tick={{ fontSize: 10 }} interval={0} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", fontSize: 11, borderRadius: 8 }}
          formatter={(v, _n, item) => {
            const p = (item as unknown as { payload?: { team?: string; tx?: number } })?.payload;
            return [`${fmtUSD(Number(v))} · ${p?.tx?.toLocaleString() ?? 0} trades`, p?.team || "Volume"];
          }}
        />
        <Bar dataKey="vol" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colorForRank(i)} />)}
          <LabelList dataKey="vol" position="right" formatter={(v) => fmtUSD(Number(v))} style={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface Pt { x: number; y: number; z: number; name: string; team: string }

export function VolumeScatter({ rows }: { rows: PlayerVolumeRow[] }) {
  const data: Pt[] = rows
    .filter((r) => r.total_volume_usd > 0 && (r.median_price_usd ?? 0) > 0)
    .map((r) => ({
      x: r.total_volume_usd,
      y: r.median_price_usd as number,
      z: Math.max(1, r.tx_count),
      name: r.player_name ?? r.player_id,
      team: r.team_name ?? "",
    }));
  if (!data.length) {
    return <div className="flex h-[420px] items-center justify-center text-[12px] text-[var(--text-faint)]">No volume in this window.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={420}>
      <ScatterChart margin={{ top: 8, right: 20, bottom: 28, left: 8 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" />
        <XAxis
          type="number" dataKey="x" name="Volume" scale="log" domain={["auto", "auto"]}
          tickFormatter={fmtUSD} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          label={{ value: "Traded volume (log)", position: "insideBottom", offset: -16, style: { fill: "var(--text-faint)", fontSize: 10 } }}
        />
        <YAxis
          type="number" dataKey="y" name="Median price" scale="log" domain={["auto", "auto"]}
          tickFormatter={fmtUSD} stroke="var(--text-faint)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} width={52}
          label={{ value: "Median sale price (log)", angle: -90, position: "insideLeft", style: { fill: "var(--text-faint)", fontSize: 10, textAnchor: "middle" } }}
        />
        <ZAxis type="number" dataKey="z" range={[24, 420]} name="Trades" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--border-strong)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Pt;
            return (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2 text-[11px] font-mono">
                <div className="font-semibold text-[var(--text)]">{p.name}</div>
                {p.team && <div className="text-[var(--text-faint)]">{p.team}</div>}
                <div className="mt-1 text-[var(--text-dim)]">vol {fmtUSD(p.x)} · median {fmtUSD(p.y)} · {p.z.toLocaleString()} trades</div>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#22d3ee" fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
