import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Sniper · mispricing feed · coming soon"
      job="Continuously scan listed serials against the user's valuation engine; flag listings whose floor sits below fair value by more than a user-set threshold."
      data="editionListedSerials cross-joined with valueMoment() from lib/valuation. Threshold persisted via nuqs URL state."
      status="Scheduled for iter-12+. Depends on the /rules valuation-tuner restoration landing first."
    />
  );
}
