# Doctrine → Constitution reconciliation — RESOLVED (Option A)

**Date:** 2026-05-31 · **Author:** Dexter · **Status:** RESOLVED — executed Option A.

> **Resolution (2026-05-31).** Chose **Option A**. `constitution.md` is now the apex spine;
> `doctrine.md` carries a subordination banner and survives as its long-form elaboration.
> Doctrine's three diverging clauses were reconciled in place with `[RECONCILED 2026-05-31]` notes:
> - **P3 comparable** — demoted from constitutional requirement; survives as an *operational loop gate* (loop may be stricter than the constitution).
> - **P5 parallels** — reframed from "dishonest" to **mirror the API** (include parallels; surface the rarest; force neither aggregation nor separation).
> - **P7 window** — **30D or 1Y**, whichever better represents the data.
>
> **Deferred (do at loop-restart, not now — loop is STOPped):** sweep the live v8/v9 prompt-level
> enforcement so a restarted Judge doesn't fail correct work — specifically any hard `?h=30d`
> landing assertion (relax to accept 1Y) and any "never aggregate across parallels" hard rule
> (relax to mirror-the-API). Tracked here so it isn't lost.

We ratified `constitution.md` (v0.1.0) and planned to delete `research/doctrine.md`,
extract its keepers, and re-point the loop at the constitution. Before deleting, I traced
what actually depends on doctrine. It's deeper than expected.

## What I found

1. **`research/doctrine.md` is referenced by ~24 files**, including:
   - **Production code:** `app/market-cap/page.tsx`, `lib/chart-palette.ts`, `lib/supabase/queries/market-cap-landing.ts`
   - **Live loop machinery:** a `doctrine-checker` enforcement role in v8 **and v9** (`loop/v9/prompts/doctrine-checker-patch.md`, `loop/v8/prompts/doctrine-checker.md`, `loop/v8/scripts/judge-vote.mjs`)
   - v7/v8 charters, research notes, design specs, handovers.

2. **The active loop is v9** (`loop/v9/CHARTER.md`), not the v5 `loop/prompts/` I first looked at. v9 was cross-vendor verified (gpt-5 + Opus) and explicitly "patches doctrine enforcement." Deleting the doctrine file breaks the checker that reads it.

3. **The new constitution contradicts the live loop canon in 3 places:**
   | Topic | Constitution (ratified) | Live loop canon |
   |---|---|---|
   | Comparable per feature | demoted from a core principle | **mandatory** — Pillar 2, `features.json.comparable_primary/_cross_domain`, Researcher+Judge enforce it |
   | Parallels | "mirror the API" (show/include, don't force) | "never aggregate across parallels" — Pillar 5 #6, `build.md` hard rule |
   | Default time window | 30D **or 1Y**, whichever better | 30D only — `build.md` step 4, doctrine P7 |

## The fork

**Option A — Constitution on top, doctrine stays as its elaboration (recommended).**
Don't delete doctrine. Make the constitution the spine; rewrite doctrine's 3 contradicting
clauses to match it (comparable = recommended-not-required; parallels = mirror-the-API;
window = 30D-or-1Y), and point the v9 `doctrine-checker` at the constitution as the source
of truth above doctrine. Low risk, no schema change, ~1 hour, reversible.

**Option B — Full rip-out.**
Retire `doctrine.md`, extract keepers (§0 comparables catalog → `comparables-reference.md`;
ICP `cuteknick` + not-in-DB caveat + market-cap-first scope → `SCOPE.md`; §2 loop mechanics
→ loop docs), then rewrite the v9 doctrine-checker prompt, the `features.json` comparable
fields, and the ~24 citations (incl. 3 prod files) to stop pointing at doctrine. This is real
engineering across a verified, running loop and is harder to undo.

## Recommendation

**A.** The constitution becomes the apex; doctrine survives as the long-form elaboration with
its 3 contradictions reconciled. The "comparable mandate" is the one with real teeth — Roham's
redline demoted it to a principle, but the loop still enforces it as a hard gate via
`features.json`. Decide: keep it as a hard build-gate (loop unchanged, constitution softens
wording only) or genuinely relax it (loop + schema + Judge change). That's the crux.
