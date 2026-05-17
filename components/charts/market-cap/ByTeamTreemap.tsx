"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TeamMcapRow } from "@/lib/supabase/queries/market-cap-landing";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Generate a deterministic color per team via a hash → HSL
function teamColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

interface TreemapNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  team_name?: string;
  mcap?: number;
  color?: string;
}

function CustomTreemapContent(p: TreemapNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, team_name = "", mcap = 0, color = "#475569" } = p;
  if (width < 30 || height < 24) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={color} stroke="var(--surface-0)" strokeWidth={1} fillOpacity={0.85} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="var(--surface-0)" strokeWidth={1} fillOpacity={0.9} />
      <text
        x={x + 6}
        y={y + 14}
        fontSize={10}
        fill="rgba(0,0,0,0.85)"
        fontWeight={600}
      >
        {team_name.length > 16 ? team_name.slice(0, 14) + "…" : team_name}
      </text>
      {width > 60 && height > 40 && (
        <text
          x={x + 6}
          y={y + 28}
          fontSize={10}
          fill="rgba(0,0,0,0.7)"
          fontFamily="var(--font-mono)"
        >
          {fmtUSD(mcap)}
        </text>
      )}
    </g>
  );
}

export function ByTeamTreemap({ rows }: { rows: TeamMcapRow[] }) {
  const data = rows.slice(0, 30).map((r) => ({
    name: r.team_name,
    team_name: r.team_name,
    size: r.total_mcap,
    mcap: r.total_mcap,
    player_count: r.player_count,
    color: teamColor(r.team_name),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        aspectRatio={4 / 3}
        stroke="var(--surface-0)"
        content={<CustomTreemapContent />}
      >
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            fontSize: 11,
          }}
          formatter={(value, _name, _item, _idx, payload) => {
            const pc = (payload as unknown as { player_count?: number })?.player_count;
            return [fmtUSD(Number(value)), `${pc ?? "?"} players`];
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
