"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface TickerItem {
  id: string;
  label: string;       // e.g. "BostonBased bought Tatum #1 @"
  price: string;       // formatted $
  delta?: string;      // optional delta (e.g. "vs floor +12%")
  href: string;        // where to click
  isNew?: boolean;     // first-tick flash
}

interface TickerTapeProps {
  items: TickerItem[];
  speedPxPerSec?: number;
}

// Bloomberg amber-bar ticker. Continuously scrolling left, items wrap around.
// New-item flash: a 1s color pulse on items marked isNew (caller decides
// what's new on each refresh).
export function TickerTape({ items, speedPxPerSec = 60 }: TickerTapeProps) {
  // Double the items for seamless loop.
  const doubled = useMemo(() => [...items, ...items], [items]);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);
  const halfWidth = useRef<number>(0);

  useEffect(() => {
    if (!innerRef.current) return;
    halfWidth.current = innerRef.current.scrollWidth / 2;
  }, [doubled]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = t - last;
      last = t;
      setOffset((cur) => {
        let next = cur + (speedPxPerSec * dt) / 1000;
        if (halfWidth.current > 0 && next >= halfWidth.current) next -= halfWidth.current;
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [speedPxPerSec]);

  if (!items.length) {
    return (
      <div className="bg-[var(--surface-1)] border-y border-[var(--border-subtle)] h-7 flex items-center px-3">
        <span className="text-[10px] font-mono text-[var(--text-faint)] tracking-data-label">
          tape · accumulating…
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border-y border-[var(--border-subtle)] h-7 overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-[var(--surface-1)] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-l from-[var(--surface-1)] to-transparent pointer-events-none" />
      <div
        ref={innerRef}
        className="flex items-center gap-6 px-3 h-full font-mono text-[11px] whitespace-nowrap will-change-transform"
        style={{ transform: `translate3d(${-offset}px, 0, 0)` }}
      >
        {doubled.map((item, i) => (
          <a
            key={`${item.id}-${i}`}
            href={item.href}
            className={`flex items-baseline gap-2 hover:text-[var(--accent)] ${
              item.isNew ? "tape-flash" : ""
            }`}
          >
            <span className="text-[var(--text-dim)]">{item.label}</span>
            <span className="tabular-nums text-[var(--text)] font-semibold">{item.price}</span>
            {item.delta && <span className="text-[var(--text-faint)] tabular-nums">{item.delta}</span>}
          </a>
        ))}
      </div>
      <style jsx>{`
        @keyframes flashAccent {
          0% { color: var(--accent); }
          100% { color: var(--text); }
        }
        .tape-flash :global(span:nth-child(2)) {
          animation: flashAccent 1s ease-out;
        }
      `}</style>
    </div>
  );
}
