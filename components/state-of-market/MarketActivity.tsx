// Market Activity — tier-segmented. Specific sales on the left (buyer ← seller,
// play · tier · serial, price, time), biggest cap moves on the right.
// Sales are real topshot.transactions; movers are real player cap deltas.

import Link from "next/link";
import type { RecentTransactionRow } from "@/lib/supabase/queries/recent-transactions";
import type { PlayerMarketCapRow } from "@/lib/supabase/queries/players-marketcap";
import { Num } from "@/components/primitives/Num";
import { type TierTab } from "@/components/state-of-market/tier-tabs-shared";

const TIER_CHIP: Record<string, string> = {
  Common: "bg-[rgba(154,161,172,0.18)] text-[#c4cad3]",
  Rare: "bg-[rgba(96,165,250,0.18)] text-[var(--blue,#60a5fa)]",
  Fandom: "bg-[rgba(167,139,250,0.2)] text-[var(--violet,#a78bfa)]",
  Legendary: "bg-[rgba(167,139,250,0.2)] text-[var(--violet,#a78bfa)]",
  Ultimate: "bg-[rgba(245,177,75,0.2)] text-[var(--amber,#f5b14b)]",
};

const TIER_ABBR: Record<string, string> = {
  Common: "COM",
  Rare: "RARE",
  Fandom: "FAN",
  Legendary: "LEG",
  Ultimate: "ULT",
};

function ago(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (!isFinite(diff) || diff < 0) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TierChip({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const cls = TIER_CHIP[tier] ?? "bg-[var(--surface-2)] text-[var(--text-dim)]";
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.06em] ${cls}`}>
      {TIER_ABBR[tier] ?? tier.slice(0, 4).toUpperCase()}
    </span>
  );
}

function MoverList({ rows, kind }: { rows: PlayerMarketCapRow[]; kind: "gain" | "loss" }) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
      <h3 className="mb-3 text-[13.5px] font-semibold">
        {kind === "gain" ? "Top gainers · 30d" : "Top losers · 30d"}
      </h3>
      {rows.length === 0 && (
        <p className="text-[11px] text-[var(--text-faint)]">No 30-day moves in range.</p>
      )}
      {rows.map((r) => (
        <Link
          key={r.player_id}
          href={`/player/${r.player_id}`}
          className={`mb-[5px] flex items-center justify-between rounded-[9px] px-[11px] py-2 text-[12.5px] ${
            kind === "gain" ? "bg-[rgba(52,211,153,0.07)]" : "bg-[rgba(248,113,113,0.07)]"
          }`}
        >
          <span className="truncate">{r.player_name ?? "—"}</span>
          <span className="ml-2 font-mono font-semibold">
            <Num value={r.delta_pct_30d} format="deltaPct" colorize precision={1} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function MarketActivity({
  transactions,
  movers,
  activeTier,
}: {
  transactions: RecentTransactionRow[];
  movers: PlayerMarketCapRow[];
  activeTier: TierTab;
}) {
  const sales =
    activeTier === "All"
      ? transactions
      : transactions.filter((t) => t.tier_name === activeTier);

  const withDelta = movers.filter((m) => m.delta_pct_30d != null);
  const gainers = [...withDelta]
    .filter((m) => (m.delta_pct_30d ?? 0) > 0)
    .sort((a, b) => (b.delta_pct_30d ?? 0) - (a.delta_pct_30d ?? 0))
    .slice(0, 5);
  const losers = [...withDelta]
    .filter((m) => (m.delta_pct_30d ?? 0) < 0)
    .sort((a, b) => (a.delta_pct_30d ?? 0) - (b.delta_pct_30d ?? 0))
    .slice(0, 5);

  return (
    <div className="mt-[14px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.5fr_1fr]">
      {/* Sales */}
      <div className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-[18px] py-[14px]">
          <h3 className="text-[13.5px] font-semibold">Notable sales</h3>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            {activeTier === "All" ? "all tiers" : activeTier}
          </span>
        </div>
        {sales.length === 0 && (
          <p className="px-[18px] py-8 text-center text-[12px] text-[var(--text-dim)]">
            No sales in this tier.
          </p>
        )}
        {sales.slice(0, 12).map((s) => (
          <div
            key={s.transaction_id}
            className="grid grid-cols-[1fr_auto] items-center gap-1.5 border-b border-[var(--border-subtle)]/50 px-[18px] py-[11px] last:border-b-0"
          >
            <div>
              <div className="text-[12.5px]">
                <b className="font-semibold">{s.buyer_safe_name ?? "—"}</b>{" "}
                <span className="text-[var(--text-faint)]">←</span>{" "}
                <b className="font-semibold">{s.seller_safe_name ?? "—"}</b>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-faint)]">
                <span className="truncate">
                  {s.player_name ?? s.play_name ?? "—"}
                  {s.serial_number != null && ` · #${s.serial_number}`}
                </span>
                <TierChip tier={s.tier_name} />
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[14px] font-semibold">
                <Num value={s.gross_amount_usd} format="usdCompact" />
              </div>
              <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                {ago(s.source_updated_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Movers */}
      <div className="flex flex-col gap-[14px]">
        <MoverList rows={gainers} kind="gain" />
        <MoverList rows={losers} kind="loss" />
      </div>
    </div>
  );
}
