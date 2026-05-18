// Server Component leaf — fetches + renders the KPI strip for a window.
// Its own data fetch + own Suspense boundary at the page level. Streams
// independently of every other section.

import { getHomepageKpis } from "@/lib/supabase/queries/homepage-kpis";
import { getEtlHeartbeat } from "@/lib/supabase/queries/etl-heartbeat";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import {
  freshnessBucket,
  windowLabel,
  windowToMarketView,
} from "@/lib/supabase/helpers";
import type { TimeWindow } from "@/components/global/window-types";

interface Props {
  window: TimeWindow;
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

export async function KpiStrip({ window }: Props) {
  const label = windowLabel(window);
  // KPI + heartbeat fetched together — both are 1-row reads on this leaf.
  const [kpis, heartbeat] = await Promise.all([
    getHomepageKpis(window),
    getEtlHeartbeat(),
  ]);

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
    <Card
      variant="inset"
      methodology={`${label} rollup over completed transactions. Refreshed every few minutes.`}
    >
      <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-[13px] font-semibold tracking-section-header">
          Market · {label}
        </h2>
        <span
          className={`text-[10px] tnum font-mono ml-auto ${footerColorClass}`}
        >
          {footer.text}
        </span>
      </div>
      {kpisVolumeMissing ? (
        <div className="px-3 py-4 text-[11px] text-[var(--text-faint)]">
          Window <span className="font-mono">{label}</span> has no data yet —
          backfill running. (
          <span className="font-mono">{windowToMarketView(window)}</span> is
          either empty or the ETL backfill has not completed its first run for
          this window.)
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
              value={
                kpis!.median_price_usd != null
                  ? Number(kpis!.median_price_usd)
                  : null
              }
              format="usd"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label="Avg price"
              value={
                kpis!.avg_price_usd != null
                  ? Number(kpis!.avg_price_usd)
                  : null
              }
              format="usd"
              size="lg"
            />
          </div>
          <div className="p-3">
            <KPI
              label="Largest sale"
              value={
                kpis!.max_price_usd != null
                  ? Number(kpis!.max_price_usd)
                  : null
              }
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
  );
}
