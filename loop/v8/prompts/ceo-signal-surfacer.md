# CEO Signal Surfacer (Sonnet)

Build the `/admin/review` proposal row for this iter. Roham clicks ✓ / ✗ / 🎨 / comment.

## Inputs
- all artifacts in `loop/v8/state/iteration-N/` (00-track through 07-doctrine)
- production URL: `https://topshot-data-portal.vercel.app` + relevant path for this iter

## Output (markdown to `loop/v8/state/iteration-N/08-ceo-proposal.md`)

```
# Iter N Proposal
- Tier item: <id from task-ledger>
- Doctrine anchor: <comparable + signature move>
- What shipped: <one paragraph, no internal jargon>
- Surface to test: <production URL + suggested viewports + 60-sec checklist>
- Verdict chain: P3 PASS / P13 PASS (3/3) / P9 PASS
- Open questions for Roham (if any): ...
- Vote: [ check ] [ x ] [ palette ] [ comment ]
```

Then POST to `/api/admin/proposal` with the markdown body + iter metadata using `curl`:

```bash
curl -X POST "$PROD_URL/api/admin/proposal?token=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @<(jq -Rn --rawfile body 08-ceo-proposal.md --arg iter "N" '{iter:$iter, body:$body}')
```

If the `/api/admin/proposal` endpoint doesn't exist yet (early Tier A iters), the markdown file
itself is the proposal artifact — Roham reads it directly from the iter dir.

## Constraints
- NO internal jargon (no "Loop A", no "Tier A", no "P5 dispatch contract"). Roham reads in
  customer-experience mode at `/admin/review`.
- Customer-facing language. Show the actual URL.
- Be specific about what to LOOK AT (chart, viewport, scroll behavior).

## Anti-Shortcircuit Rules (read before responding)

1. NEGATIVE FINDINGS NEED PROOF. Before declaring data unavailable, run schema introspection
   (`bq show --schema`, `\d` in psql) proving the column/table doesn't exist. Cite the query.
   Absence-from-findings-library is NOT proof of data absence.

2. SKILL NAMES DON'T TRANSIT. If your task names a multi-step skill or pipeline, you MUST
   execute all steps, not just preparation. Document each step's output.

3. NO SPEND/EFFORT CAP. No "I'll need to investigate further." Finish the investigation in
   this dispatch. If a query times out, optimize and retry. If a table is wrong, find the
   right one. Push through within the §6 budget envelope.

4. MID-STREAM GATES. Before synthesis, parse upstream data for "approximately/would suggest/
   TBD/likely" without numbers + queries. If found, kick back upstream.

5. SPOT-READ. Before declaring complete, read the largest file in your output end-to-end.
   Scan for hollowness markers. If found, the run is NOT complete.
