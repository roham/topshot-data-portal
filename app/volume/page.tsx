import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Volume · coming soon"
      job="Volume by edition, set, player, tier, and parallel — over the global TimeWindow."
      data="30m-market accumulator + per-set and per-player rollups; window state from the useTimeWindow hook."
      status="Scheduled after the global TimeWindow infra ships (iter-5)."
    />
  );
}
