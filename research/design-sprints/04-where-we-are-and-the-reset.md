# Where We Are, and the Reset — Top Shot Data Portal

**Date:** 2026-05-28
**Author:** Dexter (after Roham asked for a first-pass critique + a way back onto the rails)
**Status:** Critique + recommended restart. The §4 reset plan is the actionable output.
**Predecessors:** `03-meta-analysis-why-the-loop-fails.md` (2026-05-17), `doctrine.md` v1.1 (2026-05-17, Roham-signed), V9 charter (2026-05-19).

---

## 0. The one-paragraph verdict

The portal has everything except a product. 49 routes, 18 real chart components, a signed doctrine, two correct post-mortems, and a multi-vendor autonomous loop apparatus — and a front door that is a wall of dense monospace tables, which is the exact thing the doctrine forbids in writing. The work didn't fail for lack of analysis. It failed because **the loop kept optimizing its own machinery instead of the surface**, and **no human eye ever gated an expansion**. We diagnosed this correctly twice and drifted anyway. The fix is not V10. The fix is to stop building loop and put an eye on one screen until it's beautiful.

---

## 1. What we set out to build

A pro dashboard for NBA Top Shot traders: market cap and graphs, price movements, marketplace analytics, the actions users are taking. The persona work (Pro Trader: $5K–$800K portfolio, suspicious of marketing, instinct for asymmetric info) and the JTBD catalog (30 jobs, J-A*/J-P*/J-X*) were real and good. The doctrine was real and good — and Roham redlined it personally on 2026-05-17, landing two load-bearing constraints:

- **P2 — Graphs first, density on drill.** *"The first level should be graphs, almost like Polymarket graphs… you just load it, and it's just a bunch of graphs."*
- **P9 — Market-cap visualizations only, earn the right to expand.** *"We should just start with visualizing different forms of market cap and then go from there."*

That is the product we set out to build. It was never built.

---

## 2. What actually got built (the evidence)

| Signal | Doctrine said | Repo says |
|---|---|---|
| Front-door shape | Graphs-first landing | `/players`, `/sets`, and the homepage are **table-first**. Homepage `page.tsx` = **1,805 lines**, ~9 chart refs vs ~50 table refs. |
| Scope | **One** market-cap surface, made excellent | **49 routes** shipped (was 23 at V1 — scope nearly *doubled*) |
| Discoverability | Land and within 10s know where things live | A `/misc` page exists *for the explicit purpose of* holding "orphan-but-real surfaces" that have no home in nav |
| CEO taste in the loop | `/admin/review` ✓/✗/🎨 gates the REPAIR track (called *the* load-bearing fix) | `/admin/review` exists with API routes — **nothing in `lib` reads it**. Dead surface. The loop never honored a human verdict. |
| Where the hours went | Make the canonical surface beautiful | Last 30 commits: **27 are `[snapshot]` ETL plumbing**, 3 substantive — and those 3 are Grail-count minutiae (220 vs 225 triples) |
| Terminology | n/a (rule came later, now LOCKED) | `/whales` route + "whale" in `briefing`, `portfolio`, `TopNav` — violates the LOCKED L/XL-collector rule |

**The visuals Roham can't find are real and they exist** — `MultiSeriesChart`, `DepthLadder`, `SetPriceChart`, `TS50IndexChart`, `MomentPriceHistogram`, `SetCompletionHistogram`, serial-vs-price scatter, sparklines, `TickerTape`, `TopHoldersPanel`, 18 in all. They're just buried two-to-three clicks deep behind table landings, some only reachable through the orphan catalog. "It's really hard to find the visuals" is *literally true at the routing level.*

---

## 3. Why it drifted — the real generator

The `03-meta-analysis` correctly named the V1–V5 failure: the loop converged on its own blind spots because the human work (doctrine, taste, eval design) was being attempted *inside* the loop. It prescribed V6: scope-cut to 5 surfaces, multi-track with corrective priority, CEO signal in the loop, vision-diff judge.

Then V6 → V7 → V8 → V9 happened. Each version added **more apparatus** — pipeline-of-pipelines, two-stage review, voting verifiers, cross-vendor gpt-5 dialogue, meta-loop budget caps, prod-health probes, dispatch validators. The V9 charter (2026-05-19) re-diagnosed the *same* problem in its own words — *"a homepage that doesn't surface the existing visualization library"* — and moved DISCOVERABILITY/POLISH/VIZ tracks to the top of its priority order.

**And then the loop's final iterations (V9 ITER-8, ITER-10) spent themselves on Grail-count backfill — the lowest-priority track in its own charter.** It violated its own ordering on the last day it ran.

That is the generator, stated plainly:

> **The autonomous-loop apparatus became the work. We kept building, tuning, and verifying the machine that builds the product, and the machine's sophistication became a substitute for the product looking good. No screenshot ever had to pass a human eye before the loop moved on. So it moved on — toward whatever was measurable (ETL completeness, Grail counts, judge-journey green) and away from what was valuable (one beautiful screen).**

This is Goodhart, exactly as `03` predicted would happen if the human-in-loop fix wasn't actually wired. It wasn't. `/admin/review` is dead code.

I own my share: the meta-analysis already flagged me as a generator of this — author-when-orchestrator, schema-from-imagination. The loop machinery I authored across V5–V9 *was* the churn. More charter was the wrong instinct every time.

---

## 4. The reset — how to get back on track

Roham's ask was "kick off another extensive autonomous loop." The honest answer: **not another loop like the last five.** The autonomous loop is precisely what produced 49 buried, ugly tables. The way back is a different shape that still gives autonomous leverage — but earns it one screen at a time, with an eye in the gate.

### Phase 0 — Reset the surface (manual, eye-in-the-room, NOT a loop)

1. **Collapse the live front door to ONE screen**: the graph-first market-cap landing that P9 specified and that was never built. Polymarket-shaped: a wall of market-cap cuts, each a chart, click-to-drill. Built from the 18 chart components that already exist — this is assembly + taste, not net-new engineering.
2. **Everything else moves behind `/lab` (feature-flagged), not deleted.** All 49 routes and every chart are preserved and addressable — they just stop being the front door. Nothing built is lost.
3. **Iterate it to genuinely beautiful with Roham's eye on screenshots** — Dexter builds, Roham redlines the image, repeat a handful of tight rounds. This is the lore-vault move: taste work happens *with the human*, not inside an autonomous run.

### Phase 1 — Make the loop earn autonomy, one surface at a time

4. The loop's unit of work becomes **"make surface N beautiful + discoverable"**, and it **cannot advance to surface N+1 until Roham clicks ✓ on a screenshot.** Wire `/admin/review` for real this time — it gates expansion. No ✓, no next surface. This is the load-bearing fix `03` named and we never shipped.
5. **Kill the machinery that became the work.** No pipeline-of-pipelines, no cross-vendor dialogue, no meta-loop budget caps. One cycle: research the comparable → build the surface → **vision-diff the screenshot against the comparable** (the *one* piece of loop sophistication worth keeping, because it's the only eval that catches "ugly") → human ✓ gate. That's it.

### Phase 2 — Promote the rest up, one at a time, the new way

6. `/lab` is a **staging pen, not a graveyard.** The loop's standing mission becomes: take the next-most-valuable `/lab` surface, rebuild it beautiful + discoverable + graph-first, vision-diff it against its comparable, and **graduate it to production only on Roham's ✓.** Then the next. Repeat until every surface worth keeping has been pulled up in the gated way.
7. The endpoint is **not a shrunken site** — it's the full site rebuilt surface by surface, each one having passed a human eye before going live. Along the way, nav rebuilds around the surfaces that graduate (not 49 at once), `/whales` retires (terminology — LOCKED L/XL rule), and the orphan `/misc` catalog dissolves because every real surface now has a home.

**The single behavioral change that matters: a screenshot in front of Roham's eyes gates every promotion.** Everything else is detail.

---

## 5. The sequence (not a fork)

There is no A-vs-B choice. There is one sequence:

1. **Reset the front door** to one beautiful graphs-first market-cap screen (Phase 0). Push the other 48 routes behind `/lab` — feature-flagged, reversible, nothing deleted.
2. **Wire `/admin/review` to actually gate** (Phase 1). No ✓, no advance.
3. **Promote every `/lab` surface up one at a time, the new way** (Phase 2), until the full site is rebuilt — each surface having passed Roham's eye before it goes live.

The rejected non-option was "keep all 49 live and only fix the homepage." That preserves the exact loop shape that produced the sprawl — grade-your-own-taste, advance without an eye. The whole point is to retire that shape, not re-aim it.
