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

---

## Addendum — ASP basis investigation (Roham: "try replacing with ASP")

Validated against data:
- The Curry edition sat at a **flat $500K ask for 10 days with ZERO recorded sales**, then
  snapped to $38,895. So $500K was a stale vanity ask, not a real floor → capping to listed
  moments would NOT fix it, and a floor-*price* index would still ingest the $500K. ASP (realized
  sales) is the only vanity-proof basis. ✅ Roham right.
- **BUT**: `mv_edition_all_time_activity` has **3 rows total** (essentially unpopulated). Of the
  166 GRAIL editions, **0** appear in it. So `ASP × circ` for the basket = **~$0 today** — a data
  gap, not a market signal. Floor basis computes correctly ($5.79M @ 2026-05-31, matches /indices/grail).

### Why ASP can't just drop in yet
Per-edition realized-sale aggregates aren't materialized. `transactions` has no `edition_id`
column; `mv_largest_sales_*` only keep top-N per window; the edition activity MVs are empty.
Realized per-edition prices DO exist via the `edition_price_history` RPC (transactions→moments
daily median) that powers the /edition price charts — that's the correct ASP source, but it's the
exact surface the **other session** is actively rebuilding (appreciation / odds-based MSRP).

### Recommendation
1. Build the ASP/realized GRAIL index on a proper **per-edition realized-sale rollup**
   (populate `mv_edition_*_activity`, or read `edition_price_history`), value = last/avg realized
   sale × circ. Vanity-proof and non-zero. **Coordinate with the other session** (shared valuation
   surface + ETL is theirs) — don't double-build.
2. Until that data lands, keep floor basis but **annotate the index's largest mover**
   ("Curry Holo MMXX ask $500K→$38,895") so a vanity swing is never a mystery headline.
3. Drop the `×circulation` amplification regardless: report per-moment floor/last-sale, not one
   ask imputed across all moments.

Not built tonight: ASP index is blocked on the empty rollup + sits in the other session's lane.
