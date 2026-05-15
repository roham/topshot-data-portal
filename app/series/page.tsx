import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Series · directory · coming soon"
      job="Browse every Top Shot series (S1 through current) with series-level floor index."
      data="searchSets — STAGE-1 confirmed bySeries filter does not exist (the server suggests byLeagues instead), so we filter client-side on flowSeriesNumber."
      status="Scheduled for iter-7+."
    />
  );
}
