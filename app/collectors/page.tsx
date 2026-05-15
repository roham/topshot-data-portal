import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Collectors · lookup + leaderboards · coming soon"
      job="Find a collector by username or flow address; browse the day's biggest spenders and biggest sellers."
      data="Recent tx feed grouped by buyer/seller identity (UNLOCK-02 confirms both are exposed); per-collector links into /u/[username]."
      status="Scheduled for iter-5+. The homepage 'Featured collector' card is the partial implementation."
    />
  );
}
