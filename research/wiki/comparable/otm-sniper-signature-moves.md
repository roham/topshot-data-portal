# OTM Sniper — Signature Moves

**Captures:** NONE — OTM is dead. OTM Sniper was the most-loved feature in the dead-tool canon per doctrine §0.2.
**Doctrine reference:** §0.2 — *"The continuous scan-for-mispricing surface — most-loved feature in the dead-tool canon. We ship a TRANSPARENT, EDITABLE rules engine version."*
**Status:** Text-descriptive. Loaded into context by Phase C / post-Phase-B `/sniper` route iteration.

---

## §1 — The continuous scan-for-mispricing surface

OTM Sniper showed listings where `lowest_ask < some_threshold × baseline_price`. The "snipe-worthy" listings — moments priced below their comparable-floor or comparable-recent-sale.

The screen was a continuously-updating list of mispricings. Click a snipe → land on the moment detail with the chart pre-loaded showing the discount.

**Port — into /sniper route (post-Phase-B):**
- /sniper shows the continuously-updating list of moments where listing_price < threshold
- Threshold formula is TRANSPARENT and EDITABLE per doctrine §0.2 (the wedge over OTM's opaque model)
- Default formula: `listing_price < (comparable_serial_floor × 0.85)` — 15% below comparable-serial floor
- Editable on `/sniper/rules` route — adjust the discount threshold, the comparable-serial-band size, the cooldown period

**Reject:** opaque "AI-detected snipes" framing — the FORMULA IS the value. Show it.

---

## §2 — The comparable-serial-band concept

The OTM Sniper's magic was the COMPARABLE: serial #1-100 of an edition is its OWN MARKET; serial #5000-10000 is a different market. A "snipe" depends on which serial band the listing falls in.

**Port — load-bearing per persona doc:**
- Per persona: *"Comparable serial / serial band — #1-100 is a different market from #5000-10000"*
- /moment/[id] depth chart segments by serial band: 1-100, 101-1000, 1001-5000, 5001-10000, 10001+
- Each band has its own floor + listings + recent sales
- /sniper threshold is per-band, not global

**Reject:** aggregating all serials of an edition into a single "floor" (loses the snipe signal per persona).

---

## §3 — Realtime feed of new mispricings

OTM Sniper updated as new listings appeared. Within seconds of someone listing a moment below the comparable-serial-floor, it appeared on Sniper.

**Port — adapted for our doctrine §3 footnote (no live GraphQL at request time):**
- /sniper polls Supabase `moments` every 30s for new listings
- Server-side rendered with revalidation: 30s
- "New since you last visited" banner (LocalStorage timestamp)
- DEFER WebSocket / SSE real-time push to DEEPENING+

**Reject:** WebSocket-required UX (heavy infra); blocking the trader on stale data when polling is acceptable.

---

## §4 — The editability + transparency wedge (THE doctrine differentiator)

OTM Sniper was OPAQUE. Traders had to trust the model. When the model was wrong (or game-able), it lost trust. EM died partly because of opaque True Value.

**Doctrine §0.2 explicitly: *"We ship a TRANSPARENT, EDITABLE rules engine version."***

**Port — on /sniper:**
- `/sniper` shows the live snipe feed
- `/sniper/rules` shows the formula in a code-editor-like surface
- User (or Roham, or the doctrine maintainer) edits the rule; URL state captures the rule version
- Saved rules can be shared via URL (e.g., `/sniper?rule=mbl-aggressive`)
- Multiple named rules: "default" / "ultra-rare-focused" / "vet-players-only" / etc.

**Doctrine compliance:** transparency is §P1 (faithful display, never smooth). Editability is the trader's verbatim ask per §P6 — they want to control the model.

---

## §5 — The cooldown / "snipe-already-claimed" indicator

OTM Sniper showed when a snipe was likely already gone (mempool race condition):
- "New" (just listed)
- "1 min old" (still likely available)
- "5 min old" (probably gone)
- "Already sold" (red strikethrough)

**Port:**
- Each snipe row has a "Listed N min ago" badge
- If sold (via subsequent transactions row), show strikethrough + "SOLD" badge
- Color-code by age (cyan-fresh → amber-stale → red-sold)

**Reject:** misleading "available" indicators when we can't actually verify mempool state (doctrine §P1 — be faithful about uncertainty).

---

## §6 — Filter rail on /sniper

OTM Sniper had its own filter rail: by Player / Tier / Set / max listing price / minimum-serial-rarity.

**Port:**
- Filter rail same as /moments (consistent UX) — Player / Tier / Series / Set / Parallel / Price range / Serial range
- Add: "Min discount %" filter (e.g., "only show snipes >= 20% below comparable")
- Add: "Listed within last X minutes" filter

**Reject:** complex AI-driven "smart filters" (opaque); preset "Best snipes" filter without showing the formula.

---

## §7 — The wedge: what we OUTCLASS OTM Sniper

1. **Transparency + editability** — OTM was opaque; we publish the formula.
2. **Live data + Supabase mirror** — OTM relied on the same Top Shot GraphQL; we have a Supabase mirror that's queryable.
3. **Multi-rule support** — OTM had one model; we support multiple named rules + shareable.
4. **Parallels-first filtering** (§P5) — OTM aggregated parallels; we treat each as its own market.

---

## §8 — Sequencing: when does /sniper ship?

Per Loop B prompt §8, the 4 Phase B targets in sequence are /players → /moments → /sets → /u/[username]. /sniper is NOT in Phase B. It's:

- **Post-Phase-B DEEPENING candidate**
- **Or Phase C if Roham elevates it**

The /moments page IS THE J1 sniping flow per the persona doc. /sniper is a power-user surface above /moments — applies the rule-based filtering on top of the OTM grid.

**Recommendation:** defer /sniper until after the 4 Phase B targets ship. Re-evaluate priority then.

---

*Vision-judge invokes this catalog when (if) /sniper gets a Loop B iteration. Until then it sits as a reference for the rules-engine-transparency pattern that influences other surfaces too.*
