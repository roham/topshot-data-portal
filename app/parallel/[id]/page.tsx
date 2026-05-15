import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = `parallelID ${id}`;
  return (
    <ComingSoon
      title="Parallel · cross-edition browser · coming soon"
      scope={scope}
      job="Browse every edition that shares this parallelID — see the full Cosmic / Anthology / Holo cohort with floor + circulation per cell."
      data="searchEditions(byParallelIDs) grouped + sorted by floor."
      status="Scheduled for iter-9+."
    />
  );
}
