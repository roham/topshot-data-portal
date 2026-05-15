import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  const scope = `flowId ${flowId}`;
  return (
    <ComingSoon
      title="Moment · single-moment surface · pending port"
      scope={scope}
      job="Single-moment deep dive — hero, valuation block (with rule adjustments), depth ladder (iter-3 component preserved), recent comps, parallels matrix, owner card."
      data="getMoment + valueMoment() + editionListedSerials + editionRecentSales + editionsForPlay. DepthLadder restored at components/DepthLadder.tsx."
      status="Substantial port pending in iter-6. The DepthLadder component is ready; the moment page shell + valuation block need a rebuild against the design system."
    />
  );
}
