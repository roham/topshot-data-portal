# Portal Redesign — Vision & Decisions Handover

**Date:** 2026-05-29 · **Status:** design locked enough to build; resume in a fresh session.
**Purpose:** boot the next session from THIS doc + the mockups, not from the long chat transcript.

Mockups (open in a browser): `research/design-sprints/mockups/*.html`
- `directions.html` — the three north-star directions + the thesis
- `state-of-market-b-v2.html` — the landing ("B")
- `player-page-v3.html` — the player page
- `parallels-and-avgsale.html` — parallels model + pricing (note: this screen itself was over-annotated; treat its *content decisions* as canon, not its layout)

---

## North star (locked)

Pro-trading terminal for NBA digital collectibles. The moat is **on-chain transparency of people + flow** — who owns what, who's accumulating/dumping, full provenance — made visible, social, and explorable. Feels like a **living trading floor, not a spreadsheet.**

**Three layers, sequenced (not three pages):**
- **A — Living Market** (real-time flow, named actors) — the arrival energy.
- **B — State of the Market** (museum-grade macro data-viz) — the macro backdrop. **← build first.**
- **C — Encyclopedic Explorer** (entity + provenance) — the browse backbone.

Comparables to beat: Card Ladder (collecting) and the NFT-analytics sites — but more encyclopedic than any.

---

## Landing "B" — decisions

- **Hero is an INDEX, not Total Market Cap** (total cap won't trend up well). Feature **Rookies** big; rail shows **Grail · TS-100 · TS-15** (TS-15 = ultra blue-chip); click any to re-feature.
- **Market Map** = signature centerpiece: tiles = players, **sized by market cap, colored by 30d move.** Whole market's health at a glance. (Player data needs a cleanup/dedup pass.) Can re-pivot to set/tier later.
- **Live ticker** strip (who bought/sold, real handles) — the thread into layer A.
- **Market Activity, expanded:** tier-segmented (All/Common/Rare/Legendary/Ultimate/Fandom). Specific **sales** (buyer ← seller, play · tier · #serial, price, time) + movers per tier.

## Player page — decisions

- Hero: real `cdn.nba.com` headshot, identity, market cluster (cap, editions, parallel premium, lowest entry), **Watch**.
- **Event-anchored market-cap chart** — game performances annotated on the price line (Top Shot-unique).
- **Editions = sortable/filterable TABLE, never a matrix** (most editions are single, distinct — a grid is mostly empty). Columns: moment · tier · parallel · circ · low ask · **avg sale (30d)** · last traded.
- **Top holders** (named, on-chain) + recent sales — the provenance/social layer.

## Pricing + parallels — decisions (canon; the mockup's presentation was poor)

- **Show low ask AND avg sale (30d)** with sample count; **fall back to last sale** when trades are thin (don't fabricate an average). The ask-vs-avg spread is itself signal.
- **Sets demoted** — set is a small tag, not a filter axis. Primary axes: **tier + parallel.**
- **22 parallel names → ~4 scarcity classes** (Base / Premium / Elite / Crown) **derived from data** (circulation + premium-to-base), era-aware. Keep the specific name as a badge; filter/color by class. Names drift; class + data don't.
- **Per-moment "parallel ladder"** (Base → … → Omega by floor) instead of confronting all 22 globally.
- **Encyclopedic parallels glossary** — what each name meant in which season.
- **Thin trading history** is the norm for the best moments: lead with **last sale + recency + a liquidity indicator** and lean on **provenance** (who holds it). Scarcity reads as prestige, not deadness. No dead price-lines; sale dots + current ask.

---

## Hard rules (voice / craft)

- **NO meta-commentary, notes, or rationale on any surface.** Analyst voice only. The product speaks; reasoning lives in the spec. (This is the rule the parallels screen broke — twice-corrected.)
- Doctrine still governs: faithful display (count vanity 1-of-1 asks), parallels first-class, opportunity framing on empty markets, default 30D, real marks (no placeholder gradients), every pixel earns its place.

---

## State of the real app (already shipped to prod this session)

- `/market-cap` rebuilt: GRAIL+ROOKIES hero (dollar basket, not index), draft-year filter, server-side RPC (`topshot.market_cap_landing`, ~140ms), window-keyed Suspense + loading states, accent-pill nav/buttons.
- ETL fixed: Node 20→22 (supabase-js WebSocket); sync set to **1×/day** (09:00 UTC). Data freshness was still verifying (upstream BQ may cap at 2026-05-16).
- New MV `mv_market_cap_daily_totals` (in refresh list).

## Open threads

- Player-data cleanup/dedup (for the Market Map + player pages).
- Confirm whether upstream BQ `market_caps` is current or stale at 05-16.
- Build order within B: hero → market map → activity.
- Decide final index rail set (Rookies + which of Grail/TS-100/TS-15).

## How to resume (new session)

1. Read this doc + open the four mockups.
2. Confirm understanding in ~3 lines; don't replay history.
3. Pick ONE surface (recommend: build **B** for real in the app, hero → map → activity).
4. Keep that session scoped to the one surface so context stays lean.
