#!/usr/bin/env node
// loop/v8/scripts/judge-vote.mjs
// P13 — voting wrapper around loop/v7/scripts/verify-via-openai.py.
// Calls 3× with different seeds; PASS iff ≥ 2/3 PASS.
//
// Usage:
//   node loop/v8/scripts/judge-vote.mjs <iter-dir> [--loop A|B]
//
// Expects in <iter-dir>:
//   - 01-plan.md (read for context only; not passed in)
//   - per-iter generated state at <iter-dir>/iteration-N.json
//   - per-iter diff at <iter-dir>/diff.patch
//
// Reads doctrine + rubric from research/ in REPO_ROOT.
// Writes verdicts to <iter-dir>/06-judge-{a,b,c}.json (per-seed) plus <iter-dir>/06-judge.json (summary).
// Stdout: JSON summary.
// Exit:   0 PASS, 1 FAIL.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO_ROOT = process.env.CLAUDE_PROJECT_DIR
  ? resolve(process.env.CLAUDE_PROJECT_DIR)
  : resolve(process.cwd());

const args = process.argv.slice(2);
const iterDirArg = args.find((a) => !a.startsWith('--'));
if (!iterDirArg) {
  console.error('judge-vote.mjs: missing <iter-dir> argument');
  process.exit(1);
}
const iterDir = resolve(REPO_ROOT, iterDirArg);
const loopFlagIdx = args.indexOf('--loop');
const loop = loopFlagIdx >= 0 ? args[loopFlagIdx + 1] : 'A';

const iterStatePath = join(iterDir, 'iteration-state.json');
const diffPath = join(iterDir, 'diff.patch');
const rubricPath = resolve(REPO_ROOT, `research/quality-rubrics/loop-${loop.toLowerCase()}-rubric.md`);
const doctrinePath = resolve(REPO_ROOT, 'research/doctrine.md');
const sotPath = resolve(REPO_ROOT, 'research/data-schema/source-of-truth-mapping.md');
const auditPath = resolve(REPO_ROOT, 'research/audits-baseline/2026-05-17-baseline.md');

for (const p of [iterStatePath, diffPath, rubricPath, doctrinePath]) {
  if (!existsSync(p)) {
    console.error(`judge-vote.mjs: required input missing: ${p}`);
    process.exit(1);
  }
}

mkdirSync(iterDir, { recursive: true });

const SEEDS = [42, 1337, 9001];
const results = [];

for (const seed of SEEDS) {
  const outPath = join(iterDir, `06-judge-seed-${seed}.json`);
  const cmdArgs = [
    'loop/v7/scripts/verify-via-openai.py',
    '--loop', loop,
    '--iteration-state', iterStatePath,
    '--diff-path', diffPath,
    '--rubric-path', rubricPath,
    '--doctrine-path', doctrinePath,
    '--out-path', outPath,
    '--seed', String(seed),
    '--temperature', '0.7',
  ];
  if (loop === 'A') {
    if (existsSync(sotPath))   cmdArgs.push('--source-of-truth-path', sotPath);
    if (existsSync(auditPath)) cmdArgs.push('--audit-baseline-path', auditPath);
  }

  const proc = spawnSync('python3', cmdArgs, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    env: process.env,
  });

  let verdict = 'ERROR';
  let one_line = null;
  try {
    if (existsSync(outPath)) {
      const written = JSON.parse(readFileSync(outPath, 'utf-8'));
      verdict = written.verdict || 'ERROR';
      one_line = written.one_line_justification || written.error || null;
    } else if (proc.stdout) {
      const parsed = JSON.parse(proc.stdout.split('\n').find(Boolean));
      verdict = parsed.verdict || 'ERROR';
      one_line = parsed.one_line || null;
    }
  } catch (e) {
    verdict = 'PARSE_ERROR';
    one_line = (proc.stderr || '').slice(0, 200);
  }

  results.push({ seed, verdict, one_line, exit_status: proc.status });
}

const passCount = results.filter((r) => r.verdict === 'PASS').length;
const verdict = passCount >= 2 ? 'PASS' : 'FAIL';

const summary = {
  verdict,
  pass_count: passCount,
  total: SEEDS.length,
  loop,
  results,
};
writeFileSync(join(iterDir, '06-judge.json'), JSON.stringify(summary, null, 2));
process.stdout.write(JSON.stringify(summary) + '\n');
process.exit(verdict === 'PASS' ? 0 : 1);
