// MoversCardGrid — meme-coin-style cards-grid for biggest movers.
//
// Per Roham 2026-05-17 20:45Z: "color coded the way a meme coin tracking
// site would show." Reference patterns: CoinGecko trending, DexScreener
// movers, Birdeye token list. Bright neon for big gains, deep red for
// losses, large % numbers, compact cards.

import Link from "next/link";
import type { PlayerMoverRow } from "@/lib/supabase/queries/player-movers";

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (Math.abs(n) >= 100) return `$${n.toFixed(0)}`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

function fmtPct(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n > 0 ? "+" : ""}${(n / 1000).toFixed(1)}K%`;
  if (abs >= 100) return `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Meme-coin tiered color scheme.
// Brightness/saturation scales with magnitude — your eye picks the big movers
// from the grid the moment the page paints.
function intensityFor(pct: number): {
  border: string;
  bg: string;
  text: string;
  glow: string;
} {
  const abs = Math.abs(pct);
  const up = pct >= 0;

  if (up) {
    if (abs >= 500) return {
      border: "border-[#5eead4]",
      bg: "bg-gradient-to-br from-[#5eead4]/30 to-[#5eead4]/5",
      text: "text-[#5eead4]",
      glow: "shadow-[0_0_20px_-4px_#5eead4]/40",
    };
    if (abs >= 100) return {
      border: "border-[#34d399]",
      bg: "bg-gradient-to-br from-[#34d399]/20 to-[#34d399]/3",
      text: "text-[#5eead4]",
      glow: "",
    };
    if (abs >= 25) return {
      border: "border-[#22c55e]/60",
      bg: "bg-gradient-to-br from-[#22c55e]/12 to-transparent",
      text: "text-[#86efac]",
      glow: "",
    };
    return {
      border: "border-[#22c55e]/30",
      bg: "bg-[var(--surface-1)]",
      text: "text-[#86efac]",
      glow: "",
    };
  } else {
    if (abs >= 70) return {
      border: "border-[#fb7185]",
      bg: "bg-gradient-to-br from-[#fb7185]/30 to-[#fb7185]/5",
      text: "text-[#fb7185]",
      glow: "shadow-[0_0_20px_-4px_#fb7185]/40",
    };
    if (abs >= 30) return {
      border: "border-[#f87171]",
      bg: "bg-gradient-to-br from-[#f87171]/20 to-[#f87171]/3",
      text: "text-[#fca5a5]",
      glow: "",
    };
    if (abs >= 10) return {
      border: "border-[#ef4444]/60",
      bg: "bg-gradient-to-br from-[#ef4444]/12 to-transparent",
      text: "text-[#fca5a5]",
      glow: "",
    };
    return {
      border: "border-[#ef4444]/30",
      bg: "bg-[var(--surface-1)]",
      text: "text-[#fca5a5]",
      glow: "",
    };
  }
}

function MoverCard({ row }: { row: PlayerMoverRow }) {
  const i = intensityFor(row.pct_change);
  return (
    <Link
      href={`/player/${row.player_id}`}
      className={`group rounded-lg border ${i.border} ${i.bg} ${i.glow} p-3 transition-all hover:scale-[1.02] hover:-translate-y-0.5 hover:border-opacity-100`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--text)] truncate">
            {row.player_name ?? row.player_id}
          </p>
          {row.team_name && (
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase truncate">
              {row.team_name}
            </p>
          )}
        </div>
      </div>
      <p className={`text-[22px] font-bold ${i.text} tabular-nums leading-none mb-1`}>
        {fmtPct(row.pct_change)}
      </p>
      <div className="flex items-baseline justify-between gap-2 text-[10px] text-[var(--text-faint)] font-mono">
        <span>
          <span className="text-[var(--text-dim)]">{fmtUSD(row.avg_recent_usd)}</span>
          <span className="opacity-60"> avg</span>
        </span>
        <span>
          {row.tx_count_recent} tx · {fmtUSD(row.volume_recent_usd)}
        </span>
      </div>
    </Link>
  );
}

export function MoversCardGrid({
  gainers,
  losers,
  window_days,
}: {
  gainers: PlayerMoverRow[];
  losers: PlayerMoverRow[];
  window_days: number;
}) {
  if (gainers.length === 0 && losers.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-[12px] text-[var(--text-dim)]">
          No movers in the last {window_days} days with ≥5 transactions in both
          recent and prior windows.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Gainers column */}
      <div>
        <p className="text-[10px] text-[#5eead4] tracking-data-label uppercase mb-2 font-mono">
          ↑ Gainers · {window_days}d
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {gainers.map((r) => (
            <MoverCard key={r.player_id} row={r} />
          ))}
        </div>
      </div>
      {/* Losers column */}
      <div>
        <p className="text-[10px] text-[#fb7185] tracking-data-label uppercase mb-2 font-mono">
          ↓ Losers · {window_days}d
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {losers.map((r) => (
            <MoverCard key={r.player_id} row={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
