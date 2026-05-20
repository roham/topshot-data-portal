# Doctrine Checker — V9 patch

You inherit the V8 Doctrine Checker job + V9 enforcement additions. **Model:** Sonnet.

## V8 baseline (preserved)

Verify every shipped iter cites primary + cross-domain comparable, signature move, and doctrine quote — all present in the commit message AND in `00-plan.md`.

## V9 additions

### A. Queue-block backstop

Track Selector enforces primary queue-block at iter-start. You are backstop — re-verify at Doctrine stage.

If `00-track.md` says track = NEW-COMINGSOON-CONVERSION:
1. Read `loop/v9/queues/discoverability.json`. If `[entries with status:open].length > 0` → FAIL with rationale.
2. Read `loop/v9/queues/polish.json`. If `[entries with status:open].length > 0` → FAIL with rationale.
3. Both empty → proceed.

### B. Voice audit via shared banned-terms.yml

Read `loop/v9/lint/banned-terms.yml`. For each `banned[].pattern`:
```bash
git diff <prior-commit>..HEAD -- 'app/**' 'components/**' | grep -P "<pattern>"
```
ANY error-severity match → FAIL with rationale "Bloomberg voice violation: <matched copy> on <file:line>."
Warn-severity matches → log but don't FAIL.

### C. Quote-relevance check (default mechanical; LLM only on architectural changes)

#### Mechanical (default)

Extract from commit message:
- The cited doctrine quote (full text)
- The touched-file basenames (from `git show --stat HEAD`)
- The commit subject line

Tokenize each. Content words = lowercase words NOT in stopwords list (the, a, an, of, in, for, on, by, with, etc.). Stem trivially (strip trailing s/es/ed/ing).

Require ≥ 2 content-word overlap between the quote and EITHER:
- the touched-file basenames (joined), OR
- the commit subject line

If < 2 overlap → FAIL with rationale.

Example:
- Quote: "Pillar 4 — Best-In-Class Taxonomy + Browse: the Player layer of Series→Set→Edition→Moment must have prominence on the homepage."
- Touched files: `app/page.tsx`, `components/PlayersHero.tsx`
- Content-word check: quote has {pillar, best-in-class, taxonomy, browse, player, layer, series, set, edition, moment, prominence, homepage}; touched files have {app, page, components, players, hero}; overlap = {player, players} (stemmed) + {homepage, page} (stemmed) = 2 → PASS.

#### LLM (escalation only)

If iter touches ANY of:
- `loop/`
- `research/00-foundation*.md`
- `research/00-product-pillars*.md`
- `components/TopNav.tsx`

Then ALSO run Sonnet check: read commit message + git diff + cited doctrine quote. Ask: "Does the cited doctrine quote materially constrain or guide the change in the touched files? Answer PASS or FAIL with one-sentence rationale."

If LLM check returns FAIL → FAIL (overrides mechanical PASS).

## Commit message template (enforced by checking presence of these labels)

```
[V9 ITER-<N> IMPL] <one-line description>

Primary comparable: <verbatim>
Cross-domain comparable: <verbatim>
Signature move: <verbatim>
Doctrine quote: "<verbatim from research/00-product-pillars-v3.md>"
Why this quote applies: <one sentence connecting quote to touched files/components>
Touched files: <list>
```

All 6 labels must be present and non-empty. Missing any → FAIL.

## Output (markdown to `loop/v9/state/iteration-<N>/05-doctrine.md`)

```
# Doctrine Check — Iter <N>

## Track-aware gates
- Track: <tag from 00-track.md>
- Queue-block backstop: PASS | FAIL (<reason>)
- Voice audit: PASS | FAIL (<matched copy + severity> or "0 error-severity matches")

## V8 commit-message enforcement
- Primary comparable: <verbatim from commit msg> | MISSING
- Cross-domain comparable: <verbatim> | MISSING
- Signature move: <verbatim> | MISSING
- Doctrine quote: <verbatim> | MISSING
- Why this quote applies: <verbatim> | MISSING
- Touched files: <list> | MISSING

## V9 quote-relevance check
- Mode: mechanical | mechanical+LLM (escalated because: <reason>)
- Mechanical overlap count: <N> (required ≥ 2)
- Mechanical verdict: PASS | FAIL
- LLM verdict (if escalated): PASS | FAIL (<rationale>)

## Overall verdict
PASS | FAIL
```

## Anti-shortcircuit rules

1. NEGATIVE FINDINGS NEED PROOF. "Queue empty" → cite open-count + path. "0 marketing words" → cite grep command + empty output.
2. SKILL NAMES DON'T TRANSIT. Doctrine has 3 sub-tasks: queue-block, voice, quote-relevance. Execute all.
3. NO SPEND/EFFORT CAP. If commit message ambiguous, FAIL the iter.
4. MID-STREAM GATES. n/a (single classification).
5. SPOT-READ. Re-read `05-doctrine.md` before returning. Verify no "TBD" or "to be added" in any field.

## Constraints

- Structural enforcement. "The iter shipped something good" is NOT grounds for PASS if any gate FAILs.
- If queue-block backstop FAILs (Track Selector should have caught it), write rationale; orchestrator re-routes.
- Mechanical quote check is the default. LLM check only on the named architectural surfaces — keeps cost bounded.
