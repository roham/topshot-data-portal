#!/usr/bin/env node
// loop/v8/scripts/orchestrator.mjs
// V8 per-iter driver. Invoked by cron-tick.sh every 30 min.
//
// Model: cron invokes `node orchestrator.mjs`; orchestrator shells out to `claude -p`
// (headless Claude Code) for every subagent stage. Each subagent gets the full Claude
// Code tool surface, and .claude/settings.json hooks (dispatch-validator + cost-gate)
// fire on every subagent invocation — they engage exactly when subagents act, not
// when this driver acts.
//
// Stage commits use `[V8 ITER-<N> <STAGE>] <msg>` for `git log` legibility.
// Per CHARTER §5; pre-flight + Stop hook chain + spot-read + CEO surface per §5/§7/§11.

import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync,
} from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

// -----------------------------------------------------------------------------
// args + paths
// -----------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const REPO_ROOT = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
process.chdir(REPO_ROOT);

const PHASE = parseInt(args.phase || '1', 10);
const WET = args.wet === '1' || args.wet === 'true';
const LEDGER_PATH = resolve(args.ledger || 'loop/v8/state/task-ledger.json');
const STATE_DIR = resolve(args.output || 'loop/v8/state');
const PROD_URL = process.env.TOPSHOT_PROD_URL || 'https://topshot-data-portal.vercel.app';
const ADMIN_TOKEN = process.env.TOPSHOT_ADMIN_TOKEN || 'ab227a89a99f7b619e5111d693547f06';

// -----------------------------------------------------------------------------
// logging
// -----------------------------------------------------------------------------

const NOW = () => new Date().toISOString();
function log(msg, extra = {}) {
  const line = { ts: NOW(), msg, ...extra };
  process.stdout.write(JSON.stringify(line) + '\n');
}

// -----------------------------------------------------------------------------
// shell helpers (never raw exec; always array args)
// -----------------------------------------------------------------------------

function runCmd(cmd, argv, opts = {}) {
  const result = spawnSync(cmd, argv, {
    encoding: 'utf-8',
    cwd: REPO_ROOT,
    env: process.env,
    ...opts,
  });
  if (result.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${argv.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result;
}

function commitStage(iterN, stage, msg) {
  // Skip commit if nothing changed.
  const status = runCmd('git', ['status', '--porcelain']).stdout.trim();
  if (!status) { log('commit-skip-empty', { iterN, stage }); return; }
  runCmd('git', ['add', '-A']);
  runCmd('git', ['commit', '-m', `[V8 ITER-${iterN} ${stage}] ${msg}`, '--no-gpg-sign'], { allowFail: true });
}

// -----------------------------------------------------------------------------
// ledger I/O
// -----------------------------------------------------------------------------

function readLedger() { return JSON.parse(readFileSync(LEDGER_PATH, 'utf-8')); }
function writeLedger(l) { writeFileSync(LEDGER_PATH, JSON.stringify(l, null, 2) + '\n'); }

function recomputePhaseStatus() {
  const phasePath = join(STATE_DIR, 'phase-status.json');
  if (!existsSync(phasePath)) return;
  const phase = JSON.parse(readFileSync(phasePath, 'utf-8'));
  const votes = readVotes();
  // Compute consecutive recent PASS votes from the tail of vote-log.jsonl.
  const tailPass = (loop) => {
    let n = 0;
    for (let i = votes.length - 1; i >= 0; i--) {
      const v = votes[i];
      if (v.loop !== loop) continue;
      if (v.vote === 'check' || v.vote === 'pass') n++;
      else break;
    }
    return n;
  };
  if (phase.phases['1']?.graduate_to_2_when) {
    phase.phases['1'].graduate_to_2_when.consec_loop_a_pass_votes.current = tailPass('A');
    phase.phases['1'].graduate_to_2_when.consec_loop_b_pass_votes.current = tailPass('B');
  }
  phase.computed_at = NOW();
  writeFileSync(phasePath, JSON.stringify(phase, null, 2) + '\n');
}

function readVotes() {
  const p = join(STATE_DIR, 'vote-log.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// -----------------------------------------------------------------------------
// cost-ledger increment
// -----------------------------------------------------------------------------

function recordCost(key, value) {
  runCmd('node', ['loop/v8/scripts/cost-gate.mjs', `--record=${key}=${value}`], { allowFail: true });
}

// -----------------------------------------------------------------------------
// claude -p subprocess (the subagent dispatch primitive)
// -----------------------------------------------------------------------------

function findClaude() {
  // Prefer explicit env override; else fall back to PATH.
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const which = spawnSync('which', ['claude'], { encoding: 'utf-8' });
  if (which.status === 0) return which.stdout.trim();
  return 'claude';
}

function dispatchSubagent({ model, systemPromptPath, taskPrompt, outputPath, maxTurns = 25, allowEdits = true }) {
  const claudeBin = findClaude();
  const sysPromptContent = readFileSync(systemPromptPath, 'utf-8');

  const cliArgs = [
    '-p',
    '--output-format', 'json',
    '--add-dir', REPO_ROOT,
    '--append-system-prompt', sysPromptContent,
  ];
  if (model) { cliArgs.push('--model', model); }
  if (allowEdits) { cliArgs.push('--permission-mode', 'acceptEdits'); }
  cliArgs.push(taskPrompt);

  log('dispatch', { model, systemPromptPath, outputPath, maxTurns });

  const result = spawnSync(claudeBin, cliArgs, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: REPO_ROOT },
    maxBuffer: 256 * 1024 * 1024,
  });

  // Capture both raw output and best-effort parsed result
  const rawPath = `${outputPath}.raw`;
  mkdirSync(dirname(rawPath), { recursive: true });
  writeFileSync(rawPath, result.stdout + '\n---STDERR---\n' + result.stderr);

  let resultText = '';
  let cost = null;
  try {
    const parsed = JSON.parse(result.stdout);
    resultText = parsed.result || parsed.text || parsed.message || '';
    cost = parsed.total_cost_usd ?? parsed.cost_usd ?? null;
  } catch {
    resultText = result.stdout;
  }

  if (resultText) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, resultText);
  }

  if (cost != null) { recordCost('anthropic_dollars', cost); }

  if (result.status !== 0) {
    log('dispatch-nonzero', { status: result.status, stderr: result.stderr.slice(0, 500) });
  }

  return { text: resultText, status: result.status, cost };
}

// -----------------------------------------------------------------------------
// stop-the-world helpers
// -----------------------------------------------------------------------------

function activeIterLock(set) {
  const p = join(STATE_DIR, 'active-iter.lock');
  if (set) { writeFileSync(p, String(process.pid)); }
  else if (existsSync(p)) { try { runCmd('rm', ['-f', p]); } catch {} }
}

function awaitingVoteCount(ledger) {
  return (ledger.queue || []).filter((q) => q.status === 'awaiting_ceo_vote').length;
}

// -----------------------------------------------------------------------------
// hollowness scan (Gate D, Rule 5)
// -----------------------------------------------------------------------------

const HOLLOW_TOKENS = [
  /\bapproximately\b/i, /\bwould suggest\b/i, /\bappears to\b/i, /\bcannot determine\b/i,
  /\bTBD\b/, /\bfor now\b/i, /\bfallback\b/i, /\blikely\b/i,
];

function containsHollowness(text) {
  if (!text) return false;
  // Allow hollowness markers if there's a SQL or bq probe within ~10 lines.
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (HOLLOW_TOKENS.some((re) => re.test(lines[i]))) {
      const ctx = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 6)).join('\n');
      if (!/SELECT|bq query|bq show|psql|\\d \w/i.test(ctx)) {
        log('hollowness-found', { line: i + 1, snippet: lines[i].slice(0, 120) });
        return true;
      }
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// pipeline stages
// -----------------------------------------------------------------------------

function buildTrackPrompt(item, ledger) {
  return [
    `objective: classify iter ${ledger.iter_counter + 1} into a track tag and READ-ONLY/READ-WRITE class.`,
    `output_path: ${join(STATE_DIR, `iteration-${ledger.iter_counter + 1}`, '00-track.md')}`,
    `output_format: markdown matching prompts/orchestrator.md schema`,
    `tool_boundaries:`,
    `  allow: ["Read", "Grep", "Glob"]`,
    `  deny: ["Write", "Edit", "Bash"]`,
    `predecessor_artifacts:`,
    `  - ${LEDGER_PATH}`,
    `  - ${join(REPO_ROOT, 'loop/v8/CHARTER.md')}`,
    ``,
    `Queue item: ${JSON.stringify(item, null, 2)}`,
    ``,
    `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
    `Per CHARTER §10 — execute fully, do not paraphrase past unrecognizability.`,
  ].join('\n');
}

function buildPlannerPrompt(item, trackText, ledger) {
  const iterN = ledger.iter_counter + 1;
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  return [
    `objective: produce iter ${iterN} plan with 5-field P5 dispatch contracts per CHARTER §10.`,
    `output_path: ${join(iterDir, '01-plan.md')}`,
    `output_format: markdown per prompts/planner.md schema`,
    `tool_boundaries:`,
    `  allow: ["Read", "Grep", "Glob", "Bash:bq:show", "Bash:bq:ls", "Bash:psql:*"]`,
    `  deny: ["Write:lib/**", "Edit:components/**"]`,
    `predecessor_artifacts:`,
    `  - ${join(iterDir, '00-track.md')}`,
    `  - ${LEDGER_PATH}`,
    `  - ${join(REPO_ROOT, 'loop/v8/CHARTER.md')}`,
    `  - ${join(REPO_ROOT, 'research/doctrine.md')}`,
    ``,
    `Queue item: ${JSON.stringify(item, null, 2)}`,
    `Track classification:`,
    trackText,
    ``,
    `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
  ].join('\n');
}

function buildImplementerPrompt(item, planText, iterN) {
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  return [
    `objective: implement the plan; write code + tests; commit with [V8 ITER-${iterN} IMPL] tag.`,
    `output_path: ${join(iterDir, '02-impl.md')}`,
    `output_format: markdown report per prompts/implementer.md schema`,
    `tool_boundaries:`,
    `  allow: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]`,
    `  deny: ["Bash:git:push:origin:main"]`,
    `predecessor_artifacts:`,
    `  - ${join(iterDir, '01-plan.md')}`,
    `  - ${join(iterDir, '00-track.md')}`,
    `  - ${join(REPO_ROOT, 'CLAUDE.md')}`,
    ``,
    `Queue item: ${JSON.stringify(item, null, 2)}`,
    ``,
    `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
  ].join('\n');
}

function buildReviewPrompt(stage, planText, implText, iterN, schemaPath) {
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  const outName = stage === 'completeness' ? '03-completeness.md' : '04-quality.md';
  return [
    `objective: review iter ${iterN} for ${stage}.`,
    `output_path: ${join(iterDir, outName)}`,
    `output_format: JSON inside markdown code fence per prompts/${stage}-reviewer.md`,
    `tool_boundaries:`,
    `  allow: ["Read", "Grep", "Glob", "Bash:git:diff", "Bash:git:log"]`,
    `  deny: ["Write", "Edit"]`,
    `predecessor_artifacts:`,
    `  - ${join(iterDir, '01-plan.md')}`,
    `  - ${join(iterDir, '02-impl.md')}`,
    ``,
    `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
  ].join('\n');
}

function buildDoctrinePrompt(item, iterN) {
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  return [
    `objective: assert iter ${iterN} ships with comparable + signature move + doctrine quote.`,
    `output_path: ${join(iterDir, '07-doctrine.md')}`,
    `output_format: JSON in markdown per prompts/doctrine-checker.md`,
    `tool_boundaries:`,
    `  allow: ["Read", "Grep", "Bash:git:diff", "Bash:git:log"]`,
    `  deny: ["Write", "Edit"]`,
    `predecessor_artifacts:`,
    `  - ${join(iterDir, '01-plan.md')}`,
    `  - ${join(iterDir, '02-impl.md')}`,
    ``,
    `Queue item (expected comparable+signature_move+doctrine_quote): ${JSON.stringify(item, null, 2)}`,
    ``,
    `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
  ].join('\n');
}

function buildCeoPrompt(item, iterN) {
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  return [
    `objective: file a customer-facing /admin/review proposal row for iter ${iterN}.`,
    `output_path: ${join(iterDir, '08-ceo-proposal.md')}`,
    `output_format: markdown per prompts/ceo-signal-surfacer.md`,
    `tool_boundaries:`,
    `  allow: ["Read", "Bash:curl"]`,
    `  deny: ["Write:lib/**", "Edit"]`,
    `predecessor_artifacts:`,
    `  - ${join(iterDir, '01-plan.md')}`,
    `  - ${join(iterDir, '02-impl.md')}`,
    `  - ${join(iterDir, '05-verify.json')}`,
    `  - ${join(iterDir, '06-judge.json')}`,
    `  - ${join(iterDir, '07-doctrine.md')}`,
    ``,
    `Queue item: ${JSON.stringify(item, null, 2)}`,
    `Production URL base: ${PROD_URL}`,
    ``,
    `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
  ].join('\n');
}

// -----------------------------------------------------------------------------
// main per-iter loop
// -----------------------------------------------------------------------------

function pickNextItem(ledger) {
  // Phase 1/2: defer if any item awaiting CEO vote
  if (PHASE < 4 && awaitingVoteCount(ledger) > 0) {
    log('halt-awaiting-vote', { count: awaitingVoteCount(ledger) });
    return null;
  }
  return (ledger.queue || []).find((q) => q.status === 'queued');
}

function pollProductionUrl(maxAttempts = 30, intervalMs = 10000) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', PROD_URL], { encoding: 'utf-8' });
    const code = (res.stdout || '').trim();
    log('prod-poll', { attempt: i + 1, code });
    if (code === '200') return true;
    spawnSync('sleep', [String(intervalMs / 1000)]);
  }
  return false;
}

function writeIterationState(iterN, item, verdict, extra = {}) {
  const path = join(STATE_DIR, `iteration-${iterN}.json`);
  const iterState = {
    schema_version: 'v8.0',
    iter: iterN,
    queue_item_id: item.id,
    verdict,
    timestamp: NOW(),
    fully_satisfied: verdict === 'PASS' || verdict === 'AWAITING_CEO_VOTE',
    looping: false,
    forward_progress: verdict !== 'ABORTED' && verdict !== 'FAIL',
    next_actor: verdict === 'AWAITING_CEO_VOTE' ? 'roham' : 'orchestrator',
    next_instruction: verdict === 'AWAITING_CEO_VOTE'
      ? `Vote on /admin/review?token=${ADMIN_TOKEN} for iter ${iterN}`
      : 'continue to next iter',
    ...extra,
  };
  writeFileSync(path, JSON.stringify(iterState, null, 2) + '\n');
  return iterState;
}

function writeDiffPatch(iterN) {
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  mkdirSync(iterDir, { recursive: true });
  const diffPath = join(iterDir, 'diff.patch');
  // Diff from start of iter to now. We track the start with iter-start.sha.
  const startShaPath = join(iterDir, '.iter-start-sha');
  if (existsSync(startShaPath)) {
    const startSha = readFileSync(startShaPath, 'utf-8').trim();
    const res = runCmd('git', ['diff', startSha, 'HEAD'], { allowFail: true });
    writeFileSync(diffPath, res.stdout || '');
  } else {
    writeFileSync(diffPath, '');
  }
  return diffPath;
}

function archiveIter(iterN, verdict, item, extra = {}) {
  const state = writeIterationState(iterN, item, verdict, extra);
  if (verdict !== 'PASS' && verdict !== 'AWAITING_CEO_VOTE') {
    const pdbPath = join(STATE_DIR, 'program-database', `iter-${iterN}.json`);
    mkdirSync(dirname(pdbPath), { recursive: true });
    writeFileSync(pdbPath, JSON.stringify(state, null, 2) + '\n');
  }
  activeIterLock(false);
  return state;
}

async function runIter(ledger, item) {
  const iterN = ledger.iter_counter + 1;
  const iterDir = join(STATE_DIR, `iteration-${iterN}`);
  mkdirSync(iterDir, { recursive: true });

  // record start sha
  const startSha = runCmd('git', ['rev-parse', 'HEAD']).stdout.trim();
  writeFileSync(join(iterDir, '.iter-start-sha'), startSha);

  activeIterLock(true);

  // 1. Track selector
  const trackPath = join(iterDir, '00-track.md');
  const track = dispatchSubagent({
    model: 'claude-haiku-4-6',
    systemPromptPath: 'loop/v8/prompts/orchestrator.md',
    taskPrompt: buildTrackPrompt(item, ledger),
    outputPath: trackPath,
    maxTurns: 6,
  });
  if (!existsSync(trackPath) || !readFileSync(trackPath, 'utf-8').trim()) {
    return archiveIter(iterN, 'ABORTED', item, { reason: 'track-selector-empty' });
  }
  commitStage(iterN, 'TRACK', 'track classified');

  const trackText = readFileSync(trackPath, 'utf-8');
  const rwClass = /rw_class:\s*READ-ONLY/i.test(trackText) ? 'READ-ONLY' : 'READ-WRITE';

  // 2. Planner
  const planPath = join(iterDir, '01-plan.md');
  const plan = dispatchSubagent({
    model: 'claude-opus-4-7',
    systemPromptPath: 'loop/v8/prompts/planner.md',
    taskPrompt: buildPlannerPrompt(item, trackText, ledger),
    outputPath: planPath,
    maxTurns: 15,
  });
  if (!existsSync(planPath) || !readFileSync(planPath, 'utf-8').trim()) {
    return archiveIter(iterN, 'ABORTED', item, { reason: 'planner-empty' });
  }
  commitStage(iterN, 'PLAN', 'plan filed');

  const planText = readFileSync(planPath, 'utf-8');
  if (containsHollowness(planText)) {
    return archiveIter(iterN, 'ABORTED', item, { reason: 'plan-hollow' });
  }

  // DRY-RUN exit: stop after planner — no impl, no review, no judge, no deploy.
  // Surfaces full pipeline wiring + planner output without writing code or spending judge $.
  if (!WET) {
    log('dry-run-stop-after-planner', { iterN });
    return archiveIter(iterN, 'DRY_RUN_COMPLETE', item, { rw_class: rwClass });
  }

  // 3a. READ-ONLY: discovery report path
  if (rwClass === 'READ-ONLY') {
    const reportPath = join(iterDir, '02-discovery-report.md');
    dispatchSubagent({
      model: 'claude-sonnet-4-6',
      systemPromptPath: 'loop/v8/prompts/orchestrator.md',
      taskPrompt: [
        `objective: produce discovery report aggregating the plan's fan-out probes.`,
        `output_path: ${reportPath}`,
        `output_format: markdown gap-report`,
        `tool_boundaries:`,
        `  allow: ["Read", "Bash:bq:query", "Bash:bq:show", "Bash:psql:*"]`,
        `  deny: ["Write:lib/**", "Edit"]`,
        `predecessor_artifacts:`,
        `  - ${planPath}`,
        ``,
        `Anti-Shortcircuit Rules: negative findings need proof; skill names don't transit; no spend cap doesn't transit; mid-stream verification gates; orchestrator spot-reads.`,
      ].join('\n'),
      outputPath: reportPath,
      maxTurns: 25,
    });
    commitStage(iterN, 'DISCOVERY-REPORT', 'gap report filed');
    return archiveIter(iterN, 'PASS', item, { rw_class: 'READ-ONLY' });
  }

  // 3b. READ-WRITE: implementer
  const implPath = join(iterDir, '02-impl.md');
  dispatchSubagent({
    model: 'claude-sonnet-4-6',
    systemPromptPath: 'loop/v8/prompts/implementer.md',
    taskPrompt: buildImplementerPrompt(item, planText, iterN),
    outputPath: implPath,
    maxTurns: 60,
  });
  commitStage(iterN, 'IMPL', 'implementation committed');

  // write diff.patch and iteration-state.json (for judge)
  writeDiffPatch(iterN);
  writeIterationState(iterN, item, 'IN_PROGRESS');

  // 4. Two-Stage Review
  const completenessPath = join(iterDir, '03-completeness.md');
  dispatchSubagent({
    model: 'claude-sonnet-4-6',
    systemPromptPath: 'loop/v8/prompts/completeness-reviewer.md',
    taskPrompt: buildReviewPrompt('completeness', planText, '', iterN),
    outputPath: completenessPath,
    maxTurns: 10,
  });
  const completenessText = existsSync(completenessPath) ? readFileSync(completenessPath, 'utf-8') : '';
  if (/"verdict":\s*"FAIL"/.test(completenessText)) {
    return archiveIter(iterN, 'FAIL', item, { stage: 'completeness', failure_signature: 'completeness_fail' });
  }

  const qualityPath = join(iterDir, '04-quality.md');
  dispatchSubagent({
    model: 'claude-opus-4-7',
    systemPromptPath: 'loop/v8/prompts/quality-reviewer.md',
    taskPrompt: buildReviewPrompt('quality', planText, '', iterN),
    outputPath: qualityPath,
    maxTurns: 12,
  });
  const qualityText = existsSync(qualityPath) ? readFileSync(qualityPath, 'utf-8') : '';
  if (/"verdict":\s*"FAIL"/.test(qualityText)) {
    return archiveIter(iterN, 'FAIL', item, { stage: 'quality', failure_signature: 'quality_fail' });
  }
  commitStage(iterN, 'REVIEW', 'completeness+quality pass');

  // 5a. Deterministic verifier
  const verifyJson = runCmd('loop/v8/scripts/verify-deterministic.sh', [], { allowFail: true });
  writeFileSync(join(iterDir, '05-verify.json'), verifyJson.stdout || '{"verdict":"FAIL","failures":["verify-script-empty"]}');
  let verifyVerdict = 'FAIL';
  try { verifyVerdict = JSON.parse(verifyJson.stdout).verdict; } catch {}
  if (verifyVerdict !== 'PASS') {
    return archiveIter(iterN, 'FAIL', item, { stage: 'verify', failure_signature: 'verify_fail', verify: verifyJson.stdout });
  }

  // 5b. Cross-vendor voting judge
  writeDiffPatch(iterN);
  writeIterationState(iterN, item, 'IN_PROGRESS');
  const judgeRes = runCmd('node', ['loop/v8/scripts/judge-vote.mjs', iterDir, '--loop', 'A'], { allowFail: true });
  let judgeVerdict = 'FAIL';
  try { judgeVerdict = JSON.parse(judgeRes.stdout).verdict; } catch {}
  if (judgeRes.status === 0 && judgeVerdict !== 'PASS') judgeVerdict = 'FAIL';
  // Record openai_judge_calls usage (3 per iter)
  recordCost('openai_judge_calls', 3);
  if (judgeVerdict !== 'PASS') {
    return archiveIter(iterN, 'FAIL', item, { stage: 'judge', failure_signature: 'judge_fail' });
  }

  // 5c. Doctrine checker
  const doctrinePath = join(iterDir, '07-doctrine.md');
  dispatchSubagent({
    model: 'claude-sonnet-4-6',
    systemPromptPath: 'loop/v8/prompts/doctrine-checker.md',
    taskPrompt: buildDoctrinePrompt(item, iterN),
    outputPath: doctrinePath,
    maxTurns: 8,
  });
  const doctrineText = existsSync(doctrinePath) ? readFileSync(doctrinePath, 'utf-8') : '';
  if (/"verdict":\s*"FAIL"/.test(doctrineText)) {
    return archiveIter(iterN, 'FAIL', item, { stage: 'doctrine', failure_signature: 'doctrine_fail' });
  }
  commitStage(iterN, 'VERIFY', 'P3+P13+P9 all PASS');

  // 6. Spot-read (Gate D, Rule 5)
  if (containsHollowness(planText) || containsHollowness(implPath ? readFileSync(implPath, 'utf-8') : '')) {
    return archiveIter(iterN, 'ABORTED', item, { reason: 'hollowness-found-at-spot-read' });
  }

  // 7. Deploy (push origin main; Vercel auto-deploys)
  if (WET) {
    runCmd('git', ['push', 'origin', 'main'], { allowFail: true });
    recordCost('vercel_deploys', 1);
    const live = pollProductionUrl();
    if (!live) {
      return archiveIter(iterN, 'FAIL', item, { stage: 'deploy', failure_signature: 'deploy_not_200' });
    }
    commitStage(iterN, 'DEPLOY', 'production 200 OK');
  } else {
    log('deploy-skipped-dry-run');
  }

  // 8. CEO Signal Surfacer
  const ceoPath = join(iterDir, '08-ceo-proposal.md');
  dispatchSubagent({
    model: 'claude-sonnet-4-6',
    systemPromptPath: 'loop/v8/prompts/ceo-signal-surfacer.md',
    taskPrompt: buildCeoPrompt(item, iterN),
    outputPath: ceoPath,
    maxTurns: 8,
  });
  commitStage(iterN, 'CEO-SIGNAL', `proposal filed for iter-${iterN}`);

  // 9. Archive
  const verdict = PHASE >= 4 ? 'PASS' : 'AWAITING_CEO_VOTE';
  const state = archiveIter(iterN, verdict, item);

  // ledger update
  ledger.iter_counter = iterN;
  const idx = ledger.queue.findIndex((q) => q.id === item.id);
  if (idx >= 0) {
    ledger.queue[idx].status = PHASE >= 4 ? 'shipped' : 'awaiting_ceo_vote';
  }
  writeLedger(ledger);
  recomputePhaseStatus();
  commitStage(iterN, 'ARCHIVE', 'iter complete');

  return state;
}

// -----------------------------------------------------------------------------
// entry
// -----------------------------------------------------------------------------

async function main() {
  log('orchestrator-start', { phase: PHASE, wet: WET, ledger: LEDGER_PATH });

  const ledger = readLedger();
  const item = pickNextItem(ledger);
  if (!item) {
    log('no-item; nothing-to-do');
    activeIterLock(false);
    return;
  }
  log('picked-item', { id: item.id, name: item.name });

  try {
    const state = await runIter(ledger, item);
    log('iter-done', state);
  } catch (e) {
    log('iter-threw', { error: e.message, stack: (e.stack || '').slice(0, 1000) });
    activeIterLock(false);
    process.exit(1);
  }
}

main();
