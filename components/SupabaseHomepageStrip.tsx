// Server component. Top-of-page KPI strip backed by Supabase MVs.
//
// Pulls per-window:
//   - market totals from mv_market_summary_<w> (KPI strip)
//   - most-active editions from mv_edition_<w>_activity (tx_count >= 5 gate)
//   - largest sales from mv_largest_sales_<w>
//   - top players from mv_player_<w>_volume
//   - freshness from topshot._etl_heartbeat
//
// Time-window param `?w=` switches every block. The strip falls back to an
// honest-absence state when MV reads return null/empty.

import Link from "next/link";
import { getHomepageKpis } from "@/lib/supabase/queries/homepage-kpis";
import { getMostActiveEditions } from "@/lib/supabase/queries/most-active-editions";
import { getLargestSales } from "@/lib/supabase/queries/largest-sales";
import { getTopPlayers } from "@/lib/supabase/queries/top-players";
import { getEtlHeartbeat } from "@/lib/supabase/queries/etl-heartbeat";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import {
  freshnessBucket,
  parseWindow,
  windowLabel,
  windowToMarketView,
  windowToPlayerView,
  windowToEditionActivityView,
  windowToLargestSalesView,
} from "@/lib/supabase/helpers";

interface Props {
  // The ?w= search param from the page; parsed via parseWindow so the entire
  // strip re-routes to the matching MVs for that window.
  rawWindow?: string | string[];
}

const TIER_NAME_TO_RAW: Record<string, string> = {
  Common: "MOMENT_TIER_COMMON",
  Fandom: "MOMENT_TIER_FANDOM",
  Rare: "MOMENT_TIER_RARE",
  Legendary: "MOMENT_TIER_LEGENDARY",
  Ultimate: "MOMENT_TIER_ULTIMATE",
  Anthology: "MOMENT_TIER_ULTIMATE",
};
function rawTierFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return TIER_NAME_TO_RAW[name] ?? null;
}

function freshnessFooter(hbLast: string | null): {
  text: string;
  bucket: "green" | "yellow" | "red";
} {
  const last = hbLast ? new Date(hbLast) : null;
  const { bucket, minutesAgo } = freshnessBucket(last);
  if (minutesAgo == null) {
    return {
      text: "ETL heartbeat unavailable — Supabase reads may be empty until first sync completes",
      bucket,
    };
  }
  if (minutesAgo < 1) return { text: "Updated just now", bucket };
  if (minutesAgo < 60) return { text: `Updated ${minutesAgo}m ago`, bucket };
  const h = Math.round(minutesAgo / 60);
  if (h < 24) return { text: `Updated ${h}h ago`, bucket };
  const d = Math.round(h / 24);
  return { text: `Updated ${d}d ago — data may be stale`, bucket };
}

export async function SupabaseHomepageStrip({ rawWindow }: Props) {
  const window = parseWindow(rawWindow);
  const label = windowLabel(window);

  // Window-scaled min-trade threshold: 24h-window players rarely have 5+ trades,
  // but 7d/30d/1y do. Without scaling, the 24h list shows only the ~3 players
  // with daily volume — looks broken even when data is correct.
  const minTx = window === "24h" ? 2 : window === "7d" ? 5 : 10;

  const [kpis, mostActive, largest, topPlayers, heartbeat] = await Promise.all([
    getHomepageKpis(window),
    getMostActiveEditions({ window, limit: 20, minTxCount: minTx }),
    getLargestSales({ window, limit: 20 }),
    getTopPlayers({ window, limit: 20, minTxCount: minTx }),
    getEtlHeartbeat(),
  ]);

  // Detect "MV exists but window has no data" — every block came back empty
  // and the KPI row has zero volume. The strip renders an explicit caption
  // instead of a misleading $0 row.
  const allEmpty =
    !kpis &&
    mostActive.length === 0 &&
    largest.length === 0 &&
    topPlayers.length === 0;
  if (allEmpty) {
    return (
      <Card className="p-3 text-[11px] text-[var(--text-faint)]">
        Window <span className="font-mono">{label}</span> has no data yet —
        backfill running. Supabase MV reads returned empty. Either env vars are
        unset (<span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> /{" "}
        <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>) or
        the ETL backfill has not yet completed its first run for this window.
        Falling through to the snapshot path below.
      </Card>
    );
  }

  // Per-window empty: KPIs row is loaded but volume is 0/null — the MV ran
  // but its time-bound predicate returned no rows. Show the honest-absence
  // caption rather than a zeroed strip.
  const kpisVolumeMissing =
    !kpis ||
    kpis.total_volume_usd == null ||
    Number(kpis.total_volume_usd) === 0;

  const footer = freshnessFooter(heartbeat?.last_success_at ?? null);
  const footerColorClass =
    footer.bucket === "green"
      ? "text-[var(--text-faint)]"
      : footer.bucket === "yellow"
        ? "text-[var(--warn)]"
        : "text-[var(--down)]";

  return (
    <section className="space-y-5" data-source="supabase" data-window={window}>
      {/* ───── KPI strip ───── */}
      <Card
        variant="inset"
        methodology={`topshot.${windowToMarketView(window)} — single-row ${label} rollup over SUCCEEDED transactions. Refreshed every 5-15 min by the ETL cron.`}
      >
        <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-[13px] font-semibold tracking-section-header">
            Market · {label}
          </h2>
          <span className={`text-[10px] tnum font-mono ml-auto ${footerColorClass}`}>
            {footer.text}
          </span>
        </div>
        {kpisVolumeMissing ? (
          <div className="px-3 py-4 text-[11px] text-[var(--text-faint)]">
            Window <span className="font-mono">{label}</span> has no data yet —
            backfill running. (
            <span className="font-mono">{windowToMarketView(window)}</span> is
            either empty or the ETL backfill has not completed its first run
            for this window.)
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            <div className="p-3">
              <KPI
                label={`${label} $ volume`}
                value={Number(kpis!.total_volume_usd)}
                format="usdCompact"
                size="lg"
              />
            </div>
            <div className="p-3">
              <KPI
                label={`${label} trades`}
                value={Number(kpis!.total_tx_count)}
                format="int"
                size="lg"
              />
            </div>
            <div className="p-3">
              <KPI
                label="Median price"
                value={kpis!.median_price_usd != null ? Number(kpis!.median_price_usd) : null}
                format="usd"
                size="lg"
              />
            </div>
            <div className="p-3">
              <KPI
                label="Avg price"
                value={kpis!.avg_price_usd != null ? Number(kpis!.avg_price_usd) : null}
                format="usd"
                size="lg"
              />
            </div>
            <div className="p-3">
              <KPI
                label="Largest sale"
                value={kpis!.max_price_usd != null ? Number(kpis!.max_price_usd) : null}
                format="usdCompact"
                size="lg"
              />
            </div>
            <div className="p-3">
              <KPI
                label="Unique moments"
                value={Number(kpis!.unique_moments_traded)}
                format="int"
                size="lg"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ───── Top players · windowed ───── */}
      {topPlayers.length > 0 && (
        <section aria-labelledby="sb-players">
          <div className="flex items-baseline gap-3 mb-2 px-1">
            <h2
              id="sb-players"
              className="text-[13px] font-semibold tracking-section-header"
            >
              Top players · {label}
            </h2>
            <span className="text-[10px] text-[var(--text-faint)] font-mono">
              {topPlayers.length} players · ranked by $ volume · filter: ≥5
              trades · from {windowToPlayerView(window)}
            </span>
            <Link
              href="/movers"
              className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono"
            >
              see all →
            </Link>
          </div>
          <Card variant="inset">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-10">
                    #
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Player
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Team
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    $ volume
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Trades
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Unique moments
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Median
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {topPlayers.map((p, i) => (
                  <tr
                    key={p.player_id}
                    className="hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <Link
                        href={`/player/${p.player_id}`}
                        className="text-[var(--text)] hover:text-[var(--accent)]"
                      >
                        {p.player_name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-[var(--text-dim)]">
                      {p.last_known_team_full_name ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum font-semibold">
                      <Num
                        value={Number(p.total_volume_usd)}
                        format="usdCompact"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      {Number(p.tx_count).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      {p.unique_moments_traded != null
                        ? Number(p.unique_moments_traded).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      <Num
                        value={
                          p.median_price_usd != null
                            ? Number(p.median_price_usd)
                            : null
                        }
                        format="usd"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ───── Most active editions · windowed · gated ≥5 tx ───── */}
      {mostActive.length > 0 && (
        <section aria-labelledby="sb-most-active">
          <div className="flex items-baseline gap-3 mb-2 px-1">
            <h2
              id="sb-most-active"
              className="text-[13px] font-semibold tracking-section-header"
            >
              Most active · editions · {label}
            </h2>
            <span className="text-[10px] text-[var(--text-faint)] font-mono">
              {mostActive.length} editions · $ volume desc · filter: ≥5 trades
              · from {windowToEditionActivityView(window)}
            </span>
            <Link
              href="/volume"
              className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono"
            >
              see all →
            </Link>
          </div>
          <Card variant="inset">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-10">
                    #
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Edition
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    {label} $ vol
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Trades
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                    Median
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">
                    Tier
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {mostActive.map((r, i) => (
                  <tr
                    key={r.edition_id}
                    className="hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <Link
                        href={r.set_id ? `/set/${r.set_id}` : "/volume"}
                        className="text-[var(--text)] hover:text-[var(--accent)]"
                      >
                        {r.player_name ?? "—"}
                        {r.set_name ? (
                          <span className="text-[var(--text-dim)]">
                            {" "}
                            · {r.set_name}
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-right tnum font-semibold">
                      <Num value={Number(r.volume_usd)} format="usdCompact" />
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      {Number(r.tx_count).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right tnum">
                      <Num
                        value={
                          r.median_price_usd != null
                            ? Number(r.median_price_usd)
                            : null
                        }
                        format="usd"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <TierChip tier={rawTierFromName(r.tier_name)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* ───── Largest sales · windowed ───── */}
      {largest.length > 0 && (
        <section aria-labelledby="sb-largest">
          <div className="flex items-baseline gap-3 mb-2 px-1">
            <h2
              id="sb-largest"
              className="text-[13px] font-semibold tracking-section-header"
            >
              Largest sales · {label}
            </h2>
            <span className="text-[10px] text-[var(--text-faint)] font-mono">
              {largest.length} sales · price desc · from{" "}
              {windowToLargestSalesView(window)}
            </span>
            <Link
              href="/sales"
              className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono"
            >
              see all →
            </Link>
          </div>
          <Card variant="inset">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left">
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right w-[100px]">
                    Price
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Moment
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">
                    Tier
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Buyer
                  </th>
                  <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                    Seller
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {largest.map((s) => (
                  <tr
                    key={s.transaction_id}
                    className="hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-3 py-1.5 text-right tnum font-semibold text-[var(--up)]">
                      <Num value={Number(s.gross_amount_usd)} format="usd" />
                    </td>
                    <td className="px-3 py-1.5 text-[var(--text)]">
                      {s.player_name ?? "—"}
                      {s.serial_number != null && (
                        <span className="text-[var(--text-faint)]">
                          {" "}
                          #{s.serial_number}
                        </span>
                      )}
                      {s.set_name && (
                        <span className="text-[var(--text-dim)]">
                          {" "}
                          · {s.set_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <TierChip tier={rawTierFromName(s.tier_name)} />
                    </td>
                    <td className="px-3 py-1.5">
                      {s.buyer_safe_name ? (
                        <Link
                          href={`/u/${encodeURIComponent(s.buyer_safe_name)}`}
                          className="text-[var(--text-dim)] hover:text-[var(--accent)]"
                        >
                          {s.buyer_safe_name}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {s.seller_safe_name ? (
                        <Link
                          href={`/u/${encodeURIComponent(s.seller_safe_name)}`}
                          className="text-[var(--text-dim)] hover:text-[var(--accent)]"
                        >
                          {s.seller_safe_name}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </section>
  );
}
