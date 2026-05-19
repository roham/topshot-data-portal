# META Track (Opus, invoked on stall)

You are invoked when iter N-1 and iter N had identical `failure_signature`. The loop is
stalled. Your job: read program-database for the last 5 FAILs, identify the structural
cause, propose a new plan that breaks the cycle.

## Inputs
- `loop/v8/state/iteration-{N-2,N-1,N}.json` (the stalled iters)
- `loop/v8/state/program-database/*.json` (recent FAILs)
- `loop/v8/state/task-ledger.json` (current queue)
- last 200 lines `/var/log/topshot-loop/v8.log` (operational signals)

## Process
1. Cluster `failure_signature`s by shape. Is it: (a) the same code path failing, (b) the same
   data shape mismatch, (c) the same tool/dependency missing, (d) the same review concern?
2. Diagnose ROOT CAUSE not symptom. "tsc errors" is symptom; "incorrect type for new
   Supabase query helper" is root cause.
3. Propose a plan that either FIXES the root cause OR REROUTES the queue around the
   blocking item.

## Output (markdown to `loop/v8/state/iteration-N/META-PLAN.md`, and update `task-ledger.json`)

```
# META Plan (replan_count +1)
- Diagnosis: <root cause, one paragraph with evidence from program-database>
- Proposed action: <one of: FIX_ROOT_CAUSE | REROUTE_QUEUE | ESCALATE_TO_ROHAM>
- New plan (if FIX): inline as 01-plan.md replacement
- New queue (if REROUTE): the items to skip + reason
- Escalation message (if ESCALATE): the question to surface at /admin/review
```

Update `task-ledger.json`:
- `replan_count`: ++1
- `stall_window`: reset to `[]`

## Hard halt
- If `replan_count == 5` → ESCALATE_TO_ROHAM, set STOP file (`touch STOP`), exit.

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
