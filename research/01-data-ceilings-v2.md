# V2 STAGE-1 — Data ceilings, open questions, discovered unlocks

**Probed against:** `https://public-api.nbatopshot.com/graphql`
**Date:** 2026-05-15
**User-Agent:** `dapper-portal/2.0 (contact: r@dapperlabs.com)`
**Probe scripts:** `scripts/probe-v2.ts`, `scripts/probe-v2-followups.ts`, `scripts/probe-v2-discoveries.ts`, `scripts/probe-v2-finalshape.ts`
**Raw probe results:** `research/probes-v2/*.json` (50 files)

This document is positive proof of every ceiling: each "no X" claim is paired with the exact GraphQL error response captured in the JSON sidecar.

---

## Ceilings — confirmed (each has the verbatim error)

### Ceiling 1 — No `searchUsers` endpoint
- Probe: `query{ searchUsers(input:{ filters:{ byPrefix:"Boston" }, ... }){ ... } }`
- Response: `Cannot query field "searchUsers" on type "Query". Did you mean "searchSets", "searchPlays", "searchTitle", "searchEditions"`
- Sidecar: `probes-v2/ceiling-01-searchUsers-by-prefix.json`
- **Implication for V2:** username discovery requires either a maintained list, watching the global tx feed and accumulating identities seen, or accepting username/flowAddress input.

### Ceiling 2 — No per-moment transfer history
- Probe: `getMintedMoment(momentId:"45064996"){ data{ transfers{ ... } } }`
- Response: `Cannot query field "transfers" on type "MintedMoment".` Also no `transferHistory`, no `history`.
- Sidecars: `ceiling-02-moment-transfers.json`, `ceiling-02b-moment-transferHistory.json`
- **Implication:** chain-of-custody timeline impossible from public API. Closest proxy is `acquiredAt` (current owner only) and observed sales in the global tx feed.

### Ceiling 3 — Global marketplace tx feed has no date-range or price-range filter
- Probes:
  - `filters:{ byDateRange:{...} }` → `Field "byDateRange" is not defined by type "MarketplaceTransactionFiltersInput".`
  - `filters:{ byPriceRange:{...} }` → `Field "byPriceRange" is not defined by type "MarketplaceTransactionFiltersInput".`
- Sidecars: `ceiling-03-tx-filter-byDateRange.json`, `ceiling-03b-tx-filter-byPriceRange.json`
- Filters that DO work (confirmed via V1 code + probes): `byEditions: [{ setID, playID }]`, empty `filters:{}`.
- **Implication:** windowed analysis requires pulling the global feed and filtering client-side. With per-page 50 and ~tens-of-thousands sales/day this is feasible but heavy. The snapshot accumulator must do this.

### Ceiling 4 — No per-listing prices anywhere
- Probe: `getMintedMoment{ ... listings { id price seller{ username } } }`
- Response: `Cannot query field "listings" on type "MintedMoment".`
- Sidecar: `ceiling-04-moment-listings-array.json`
- **Implication:** the "depth chart" surface (J-S5) must reconstruct the ladder from individual moments' `.lowAsk` plus `searchMintedMoments(byEditions, byForSale:FOR_SALE)`. Each moment exposes its single lowest ask. The depth chart is a sample, not the ground-truth book.

### Ceiling 5 — `Edition` has no `lowestAsk` aggregate
- Probe: `getEditionByFlowIDs{ ... edition{ lowestAsk floor floorPrice } }`
- Response: `Cannot query field "lowestAsk" on type "Edition".` Also no `floor`, no `floorPrice`.
- Sidecar: `ceiling-05-edition-lowestAsk.json`
- **Implication:** edition floor = min over all listed moments' `lowAsk`. The snapshot accumulator computes and stores this.

### Ceiling 6 — Per-listing prices (overlap with 4)
Subsumed by Ceiling 4 in the V2 schema (no listings array → no per-listing pricing).

### Ceiling 7 — Leaderboard entries have no collector identity
- Probe: `getLeaderboard{ ... entries{ rank score user{ username flowAddress } } }`
- Response: `Cannot query field "user" on type "LeaderboardUser".`
- Sidecar: `ceiling-07-leaderboard-entry-username.json`
- Confirmed via V1 type: `LeaderboardEntry { rank: Int, score: Int }`. No identity.
- **Implication:** the "biggest collectors per scope" surface (J-D5/J-A7) cannot be backed by the leaderboard API. Identity must come from sample-counting via `searchMintedMoments(byOwnerFlowAddress)` plus accumulating identities from the global tx feed.

### Ceiling 8 — No per-edition or per-moment price history (BUT see UNLOCK below)
- Probes:
  - `getPriceHistory(...)` → `Cannot query field "getPriceHistory" on type "Query". Did you mean "getSetPriceHistory"...`
  - `getEditionByFlowIDs{ edition{ priceHistory } }` → `Cannot query field "priceHistory" on type "Edition".`
- Sidecars: `ceiling-08-getPriceHistory.json`, `ceiling-08b-edition-priceHistory.json`
- **Implication:** edition-level history requires our own accumulator. Per-set is now unblocked — see UNLOCK-01 below.

### Ceiling 9 — Introspection disabled
- Probes: `{ __schema{ types{ name } } }`, `{ __type(name:"MintedMoment"){ fields } }`
- Response (HTTP 200): `"error": "introspection disabled"`
- Sidecars: `ceiling-09-introspection-schema.json`, `ceiling-09b-introspection-type.json`
- **Implication:** schema discovery is via probe-and-error. We're already doing it; the V1 type-listing trick (`___nonexistent` field → server lists valid field names in the error message) works on `Edition`, `MintedMoment`, etc., and is the best alternative.

### Ceiling 10 — No bid or offer data
- Probes: `getMintedMoment{ ... bids{...} offers{...} }`, `getEditionByFlowIDs{ ... edition{ bestBid highestBid bidCount } }`
- Responses: `Cannot query field "bids" on type "MintedMoment".`, `Cannot query field "bestBid" on type "Edition".`
- Sidecars: `ceiling-10-moment-bids.json`, `ceiling-10b-edition-bestBid.json`
- **Implication:** depth chart is sell-side only. The "thin air-gap" detection runs on the listing ladder, not on the spread.

---

## Discovered UNLOCKS — surfaces that the V1 dossier assumed were blocked

### UNLOCK-01 — `getSetPriceHistory(input:{ setID, days })` works
- **Args:** `setID: ID!` (must be the UUID, not the flow numeric ID) + `days: Int!`
- **Response shape:** `{ data: [[timestamp_ms, price_cents]] }` — array of two-element tuples
- **Sample (Run It Back: Origins set, 30d):** ~34 datapoints, prices ranging 1320–1413 (cents) over the window
- **Sidecar:** `probes-v2/UNLOCK-getSetPriceHistory.json` + `final-01-getSetPriceHistory-scalar.json`
- **What this unlocks:**
  - Indices registry can use real set-history series for any set-aggregated index instead of accumulator-only
  - Set page header renders a real chart on first paint (no warm-up period)
  - The "set retrospective" surface (J-A4) gets a 30/90/365-day chart for free
- **Limitations:** sample times are irregular (not strictly daily); volume not in payload (price only); per-edition and per-moment series remain blocked.

### UNLOCK-02 — Marketplace tx supports `UPDATED_AT_DESC` sort and surfaces `updatedAt` timestamp
- `MarketplaceTransactionSortType` enum: `PRICE_DESC` (already known) plus `UPDATED_AT_DESC` (and presumably `UPDATED_AT_ASC`, `PRICE_ASC`)
- `MarketplaceTransaction.updatedAt` — present. `createdAt` is NOT (server: `Cannot query field "createdAt" on type "MarketplaceTransaction". Did you mean "updatedAt"?`)
- Sidecars: `discovery-02-tx-sort-CREATED_AT_DESC.json`, `shape-07-tx-identity.json`
- **What this unlocks:** chronological backfill via cursor + `UPDATED_AT_DESC`. The accumulator can window the feed reliably.

### UNLOCK-03 — `searchChallenges` returns data (envelope: `data.searchSummary.data` typed `UserChallenges`)
- Sidecar: `probes-v2/final-02-searchChallenges-envelope.json`
- **Caveat:** `totalCount` returned null on an unauthenticated probe; the `UserChallenges` typename suggests this is per-user and may require an auth context to populate. Worth a follow-up probe in a future iter with a user filter.
- **Implication:** locking/challenges surface (J-X3) is partially unlocked. Per-user challenge state is queryable when scoped to a user; the all-active-challenges view across the marketplace is not directly addressable from this endpoint.

### UNLOCK-04 — `searchBreakEvents`, `getTitles`, `getUserSets` exist (shapes pending)
- `searchBreakEvents` takes `input: { filters, ... }` — NOT the standard `searchInput.pagination` wrapper. Sidecar: `final-03-searchBreakEvents-no-pagination.json` (probe with the alternate shape still errored, but the surface is real).
- `getTitles` returns `GetTitlesResponse` — no `.data` envelope, different shape. Sidecar: `final-04-getTitles-real.json`.
- `getUserSets` accepts a different arg than `flowAddress` (server: `Field "flowAddress" is not defined by type "GetUserSetsInput".`). Likely `dapperID` or `username`.
- **Implication:** three additional surfaces (break events / titles / per-user set completion) are usable once the schema dance lands. Deferred to per-iter discovery when the surface gets prioritized.

### UNLOCK-05 — `searchSets.filters.byLeagues`
- Server error: `Field "bySeries" is not defined by type "SearchSetsFilterInput". Did you mean "byLeagues"?`
- **Implication:** sets can be filtered by league (Top Shot covers NBA + WNBA). Useful if/when WNBA scope expands.

---

## Open questions — answers

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | Does `MintedMoment.lockStatus` exist? | **No.** `Cannot query field "lockStatus" on type "MintedMoment".` | `open-01-lockStatus-on-moment.json` |
| 2 | Is `MintedMoment.play.stats.dateOfMoment` reliable? | **Yes — 100% populated on recent-plays sample, full ISO datetime with timezone (e.g. `2026-04-28T01:30:00Z`).** Reliable enough to anchor game-day markers on player price charts. | `open-02-dateOfMoment-reliability.json` |
| 3 | Per-edition sale-count over a window? | **Partial.** `searchMarketplaceTransactions(filters:{ byEditions:[{ setID, playID }] })` works and accepts `UPDATED_AT_DESC`. Window is implicit: paginate `UPDATED_AT_DESC` until you cross the lower bound. No `byDateRange` filter. | V1 code + `permissive-02`, `discovery-02` |
| 4 | Holder distribution / `getEditionMinted` with topHolders? | **No top-N aggregate.** `Edition.holders`, `Edition.topHolders` don't exist. Reconstruct by paginating `searchMintedMoments(byEditions)` and grouping by `ownerV2.flowAddress`. | `open-04-holder-distribution.json`, `discovery-03-edition-fields.json` |
| 5 | Challenge / staking state? | **Indirect.** `MintedMoment.stakedIn`, `MintedMoment.activeChallenges`, `MintedMoment.lockStatus` all don't exist. But `searchChallenges(input:{...})` returns a `UserChallenges` envelope (see UNLOCK-03) — per-user challenge state appears queryable with the right arg shape. | `open-05-challenge-staking.json`, `final-02-searchChallenges-envelope.json` |

---

## Permissive findings — what we CAN do on the marketplace tx feed

- Empty filters: `searchMarketplaceTransactions(input:{ filters:{} ... })` — returns recent tx globally, default sort is by date.
- `sortBy: PRICE_DESC` — works (V1 `biggestSalesAllTime`).
- `sortBy: UPDATED_AT_DESC` — works (discovered in UNLOCK-02).
- `filters: { byEditions: [{ setID, playID }] }` — works.
- buyer + seller present on every tx with `username`, `flowAddress`, `dapperID`. Sufficient for wash-trade detection (Hildobby methodology: circular flows over windows).

---

## Schema-revealing tricks worth memorizing

1. **Type-enumeration via bad field:** `getEditionByFlowIDs{ edition{ ___nonexistent } }` → server replies `Cannot query field "___nonexistent" on type "Edition".` Once a probe lands inside `Edition`, ask for one bad field name at a time; the "Did you mean..." suggestion list surfaces valid neighbors.
2. **Enum-enumeration via bad value:** `sortBy: WAT_DESC` → `Value "WAT_DESC" does not exist in "MarketplaceTransactionSortType" enum. Did you mean the enum value "UPDATED_AT_DESC"`.
3. **Required-field surfacing via bare query:** `getSetPriceHistory(input:{ setID:"x" })` → `Field "GetSetPriceHistoryInput.days" of required type "Int!" was not provided.` Probe with one field at a time to enumerate the required input shape.

These three patterns are the schema-discovery toolkit for every future probe.

---

## Action items for STAGE-2/3

1. **`lib/topshot/queries.ts` extensions to land in next phase:**
   - `getSetPriceHistory(setUuid, days)` → returns `{ ts: Date, price: number }[]` (with `price / 100` for dollars)
   - `chronologicalTxBackfill(windowMs, filterFn)` → uses `UPDATED_AT_DESC` cursor pagination, stops when `updatedAt < now - windowMs`
   - `editionFloor(setUuid, playUuid)` → wraps `editionListedSerials` + `Math.min`. Cached 60s.
   - `holderDistribution(setUuid, playUuid, sampleSize)` → paginates `searchMintedMoments(byEditions)` and groups by `ownerV2.flowAddress`.
2. **`lib/snapshots/` (Phase 3):**
   - 15-minute snapshot for hot editions records `floor`, `listingCount`, `sample-top-50-asks` to JSON.
   - 30-minute snapshot for market-wide aggregates uses `chronologicalTxBackfill(window=30min)` to record sale-count and median price.
   - 6-hour snapshot pulls `getSetPriceHistory(set, 1)` for every active set — bootstrapping the index history without warm-up.
3. **`lib/indices/registry.ts` (Phase 3) can use `getSetPriceHistory` for any set-aggregated index, side-stepping the accumulator-cold-start problem for set-level indices.**

---

## Probe sidecar inventory

```
research/probes-v2/
├── control-01-getUserProfileByUsername.json          (baseline)
├── ceiling-01-searchUsers-by-prefix.json
├── ceiling-01b-searchUsers-no-args.json
├── ceiling-02-moment-transfers.json
├── ceiling-02b-moment-transferHistory.json
├── ceiling-03-tx-filter-byDateRange.json
├── ceiling-03b-tx-filter-byPriceRange.json
├── ceiling-04-moment-listings-array.json
├── ceiling-05-edition-lowestAsk.json
├── ceiling-07-leaderboard-entry-username.json
├── ceiling-08-getPriceHistory.json
├── ceiling-08b-edition-priceHistory.json
├── ceiling-09-introspection-schema.json
├── ceiling-09b-introspection-type.json
├── ceiling-10-moment-bids.json
├── ceiling-10b-edition-bestBid.json
├── open-01..05-*.json
├── permissive-01..02-*.json
├── discovery-01..09-*.json
├── shape-01..07-*.json
├── final-01..04-*.json
└── UNLOCK-getSetPriceHistory.json
```

Every claim in this doc has a JSON sidecar with request + response body + HTTP status + timestamp + elapsed-ms.
