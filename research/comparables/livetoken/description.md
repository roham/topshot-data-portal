---
topic: comparable-livetoken
side: target
kind: comparable
last_ingested: 2026-05-15T19:00:00Z
last_linted: 2026-05-15T19:05:19Z
source_iters: []
source_docs:
  - research-v2/04-current-topshot-analytics.md
confidence: high
validity: live
superseded_by: null
contradictions: []
owner_writes: wiki-keeper
---
## Claim

**LiveToken (livetoken.co)** is the **de facto Pro Trader tool** in the Top Shot ecosystem in May 2026. Free. Vue.js SPA. Built by a single dev ("Bonfire" — also runs Pieland NFT project). **October 2024 official partnership with Top Shot** for the Offer Terminal. Telegram alerts. Android app.

**Routes (extracted from decompiled JS):**
- `/` — home / live sales feed
- `/listings`, `/listings/auctions` — listings firehose + auction sub-view
- `/deals` — sniping tool (gap-to-FMV ranking)
- `/offers` — **Offer Terminal** (official Top Shot partnership)
- `/challenges` — Showcase Challenge tracker
- `/community-tools/fastfingers`, `/account-lookup`, `/top-gifters`, `/odd-sales`
- `/leaderboards` — collector + account leaderboards
- `/goto/:linkType/:payload` — universal moment/account permalink
- `/m/:code` — short-link redirector

**Feature inventory:**
- Live Sales Feed — every transaction real-time
- Listings firehose — every active listing
- Deals / Snipe tool — discounted listings ranked by gap to FMV
- Offer Terminal (Top Shot-partnered) — most-offered moments, largest offer/ask spread, per-moment offer activity
- Showcase Challenge tracker — eligible moments owned vs required, progress %, cost-to-complete
- Portfolio — moment, serial, tier, cost basis, current value, P&L (realized + unrealized), ROI, time-since-purchase, total portfolio valuation, sort/filter, **CSV export**
- Fast Fingers — pack-pull / drop / snipe speed leaderboard
- Top Gifters — leaderboard of users who give away the most moments
- Odd Sales — anomaly detector for wash trades / gifts / mispricing
- Telegram alerts — out-of-band price-drop alerts
- Plotly popup charts — high-density scientific-grade charts (significant choice over Recharts/Chart.js)
- Series + WNBA support — Series 1-4, 2023-24, 2024-25, 2025-26

**JTBD coverage (Persona 2 Pro Trader):**
- P&L = YES
- Market depth = PARTIAL (offers visible, no full asks ladder UI)
- Floor compression = NO
- Top movers with delta context = YES
- Watched-wallet feeds = YES (Account Lookup)
- Transparent valuation = **NO (FMV is opaque)**
- Set completion with cost-to-complete = YES (Challenges)
- CSV export = YES

**Wedge for the portal vs LiveToken:**
1. **Transparent valuation** (J-P7) — LiveToken's FMV is a black box; portal's `/rules` is editable + inspectable.
2. **Per-moment market depth visualization** (J-P2) — order-book-style asks ladder; LiveToken shows offers but no full asks ladder UI.
3. **Per-parallel insights** — parallels are first-class in Top Shot taxonomy but LiveToken doesn't treat them as such (per research-v2/04 §4 "What the ecosystem does NOT cover").
4. **Magazine-density editorial layouts** — LiveToken defaults to spreadsheet-density.
5. **Player-anchored / team-anchored narrative bundling** — entirely missing from LiveToken.
6. **Shareable artifact generation** — collector callouts as cards, moment-of-the-day; LiveToken has no shareables surface.

**Reference for what's possible:** LiveToken is the proof that a single-dev free tool can hold the Pro Trader market in this ecosystem. The portal's bar is "outclass LiveToken on transparency + depth + ownership-graph identity."

## Evidence

- research-v2/04-current-topshot-analytics.md §2.1 "LiveToken (livetoken.co) — THE Pro Trader Tool": full feature inventory, route table, JTBD coverage matrix.
- research-v2/04-current-topshot-analytics.md §1: "LiveToken — the de facto Pro Trader tool. October 2024 official partnership with Top Shot for the Offer Terminal."
- research-v2/04-current-topshot-analytics.md §4 "Specific Gaps in the Ecosystem — V2's Opening": full gap list including transparent valuation methodology, per-parallel insights, magazine-density.

## Open questions

- LiveToken FMV model — opaque. The portal's J-P7 rules engine is the answer, but is the portal's user willing to switch from a free trusted brand? Probable answer: power users yes (because tunable), casual no.
- LiveToken's Plotly charts vs the portal's Recharts/visx — Plotly is heavier but more scientific. Trade-off intentional in design/00 §4.4? Probable: visx chosen for finer-grained control on dense Trader surfaces.
- The Offer Terminal is Top Shot-partnered. Does the portal have any path to official partnership? Out of scope here.

## Last change

2026-05-15: initial seed. LiveToken is the live competitive bar in the ecosystem; "outclass on transparency + depth + ownership-graph" is the wedge.
