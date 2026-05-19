// TopHoldersPanel — Glassnode-style supply-distribution panel.
//
// Doctrine §0.2 comparable: Glassnode supply-distribution; PSA Set Registry
// per-set leaderboard. Both surface "who holds what" as a first-class
// concentration metric.
//
// Honest empty state per doctrine §P4: if no holders are loaded yet (e.g.
// ownership ETL hasn't completed), renders the empty-state with a
// methodology note explaining the data lag — NOT a fake placeholder.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { EmptyState } from "@/components/primitives/EmptyState";
import type { HolderRow } from "@/lib/supabase/queries/holders";

interface TopHoldersPanelProps {
  rows: HolderRow[];
  /** entity name for the title — "LeBron James", "Base Set Series 9", etc */
  entityName: string;
  /** kind of entity, used in subtitle wording */
  entityKind: "player" | "set" | "edition";
  /** comparable string for methodology hover */
  comparable?: string;
}

export function TopHoldersPanel({ rows, entityName, entityKind, comparable = "Glassnode supply-distribution" }: TopHoldersPanelProps) {
  const total = rows.reduce((sum, r) => sum + r.moment_count, 0);
  const top10Share = rows.slice(0, 10).reduce((sum, r) => sum + r.moment_count, 0);
  const concentrationPct = total > 0 ? (top10Share / total) * 100 : 0;
  const subtitle =
    rows.length === 0
      ? `holdings concentration — ${entityKind === "player" ? "by player" : entityKind === "set" ? "by set" : "by edition"}`
      : `top ${rows.length} hold ${total.toLocaleString()} moments · top-10 concentration ${concentrationPct.toFixed(1)}%`;

  return (
    <Card
      title="Top holders"
      subtitle={subtitle}
      variant="inset"
      methodology={`Top owners of ${entityName} by distinct moment count. Counts include all parallels by default; for parallel-disambiguated holders see per-edition view. Comparable: ${comparable}.`}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No holders surfaced yet"
          body="Ownership ETL completes nightly; this panel populates once the next backfill lands."
        />
      ) : (
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 gap-y-1"
          data-testid="top-holders-list"
        >
          {rows.map((h) => {
            const display = h.owner_username ?? truncateAddr(h.owner_flow_address);
            const href = h.owner_username
              ? `/u/${encodeURIComponent(h.owner_username)}`
              : `/u/${h.owner_flow_address}`;
            return (
              <li
                key={h.owner_flow_address}
                className="flex items-center justify-between gap-3 py-1 px-2 border-b border-[var(--border-subtle)] last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-[var(--text-faint)] w-6 text-right">
                    #{h.rank}
                  </span>
                  {h.owner_profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={h.owner_profile_image_url}
                      alt=""
                      className="w-5 h-5 rounded-full bg-[var(--surface-deep)] shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[var(--surface-deep)] shrink-0" />
                  )}
                  <Link
                    href={href}
                    className="truncate text-[12px] hover:text-[var(--accent)]"
                    title={h.owner_flow_address}
                  >
                    {display}
                  </Link>
                </div>
                <span
                  className="text-[12px] font-mono tabular-nums text-[var(--text-dim)] shrink-0"
                  data-testid={`holder-count-${h.rank}`}
                >
                  <Num value={h.moment_count} format="int" />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function truncateAddr(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
