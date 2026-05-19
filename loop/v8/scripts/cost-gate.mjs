#!/usr/bin/env node
// loop/v8/scripts/cost-gate.mjs
// P8 — PreToolUse hook on Bash + pre-flight mode for cron-tick.sh.
// Reads cost-ledger.jsonl; enforces daily caps per CHARTER §6.
//
// PreToolUse protocol:
//   stdin:  Claude Code hook event JSON
//   stdout: {"decision":"approve"|"block","reason":"..."}
//   exit:   0 approve, 2 block (per Claude Code hook protocol)
//
// Pre-flight protocol (--pre-flight): exit 0 if under all caps, exit 1 if any cap hit.

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const LEDGER_PATH = resolve(REPO_ROOT, 'loop/v8/state/cost-ledger.jsonl');
const TODAY = new Date().toISOString().slice(0, 10);

const CAPS = {
  bq_gb_scanned:       50,
  vercel_deploys:      10,
  openai_judge_calls:  100,
  anthropic_dollars:   50,
};

function totalsForDay(day) {
  if (!existsSync(LEDGER_PATH)) return {};
  const raw = readFileSync(LEDGER_PATH, 'utf-8').trim();
  if (!raw) return {};
  const lines = raw.split('\n').filter(Boolean);
  const totals = {};
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.date === day) totals[e.key] = (totals[e.key] || 0) + (e.value || 0);
    } catch { /* skip malformed line */ }
  }
  return totals;
}

function approve() {
  process.stdout.write(JSON.stringify({ decision: 'approve' }) + '\n');
  process.exit(0);
}

function block(key, current, cap) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `Cost gate (P8): ${key} = ${current} >= cap ${cap} for ${TODAY}. ` +
            `Escalate to Roham via /admin/review per CHARTER §6.`,
  }) + '\n');
  process.exit(2);
}

// Append helper for orchestrator to call (also usable as CLI: --record key=value)
function recordCost() {
  const arg = process.argv.find((a) => a.startsWith('--record='));
  if (!arg) return false;
  const [key, valStr] = arg.slice('--record='.length).split('=');
  const value = Number(valStr);
  if (!key || !Number.isFinite(value)) {
    console.error(`bad --record arg: ${arg}`);
    process.exit(1);
  }
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  appendFileSync(LEDGER_PATH, JSON.stringify({ date: TODAY, ts: new Date().toISOString(), key, value }) + '\n');
  return true;
}

// Pre-flight mode
if (process.argv.includes('--pre-flight')) {
  const today = totalsForDay(TODAY);
  for (const [key, cap] of Object.entries(CAPS)) {
    if ((today[key] || 0) >= cap) {
      console.error(`daily cap hit: ${key} = ${today[key]} >= ${cap}`);
      process.exit(1);
    }
  }
  process.exit(0);
}

// Record mode (orchestrator increments after spend)
if (process.argv.some((a) => a.startsWith('--record='))) {
  recordCost();
  process.exit(0);
}

// Hook mode (PreToolUse on Bash)
let hookEvent;
try {
  const stdin = readFileSync(0, 'utf-8');
  hookEvent = stdin ? JSON.parse(stdin) : {};
} catch {
  // Not a hook invocation (e.g. ran by hand); approve.
  approve();
}

if (hookEvent.tool_name !== 'Bash') {
  approve();
}

const cmd = hookEvent.tool_input?.command || '';
const today = totalsForDay(TODAY);

if (/\bbq\s+(query|cp)\b/.test(cmd)) {
  if ((today.bq_gb_scanned || 0) >= CAPS.bq_gb_scanned) {
    block('bq_gb_scanned', today.bq_gb_scanned, CAPS.bq_gb_scanned);
  }
}
if (/git\s+push\s+origin\s+main\b/.test(cmd) || /vercel\s+deploy\b/.test(cmd)) {
  if ((today.vercel_deploys || 0) >= CAPS.vercel_deploys) {
    block('vercel_deploys', today.vercel_deploys, CAPS.vercel_deploys);
  }
}
if (/api\.openai\.com/.test(cmd) || /verify-via-openai\.py/.test(cmd)) {
  if ((today.openai_judge_calls || 0) >= CAPS.openai_judge_calls) {
    block('openai_judge_calls', today.openai_judge_calls, CAPS.openai_judge_calls);
  }
}

approve();
