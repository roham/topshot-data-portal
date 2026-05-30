"use client";

// Index switcher rail. Click a card to re-feature it in the hero (drives ?idx=).
// Each card carries a real micro-sparkline drawn from the index's own series.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MarketIndexCard, MarketIndexKey } from "@/lib/state-of-market/indices";
import { Num } from "@/components/primitives/Num";

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const w = 74;
  const h = 38;
  if (values.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - ((v - min) / span) * (h - 6) - 3).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "var(--up)" : "var(--down)"}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IndexRail({
  cards,
  featured,
}: {
  cards: MarketIndexCard[];
  featured: MarketIndexKey;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (key: MarketIndexKey) => {
    const next = new URLSearchParams(params.toString());
    next.set("idx", key);
    return `${pathname}?${next.toString()}`;
  };

  return (
    <div className="grid grid-cols-2 gap-[14px] py-[6px] md:grid-cols-3">
      {cards.map((c) => {
        const on = c.key === featured;
        const up = c.pct_change >= 0;
        return (
          <Link
            key={c.key}
            href={hrefFor(c.key)}
            scroll={false}
            className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-[13px] border px-4 py-[14px] transition-colors ${
              on
                ? "border-[var(--teal,#2dd4bf)]/50 bg-[var(--teal,#2dd4bf)]/[0.06]"
                : "border-[var(--border-subtle)] bg-[var(--surface-1)] hover:border-[var(--border)]"
            }`}
          >
            <div>
              <h4
                className={`font-mono text-[10.5px] font-semibold tracking-[0.1em] ${
                  on ? "text-[#2dd4bf]" : "text-[var(--text-dim)]"
                }`}
              >
                {c.name}
                {c.is_thin && (
                  <span className="ml-1.5 text-[8.5px] font-normal text-[var(--text-faint)]">
                    thin
                  </span>
                )}
              </h4>
              <div className="mt-[5px] text-[21px] font-semibold tabular-nums">
                <Num value={c.basket_mcap_usd} format="usdCompact" />
              </div>
              <div className="mt-0.5 text-[10.5px] text-[var(--text-faint)]">
                {c.sublabel} ·{" "}
                <Num value={c.pct_change} format="deltaPct" colorize precision={1} />
              </div>
            </div>
            <Sparkline values={c.series.map((p) => p.value)} up={up} />
          </Link>
        );
      })}
    </div>
  );
}
