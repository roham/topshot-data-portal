#!/usr/bin/env node
// loop/v8/scripts/dispatch-validator.mjs
// P5 — PreToolUse hook on Task. Rejects subagent launches missing the 5-field dispatch contract.
//
// PreToolUse protocol:
//   stdin:  Claude Code hook event JSON
//   stdout: {"decision":"approve"|"block","reason":"..."}
//   exit:   0 approve, 2 block

import { readFileSync } from 'node:fs';

function approve() {
  process.stdout.write(JSON.stringify({ decision: 'approve' }) + '\n');
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  process.exit(2);
}

let hookEvent;
try {
  const stdin = readFileSync(0, 'utf-8');
  hookEvent = stdin ? JSON.parse(stdin) : {};
} catch {
  approve();
}

if (hookEvent.tool_name !== 'Task') approve();

const prompt = (hookEvent.tool_input?.prompt || '').toLowerCase();

// 5-field P5 contract
const REQUIRED_FIELDS = [
  'objective:',
  'output_path:',
  'output_format:',
  'tool_boundaries:',
  'predecessor_artifacts:',
];
const missing = REQUIRED_FIELDS.filter((f) => !prompt.includes(f));
if (missing.length > 0) {
  block(
    `P5 dispatch contract violated; missing fields: ${missing.join(', ')}. ` +
    `Every Task tool launch MUST include all 5 fields per CHARTER §10.`,
  );
}

// Anti-Shortcircuit Rules — at minimum Rules 1+2+3 must be cited verbatim or in spirit.
const RULE_MARKERS = [
  'negative findings',          // Rule 1
  'skill names',                // Rule 2
  'no spend cap',               // Rule 3 (canonical phrasing)
];
const rulesPresent = RULE_MARKERS.every((s) => prompt.includes(s));
if (!rulesPresent) {
  block(
    'Anti-Shortcircuit Rules (1+2+3 minimum) not embedded in subagent prompt. ' +
    'Paste the full Anti-Shortcircuit block from CHARTER §10 verbatim.',
  );
}

approve();
