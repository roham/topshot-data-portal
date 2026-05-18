# NFL All Day — Signature Moves

**Captures:** `research/comparables/nfl-all-day/{search,search-2,marketplace-moments}.png` — sibling Dapper Labs product.
**Doctrine reference:** SECONDARY — used as visual-hygiene cross-check for the Top Shot family typography + spacing + interaction patterns. Not a primary doctrine §0 comparable; rather a "house style" reference.

NFL All Day shares Dapper Labs' design DNA with Top Shot. Useful for: spacing, typography, button affordance, filter rail patterns, dark theme palette consistency. NOT useful for: doctrinal feature decisions (we follow doctrine §0 primary comparables for those).

---

## §1 — Search/filter rail pattern (`search.png`)

Search bar at top with type-ahead. Filter chips below: by Team / by Position / by Year / by Tier. Active filters highlighted; clear-all button.

**Port:**
- Filter rail on /moments (already specified in /moments brief) — same chip pattern
- Filter rail on /players (specified in /players brief)

**Reject:** marketing-copy chip labels ("Hot Players" / "Trending Teams").

---

## §2 — Marketplace moments grid (`marketplace-moments.png`)

Dense card grid with: thumbnail + player name + team chip + tier chip + lowest ask + listings count. ~24-36 cards per fold.

**Port — informational only:**
- This is the CARD-GRID variant of /moments listing
- We use the OTM-grid-LIST pattern (per /moments brief §5) as primary
- BUT — the CARD-GRID could be a "view toggle" option (Grid | List) in V1.1

**Reject:** card-grid as the ONLY view (low density). Card-grid as a secondary option is fine.

---

## §3 — Color + typography consistency

NFL All Day uses:
- Background: dark slate (matches our slate-950)
- Accent: NFL red for sports context — Top Shot equivalent: cyan (for trader instrument vibe)
- Typography: same Dapper font stack (Inter / SF Pro mix)

**Port:** verify our chart-palette.ts + global font stack matches Dapper's house style.

---

## §4 — What we DON'T port from NFL All Day

- NFL-specific framing (we're NBA-focused per doctrine §P9)
- Their drop-calendar emphasis (off-instrument)
- Anything fantasy-football / "pick your lineup" related

---

*Useful primarily as a "is this visually consistent with the Dapper family?" check during vision-diff. Tertiary reference, not load-bearing.*
