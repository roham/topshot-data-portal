// The Market Map — the signature centerpiece.
// Every tile a player: sized by market cap, colored by 30-day move.
// Real data from mv_player_market_cap; delta is honest-null when the 30d-prior
// snapshot is absent (renders neutral, never fabricated green/red).

import Link from "next/link";
import type { PlayerMarketCapRow } from "@/lib/supabase/queries/players-marketcap";
import { Num } from "@/components/primitives/Num";

const MAX_TILES = 40;

// Size buckets (flex-basis px) by cap rank within the visible set.
function basisFor(capRatio: number): number {
  // capRatio in [0,1] relative to the largest visible cap. sqrt keeps small
  // players legible without letting the leader dominate the whole row.
  const min = 104;
  const max = 250;
  return Math.round(min + (max - min) * Math.sqrt(capRatio));
}

// Tint: green for gainers, red for losers, intensity by |delta|. Null = neutral.
function tileStyle(delta: number | null, capRatio: number): React.CSSProperties {
  const basis = basisFor(capRatio);
  const base: React.CSSProperties = {
    flex: `1 1 ${basis}px`,
    maxWidth: `${Math.round(basis * 1.5)}px`,
  };
  if (delta == null) {
    return {
      ...base,
      background: "var(--surface-1)",
      border: "1px solid var(--border-subtle)",
    };
  }
  const mag = Math.min(Math.abs(delta) / 15, 1); // saturate at ±15%
  const alphaBg = (0.05 + mag * 0.13).toFixed(3);
  const alphaBd = (0.2 + mag * 0.18).toFixed(3);
  const rgb = delta >= 0 ? "52,211,153" : "248,113,113";
  return {
    ...base,
    background: `rgba(${rgb},${alphaBg})`,
    border: `1px solid rgba(${rgb},${alphaBd})`,
  };
}

export function MarketMap({ rows }: { rows: PlayerMarketCapRow[] }) {
  const visible = rows.filter((r) => r.market_cap_usd > 0).slice(0, MAX_TILES);
  if (visible.length === 0) {
    return (
      <p className="py-10 text-center text-[12px] text-[var(--text-dim)]">
        No player market caps available.
      </p>
    );
  }
  const maxCap = visible[0]?.market_cap_usd ?? 1;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((r) => {
        const capRatio = r.market_cap_usd / maxCap;
        const isRookie = r.last_play_date == null && r.league === "NBA";
        return (
          <Link
            key={r.player_id}
            href={`/player/${r.player_id}`}
            style={tileStyle(r.delta_pct_30d, capRatio)}
            className="flex min-h-[92px] flex-col justify-between overflow-hidden rounded-lg px-[13px] py-3 transition-transform hover:-translate-y-0.5"
          >
            <div>
              <div className="text-[13px] font-semibold leading-tight">{r.player_name ?? "—"}</div>
              <div className="mt-0.5 font-mono text-[11px] opacity-90">
                <Num value={r.market_cap_usd} format="usdCompact" />
              </div>
              {isRookie && (
                <div className="mt-0.5 text-[9.5px] uppercase tracking-wide opacity-70">rookie</div>
              )}
            </div>
            <div className="self-start font-mono text-[13px] font-semibold">
              <Num value={r.delta_pct_30d} format="deltaPct" colorize precision={1} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
