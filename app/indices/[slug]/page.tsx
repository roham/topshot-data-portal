import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scope = `index slug ${slug}`;
  return (
    <ComingSoon
      title="Index · per-index page · coming soon"
      scope={scope}
      job="Index value over time, list of constituents with weight + current price + delta contribution, and methodology paragraph."
      data="lib/indices/registry.ts for the definition; per-constituent series from getSetPriceHistory (UNLOCK-01)."
      status="Scheduled for iter-6+. The /indices directory ships in the same iter."
    />
  );
}
