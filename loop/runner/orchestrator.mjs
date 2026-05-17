#!/usr/bin/env node
// v5 Top Shot Data Portal autonomous build loop — orchestrator.
//
// Single-tick state machine: STOP-check -> wall-clock check -> pick feature ->
//   spawn Researcher (`claude --print`) -> spawn Builder (`claude --print`) ->
//   spawn judge runner (`node loop/judge/run.mjs`) -> record outcome.
//
// Hard rules (enforced by code AND by the per-role prompt briefs):
//   - Only the judge flips features.json `passes`. The orchestrator does not
//     touch features.json. Period.
//   - Per-role SIGTERM timeouts. A wedged sub-agent never blocks the loop.
//   - State files live under loop/runner/state/ (gitignored). On orchestrator
//     restart, an in-progress iteration is re-attempted (idempotent).
//   - The judge already appends to progress.md on pass. The orchestrator does
//     not.
//
// See LOOP-CHARTER.md §3 for role contracts, §5 for exit conditions, and
// loop/runner/README.md for operator usage.

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Paths ──────────────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const FEATURES_PATH = resolve(ROOT, "features.json");
const STATE_DIR = resolve(HERE, "state");
const PROMPTS_DIR = resolve(ROOT, "loop", "prompts");
const RESEARCH_PROMPT = resolve(PROMPTS_DIR, "research.md");
const BUILD_PROMPT = resolve(PROMPTS_DIR, "build.md");
const JUDGE_RUNNER = resolve(ROOT, "loop", "judge", "run.mjs");
const STOP_FILE = resolve(ROOT, "STOP");
const RESEARCH_OUTPUT_DIR = resolve(ROOT, "research", "features");

// ── Constants ──────────────────────────────────────────────────────────────

const RESEARCHER_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
const BUILDER_TIMEOUT_MS = 35 * 60 * 1000; // 35 min
const JUDGE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min
const SIGKILL_GRACE_MS = 30 * 1000; // 30s after SIGTERM
const ITERATION_SLEEP_MS = 5_000;
const DEFAULT_MAX_HOURS = 8;
const DEFAULT_PORTAL_URL = "https://topshot-data-portal.vercel.app";

// ── Logging ────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString();
}

function log(msg) {
  console.log(`[orchestrator] ${ts()} ${msg}`);
}

function logErr(msg) {
  console.error(`[orchestrator] ${ts()} ${msg}`);
}

// ── CLI parsing (tiny inline; no deps) ─────────────────────────────────────

function printUsage() {
  const usage = [
    "Usage: node loop/runner/orchestrator.mjs [options]",
    "",
    "Drives the v5 Top Shot Data Portal autonomous build loop: picks the",
    "highest-priority unblocked feature from features.json, dispatches the",
    "Researcher -> Builder -> Judge sequence, records outcomes to disk.",
    "",
    "Options:",
    "  --max-hours N      wall-clock budget in hours (default 8)",
    "  --feature ID       run only this feature id (default: highest-priority unpassed unblocked)",
    "  --once             single iteration then exit (default: continuous loop)",
    "  --portal-url URL   target deploy URL for the judge",
    "                     (default: $PORTAL_URL or https://topshot-data-portal.vercel.app)",
    "  --dry-run          log what would happen; do not spawn sub-agents or call git/vercel",
    "  --help             print this usage and exit 0",
    "",
    "Exit codes:",
    "  0 — clean exit (STOP file, wall-clock, backlog drained, --once + pass)",
    "  1 — --once iteration failed (researcher/builder/judge)",
    "  2 — config error (invalid --feature, missing prompt template)",
    "  3 — uncaught fatal (defensive)",
    "",
    "How to stop a continuous loop:",
    "  touch STOP   # at the repo root; orchestrator exits cleanly next tick",
    "",
    "See loop/runner/README.md for the full operator runbook.",
  ].join("\n");
  console.log(usage);
}

function parseArgs(argv) {
  const out = {
    maxHours: DEFAULT_MAX_HOURS,
    feature: null,
    once: false,
    portalUrl: process.env.PORTAL_URL || DEFAULT_PORTAL_URL,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
    } else if (a === "--once") {
      out.once = true;
    } else if (a === "--dry-run") {
      out.dryRun = true;
    } else if (a === "--max-hours") {
      const v = argv[++i];
      if (v === undefined) {
        logErr("--max-hours requires a numeric argument");
        process.exit(2);
      }
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) {
        logErr(`--max-hours must be a positive number; got: ${v}`);
        process.exit(2);
      }
      out.maxHours = n;
    } else if (a === "--feature") {
      out.feature = argv[++i] ?? null;
      if (!out.feature) {
        logErr("--feature requires a feature id argument");
        process.exit(2);
      }
    } else if (a === "--portal-url") {
      out.portalUrl = argv[++i] ?? null;
      if (!out.portalUrl) {
        logErr("--portal-url requires a URL argument");
        process.exit(2);
      }
    } else {
      logErr(`unknown argument: ${a}`);
      printUsage();
      process.exit(2);
    }
  }
  return out;
}

// ── Filesystem helpers ─────────────────────────────────────────────────────

function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true });
}

function statePath(featureId, suffix) {
  return resolve(STATE_DIR, `${featureId}.${suffix}`);
}

function readIterationState(featureId) {
  const p = statePath(featureId, "iteration.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    logErr(`failed to parse iteration state at ${p}: ${e.message}`);
    return null;
  }
}

function writeIterationState(featureId, state) {
  const p = statePath(featureId, "iteration.json");
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n");
}

function writeFailedMarker(featureId, message) {
  const p = statePath(featureId, "failed.md");
  writeFileSync(
    p,
    `# Iteration failed — ${featureId}\n\n**At:** ${ts()}\n\n${message}\n`,
  );
  return p;
}

function writeCrashLog(featureId, err) {
  const p = statePath(featureId, "crash.log");
  const body =
    `[orchestrator] ${ts()} uncaught error during iteration for ${featureId}\n` +
    (err && err.stack ? err.stack : String(err)) +
    "\n";
  writeFileSync(p, body);
  return p;
}

// Prompts loaded once at startup so branch-switching during an iteration
// (Builder checks out feature branch) cannot leave the orchestrator unable to
// re-read them. Held in memory for the life of the process.
const PROMPT_CACHE = { research: null, build: null };

function loadPromptsAtStartup() {
  if (!existsSync(RESEARCH_PROMPT)) {
    logErr(`prompt template missing: ${RESEARCH_PROMPT}`);
    process.exit(2);
  }
  if (!existsSync(BUILD_PROMPT)) {
    logErr(`prompt template missing: ${BUILD_PROMPT}`);
    process.exit(2);
  }
  PROMPT_CACHE.research = readFileSync(RESEARCH_PROMPT, "utf8");
  PROMPT_CACHE.build = readFileSync(BUILD_PROMPT, "utf8");
}

function renderPromptTemplate(templatePath, featureId) {
  // Resolve to cached text via path identity (no re-read; survives branch switches).
  let tpl;
  if (templatePath === RESEARCH_PROMPT && PROMPT_CACHE.research) {
    tpl = PROMPT_CACHE.research;
  } else if (templatePath === BUILD_PROMPT && PROMPT_CACHE.build) {
    tpl = PROMPT_CACHE.build;
  } else {
    if (!existsSync(templatePath)) {
      logErr(`prompt template missing: ${templatePath}`);
      process.exit(2);
    }
    tpl = readFileSync(templatePath, "utf8");
  }
  return tpl.replaceAll("{FEATURE_ID}", featureId);
}

// ── Feature selection ──────────────────────────────────────────────────────

function loadFeatures() {
  return JSON.parse(readFileSync(FEATURES_PATH, "utf8"));
}

function pickFeature(features, requestedId) {
  if (requestedId) {
    const f = features.features.find((x) => x.id === requestedId);
    if (!f) {
      logErr(`--feature: id not found in features.json: ${requestedId}`);
      process.exit(2);
    }
    return f;
  }
  const candidates = features.features
    .filter((f) => !f.passes && !f.blocked)
    .sort((a, b) => a.priority - b.priority);
  return candidates[0] ?? null;
}

// ── Sub-agent dispatch ─────────────────────────────────────────────────────

/**
 * Spawn a child process with a per-role SIGTERM timeout, stream stdout+stderr
 * to a merged log file, and resolve with the exit code (or null if killed).
 *
 * stdinData (optional string): if provided, written to child.stdin then closed.
 */
function spawnRole({ command, args, env, logFile, timeoutMs, stdinData }) {
  return new Promise((resolveP) => {
    const out = createWriteStream(logFile, { flags: "a" });
    out.write(
      `\n--- spawn ${ts()} cmd=${command} args=${JSON.stringify(args)} timeout=${timeoutMs}ms ---\n`,
    );

    const child = spawn(command, args, {
      cwd: ROOT,
      env: env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });

    if (stdinData !== undefined && stdinData !== null) {
      child.stdin.write(stdinData);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    let killed = false;
    const termTimer = setTimeout(() => {
      killed = true;
      out.write(`\n--- ${ts()} SIGTERM after ${timeoutMs}ms ---\n`);
      try {
        child.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          out.write(`\n--- ${ts()} SIGKILL after ${SIGKILL_GRACE_MS}ms grace ---\n`);
          try {
            child.kill("SIGKILL");
          } catch {}
        }
      }, SIGKILL_GRACE_MS).unref();
    }, timeoutMs);
    termTimer.unref();

    child.on("error", (err) => {
      clearTimeout(termTimer);
      out.write(`\n--- ${ts()} child error: ${err.message} ---\n`);
      out.end();
      resolveP({ code: null, killed: true, spawnError: err });
    });

    child.on("exit", (code, signal) => {
      clearTimeout(termTimer);
      out.write(`\n--- ${ts()} exit code=${code} signal=${signal} killed=${killed} ---\n`);
      out.end();
      resolveP({ code, killed, signal });
    });
  });
}

// ── Iteration phases ───────────────────────────────────────────────────────

async function runResearcher({ featureId, dryRun }) {
  const promptText = renderPromptTemplate(RESEARCH_PROMPT, featureId);
  const logFile = statePath(featureId, "research.log");
  const expectedArtifact = resolve(RESEARCH_OUTPUT_DIR, `${featureId}.md`);

  if (dryRun) {
    log(`[dry-run] would spawn researcher: claude --print --add-dir ${ROOT} --dangerously-skip-permissions`);
    log(`[dry-run] researcher prompt rendered from ${RESEARCH_PROMPT} (${promptText.length} chars)`);
    log(`[dry-run] researcher log would stream to ${logFile}`);
    log(`[dry-run] expected artifact: ${expectedArtifact}`);
    return { ok: true, dryRun: true };
  }

  mkdirSync(RESEARCH_OUTPUT_DIR, { recursive: true });
  log(`researcher dispatch: feature=${featureId} log=${logFile}`);
  const res = await spawnRole({
    command: "claude",
    args: [
      "--print",
      "--bare",
      "--add-dir",
      ROOT,
      "--dangerously-skip-permissions",
    ],
    logFile,
    timeoutMs: RESEARCHER_TIMEOUT_MS,
    stdinData: promptText,
  });

  if (res.spawnError) {
    return {
      ok: false,
      reason: `researcher spawn error: ${res.spawnError.message}`,
    };
  }
  if (res.killed) {
    return { ok: false, reason: `researcher killed by timeout (${RESEARCHER_TIMEOUT_MS}ms)` };
  }
  if (res.code !== 0) {
    return { ok: false, reason: `researcher exited code=${res.code}` };
  }
  if (!existsSync(expectedArtifact)) {
    return {
      ok: false,
      reason: `researcher exited 0 but did not produce ${expectedArtifact}`,
    };
  }
  log(`researcher done: ${expectedArtifact}`);
  return { ok: true };
}

async function runBuilder({ featureId, dryRun }) {
  const promptText = renderPromptTemplate(BUILD_PROMPT, featureId);
  const logFile = statePath(featureId, "build.log");
  const doneMarker = statePath(featureId, "done.json");

  if (dryRun) {
    log(`[dry-run] would spawn builder: claude --print --add-dir ${ROOT} --dangerously-skip-permissions`);
    log(`[dry-run] builder prompt rendered from ${BUILD_PROMPT} (${promptText.length} chars)`);
    log(`[dry-run] builder log would stream to ${logFile}`);
    log(`[dry-run] expected done marker: ${doneMarker}`);
    return { ok: true, dryRun: true, doneMarker: null };
  }

  log(`builder dispatch: feature=${featureId} log=${logFile}`);
  const res = await spawnRole({
    command: "claude",
    args: [
      "--print",
      "--bare",
      "--add-dir",
      ROOT,
      "--dangerously-skip-permissions",
    ],
    logFile,
    timeoutMs: BUILDER_TIMEOUT_MS,
    stdinData: promptText,
  });

  if (res.spawnError) {
    return {
      ok: false,
      reason: `builder spawn error: ${res.spawnError.message}`,
    };
  }
  if (res.killed) {
    return { ok: false, reason: `builder killed by timeout (${BUILDER_TIMEOUT_MS}ms)` };
  }
  if (res.code !== 0) {
    return { ok: false, reason: `builder exited code=${res.code}` };
  }
  if (!existsSync(doneMarker)) {
    return { ok: false, reason: `builder exited 0 but no done marker at ${doneMarker}` };
  }
  let markerData;
  try {
    markerData = JSON.parse(readFileSync(doneMarker, "utf8"));
  } catch (e) {
    return { ok: false, reason: `builder done marker is invalid JSON: ${e.message}` };
  }
  if (!markerData.smoke_passed) {
    return {
      ok: false,
      reason: `builder reported smoke_passed=false in ${doneMarker}`,
      doneMarker,
      markerData,
    };
  }
  if (!markerData.deploy_url) {
    return {
      ok: false,
      reason: `builder done marker missing deploy_url: ${doneMarker}`,
    };
  }
  log(`builder done: commit=${markerData.commit_sha} deploy=${markerData.deploy_url}`);
  return { ok: true, doneMarker, markerData };
}

/**
 * Synchronously switch the working tree to a target branch. Used by runJudge
 * to ensure the feature branch's journey spec is on disk before the judge
 * runner reads it.
 */
function gitCheckout(branchName) {
  return spawnSync("git", ["-C", ROOT, "checkout", branchName], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

function gitCurrentBranch() {
  const r = spawnSync("git", ["-C", ROOT, "rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
  });
  return r.stdout?.trim() || "main";
}

async function runJudge({ featureId, deployUrl, branchName, dryRun }) {
  const logFile = statePath(featureId, "judge.log");

  if (dryRun) {
    log(`[dry-run] would checkout branch: ${branchName ?? "(none — staying put)"}`);
    log(`[dry-run] would spawn judge: node ${JUDGE_RUNNER} --feature ${featureId}`);
    log(`[dry-run] judge env PORTAL_URL=${deployUrl}`);
    log(`[dry-run] judge log would stream to ${logFile}`);
    return { ok: true, dryRun: true };
  }

  // Step A: checkout the feature branch so the journey spec is on disk.
  // Skip if no branchName (defensive — older done.json shape).
  let restoreBranch = null;
  if (branchName) {
    restoreBranch = gitCurrentBranch();
    const co = gitCheckout(branchName);
    if (co.status !== 0) {
      logErr(`judge: failed to checkout ${branchName}: ${co.stderr?.trim()}`);
      return { ok: false, reason: `git checkout ${branchName} failed: ${co.stderr?.trim()}` };
    }
    log(`judge: checked out ${branchName} (will restore to ${restoreBranch} after)`);
  }

  log(`judge dispatch: feature=${featureId} portal=${deployUrl} log=${logFile}`);
  const env = { ...process.env, PORTAL_URL: deployUrl };
  const res = await spawnRole({
    command: "node",
    args: [JUDGE_RUNNER, "--feature", featureId],
    env,
    logFile,
    timeoutMs: JUDGE_TIMEOUT_MS,
  });

  // Step B: restore the previous branch (best-effort; log on failure but
  // don't override the judge outcome).
  if (restoreBranch) {
    const restore = gitCheckout(restoreBranch);
    if (restore.status !== 0) {
      logErr(`judge: failed to restore ${restoreBranch}: ${restore.stderr?.trim()}`);
    } else {
      log(`judge: restored ${restoreBranch}`);
    }
  }

  if (res.spawnError) {
    return { ok: false, reason: `judge spawn error: ${res.spawnError.message}` };
  }
  if (res.killed) {
    return { ok: false, reason: `judge killed by timeout (${JUDGE_TIMEOUT_MS}ms)` };
  }
  if (res.code === 0) return { ok: true };
  if (res.code === 1) return { ok: false, reason: `judge fail (exit 1); see report in loop/judge/reports/` };
  if (res.code === 2) return { ok: false, reason: `judge runner error (exit 2)` };
  return { ok: false, reason: `judge exited code=${res.code}` };
}

// ── One iteration ──────────────────────────────────────────────────────────

async function runIteration({ requestedFeatureId, portalUrl, dryRun }) {
  // 1. STOP check
  if (existsSync(STOP_FILE)) {
    log("STOP file present, exiting cleanly");
    return { exitCode: 0, terminal: true };
  }

  // 2. Read features.json + pick feature
  let features;
  try {
    features = loadFeatures();
  } catch (e) {
    logErr(`failed to read features.json: ${e.message}`);
    return { exitCode: 2, terminal: true };
  }
  const feature = pickFeature(features, requestedFeatureId);
  if (!feature) {
    log("no eligible features — backlog drained");
    return { exitCode: 0, terminal: true };
  }

  // 4. Generate run-id
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  // 5. Iteration state (idempotent re-attempt counter)
  ensureStateDir();
  const prior = readIterationState(feature.id);
  const attempts = (prior?.attempts ?? 0) + 1;
  const startedAt = new Date().toISOString();
  let state = {
    run_id: runId,
    feature_id: feature.id,
    started_at: startedAt,
    phase: "researching",
    attempts,
  };
  writeIterationState(feature.id, state);

  // 6. Log iteration start
  log(
    `iter run=${runId} feature=${feature.id} priority=${feature.priority} attempt=${attempts}`,
  );

  // 7. Researcher
  const researchRes = await runResearcher({ featureId: feature.id, dryRun });
  if (!researchRes.ok) {
    state.phase = "failed";
    state.failed_at = new Date().toISOString();
    state.failure_reason = researchRes.reason;
    writeIterationState(feature.id, state);
    const markerPath = writeFailedMarker(
      feature.id,
      `Researcher phase failed: ${researchRes.reason}`,
    );
    logErr(`researcher failed: ${researchRes.reason} (marker: ${markerPath})`);
    return { exitCode: 1, terminal: false, feature };
  }

  // 8. Builder
  state.phase = "building";
  writeIterationState(feature.id, state);
  const buildRes = await runBuilder({ featureId: feature.id, dryRun });
  if (!buildRes.ok) {
    state.phase = "failed";
    state.failed_at = new Date().toISOString();
    state.failure_reason = buildRes.reason;
    writeIterationState(feature.id, state);
    const markerPath = writeFailedMarker(
      feature.id,
      `Builder phase failed: ${buildRes.reason}`,
    );
    logErr(`builder failed: ${buildRes.reason} (marker: ${markerPath})`);
    return { exitCode: 1, terminal: false, feature };
  }

  // 9. Judge — skip if Builder already ran judge locally and reported judge_passed:true.
  // This is the gpt-5 + claude-sub-agent convergent finding from the 2026-05-17 review:
  // the redundant Judge phase doubles wall-clock and duplicates progress.md lines.
  // Builder's local Judge IS the canonical pass; orchestrator records the outcome.
  state.phase = "judging";
  writeIterationState(feature.id, state);
  const deployUrl = dryRun
    ? portalUrl
    : buildRes.markerData?.deploy_url ?? portalUrl;
  const branchName = dryRun ? null : buildRes.markerData?.branch_name ?? null;
  const builderJudgePassed = !dryRun && buildRes.markerData?.judge_passed === true;

  let judgeRes;
  if (builderJudgePassed) {
    log(`judge: Builder already ran Judge locally (done.json#judge_passed=true) — skipping redundant orchestrator-side dispatch`);
    judgeRes = { ok: true, skipped: true };
  } else {
    judgeRes = await runJudge({
      featureId: feature.id,
      deployUrl,
      branchName,
      dryRun,
    });
  }

  // 10. Outcome
  if (judgeRes.ok) {
    state.phase = "done";
    state.completed_at = new Date().toISOString();
    state.deploy_url = deployUrl;
    writeIterationState(feature.id, state);
    log(`feature=${feature.id} passed at ${state.completed_at} deploy=${deployUrl}`);
    return { exitCode: 0, terminal: false, feature };
  } else {
    state.phase = "failed";
    state.failed_at = new Date().toISOString();
    state.failure_reason = judgeRes.reason;
    writeIterationState(feature.id, state);
    logErr(
      `judge failed feature=${feature.id} reason=${judgeRes.reason} (see loop/judge/reports/)`,
    );
    return { exitCode: 1, terminal: false, feature };
  }
}

// ── Main loop ──────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  ensureStateDir();

  // Validate prompt templates exist before we start spawning anything (even
  // dry-run validates this so the operator finds out before the loop runs).
  for (const p of [RESEARCH_PROMPT, BUILD_PROMPT]) {
    if (!existsSync(p)) {
      logErr(`missing prompt template: ${p}`);
      process.exit(2);
    }
  }

  // Load prompts into memory ONCE at startup. Iteration's branch-switching
  // (Builder checks out feature branch, Judge checks out feature branch) can
  // leave the prompt files missing from the working tree mid-iteration — the
  // in-memory copies survive.
  loadPromptsAtStartup();

  if (!existsSync(JUDGE_RUNNER)) {
    logErr(`missing judge runner: ${JUDGE_RUNNER}`);
    process.exit(2);
  }

  const loopStartMs = Date.now();
  const budgetMs = opts.maxHours * 3600 * 1000;

  // Defensive wall-clock — fires regardless of inner loop state.
  const budgetTimer = setTimeout(() => {
    logErr(`wall-clock budget exceeded (${opts.maxHours}h); exiting`);
    process.exit(0);
  }, budgetMs);
  budgetTimer.unref();

  log(
    `start max-hours=${opts.maxHours} once=${opts.once} dry-run=${opts.dryRun} feature=${opts.feature ?? "(auto)"} portal=${opts.portalUrl}`,
  );

  let iterationCount = 0;

  while (true) {
    // Wall-clock soft check (in addition to the unref'd hard timer above).
    const elapsedMs = Date.now() - loopStartMs;
    if (elapsedMs > budgetMs) {
      log(
        `wall-clock budget reached (${(elapsedMs / 3600000).toFixed(2)}h >= ${opts.maxHours}h); exiting`,
      );
      process.exit(0);
    }

    iterationCount++;
    const iterStart = Date.now();
    let result;
    try {
      result = await runIteration({
        requestedFeatureId: opts.feature,
        portalUrl: opts.portalUrl,
        dryRun: opts.dryRun,
      });
    } catch (e) {
      const fid = opts.feature ?? "(unknown)";
      const crashPath = writeCrashLog(fid, e);
      logErr(`uncaught iteration error (continuing): ${e.message} (crash log: ${crashPath})`);
      if (opts.once) process.exit(3);
      result = { exitCode: 3, terminal: false };
    }

    const elapsedSec = ((Date.now() - iterStart) / 1000).toFixed(1);
    log(
      `iter#${iterationCount} done exit=${result.exitCode} terminal=${!!result.terminal} elapsed=${elapsedSec}s`,
    );

    if (result.terminal) process.exit(result.exitCode);
    if (opts.once) process.exit(result.exitCode);

    await new Promise((r) => setTimeout(r, ITERATION_SLEEP_MS));
  }
}

// Defensive top-level fatal-catch. Should never trigger because every
// iteration is already wrapped in try/catch, but if it does, exit 3.
process.on("uncaughtException", (err) => {
  logErr(`uncaughtException: ${err.stack ?? err}`);
  process.exit(3);
});
process.on("unhandledRejection", (reason) => {
  logErr(`unhandledRejection: ${reason}`);
  process.exit(3);
});

main().catch((err) => {
  logErr(`main() rejected: ${err.stack ?? err}`);
  process.exit(3);
});
