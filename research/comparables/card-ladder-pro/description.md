---
topic: comparable-card-ladder
side: target
kind: comparable
last_ingested: 2026-05-15T19:00:00Z
last_linted: 2026-05-15T19:05:19Z
source_iters: []
source_docs:
  - design/03-comp-anchors.md
  - iter/14-comp-anchors/card-ladder-deep-walk.md
confidence: medium
validity: live
superseded_by: null
contradictions: []
owner_writes: wiki-keeper
---
## Claim

Card Ladder is the **secondary anchor for per-category index pages** (`/index/[code]`, `/indices/[slug]`). Cloudflare-blocked WebFetch limited direct walking; evidence assembled from Google snippets + Zendesk methodology + marketing surface `cardladder.com/cl50`.

**Verified facts** (with VERIFIED / NOT CONFIRMED tags from `card-ladder-deep-walk.md`):
- CL50 = top-50-by-eligibility, sum/divide methodology à la pre-1928 Dow Jones, base 1,000 — **[VERIFIED via Zendesk]**
- 35 category indices spanning basketball / football / baseball / hockey / golf / soccer / gaming / Pokemon / One Piece / Marvel / TCG83 / Multi-Sport / UFC-MMA / Wrestling — **[VERIFIED via search snippets]**
- Card Ladder Value = card-to-player-index regression for missing-sale imputation — **[VERIFIED]**
- Custom indexes are desktop-only Pro feature, 5-100 cards each — **[VERIFIED]**
- Ladder Score = 14-day composite of $ change + % change + volume — **[VERIFIED]**
- Industry page produces externally-citable monthly volume ($416M Aug, $387M Sept) — **[VERIFIED]**
- Star Wars index page existence — **[NOT CONFIRMED IN THIS WALK]**

**Anchors:** `/index/[code]`, `/index/basketball` (the league-index pattern), the methodology page. **Does NOT anchor the homepage anymore** — TradingView outclasses it on density. Card Ladder's wedge is the per-category aggregated index page specifically.

**Dimensions to beat on `/index/[code]`:**
1. Every constituent edition listed with weight % + today's contribution to index Δ in basis points + per-constituent 1d sparkline — sortable by contribution desc
2. Rebalance transparency: last-rebalance date + what was added/dropped + the rule that triggered it
3. Exact formula in plain math + worked example using yesterday's values — beat Card Ladder's Zendesk-buried methodology by inlining it
4. Divisor history chart — index splits / re-bases visible with the size of each adjustment
5. **NEW:** named top holders of the index basket — surface the ownership-graph wedge that no equity index can show

**Dimensions to beat on `/indices` (full registry):**
1. Every index row shows constituent count + rebalance cadence + inception date — three columns Card Ladder doesn't have
2. Multi-horizon deltas in one row: 1h / 24h / 7d / 30d / YTD / since-inception, all visible without hover
3. Correlation column vs. headline TS500 (Pearson, 30d) — surfaces which indices are independent bets
4. CSV / JSON full-history download per index, no signup wall — Card Ladder requires Pro
5. Per-index liquidity column (median daily $ volume across constituents) — neither comp shows it

## Evidence

- design/03-comp-anchors.md §"Card Ladder per-category index pages → /index/[code]": full verified-facts table + dimensions-to-beat for `/index/[code]` and `/indices`.
- iter/14-comp-anchors/card-ladder-deep-walk.md: Cloudflare-blocked WebFetch outcomes + Google snippet evidence.

## Open questions

- Star Wars index existence not confirmed — pattern claim "35 categories" is search-snippet-derived but the specific category list has gaps. Probable: most major categories confirmed; long-tail not.
- Card Ladder Value (regression imputation) — is this a borrowed pattern the portal should adopt for thinly-traded editions? Probable yes given honest-absence doctrine. Not yet implemented.
- TS500 index — V3 iter-1 Block 6 reserved a TS500 cell but data shipped as `—`; "Canonical index live 2026-06-09" caption. Index pipeline timing critical to whether Card Ladder anchor stays useful.

## Last change

2026-05-15: initial seed. Confidence medium because Cloudflare-blocked walk limited direct verification; most facts via Zendesk + snippets.
