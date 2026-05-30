"use client";

// Live trade ticker — the thread into the Living Market (layer A).
// Real transactions only: buyer/seller/play/price from topshot.transactions.
// Duplicates the row once so the CSS marquee loops seamlessly.

export interface TickerItem {
  id: string;
  actor: string | null; // buyer or seller handle
  side: "bought" | "sold";
  label: string; // play · parallel · serial
  priceUsd: number | null;
}

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function MarketTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <div className="som-ticker-row inline-flex gap-[30px] px-[22px] py-[7px] font-mono text-[11.5px]">
        {loop.map((it, i) => (
          <span key={`${it.id}-${i}`} className="text-[var(--text-dim)]">
            <span className="text-[var(--text-faint)]">◍ </span>
            <b className="font-semibold text-[var(--text)]">{it.actor ?? "—"}</b> {it.side}{" "}
            <b className="font-semibold text-[var(--text)]">{it.label}</b>{" "}
            {it.priceUsd != null && (
              <span className={it.side === "bought" ? "text-[var(--up)]" : "text-[var(--down)]"}>
                {fmtUSD(it.priceUsd)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
