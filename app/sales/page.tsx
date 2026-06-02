// /sales — Top Sales, reframed as a special-serial showcase.
//
// The old surface was a podium + a flat ranked table — a spreadsheet that never
// said WHY a sale mattered. The collector audience cares about the story behind
// the serial: #1 first mints, serials that match the player's jersey number, and
// the scarcest parallels (Omega, Galactic). This page leads with those.
//
// Structure:
//   1. Featured hero — the single greatest special sale in the window.
//   2. Stat strip — counts per category (anchors into the sections).
//   3. Category sections — First Mint / Jersey Match / Omega / Galactic / Low Serials,
//      each a themed rail of rich cards (real NBA headshots, team-color washes).
//   4. All Top Sales — the comprehensive ranked table + CSV for power users.
//
// Default window is 1Y (the showcase wants depth — the rarest categories like
// Omega are thin over 30D). Selector offers 24H…All. Sales shown as-is per the
// constitution (settled marks, no vanity cap).

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { ExportCSV } from "@/components/global/ExportCSV";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";
import { getTopSales } from "@/lib/supabase/queries/largest-sales";
import { getSpecialSales } from "@/lib/supabase/queries/special-sales";
import { windowToLargestSalesView } from "@/lib/supabase/helpers";
import {
  FeaturedHero,
  SpecialSection,
  THEMES,
  type ThemeKey,
} from "@/components/sales/special-sales-ui";

export const revalidate = 120;
export const maxDuration = 30;
export const metadata = { title: "Top Sales · Special Serials · TS·PORTAL" };

const TIER_NAME_TO_RAW: Record<string, string> = {
  Common: "MOMENT_TIER_COMMON",
  Fandom: "MOMENT_TIER_FANDOM",
  Rare: "MOMENT_TIER_RARE",
  Legendary: "MOMENT_TIER_LEGENDARY",
  Ultimate: "MOMENT_TIER_ULTIMATE",
  Anthology: "MOMENT_TIER_ULTIMATE",
};
function rawTier(name: string | null | undefined): string | null {
  return name ? (TIER_NAME_TO_RAW[name] ?? null) : null;
}
function soldDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Ordered category render list.
const SECTION_ORDER: ThemeKey[] = ["serial_one", "jersey", "omega", "galactic", "low_serial"];

// ── The special-serial showcase ─────────────────────────────────────────────
async function Showcase({ window }: { window: TimeWindow }) {
  const data = await getSpecialSales(window);
  const sections = {
    serial_one: data.serial_one,
    jersey: data.jersey,
    omega: data.omega,
    galactic: data.galactic,
    low_serial: data.low_serial,
  };
  const hasAny = data.hero.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center font-mono text-[12px] text-[var(--text-dim)]">
        No special-serial sales recorded in the {data.windowLabel} window yet. Widen the window above.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured hero */}
      <FeaturedHero sale={data.hero[0]} />

      {/* Stat strip — counts per category, click to jump */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {SECTION_ORDER.map((key) => {
          const t = THEMES[key];
          const c = sections[key].count;
          return (
            <Link
              key={key}
              href={`#${t.id}`}
              className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[13px]" style={{ color: t.accent }}>{t.glyph}</span>
                <span className="font-mono text-[9px] tracking-data-label text-[var(--text-faint)]">{t.title}</span>
              </div>
              <div className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-[var(--text)]">
                {c.toLocaleString("en-US")}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Category sections */}
      {SECTION_ORDER.map((key) => (
        <SpecialSection key={key} theme={THEMES[key]} count={sections[key].count} rows={sections[key].rows} />
      ))}
    </div>
  );
}

// ── Comprehensive ranked table (the full "biggest sales" list + CSV) ─────────
async function AllTopSales({ window }: { window: TimeWindow }) {
  const sales = await getTopSales({ window, limit: 50 });
  if (sales.length === 0) return null;

  return (
    <Card
      variant="inset"
      title="ALL TOP SALES"
      subtitle={`${sales.length} biggest settled sales`}
      right={
        <ExportCSV
          filename={`topshot-top-sales-${window}.csv`}
          headers={["Price USD", "Player", "Serial", "Set", "Tier", "Buyer", "Seller", "Sold at", "Edition id"]}
          rows={sales.map((r) => [
            Number(r.gross_amount_usd).toFixed(2),
            r.player_name ?? "",
            r.serial_number ?? "",
            r.set_name ?? "",
            r.tier_name ?? "",
            r.buyer_safe_name ?? "",
            r.seller_safe_name ?? "",
            r.sold_at ?? "",
            r.edition_id ?? "",
          ])}
        />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--surface-2)]">
            <tr className="text-left text-[10px] uppercase tracking-data-label text-[var(--text-faint)]">
              <th className="w-8 px-3 py-1.5 text-right">#</th>
              <th className="w-[110px] px-3 py-1.5 text-right">Price</th>
              <th className="px-3 py-1.5">Moment</th>
              <th className="w-[110px] px-3 py-1.5">Tier</th>
              <th className="px-3 py-1.5">Buyer</th>
              <th className="px-3 py-1.5">Seller</th>
              <th className="w-[90px] px-3 py-1.5 text-right">Sold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sales.map((s, i) => {
              const href = s.edition_id ? `/edition/${s.edition_id}` : null;
              return (
                <tr key={s.transaction_id} className="transition-colors hover:bg-[var(--surface-2)]">
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-faint)]">{i + 1}</td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-[var(--up)]">
                    <Num value={Number(s.gross_amount_usd)} format="usd" />
                  </td>
                  <td className="px-3 py-1.5 text-[var(--text)]">
                    {href ? (
                      <Link href={href} className="hover:text-[var(--accent)]">
                        {s.player_name ?? "—"}
                        {s.serial_number != null && <span className="text-[var(--text-faint)]"> #{s.serial_number}</span>}
                        {s.set_name && <span className="text-[var(--text-dim)]"> · {s.set_name}</span>}
                      </Link>
                    ) : (
                      <>
                        {s.player_name ?? "—"}
                        {s.serial_number != null && <span className="text-[var(--text-faint)]"> #{s.serial_number}</span>}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <TierChip tier={rawTier(s.tier_name)} />
                  </td>
                  <td className="px-3 py-1.5">
                    {s.buyer_safe_name ? (
                      <Link href={`/u/${encodeURIComponent(s.buyer_safe_name)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">
                        {s.buyer_safe_name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {s.seller_safe_name ? (
                      <Link href={`/u/${encodeURIComponent(s.seller_safe_name)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">
                        {s.seller_safe_name}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[11px] tabular-nums text-[var(--text-faint)]">
                    {soldDate(s.sold_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 max-w-2xl px-3 pb-3 font-mono text-[10px] leading-relaxed text-[var(--text-faint)]">
        Real, settled sales — price descending — from{" "}
        <span className="text-[var(--text-dim)]">{windowToLargestSalesView(window)}</span>. Headshots are official
        NBA marks (cdn.nba.com). Click any row to open the edition&apos;s price history.
      </p>
    </Card>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ w?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const { window } = parseTimeWindow(sp.w, "1y");
  const label = WINDOW_SPECS[window].label;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-mono text-[14px] tracking-section-header">TOP SALES · SPECIAL SERIALS</h1>
        <p className="text-[11px] text-[var(--text-dim)]">
          The biggest settled sales — and what makes each serial special: first mints, jersey matches, and the rarest parallels.
        </p>
        <div className="ml-auto">
          <TimeWindowSelector />
        </div>
      </header>

      <Suspense
        key={`showcase-${window}`}
        fallback={<div className="p-8 font-mono text-[12px] text-[var(--text-dim)]">Loading the {label} showcase…</div>}
      >
        <Showcase window={window} />
      </Suspense>

      <Suspense key={`all-${window}`} fallback={null}>
        <AllTopSales window={window} />
      </Suspense>
    </div>
  );
}
