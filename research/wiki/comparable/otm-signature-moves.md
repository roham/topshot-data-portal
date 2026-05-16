# OTM Signature Moves (the patterns we port)

OTM was the most-loved analytics tool in the Top Shot ecosystem. It is dead. We are not building a clone — we are porting the moves that made traders prefer it over the alternatives. Reference: 7 screenshots at `research/otm-screenshots/`.

## The seven moves

### 1. Persistent left-rail filter accordion

Always-visible filter categories. Each is a collapsible accordion. State persists across navigations. Filter chips at the top of the table show what's currently applied with x-to-remove. Categories OTM used: Owned, Player, Team, Current Team, Tier, Badges, Price, Circulation, League.

### 2. EXPORT button in the table header

Top-left of every data table. CSV download respecting the current filter state. Lock-in is hostile to the persona; export is a trust signal.

### 3. Sortable columns with visual indicator

Click a column header to sort. Click again to reverse. Tiny arrow indicates current sort. Default sort per page: usually the numeric column most relevant to the persona (market cap on Players, listing price on Moments, % completion on Sets).

### 4. KPI strip at the top of every detail page

Six to eight tiles, monospace numbers, color-coded deltas. On Moment detail: Low Ask · 4h Δ% · 24h Δ% · 7d Δ% · Avg Sale · Highest Offer · 24h Sales · 7d Sales. The strip is the at-a-glance summary; everything else is for deeper inspection.

### 5. Time tabs that actually work

1D / 7D / 1M / 3M / YTD / ALL. Click one, the chart redraws. Tab state survives refresh. Default = 7D on moment detail, 30D on set detail. **The original portal audit's #1 bug was decorative time tabs.**

### 6. Circulation breakdown panel

The most underrated OTM feature. Owned / Listings / Locked-Owned / In a Pack / Locker Room / Burned — each with absolute count and % of total. Traders read this to assess supply pressure: high "In a Pack" + low "Burned" = supply incoming = bearish. High "Locked" + low "Listings" = supply constrained = bullish.

### 7. Sniper (the killer app)

Continuous scan over watched editions. Flag listings where user's fair-value diverges from market price by ≥ N%. Sorted by % discount × time-on-market × $ delta. Click-to-buy linkout to nbatopshot.com. **Port the interaction pattern, not the GBM black box** — make the rules visible and editable per `research/00-foundation-v2.md` §5.

## What OTM did NOT do (our beyond-OTM opportunities)

- IPFS provenance per moment (Top Shot has it on-chain; OTM never surfaced it)
- Transparent valuation methodology (OTM True Value was a black-box GBM)
- Real-time activity feed with click-to-trade
- Cross-collector portfolio diff
- Anomaly detection with rules engine transparency
- On-this-day historic retrospective
- Mobile-web responsiveness (OTM was desktop-only effectively)

## When the judge consults this file

When grading a feature pass/fail vs OTM fidelity 1-10:

- Does the feature use the patterns above? (+score)
- Does it deviate in ways that match the persona vocabulary (`research/personas/pro-trader.md`)? (+score)
- Does it deviate in ways the persona offends-list flags? (-score, often hard-fail)
