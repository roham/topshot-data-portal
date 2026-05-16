# Comp-Diff: OTM (dead reference) vs Top Shot Data Portal (current state)

**Date:** 2026-05-16
**Authored by:** Dexter
**Reference screenshots:** `research/otm-screenshots/`
**Live portal:** https://topshot-data-portal.vercel.app

This document enumerates every OTM signature feature, the screenshot that shows it, the portal's current state for that feature, and the gap. The judge consults this when grading a feature pass/fail. The builder consults this when designing the thin slice. Updated whenever a feature flips `passes: true`.

---

## 1. Filterable Moments grid (`research/otm-screenshots/10-filterable-moments-grid.png`)

**OTM shape:** Persistent left rail (Owned / Player / Team / Current Team / Tier / Badges / Price / Circulation / League — each collapsible accordion). EXPORT button top-left. Right-side table with column headers: MOMENT / #OWNED / LOCKED / CIRC. / %CIR. Each row ~64px high, dark slate background, the moment thumb is a left-aligned circle, then play description + set, then green check + multiplier badge for #OWNED, then a lock-count badge, then CIRC absolute, then %CIRC.

**Portal current state:** `/moments` returns **404**. Route does not exist.

**Gap:** Total. The OTM centerpiece has zero surface here.

**Action item:** `features.json → moments-grid` (priority 1).

---

## 2. Moment detail with working time tabs (`research/otm-screenshots/08-moment-detail-large-cap.png`, `09-moment-detail-low-cap.png`)

**OTM shape:** Top bar with Search Moment input, hero crumb (player → set → team), BUY (TS) and BUY (other) buttons. Below: left column = hero image, "Common · #4,000 LE" tier+circulation, player name with NBA logo, play category icons, set name. Below hero: "Search True Value by serial" input. Below that: pricing block with Low Ask, 4h/24h/7d % deltas (color-coded), Average Sale Price, Highest Offer, 24h Sales, 7d Sales. Below pricing: CIRCULATION block — Owned absolute + %, Listings absolute + %, Owned (locked) absolute + %, In a Pack absolute + %, Locker Room absolute + %, Burned absolute + %.

Right column: time tabs (1D / 7D / 1M / 3M / YTD / ALL — bold currently-selected). Big price chart underneath. Below chart: sale-price histogram (small bars, x-axis = $ buckets, y-axis = sale count, color-coded by recent vs older).

**Portal current state:**
- Route `/moment/[flowId]` exists. Header + depth ladder rendering.
- Time tabs visible in the URL contract but per handover Section 2B: "**Missing**: time-period chart with working tabs (1D/7D/1M/3M/YTD/ALL), the OTM-signature feature."
- "**Missing**: circulation breakdown (owned/listed/locked/in-pack/burned percentages)."
- "**Missing**: price-bucket histogram."
- "**Missing**: 'Search True Value by serial' (per-serial valuation overlay)."

**Gap:** Surface exists; **four of five OTM-signature components missing**. The most-trafficked detail page is partial.

**Action items:** `moment-detail-chart` (priority 2), `moment-detail-circulation` (priority 3), `moment-detail-histogram` (priority 8), `moment-detail-serial-overlay` (priority 9).

---

## 3. Market Players view with MARKET CAP (`research/otm-screenshots/04-players-marketcap-leaderboard.png`)

**OTM shape:** Sidebar with sport-toggle (NBA logo + TS logo). Tabs: Moments / Sets / Teams / Players / Special Serials. Filter rail left: Active Players (open), Owned (collapsed), Player (collapsed), team-multi-select (Boston Celtics, Miami Heat shown as chips), League. Right table: MARKET (toggle) / STATS (toggle) at top. Columns: # / Player photo / Player name / #OWNED / MOMENTS / C / R / L / F / MAX MINT / MINTED / CIRC.% / **MARKET CAP** ($ formatted) / 24H Δ% (green/red).

Sample rows: Jayson Tatum 27 moments, 11/9/6/1 CRLF, 60,000 max mint, 203,245 minted, 85% circ, $8.58M market cap, +2.02% 24h.

**Portal current state:** `/players` returns "Players · directory · coming soon" stub. No MARKET CAP column visible anywhere in the product.

**Gap:** Total for the leaderboard; the MV `mv_player_market_cap` exists per handover but nothing surfaces it.

**Action item:** `players-marketcap` (priority 4), `players-directory` (priority 10).

---

## 4. Set detail with completion histogram (`research/otm-screenshots/07-set-completion-histogram.png`)

**OTM shape:** Header: set logo + name "WNBA: Best of 2021", tier badge "Common · 56 moments". KPI strip: Low Ask $312, 4h +2.3%, 24h +4%, 7d +34.48%, 24h Sales 506, 7d Sales 3,775, My Progress 56/56 (green progress bar), Cost $0. Below: time tabs 1D/7D/1M/3M/YTD/ALL, big price chart (purple gradient fill). Right column: COMPLETION table — count of users at each completion level, e.g., 56/56 = 2,149 users, 55/56 = 96, 54/56 = 36, descending.

**Portal current state:** `/sets` returns "coming soon" stub. `/set/[id]` per handover Section 2C: "Header + KPI strip works. **Missing**: working set completion histogram (the data is in `mv_set_completion_distribution` but the page doesn't surface it). **Missing**: editions table. **Missing**: recent transactions for this set."

**Gap:** Histogram missing despite MV existing. Editions + transactions also missing.

**Action items:** `sets-directory` (priority 11), `set-completion-histogram` (priority 7).

---

## 5. Pack tracker (`research/otm-screenshots/05-pack-tracker-whats-left.png`, `06-pack-thumbnail.png`)

**OTM shape:** Pack thumbnail with set name "Rookie Revelation 2023-24". Metadata: DROPPED ON DEC 27, 2024, Moments per pack 4, Pack Type Legendary, Total Packs 71,000, Original Price $1,499.00, current $2,544 / 1.5% / 12.07%. PACKS OPENED: $2,465.05 / 51 / 323 unopened. Tabs: What's Left / Listings / Price History. Default tab What's Left shows a table of moments remaining by edition: Special Serials counts, listings count, etc.

**Portal current state:** No pack tracker page. `topshot.packs` table exists per handover; nothing surfaces it.

**Gap:** Total.

**Action item:** `packs-tracker` (priority 12).

---

## 6. CSV Export (cross-cutting, visible in screenshot 10)

**OTM shape:** EXPORT button top-left of the moments grid, downloads the current filter state as CSV. Re-encodes column headers in human form, handles commas in play descriptions via quoting.

**Portal current state:** No CSV export anywhere.

**Gap:** Total. Lock-in is hostile to the persona.

**Action item:** `moments-csv-export` (priority 5). Extends to other tables in later iterations.

---

## 7. Collector portfolio with real BAG table (no direct screenshot — see handover Section 2E)

**OTM shape:** Collector username, total holdings count, total value, Realized P&L (24h/30d/all), Unrealized P&L. BAG table: every moment owned with play, edition, serial, tier, current floor, acquired-at price, P&L per row. Sortable.

**Portal current state:** `/u/[username]` per handover: "Header + composition rollup work. **The main BAG table renders 0 rows despite header claiming the user owns N moments.** P&L calculation untested."

**Gap:** Surface exists but the load-bearing table is empty.

**Action item:** `collector-bag` (priority 6). Diagnose root cause (likely flow_address mismatch or empty owner_flow_address column).

---

## 8. Per-player editions matrix (no direct screenshot — inferred from OTM PLAYERS view + handover Section 2D)

**OTM shape:** Player photo + name + team + market cap rank + 24h Δ%. Editions matrix: rows = sets, columns = tiers (C/R/L/F/U), each cell = floor + market cap + count. Career volume table: 24h / 7d / 30d / 1y / ALL with $ + trades + median.

**Portal current state:** `/player/[id]` per handover: "Bare header. **Missing**: editions matrix grouped by set/tier. **Missing**: market cap rank. **Missing**: career volume table (uses 24h/7d/30d, doesn't expose 1y/all-time despite having those MVs)."

**Gap:** Page is a header with nothing below it.

**Action item:** `player-detail` (priority 13).

---

## 9. The OTM-superpower not on a single screenshot: SNIPER

Per `research/00-foundation-v2.md` §7: *"OTM's Sniper is the most-loved feature in the dead-tool canon and the interaction pattern V2 must port (artifact 03 §3.2)."*

**OTM shape:** Continuous scan over watched editions. Flag listings where user's fair-value diverges from market price by ≥N%. List sorted by % discount + time-on-market + total $ delta. Click-to-buy linkout.

**Portal current state:** `/sniper` exists as a nav tab; current contents unknown (likely stub).

**Gap:** Likely total. The lesson per foundation §5: ship the *interaction pattern* (transparent rules engine + click-to-buy), not the GBM black box.

**Action item:** `sniper-alerts` (priority 14). Beyond OTM in transparency: the model rules are editable + visible, not black-box.

---

## Summary: gap count

| OTM signature feature                       | Portal state           | Priority |
|---------------------------------------------|------------------------|----------|
| Filterable Moments grid                     | 404                    | 1        |
| Moment detail working time tabs             | Partial (tabs decorative) | 2     |
| Moment detail circulation breakdown         | Missing                | 3        |
| Players MARKET CAP leaderboard              | Stub                   | 4        |
| CSV export                                  | Missing                | 5        |
| Collector real BAG                          | Empty                  | 6        |
| Set completion histogram                    | Missing                | 7        |
| Moment detail price histogram               | Missing                | 8        |
| Moment True Value by serial                 | Missing                | 9        |
| Players directory full filters              | Stub                   | 10       |
| Sets directory                              | Stub                   | 11       |
| Pack tracker                                | Missing                | 12       |
| Player detail editions matrix               | Header only            | 13       |

**13 OTM-parity gaps. 1 closed (none yet — homepage strip is beyond-OTM, not OTM-parity).**

---

## Beyond-OTM (the moat opportunities)

Per `research/00-foundation-v2.md` §6 the structural opening: **the Analyst persona has no native data product**, and pro-trader features the comparable tools shipped poorly or not at all:

- **IPFS provenance** per moment (Top Shot has it; OTM/livetoken/evaluate did not)
- **Transparent Sniper** (rules visible + editable vs OTM's GBM black box)
- **Real-time activity feed** with click-to-trade
- **Cross-collector compare**
- **Anomaly detection** with rules-engine transparency
- **On-this-day** archive (editorial × data)
- **Watchlist + alerts** (auth-protected)

See `features.json` for the full beyond-OTM backlog with acceptance criteria.

---

*The judge re-reads this on every grading run. The comp-diff is the ground truth for "OTM fidelity 1-10."*
