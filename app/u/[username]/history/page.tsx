import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const scope = `for ${username}`;
  return (
    <ComingSoon
      title="History · per-user portfolio time series · coming soon"
      scope={scope}
      job="Portfolio value over time for this collector — only as deep as the snapshot accumulator has been running this address."
      data="30m-portfolio cron (writes when PORTFOLIO_WATCHLIST contains the address) + per-user activity replay from the market accumulator."
      status="Gated on adding this address to PORTFOLIO_WATCHLIST. Until then, render 'accumulating since {first-snapshot}' once the first snapshot lands."
    />
  );
}
