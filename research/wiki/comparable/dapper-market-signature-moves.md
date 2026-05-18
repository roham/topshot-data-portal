# Dapper.market — Signature Moves

**Capture:** `research/comparables/dapper-market/moment-detail-15340.png` — Miles McBride 2025-26 Hardwood Common, edition 15340. The new Dapper Labs visual canon for moment detail.
**Doctrine reference:** §0.2 drill-down canon (the closest authoritative reference for moment-detail because it's Dapper's own newest design).

This is THE port reference for `/moment/[id]`. Every signature move below is the Dapper-internal canonical design.

---

## §1 — The 3D holographic card render (center)

Large square card rendering (~700×700px viewport, ~2200px native) shows the moment's video poster with a holographic frame effect — light streaks at the edges, glow border, parallax depth illusion. Centered on the card is the actual play frame (Miles McBride dribbling in a Knicks jersey). The frame breaks slightly outside the card outline (artistic bleed). Below the card: small playback controls + tap-to-flip arrow.

**Port for /moment/[id]:**
- Hero card render takes the center column, ~50% of viewport width
- Uses the `editions.video_urls` + `editions.image_urls` from Supabase as the underlying media
- CSS holographic frame effect (gradient + drop-shadow + slight rotation on hover) — new chrome layer, not a Top Shot asset
- Playback controls below: play / pause / restart + flip-to-back

**Reject:** Static thumbnail rendering (boring; off-doctrine). Modal-only enlarged view (the card IS the hero).

---

## §2 — The left vertical icon rail (parallel selector)

Vertical strip on the left edge of the card render showing 8 small icons stacked vertically. Each represents a parallel variant of this moment. Clicking changes the rendered card to that parallel.

**Port:**
- Left vertical icon rail with one icon per available parallel
- Icons: small (~40×40px), thumbnail of the parallel's frame variant
- Active parallel: cyan border + glow
- Hover: tooltip with parallel name
- Empty parallels (sibling editions not yet in our DB per Loop A §P2.1): grayed-out + "(coming)" tooltip with §P8 NEW DROP framing

**Reject:** dropdown parallel-picker (less scannable); horizontal parallel row (eats fold real-estate).

---

## §3 — The right detail panel (dense info column)

Right ~30-35% of viewport is a vertically-stacked detail panel:
- HEADER row: tier chip ("COMMON" with electric blue border) + 2 small numeric chips
- Sub-header row: share icon | search icon (3 icons total)
- LARGE PLAYER NAME: "Miles McBride" (~36px, bold)
- DESCRIPTION text (3-4 lines, gray-400)
- 2 tagged context cards stacked vertically:
  - "2025 NBA Playoffs Series 2025-26" (with set icon)
  - "Miles McBride" (with player icon — redundant tag)
- "Set 9" / "Series 2025-26" / "Hardwood" three small chips (parallel name surfaced!)
- 3 price tier buttons in a horizontal row: $1.50K / $1K / $7K (these are the price tiers visible)
- Tab nav row: **Details | Listings | Offers | Activity** (4 tabs)
- Date header: "May 10 2026"
- Multi-line description text below

**Port for /moment/[id]:**
- Right panel ~35% of viewport, scrollable independently from the card render
- Top: tier chip + parallel chip + serial badge in a single row
- Player name large bold
- Description from `editions.description` (faithful display — no marketing overwrite)
- Three context cards: parent set + this moment + this play (uses `editions` joined `sets` + `plays`)
- Price tier buttons: floor / 30D avg / highest ask — clickable to load chart in that frame
- Tab nav: **Stats | Listings | Offers | Activity** (we rename "Details" → "Stats" for trader-vocabulary alignment)

**Reject:** marketing-copy filler in the description ("This moment is iconic..."); buttons without a data-bearing function.

---

## §4 — The activity timeline strip (right panel bottom)

Below the main info panel, 3 activity cards in a vertical stack, each card has:
- Small logo / icon (left)
- Two-line text block: title + sub-context (e.g., "2025 NBA Playoffs / Series 2025-26")
- Numeric badge (right): "8/87" — fraction/count indicator

Then a row of stat tiles:
- "X1" with "114" / "144" (parallels owned / total)
- Color-coded badges

Then a "PLAYER DETAILS" panel:
- Avatar
- Player name
- Team name ("New York Knicks")
- Two more stat cards: Position "PG" and Jersey "2"

**Port for /moment/[id]:**
- Below the price/tab section, render a "RECENT ACTIVITY" feed (last 5 transactions for this moment)
- Below activity: a "PLAYER" mini-card (avatar + name + team + position + jersey, link to /player/[id])
- Below player: a "SET" mini-card (set name + series + link to /set/[id])

**Reject:** social-proof activity ("12 people are viewing this"); achievement badges.

---

## §5 — The dark slate background + electric blue + purple accent palette

- Background: very dark slate, near-black (~slate-950)
- Primary accent: electric blue (#3B82F6 ish for tier outlines / button borders)
- Secondary accent: purple/violet (#A855F7 ish for high-tier moments) — mapped to TIER_COLOR.legendary
- Text hierarchy: white (#FFFFFF) for headers, slate-200 for body, slate-400 for meta, slate-500 for de-emphasized
- Numerics: monospace, tabular-nums

**Port:** identical palette. Our /market-cap already uses dark slate; verify the accent blues match.

**Reject:** any color outside `chart-palette.ts`.

---

## §6 — Top-left brand mark + simplified top nav

Top-left has the "TOPSHOT" logo. Top nav center: Explore / Wallet / Collectors. Right: profile avatar.

**Port — but adapted to OUR nav structure:**
- Our nav is the persistent LEFT rail (per Card Ladder pattern §1)
- Dapper.market's top-nav is HORIZONTAL; we go vertical-left for portal because of density
- Logo can be at top of left rail

**Reject:** their horizontal top-nav (less density-friendly for our portal use case).

---

## §7 — Footer with legal links

Simple footer at the bottom: TOPSHOT / NFL ALL DAY / NBA Top Shot / LaLiga Golazos / Legal / Terms / Privacy / © 2026 Dapper Labs, Inc.

**Port:** simplified — our footer has Doctrine / Methodology / Wiki / About; no Dapper-product cross-links.

---

## §8 — What dapper.market does that we DON'T port

- **Wallet integration** — we don't transact
- **"Explore" / "Wallet" / "Collectors" top nav** — replaced by our left rail
- **Marketing-copy descriptions** if any (the moment description in the capture is faithful, but if dapper.market adds promotional copy elsewhere, we don't inherit it)

---

## §9 — The doctrine-add: 24H/30D/90D price-tier history (NOT in dapper.market)

Dapper.market shows static price tier buttons ($1.50K / $1K / $7K). They DON'T show the historical movement of those price tiers.

**We add:**
- Clickable price-tier buttons that load a price history chart in the detail panel
- The chart respects the time-window selector (24H / 7D / 30D / 90D / 1Y / ALL — per doctrine §P7 default 30D)
- This is the J4 (moment-detail research) signature move per `pro-trader.md`

---

*Vision-judge invokes this doc when scoring fidelity for any /moment/[id] work in Loop B Phase A or first DEEPENING iter.*
