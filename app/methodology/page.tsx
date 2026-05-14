export const dynamic = "force-static";

export default function MethodologyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 prose prose-invert">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Methodology</h1>
      <p className="text-[var(--text-dim)] mb-6 text-sm">
        What this portal does, what it can&apos;t, and where every number comes from.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mt-6 mb-2">The data source</h2>
        <p className="text-sm leading-7 text-[var(--text-dim)]">
          Every number on this site comes from <code className="font-mono text-[var(--accent)]">public-api.nbatopshot.com/graphql</code>, the
          public NBA Top Shot GraphQL endpoint. It&apos;s unauthenticated. There are no private feeds, no proprietary scrapers, and no Dapper-internal channels feeding this portal.
          Everything you see, you could pull yourself with curl.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mt-6 mb-2">What we can show</h2>
        <ul className="text-sm leading-7 text-[var(--text-dim)] list-disc pl-5 space-y-1">
          <li><strong>Live sales</strong> — `searchMarketplaceTransactions` with global filter. Newest first, 30-second cache.</li>
          <li><strong>Per-serial floor</strong> — `MintedMoment.lowAsk` (USD). When `forSale` is true, this is the lowest-ask price for that specific minted serial.</li>
          <li><strong>Last sale</strong> — `MintedMoment.lastPurchasePrice` (USD) at `acquiredAt`.</li>
          <li><strong>Edition metadata</strong> — circulationCount, parallelID, tier, set, play.</li>
          <li><strong>Owner identity</strong> — when the wallet is Dapper-custodial we get username + profile image. Self-custody wallets show only the flow address.</li>
          <li><strong>Score ladder</strong> — `getLeaderboard(kind: PLAYER|TEAM, ...)`. Ranks and scores only — collector identities are intentionally withheld by the API.</li>
          <li><strong>Bag pulls</strong> — `searchMintedMoments(byOwnerFlowAddress)` paginated; up to 200 moments are pulled on the first load.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mt-6 mb-2">What we can&apos;t show (yet)</h2>
        <ul className="text-sm leading-7 text-[var(--text-dim)] list-disc pl-5 space-y-1">
          <li><strong>Full transfer history per moment.</strong> The public API exposes <em>acquiredAt</em> for the current owner only. Prior holders are reachable via Flowscan but not via this API.</li>
          <li><strong>Per-edition floor in a single call.</strong> `Edition.lowestAsk` doesn&apos;t exist. We estimate floor by sampling listed serials.</li>
          <li><strong>Sales filtered by player or edition.</strong> `MarketplaceTransaction` filters are global — no `byFlowID`, no `byEditions`, no `byPlayers`.</li>
          <li><strong>Username from a leaderboard rank.</strong> `LeaderboardEntry` returns `rank` and `score`, nothing else.</li>
          <li><strong>Live username search.</strong> No `searchUsers` query exists. You must know the exact username or the flow address.</li>
          <li><strong>Marketplace listings detail.</strong> `MomentListing` exposes only `id` on the public schema; per-listing price is not surfaced (we use `MintedMoment.lowAsk` instead).</li>
        </ul>
        <p className="text-sm text-[var(--text-dim)] mt-3">
          Where the data isn&apos;t there, we say so. We don&apos;t invent it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mt-6 mb-2">The valuation engine</h2>
        <p className="text-sm leading-7 text-[var(--text-dim)]">
          See <a href="/rules" className="text-[var(--accent)] underline">/rules</a> for the full editable rules engine and a set of sample moments that re-value live.
          The engine is a pure function: <code className="font-mono">valueMoment(moment, marketContext, rules)</code>.
          Every adjustment is recorded with a rationale — no hidden multipliers. Confidence bands depend on the count of recent comps and the base-price source.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mt-6 mb-2">Caching and freshness</h2>
        <ul className="text-sm leading-7 text-[var(--text-dim)] list-disc pl-5 space-y-1">
          <li>Recent sales: 30s server cache, SWR 300s.</li>
          <li>Bag pulls: 60s server cache per cursor.</li>
          <li>Static metadata (`allPlayers`, edition details): 24h.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mt-6 mb-2">Honesty notes</h2>
        <ul className="text-sm leading-7 text-[var(--text-dim)] list-disc pl-5 space-y-1">
          <li>This site is not affiliated with Dapper Labs or NBA Top Shot. It&apos;s built on top of the same public API that any third-party tool uses.</li>
          <li>The valuation engine is a heuristic. It does not predict future price; it adjusts a base observation by collector-grade premiums.</li>
          <li>2021–2022 happened. Bags down 80–90% are common. Numbers here reflect today&apos;s market, not yesterday&apos;s euphoria.</li>
        </ul>
      </section>
    </article>
  );
}
