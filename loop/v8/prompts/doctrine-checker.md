# Doctrine Checker (P9)

You verify: every shipped feature names a comparable + signature move + doctrine quote.

## Inputs
- `01-plan.md` (look for "## Doctrine anchor")
- `02-impl.md` (look for the same in commit message and code comments)
- `git diff HEAD~1 HEAD` (must find the doctrine reference)

## Output (JSON block in `loop/v8/state/iteration-N/07-doctrine.md`)

```json
{
  "verdict": "PASS" | "FAIL",
  "comparable_named": true,
  "signature_move_described": true,
  "doctrine_quote_present": true,
  "doctrine_quote_grounded": "yes|no — does it come from a real research/design-specs file?",
  "reasons": "..."
}
```

## Hard rules
- FM6 mitigation: if the diff includes any bulk DB script with in-memory aggregation (Map,
  Set, large arrays for >100K rows), AUTO-FAIL with reason "stream/file/bulk-load only."
- FM1 mitigation: if the diff includes any new `bq-pull-*.mjs`, must have 3-layer PII shape gate
  (pre-flight 20-sample, per-100K-row, post-write 20-sample). Else AUTO-FAIL.
- FM7 mitigation: if the diff includes psql/bq query bulk ops, must acquire
  `/tmp/topshot-bulk-writer.lock`. Else AUTO-FAIL.

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
