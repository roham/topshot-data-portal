# Tensor — Signature Moves

**Captures:** NONE in repo. Tensor Pro is a public web app at tensor.trade; could be WebFetch'd or screenshotted but isn't yet.
**Doctrine reference:** §0.2 — depth chart pattern + rarity-vs-price scatter recast. Per doctrine: *"Depth chart (cumulative listings + bids by price). Rarity-vs-price scatter recast as serial-vs-price within an edition. Row-density treatment with sparklines."*
**Status:** Text-descriptive. Phase B iter 0 (or DEEPENING) should capture Tensor for vision-diff baseline.

---

## §1 — The depth chart (cumulative listings + bids by price)

Tensor's signature drill-down pattern is the **depth chart**: an inverted-Y waterfall showing:
- LEFT side: cumulative listings ascending from cheapest to most expensive
- RIGHT side: cumulative bids descending from highest to lowest
- Center: the spread between best ask and best bid
- Color: green for bids, red for listings (mirroring trading-platform conventions)

**Port for /moment/[id] and /edition/[id]:**
- "Order book" style chart on the moment-detail page
- Listings: lowest_ask + all visible listings stacked
- Bids: highest_offer + all visible bids stacked (if data available — current ETL doesn't have offers per V6)
- The shape is THE depth-chart pattern; the data depends on what Loop A pulls

**Reject:** showing only the lowest ask without depth context (loses the signature insight); using non-financial colors.

---

## §2 — Rarity-vs-price scatter

Tensor shows a scatter chart of: x-axis = rarity rank, y-axis = listing price. Each dot is one NFT. Hover reveals NFT name + image. Pattern: cheaper rarities cluster low-left, premium rarities up-right. Anomalies (high rarity, low price) are SNIPE TARGETS.

**Port — RECAST per doctrine §0.2:** *"Rarity-vs-price scatter recast as serial-vs-price within an edition."*

For our domain:
- /edition/[id] page (Phase B+) shows: x-axis = serial number (1 → mint_count), y-axis = listing price
- Each dot = one moment for sale in that edition
- Hover: moment ID + owner + acquired date
- Anomalies (low serial, low price) are highlighted with cyan glow — these are SNIPE TARGETS per J1

**Reject:** opaque rarity-rank algorithms (we use serial_number directly + parallel_id — transparent and doctrine §P1 compliant).

---

## §3 — Row-density with sparklines

Tensor's collection-row treatment: each NFT collection in the directory has:
- Thumbnail
- Collection name
- Floor (numeric)
- 24H Δ
- 7D Δ
- Volume
- **Sparkline** for the 30D floor history

The sparkline density per row is signature — packs a lot of info into 80-100px of vertical space.

**Port — load-bearing for /players, /moments, /sets dense lists:**
- Per-row sparkline column (30D floor history) on every dense list
- Sparkline-as-canvas if SVG perf hits (per /moments brief §9 risk #5)
- Always pair with a numeric column showing current value

**Reject:** row-level sparklines without the numeric context (sparklines alone are noise); animated sparklines (jittery, unprofessional).

---

## §4 — The Pro / Lite toggle

Tensor offers a "Pro" mode and a "Lite" mode. Pro shows the depth chart + candlesticks + dense data. Lite shows simplified cards. Toggle is page-level.

**Port — DOCTRINE COMPLIANCE NOTE:**
- We DON'T ship a Pro/Lite toggle. Doctrine §P9 + the persona doc both say the portal is FOR pro traders. No simplified mode.
- Persona doc explicitly: *"They are NOT: casual fans, pack-openers, 'I love sports' tourists, animation-appreciators, gamification consumers."*

**Reject:** any "simple" or "beginner" mode UI.

---

## §5 — Candlestick charts (per-collection)

Tensor shows candlesticks for each NFT collection: open-high-low-close per day, with volume bars below.

**Port — DEEPENING candidate:**
- /player/[id] could have candlestick mode for market-cap history (toggle from line chart)
- /set/[id] similarly
- DEFER to DEEPENING — line charts cover the J3/J4/J5 canonical use cases

**Reject:** candlesticks as default (more complex than needed for the trader audience's primary task — sniping mispriced floors).

---

## §6 — Solana-specific UI elements (we DON'T port)

- Wallet connect (Phantom, Solflare)
- $SOL price ticker
- Compressed NFT (cNFT) handling
- Tensor's $TNSR token integration
- Magic Eden cross-listings

These are Tensor-platform-specific. Skip.

---

## §7 — The wedge: what we OUTCLASS Tensor

1. **Top Shot domain specificity** — Tensor is multi-chain NFT; we're Top Shot only with deeper schema understanding (parallels, tiers, sets, plays, players).
2. **Parallel-first surfacing** (§P5) — Tensor lumps "rare variants" loosely; we structure parallels explicitly.
3. **Transparent valuation** (§P1) — Tensor uses opaque AI valuations on some surfaces; we use floor × circulation.
4. **Persona vocabulary** (§P6) — Tensor uses Solana-trader vocabulary; we use Top-Shot-Discord vocabulary.

---

## §8 — What we DO port (the load-bearing moves)

1. Depth chart on /moment/[id] (listings + bids cumulative)
2. Serial-vs-price scatter on /edition/[id]
3. Per-row sparklines on all dense lists
4. Anomaly highlighting (snipe-target glow) on the serial-vs-price scatter

---

*Vision-judge invokes this catalog for /moment/[id] depth chart work (Phase B+ or DEEPENING) and per-row sparkline work across all dense lists.*
