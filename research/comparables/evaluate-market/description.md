---
topic: comparable-evaluate-market
side: target
kind: comparable
last_ingested: 2026-05-15T19:00:00Z
last_linted: 2026-05-15T19:05:19Z
source_iters: []
source_docs:
  - research-v2/03-defunct-topshot-analytics.md
confidence: high
validity: live
superseded_by: null
contradictions: []
owner_writes: wiki-keeper
---
## Claim

**Evaluate.market (evaluate.xyz)** was the financialized, Bloomberg-shaped data terminal of the Top Shot ecosystem — opened early 2021, $4M seed in early 2022 from Rho Capital's Ignition Fund + Drive by DraftKings + Castle Island + Arca + Notation + Flamingo + **Dapper Labs** + Visary + Niche Capital + Dan Nova. Grew to 11 people. Expanded from Top Shot into 800+ ETH collections. **Rebranded to evaluate.xyz November 16, 2022.** Both domains dead as of 2026-05-14. **Pro Trader persona is mostly EM-shaped.**

**Surfaces shipped:**
- `/` — collection ticker, top-supported-collections grid (market cap, floor, 24h % change)
- `/moments` — every Moment with valuation, market cap, sales data
- `/editions` — per-edition deep dives (sales/listings charts, % in circulation, traits)
- `/sets` — per-set rollup
- `/marketmovers` — filterable leaderboard (Avg Floor Today, % Change 24h, Floor Volume)
- `/accounts`, `/accountValuation` — collector portfolio at permanent URL
- `/nbatopshot/indices` — **the Indices page** — Bloomberg-shaped "S&P 500 of Top Shot" with market cap, floor index, segment indices (S1/S2/Rookies/Stars). Most-ambitious surface; client-rendered chart data not captured in Wayback.
- `/nbatopshot/content` — curated content tab
- `/portfolio` — multi-wallet, multi-chain aggregator (Flow + Ethereum, USD totals, per-collection)
- Mirrors for NFL All Day, BAYC, Ballerz, Doodles, etc.

**Specific features:**
1. Account Valuation engine — True Value per moment, USD totals, per-moment P&L vs purchase price
2. Market Cap per Moment — total market cap, % owned, % of packs, sale-price + volume trends
3. Market Movers — discovery primitive for spike/breakout detection
4. Indices — composite trackers (Top Shot S&P-style)
5. Profit/Loss charting — all-time, 90-day, 30-day, 7-day periods
6. Collector Leaderboards — per-collection, named identity
7. Rarity rankings + trait drill-down — volume data across multiple timeframes
8. CSV export

**What killed EM:**
- Ad/donation/sub revenue couldn't sustain a team while Top Shot DAUs collapsed
- Data ceiling Dapper held — no transfer history, no per-listing price, no real-time bid/offer — meant EM was always backing out the same surface from constrained public source
- Once Top Shot shipped first-party tooling (Top Shot Score, locking, leaderboards), third-party version lost value

**Lessons for V2/V3/V4:** EM nailed depth — per-moment market cap, % in circulation, indices, multi-wallet portfolio, USD-vs-DUC, profit/loss graphs over 7/30/90/all. **The portal can directly adopt these — and outclass on the ownership-graph wedge that EM had (named identity at user-page level) but couldn't fully exploit.**

## Evidence

- research-v2/03-defunct-topshot-analytics.md §1 + §2: full surface inventory + feature spec + $4M seed funding announcement.
- research-v2/03-defunct-topshot-analytics.md §2.2: 8 numbered specific features with substack + bydfi citations.
- research-v2/03-defunct-topshot-analytics.md §1 conclusion: "Pro Trader persona is mostly EM-shaped."

## Open questions

- The Indices page was the most ambitious surface but chart data was never captured in Wayback. What was the actual constituent list of EM's indices? Lost to history; the portal must define from first principles (see target/concepts/rationale-per-choice.md).
- True Value engine — EM's per-moment valuation model. Open question: was it published / open-sourced anywhere? Probable: closed-source. The portal's J-P7 (transparent rules engine) is the answer to "what if True Value were inspectable."
- Did EM offer embedabbles? Not documented; probable no.

## Last change

2026-05-15: initial seed. EM is the "Pro Trader persona is mostly EM-shaped" historical foundation.
