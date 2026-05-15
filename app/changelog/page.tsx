import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Changelog · coming soon"
      job="Iter-by-iter changelog so the trader can see what landed and when, with links to the commit and self-assessment for each iter."
      data="Generated at build time from git log scanning for [TOPSHOT-PORTAL-V2 STAGE-7 iter-N] commits + kaaos-knowledge iter/N-*/self-assessment.md."
      status="Scheduled for iter-12. Static generation at build time."
    />
  );
}
