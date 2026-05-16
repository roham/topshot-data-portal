#!/usr/bin/env node
// Persona-judge runner.
//
// Reads features.json, picks the requested feature (or highest-priority
// un-passed if none given), runs the journey against PORTAL_URL, and either
// flips passes:true with passes_at timestamp OR writes a fail report.
//
// Usage:
//   PORTAL_URL=https://topshot-data-portal-...-vercel.app \
//     node loop/judge/run.mjs --feature moments-grid
//
// Exit codes:
//   0 — journey passed AND flag flipped
//   1 — journey failed (fail report written)
//   2 — runner error (config / file IO / missing journey spec)

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const FEATURES = resolve(ROOT, "features.json");
const PROGRESS = resolve(ROOT, "progress.md");
const REPORTS_DIR = resolve(HERE, "reports");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { feature: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--feature") {
      out.feature = args[++i];
    }
  }
  return out;
}

function loadFeatures() {
  return JSON.parse(readFileSync(FEATURES, "utf8"));
}

function saveFeatures(f) {
  writeFileSync(FEATURES, JSON.stringify(f, null, 2) + "\n");
}

function pickFeature(features, requested) {
  if (requested) {
    const f = features.features.find((x) => x.id === requested);
    if (!f) {
      console.error(`[judge] feature not found: ${requested}`);
      process.exit(2);
    }
    return f;
  }
  // Default: highest-priority un-passed un-blocked feature
  const candidates = features.features
    .filter((f) => !f.passes && !f.blocked)
    .sort((a, b) => a.priority - b.priority);
  if (candidates.length === 0) {
    console.log("[judge] no un-passed unblocked features — loop is done?");
    process.exit(0);
  }
  return candidates[0];
}

function appendProgressLog(line) {
  const cur = readFileSync(PROGRESS, "utf8");
  const marker = "## Completed (chronological, judge-verified only)";
  if (cur.includes(marker)) {
    const replaced = cur.replace(
      `${marker}\n\n(none yet)`,
      `${marker}\n\n- ${line}`,
    );
    if (replaced !== cur) {
      writeFileSync(PROGRESS, replaced);
      return;
    }
    // Append below the marker if "(none yet)" already removed
    const idx = cur.indexOf(marker);
    const nextSection = cur.indexOf("\n##", idx + 1);
    const before = cur.slice(0, nextSection);
    const after = cur.slice(nextSection);
    writeFileSync(PROGRESS, `${before}\n- ${line}\n${after}`);
  }
}

function appendProgressFailLog(line) {
  const cur = readFileSync(PROGRESS, "utf8");
  const marker = "## Failed (judge fail-reports for re-research)";
  if (cur.includes(marker)) {
    const replaced = cur.replace(
      `${marker}\n\n(none yet)`,
      `${marker}\n\n- ${line}`,
    );
    if (replaced !== cur) writeFileSync(PROGRESS, replaced);
  }
}

function runPlaywright(specPath) {
  const env = { ...process.env };
  if (!env.PORTAL_URL) {
    console.warn("[judge] PORTAL_URL not set; defaulting to http://localhost:3000");
  }
  const res = spawnSync(
    "npx",
    ["playwright", "test", "--config", "loop/judge/playwright.config.ts", specPath],
    { cwd: ROOT, env, stdio: "inherit" },
  );
  return res.status === 0;
}

function findLatestCapture(journeyId) {
  const baseDir = resolve(HERE, "captures", journeyId);
  if (!existsSync(baseDir)) return null;
  const entries = readdirSync(baseDir).sort().reverse();
  return entries.length > 0 ? resolve(baseDir, entries[0]) : null;
}

function main() {
  const { feature: requested } = parseArgs();
  const features = loadFeatures();
  const feature = pickFeature(features, requested);
  console.log(`[judge] running ${feature.id} (priority ${feature.priority}) against ${process.env.PORTAL_URL ?? "(default localhost)"}`);

  const specPath = `loop/judge/journeys/${feature.id}.spec.ts`;
  if (!existsSync(resolve(ROOT, specPath))) {
    console.error(`[judge] no spec at ${specPath}`);
    process.exit(2);
  }

  mkdirSync(REPORTS_DIR, { recursive: true });

  const passed = runPlaywright(specPath);
  const capturePath = findLatestCapture(feature.id);
  const ts = new Date().toISOString();

  if (passed) {
    // Flip the feature's flag
    for (const f of features.features) {
      if (f.id === feature.id) {
        f.passes = true;
        f.passes_at = ts;
        if (!f.judge_evidence) f.judge_evidence = [];
        f.judge_evidence.push({ at: ts, capture_dir: capturePath ?? null, portal_url: process.env.PORTAL_URL ?? null });
      }
    }
    saveFeatures(features);
    appendProgressLog(`${ts.slice(0, 10)} — \`${feature.id}\` flipped \`passes:true\` (judge run against ${process.env.PORTAL_URL ?? "localhost"}; capture: ${capturePath ?? "n/a"})`);
    console.log(`[judge] PASS — ${feature.id} flipped`);
    process.exit(0);
  } else {
    const failReport = resolve(REPORTS_DIR, `${feature.id}-${ts.replace(/[:.]/g, "-")}.md`);
    writeFileSync(
      failReport,
      `# Judge fail report — ${feature.id}\n\n` +
        `**Run at:** ${ts}\n**Portal URL:** ${process.env.PORTAL_URL ?? "(default)"}\n**Capture dir:** ${capturePath ?? "(none)"}\n\n` +
        `## What failed\n\nSee Playwright output above and the screenshots in the capture dir.\n\n` +
        `## Next research turn\n\nRead the capture screenshots in order, identify which step the persona stalled at, and propose a fix.\n`,
    );
    // Append to feature's fail_reasons
    for (const f of features.features) {
      if (f.id === feature.id) {
        if (!f.fail_reasons) f.fail_reasons = [];
        f.fail_reasons.push({ at: ts, report: failReport });
      }
    }
    saveFeatures(features);
    appendProgressFailLog(`${ts.slice(0, 10)} — \`${feature.id}\` FAILED judge (report: ${failReport})`);
    console.log(`[judge] FAIL — ${feature.id}; report at ${failReport}`);
    process.exit(1);
  }
}

main();
