import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Whales · concentration shifts · coming soon"
      job="Per-edition area chart of top-1% holder share over time + a ranked list of the biggest individual portfolios in the catalog."
      data="Accumulator-derived holder distribution from sample-and-group passes (no native top-holders aggregate per Ceiling 7)."
      status="Scheduled for iter-9+. Sample-based reconstruction in lib/snapshots needs an iter."
    />
  );
}
