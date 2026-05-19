// TS50IndexHero — server component that fetches + renders the hero index.
//
// Used at the top of `/` and `/market-cap` per doctrine §0.1 (graph-first
// landing). The chart is rendered client-side via TS50IndexChart; this
// wrapper does the data fetch + the surrounding hero KPI strip.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { getTS50Index } from "@/lib/indices/ts50-synthesizer";
import { TS50IndexChart } from "@/components/TS50IndexChart";

export async function TS50IndexHero({
  lookbackDays = 30,
}: {
  /** Default 30D per doctrine §P7. Override for /market-cap to ALL. */
  lookbackDays?: number;
}) {
  const ts50 = await getTS50Index(lookbackDays).catch((err) => {
    console.error("[ts50-hero] fetch error", err);
    return null;
  });

  if (!ts50 || ts50.series.length === 0) {
    return (
      <Card
        title="TS50 Index"
        subtitle="Top 50 editions by market cap · value-weighted · daily-grain"
        methodology="Comparable: Card Ladder Pro CL50. The 50 editions with the highest current market cap, value-weighted (w_i = mcap_i / sum_j mcap_j), normalized so the first snapshot = 100. Faithful (P1) — no smoothing, vanity 1-of-1s included."
        variant="inset"
      >
        <div className="p-6 text-[12px] text-[var(--text-dim)]">
          TS50 Index hasn&apos;t accumulated enough snapshots yet. ETL writes one
          snapshot per UTC day; the index becomes meaningful at ≥ 7 days.
        </div>
      </Card>
    );
  }

  const deltaColor =
    ts50.series_pct_change > 0
      ? "text-[var(--up)]"
      : ts50.series_pct_change < 0
        ? "text-[var(--down)]"
        : "text-[var(--text-dim)]";

  return (
    <Card
      title="TS50 Index"
      subtitle={`Top 50 editions · value-weighted · ${ts50.days_of_history} day${ts50.days_of_history === 1 ? "" : "s"} of history${ts50.as_of_date ? ` · as of ${ts50.as_of_date}` : ""}`}
      methodology="Comparable: Card Ladder Pro CL50. The 50 editions with the highest current market cap, value-weighted (w_i = mcap_i / sum_j mcap_j), normalized so the first snapshot = 100. Faithful (P1) — no smoothing applied; vanity 1-of-1s included; ETL gaps carry forward last known value (P4: gap-tolerant)."
      variant="inset"
      right={
        <Link
          href="/market-cap"
          className="text-[11px] text-[var(--accent)] hover:underline font-mono"
        >
          full register →
        </Link>
      }
    >
      <div className="grid lg:grid-cols-[280px_1fr] gap-4 p-3">
        {/* KPI rail — left side */}
        <div className="space-y-3 lg:border-r lg:border-[var(--border-subtle)] lg:pr-4">
          <div>
            <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
              Index
            </div>
            <div className="text-[40px] leading-none font-semibold tabular-nums tracking-tight">
              {ts50.latest_index_value.toFixed(2)}
            </div>
            <div className={`text-[13px] mt-1 font-mono tabular-nums ${deltaColor}`}>
              <Num value={ts50.series_pct_change} format="deltaPct" colorize={false} />
              <span className="text-[var(--text-faint)] ml-2">
                over {ts50.days_of_history}d
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] font-mono">
              Basket Market Cap
            </div>
            <div className="text-[20px] leading-none font-semibold tabular-nums">
              <Num value={ts50.basket_mcap_total_usd} format="usdCompact" />
            </div>
            <div className="text-[10px] text-[var(--text-faint)] mt-1 font-mono">
              sum of top 50 editions
            </div>
          </div>
          {ts50.is_thin && (
            <p className="text-[10px] text-[var(--text-faint)] font-mono leading-relaxed">
              Series is still thin — accumulates 1 snapshot per UTC day.
              Becomes representative at ≥ 7 days.
            </p>
          )}
        </div>
        {/* Chart — right side */}
        <div className="min-w-0">
          <TS50IndexChart series={ts50.series} />
        </div>
      </div>
    </Card>
  );
}
