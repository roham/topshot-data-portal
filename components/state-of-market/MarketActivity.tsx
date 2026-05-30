// Market Activity. Specific sales on the left (buyer ← seller · play · #serial ·
// price · time) from the flat mv_largest_sales MV; biggest cap moves on the
// right from mv_player_movers_30d. All real, all MV-backed.

import Link from "next/link";
import type { ActivitySaleRow } from "@/lib/state-of-market/activity";
import type { MoverItem } from "@/lib/state-of-market/player-moves";
import { Num } from "@/components/primitives/Num";

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

function MoverList({
  rows,
  kind,
  windowLabel,
}: {
  rows: MoverItem[];
  kind: "gain" | "loss";
  windowLabel: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
      <h3 className="mb-3 text-[13.5px] font-semibold">
        {kind === "gain" ? `Top gainers · ${windowLabel}` : `Top losers · ${windowLabel}`}
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
          <span className="ml-2 text-right font-mono font-semibold leading-tight">
            <Num value={r.pct_change} format="deltaPct" colorize precision={1} />
            <span className="block text-[10px] font-medium text-[var(--text-faint)]">
              <Num value={r.delta_usd} format="delta" colorize precision={1} />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function MarketActivity({
  sales,
  gainers,
  losers,
  moverWindowLabel,
  salesWindowLabel,
}: {
  sales: ActivitySaleRow[];
  gainers: MoverItem[];
  losers: MoverItem[];
  moverWindowLabel: string;
  salesWindowLabel: string;
}) {
  return (
    <div className="mt-[14px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.5fr_1fr]">
      {/* Sales */}
      <div className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-[18px] py-[14px]">
          <h3 className="text-[13.5px] font-semibold">Notable sales</h3>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            {salesWindowLabel} · by size
          </span>
        </div>
        {sales.length === 0 && (
          <p className="px-[18px] py-8 text-center text-[12px] text-[var(--text-dim)]">
            No sales in range.
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
              <div className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--text-faint)]">
                {s.player_name ?? s.play_name ?? "—"}
                {s.serial_number != null && ` · #${s.serial_number}`}
                {s.set_name && ` · ${s.set_name}`}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[14px] font-semibold">
                <Num value={s.gross_amount_usd} format="usdCompact" />
              </div>
              <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">{ago(s.sold_at)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Movers */}
      <div className="flex flex-col gap-[14px]">
        <MoverList rows={gainers} kind="gain" windowLabel={moverWindowLabel} />
        <MoverList rows={losers} kind="loss" windowLabel={moverWindowLabel} />
      </div>
    </div>
  );
}
