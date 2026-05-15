import { Card } from "@/components/primitives/Card";

export const metadata = { title: "Methodology · TS·PORTAL" };

export default function MethodologyPage() {
  return (
    <div className="max-w-[1080px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Methodology</h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1">
          Every claim this portal makes is built on the public Top Shot GraphQL API at <code className="font-mono text-[var(--text)]">public-api.nbatopshot.com/graphql</code> and the
          snapshot accumulator running on GitHub Actions. This page documents what the API exposes, what it doesn&apos;t,
          and how we reconstruct what&apos;s missing. If a number on this site doesn&apos;t match what you compute yourself,
          the methodology here is the audit trail.
        </p>
      </header>

      <Card title="The 10 public-API ceilings · what is structurally not available">
        <div className="space-y-2 text-[12px] leading-relaxed">
          <p className="text-[var(--text-dim)]">
            Each ceiling was confirmed against the live API with a probe whose raw response is stored in the repo at{" "}
            <code className="font-mono text-[var(--text)]">research/probes-v2/</code>. Negative findings require positive proof — the JSON sidecars are it.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-[var(--text)]">
            <li><span className="font-mono text-[var(--text-dim)]">C1</span> · <span className="font-semibold">No <code className="font-mono">searchUsers</code> endpoint.</span> Username discovery requires either an explicit input or the accumulator scanning the global tx feed for identities seen as buyers and sellers.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C2</span> · <span className="font-semibold">No per-moment transfer history.</span> Chain-of-custody timelines are impossible from the public API. The closest proxy is <code className="font-mono">acquiredAt</code> (current owner only).</li>
            <li><span className="font-mono text-[var(--text-dim)]">C3</span> · <span className="font-semibold">The global marketplace-transactions feed has no date-range or price-range filter.</span> Windowed analysis pages the feed via <code className="font-mono">UPDATED_AT_DESC</code> cursor pagination until the cutoff is crossed.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C4</span> · <span className="font-semibold">No per-listing prices.</span> <code className="font-mono">MintedMoment.listings</code> doesn&apos;t exist. The depth ladder reconstructs the book by sampling <code className="font-mono">searchMintedMoments(byEditions, byForSale:FOR_SALE)</code> and reading each moment&apos;s single <code className="font-mono">lowAsk</code>.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C5</span> · <span className="font-semibold">No <code className="font-mono">Edition.lowestAsk</code> aggregate.</span> Edition floor = min(listed serials&apos; <code className="font-mono">lowAsk</code>) computed on demand and snapshotted by the accumulator.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C7</span> · <span className="font-semibold">Leaderboard entries are anonymous.</span> The API exposes <code className="font-mono">{`{ rank, score }`}</code> only — no collector identity. Biggest-collectors surfaces reconstruct identity from the global tx feed.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C8</span> · <span className="font-semibold">No per-edition or per-moment price history.</span> Set-level history IS available (see UNLOCK-01 below); deeper granularity needs the accumulator.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C9</span> · <span className="font-semibold">GraphQL introspection is disabled.</span> Schema discovery happens via probe-and-error; the field-enumeration trick (asking for <code className="font-mono">___nonexistent</code> returns the suggestion list) is the working substitute.</li>
            <li><span className="font-mono text-[var(--text-dim)]">C10</span> · <span className="font-semibold">No bid or offer data.</span> The depth ladder is sell-side only. We do not synthesize a bid side; inventing one would be fraud.</li>
          </ol>
        </div>
      </Card>

      <Card title="The 5 discovered unlocks · what we found beyond the V1 dossier">
        <ol className="list-decimal pl-5 space-y-1 text-[12px] text-[var(--text)] leading-relaxed">
          <li><span className="font-mono text-[var(--text-dim)]">U1</span> · <code className="font-mono">getSetPriceHistory(input:{`{ setID, days }`})</code> returns <code className="font-mono">[[ts_ms, price_cents]]</code> — real set-level price history. Unlocks every set page chart and seeds the indices registry. <span className="text-[var(--text-faint)]">setID must be the UUID, not the numeric flowId.</span></li>
          <li><span className="font-mono text-[var(--text-dim)]">U2</span> · <code className="font-mono">searchMarketplaceTransactions(sortBy: UPDATED_AT_DESC)</code> enables chronological backfill. Tx have <code className="font-mono">updatedAt</code> (no <code className="font-mono">createdAt</code>).</li>
          <li><span className="font-mono text-[var(--text-dim)]">U3</span> · <code className="font-mono">searchChallenges</code> returns a <code className="font-mono">UserChallenges</code> envelope — appears auth-scoped; a follow-up probe with an authenticated session is pending.</li>
          <li><span className="font-mono text-[var(--text-dim)]">U4</span> · <code className="font-mono">searchBreakEvents</code>, <code className="font-mono">getTitles</code>, <code className="font-mono">getUserSets</code> exist with non-standard input shapes; deferred to per-iter exploration.</li>
          <li><span className="font-mono text-[var(--text-dim)]">U5</span> · <code className="font-mono">searchSets.filters.byLeagues</code> exists (server hint via the <code className="font-mono">bySeries</code> error); WNBA-scope filtering ready when needed.</li>
        </ol>
      </Card>

      <Card title="The snapshot accumulator · what is being recorded right now">
        <div className="space-y-2 text-[12px] text-[var(--text)] leading-relaxed">
          <p className="text-[var(--text-dim)]">
            Six GitHub Actions workflows write JSON snapshots to <code className="font-mono">.snapshots/{`{cadence}`}/{`{timestamp}`}.json</code> on the
            production repo. The cadences began firing on 2026-05-15. Render-side reads come from{" "}
            <code className="font-mono">raw.githubusercontent.com</code> with a 60s edge cache; no token required.
          </p>
          <table className="text-[11px] w-full">
            <thead className="border-b border-[var(--border-subtle)]">
              <tr className="text-left">
                <th className="py-1 text-[10px] tracking-data-label text-[var(--text-faint)]">Cadence</th>
                <th className="py-1 text-[10px] tracking-data-label text-[var(--text-faint)]">Schedule</th>
                <th className="py-1 text-[10px] tracking-data-label text-[var(--text-faint)]">What it records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              <tr><td className="py-1.5 font-mono">hot</td><td className="py-1.5 font-mono">*/15 * * * *</td><td className="py-1.5">top-30 hot editions by recent tx-feed observed sales</td></tr>
              <tr><td className="py-1.5 font-mono">warm</td><td className="py-1.5 font-mono">0 * * * *</td><td className="py-1.5">sets at ranks 30–200 by 500-tx-window count</td></tr>
              <tr><td className="py-1.5 font-mono">market</td><td className="py-1.5 font-mono">*/30 * * * *</td><td className="py-1.5">30-minute market aggregate — tx count, unique buyers/sellers, median/mean price, top players/sets by volume</td></tr>
              <tr><td className="py-1.5 font-mono">players</td><td className="py-1.5 font-mono">5,35 * * * *</td><td className="py-1.5">per-player rollup — distinct editions, median recent sale, recent sale count</td></tr>
              <tr><td className="py-1.5 font-mono">portfolios</td><td className="py-1.5 font-mono">10,40 * * * *</td><td className="py-1.5">watchlist portfolios — first-page bag pull, estimated value, top holdings (only fires when PORTFOLIO_WATCHLIST is set)</td></tr>
              <tr><td className="py-1.5 font-mono">nba-games</td><td className="py-1.5 font-mono">0 */6 * * *</td><td className="py-1.5">prior-day NBA games and scores via balldontlie.io</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Honest-absence pattern" methodology="No surface on this portal fabricates data. When the API returns nothing or the accumulator hasn't yet reached enough depth, we say so in the surface itself.">
        <ul className="text-[12px] text-[var(--text-dim)] space-y-1 list-disc pl-5">
          <li>Charts gated on accumulator depth render the words <span className="text-[var(--text)]">&ldquo;accumulating since 2026-05-15&rdquo;</span> until the series is meaningful.</li>
          <li>The depth ladder labels itself <span className="text-[var(--text)]">&ldquo;asks-only — Top Shot does not expose bids&rdquo;</span> on every render.</li>
          <li>Empty states give the trader a concrete next action, not a sad face.</li>
          <li>Every chart card has a methodology caption naming the API call and the constraint.</li>
        </ul>
      </Card>
    </div>
  );
}
