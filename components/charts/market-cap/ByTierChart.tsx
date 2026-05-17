"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { TierMcapRow } from "@/lib/supabase/queries/market-cap-landing";
import { colorForTier } from "@/lib/chart-palette";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function ByTierChart({ rows }: { rows: TierMcapRow[] }) {
  const data = rows.map((r) => ({
    tier: r.tier_name,
    mcap: r.total_mcap,
    editions: r.edition_count,
    color: colorForTier(r.tier_name),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: 4, bottom: 4 }}>
        <XAxis
          dataKey="tier"
          stroke="var(--text-faint)"
          tick={{ fontSize: 11 }}
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
        <Bar dataKey="mcap" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
          <LabelList
            dataKey="mcap"
            position="top"
            formatter={(v) => fmtUSD(Number(v))}
            style={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
