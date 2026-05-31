# Finding: GRAIL "$15M→$5M" is a vanity-ask artifact, not a market move

**Date:** 2026-05-31 · **Author:** Dexter · Raised by Roham (homepage GRAIL mcap looked wrong)

## TL;DR
GRAIL's ~3× "drop" over two weeks is driven almost entirely by **one edition's vanity
lowest-ask normalizing**, not a market decline. The whole-market floor mcap fell only ~30%
this month ($131M→$91M, 2026-05-01→05-31) with rising edition coverage (8,714→8,874) — so
it's neither a snapshot/ETL artifact nor a real crash.

## Evidence (market_caps, 2026-05-17 → 2026-05-31)
Top two per-edition mcap drops market-wide:

| Edition | tier / supply | circ | lowest_ask | mcap |
|---|---|---|---|---|
| **Stephen Curry — Holo MMXX, Series 1** | Legendary /50 | 20 | $500,000 → **$38,895** | $10,000,000 → $777,900 (**−$9.22M**) |
| **Utah Jazz REEL — Signature Victory, S2023-24** | Legendary /50 | 7 → 6 | $5,000,000 (flat) | $35,000,000 → $30,000,000 (−$5M; circ 7→6) |

The Curry edition alone ≈ the entire GRAIL move.

## Mechanism
`market_cap = lowest_ask × num_moments_in_circulation`. This imputes a **single** seller's
ask to **every** circulating moment. A $500K vanity ask on a /50 Curry with 20 in circulation
→ a $10M phantom basket contribution. When that ask left (dropped to $38,895), the basket
repriced down $9.2M. The Jazz REEL sits at a $5M ask × 6–7 circ = $30–35M — one listing
driving $30M+ of "market cap."

This is **P1 "faithful display, never smooth"** working exactly as designed (vanity asks
included, no smoothing). But as a *headline index number* it reads as a crash when it's one
whale relisting — exactly the "embarrassing/misleading screenshot" the ratified constitution
**Principle I** (honest data *framed to inspire confidence*) warns about. Real tension between
P1 (faithful floor) and Principle I (robust, confidence-inspiring framing).

## Options for Roham (methodology = his call; NOT changed unilaterally)
1. **Outlier-robust index** — cap each edition's per-moment ask at, e.g., N× its trailing
   realized median (or exclude asks with zero recent sales support) before ×circulation.
   Keeps floor basis; removes lone-vanity-ask amplification. Mild tension with P1's
   "no smoothing" — but arguably the /50-with-one-$500K-ask case isn't the 1-of-1 case P1 defends.
2. **Cap imputation to listed count** — value = lowest_ask × (listed moments), not × (all
   circulation). Only moments actually offered count at the ask; unlisted moments use a
   realized/last-sale basis. More honest about what "the market" is offering.
3. **Annotate, don't change** — keep pure floor, but surface "largest mover: {edition} ask
   {old}→{new}" so the index movement is explained, never mysterious.
4. **Realized-value index variant** — a sibling index on median/avg realized sale × circ,
   shown alongside the floor index (P1 keeps floor canonical; realized as the robust read).

Recommendation: **(2) or (1)** for the index specifically — the per-moment-ask×full-circulation
imputation is the actual flaw. Leave the per-edition page faithful (P1), make the *index*
robust. Decide with the appreciation/MSRP work in flight (another session) since they share
valuation surface.

## Not touched
GRAIL synthesizer + index methodology left as-is pending Roham's call (doctrine-level + adjacent
to the other session's MSRP/appreciation work).
