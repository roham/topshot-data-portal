// Server component. Renders the ETL freshness pill in the top nav.
//   green:  last_success_at < 30m ago — silent confidence
//   yellow: < 60m ago — caution
//   red:    >= 60m ago OR row missing — "Data may be stale"
//
// Returns `null` (render nothing) when the heartbeat read fails — we never
// render a misleading "Live" lie if we don't know the state.

import { getEtlHeartbeat } from "@/lib/supabase/queries/etl-heartbeat";
import { freshnessBucket } from "@/lib/supabase/helpers";

const BUCKET_TO_CLASS: Record<"green" | "yellow" | "red", string> = {
  green: "bg-[var(--up)]",
  yellow: "bg-[var(--warn)]",
  red: "bg-[var(--down)]",
};

export async function EtlFreshnessBadge() {
  const hb = await getEtlHeartbeat();
  const lastSuccessAt = hb?.last_success_at ? new Date(hb.last_success_at) : null;
  const { bucket, minutesAgo } = freshnessBucket(lastSuccessAt);

  const labelText =
    minutesAgo == null
      ? "no heartbeat"
      : minutesAgo < 1
        ? "just now"
        : minutesAgo < 60
          ? `${minutesAgo}m ago`
          : minutesAgo < 1440
            ? `${Math.round(minutesAgo / 60)}h ago`
            : `${Math.round(minutesAgo / 1440)}d ago`;

  const tooltip =
    bucket === "green"
      ? `ETL last synced ${labelText}`
      : bucket === "yellow"
        ? `ETL slowing — last sync ${labelText}`
        : minutesAgo == null
          ? "ETL heartbeat unavailable"
          : `Data may be stale — ETL last synced ${labelText}`;

  return (
    <span
      className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)] font-mono"
      title={tooltip}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${BUCKET_TO_CLASS[bucket]}`}
      />
      <span className="hidden sm:inline tracking-data-label">
        {bucket === "red" ? "stale" : bucket === "yellow" ? "slow" : "fresh"} ·{" "}
        {labelText}
      </span>
    </span>
  );
}
