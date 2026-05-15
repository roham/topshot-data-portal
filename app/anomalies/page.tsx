import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Anomalies · wash-trade + outlier · coming soon"
      job="Surface transactions whose buyer-seller graph forms circular flows over windows (Hildobby methodology), and sales > 3σ from edition median."
      data="Recent tx feed with buyer + seller identity (STAGE-1 UNLOCK-02 confirms both present); circular-flow detection client-side."
      status="Scheduled for iter-11+. Wash-trade toggle is also planned on /movement and /sets per the V2 prompt."
    />
  );
}
