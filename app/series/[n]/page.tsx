import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const scope = `series ${n}`;
  return (
    <ComingSoon
      title="Series · per-series deep dive · coming soon"
      scope={scope}
      job="Browse all sets within a series with a series-level floor index."
      data="searchSets, filtered client-side on flowSeriesNumber (bySeries filter does not exist per STAGE-1 probe)."
      status="Scheduled for iter-7+."
    />
  );
}
