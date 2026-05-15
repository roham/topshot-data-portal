import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="On this day · coming soon"
      job="Browse moments minted, sales completed, and editions debuted on this calendar date in prior years."
      data="dateOfMoment-anchored play queries + per-day tx archives from the accumulator (gated on accumulator depth ≥ 30 days)."
      status="Scheduled for iter-13+. Belongs under /archive/on-this-day in the final IA."
    />
  );
}
