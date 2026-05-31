// /portfolio — entry landing for collector lookup. Search box + recent
// large-volume collector callouts. Selecting a name routes to /u/[username].

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/primitives/Card";

export default function Page() {
  const router = useRouter();
  const [v, setV] = useState("");
  return (
    <div className="max-w-[760px] mx-auto px-4 py-12 space-y-6">
      <header>
        <h1 className="font-mono text-[14px] tracking-section-header">PORTFOLIO · LOOKUP</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono mt-1 max-w-2xl">
          Look up any collector by Top Shot username or flow address. Lands on{" "}
          <code className="text-[var(--text-dim)]">/u/[username]</code> with portfolio value, P&L,
          tier breakdown, and recent activity.
        </p>
      </header>

      <Card variant="inset">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = v.trim();
            if (!trimmed) return;
            router.push(`/u/${encodeURIComponent(trimmed)}`);
          }}
          className="flex items-center gap-3 p-4"
        >
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="username or 0x flow address"
            className="flex-1 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded text-[12px] px-3 py-2 focus:border-[var(--border-strong)] outline-none font-mono"
            autoFocus
            spellCheck={false}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded text-[11px] font-mono font-semibold tracking-data-label"
          >
            LOOK UP →
          </button>
        </form>
      </Card>

      <Card title="WHERE ELSE TO LOOK" variant="inset">
        <ul className="p-4 space-y-2 text-[12px] font-mono">
          <li>
            <Link href="/collectors" className="text-[var(--accent)] hover:underline">/collectors</Link>{" "}
            <span className="text-[var(--text-dim)]">— directory of all known collectors ranked by activity</span>
          </li>
          <li>
            <Link href="/vip" className="text-[var(--accent)] hover:underline">/vip</Link>{" "}
            <span className="text-[var(--text-dim)]">— VIP collectors and their recent moves</span>
          </li>
          <li>
            <Link href="/leaderboards" className="text-[var(--accent)] hover:underline">/leaderboards</Link>{" "}
            <span className="text-[var(--text-dim)]">— ranked by recent USD volume</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
