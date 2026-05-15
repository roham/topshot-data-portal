import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = `set id ${id}`;
  return (
    <ComingSoon
      title="Set · per-set surface · pending port"
      scope={scope}
      job="Per-set deep dive — 30-day VWAP chart (iter-1 component preserved), edition list by tier × parallel, recent activity, plays directory."
      data="setDetail + editionsInSet + getSetPriceHistory + recentSalesBulk filtered to the set's flowName."
      status="Substantial port pending in iter-5. The SetPriceChart component is ready at components/SetPriceChart.tsx; the page shell needs a rebuild against the design system."
    />
  );
}
