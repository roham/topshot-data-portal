#!/usr/bin/env -S npx tsx
// V8 → V9 queue migration tool.
// Reads loop/v8/state/task-ledger.json `queue` array.
// Maps each item to one of {DISCOVERABILITY, POLISH, VISUAL} per heuristic rules below.
// Writes results to loop/v9/queues/*.json (append, dedupe by id).
// Writes loop/v9/state/migration-report.md (audit trail).
// Writes loop/v9/MIGRATED (soft marker — per Opus pushback, first 3 iters refuse to dispatch
//   over its absence with rationale, but iter-4+ proceeds; not a hard gate).
//
// Usage:
//   npx tsx loop/v9/tools/migrate-v8-queues.ts
//
// Idempotent: re-running produces no duplicate entries (dedup by id).

import * as fs from "fs";
import * as path from "path";

interface V8QueueItem {
  tier: string;
  id: string;
  name: string;
  track_default?: string;
  rw_class?: string;
  spec_ref?: string;
  files_to_touch?: string[];
  comparable?: string;
  signature_move?: string;
  doctrine_quote?: string;
  verification?: string;
  status?: string;
}

interface V9QueueItem {
  id: string;
  title: string;
  track: "DISCOVERABILITY-GAP" | "POLISH-EXISTING" | "VIZ-COMPLETENESS";
  rw_class: "READ-WRITE";
  status: "open" | "in_progress" | "done" | "blocked" | "retired";
  priority: number;
  created_at: string;
  updated_at: string;
  age_hours: number;
  blocked_by: string | null;
  rationale: string;
  end_state: string;
  comparable_primary: string;
  comparable_cross_domain: string;
  signature_move: string;
  doctrine_quote: string;
  why_this_quote_applies: string;
  load_bearing_file: string;
  spot_read_target: string;
  estimated_effort: "S" | "M" | "L";
  estimated_minutes: number;
  added_by: string;
}

const REPO_ROOT = path.resolve(__dirname, "../../..");
const V8_LEDGER = path.join(REPO_ROOT, "loop/v8/state/task-ledger.json");
const V9_QUEUES = {
  "DISCOVERABILITY-GAP": path.join(REPO_ROOT, "loop/v9/queues/discoverability.json"),
  "POLISH-EXISTING": path.join(REPO_ROOT, "loop/v9/queues/polish.json"),
  "VIZ-COMPLETENESS": path.join(REPO_ROOT, "loop/v9/queues/visual.json"),
};
const REPORT_PATH = path.join(REPO_ROOT, "loop/v9/state/migration-report.md");
const MIGRATED_FLAG = path.join(REPO_ROOT, "loop/v9/MIGRATED");

function classifyV8Item(item: V8QueueItem): {
  track: "DISCOVERABILITY-GAP" | "POLISH-EXISTING" | "VIZ-COMPLETENESS";
  status: "open" | "blocked" | "retired";
  rationale: string;
} {
  const sig = (item.signature_move || "").toLowerCase();
  const files = (item.files_to_touch || []).join(" ").toLowerCase();
  const name = item.name.toLowerCase();

  // Heuristic 1 — explicit retiring
  if (sig.includes("segmented pills") || sig.includes("indexpillrow")) {
    return {
      track: "POLISH-EXISTING",
      status: "retired",
      rationale: "Superseded by TopNav global TimeWindowSelector (HANDOVER-topshot-portal-visual-sprint-2026-05-19 commit 25ab009).",
    };
  }

  // Heuristic 2 — chart-shape work → VIZ-COMPLETENESS
  if (
    sig.includes("chart") ||
    sig.includes("crosshair") ||
    sig.includes("multi-line") ||
    sig.includes("depth") ||
    sig.includes("sparkline") ||
    sig.includes("compare-formulas") ||
    name.includes("compare drawer") ||
    name.includes("multi-line") ||
    name.includes("hover")
  ) {
    return {
      track: "VIZ-COMPLETENESS",
      status: "open",
      rationale: "V8 Tier A item with chart-shape signature; maps to VIZ-COMPLETENESS.",
    };
  }

  // Heuristic 3 — chrome/density/toggle work → POLISH-EXISTING
  if (
    sig.includes("toggle") ||
    sig.includes("chrome") ||
    sig.includes("sticky") ||
    sig.includes("density") ||
    sig.includes("pro toggle") ||
    name.includes("toggle") ||
    name.includes("density")
  ) {
    return {
      track: "POLISH-EXISTING",
      status: "open",
      rationale: "V8 Tier A item with chrome/density signature; maps to POLISH-EXISTING.",
    };
  }

  // Heuristic 4 — nav/home/discovery → POLISH-EXISTING (default per V9 priority)
  if (
    files.includes("topnav") ||
    files.includes("page.tsx") ||
    name.includes("nav") ||
    name.includes("home")
  ) {
    return {
      track: "POLISH-EXISTING",
      status: "open",
      rationale: "V8 item touches nav/home; maps to POLISH-EXISTING.",
    };
  }

  // Default: POLISH-EXISTING with manual-review flag
  return {
    track: "POLISH-EXISTING",
    status: "blocked",
    rationale: "V8 item did not match any heuristic; flagged for manual review. blocked_by:manual_review until Roham re-tracks.",
  };
}

function v8ToV9(item: V8QueueItem): V9QueueItem | null {
  if (item.status === "shipped" || item.status === "done") {
    return null; // skip shipped items
  }

  const cls = classifyV8Item(item);
  const now = new Date().toISOString();
  const v8Id = item.id;
  const v9Id = cls.track === "DISCOVERABILITY-GAP"
    ? `DISC-V8-${v8Id}`
    : cls.track === "POLISH-EXISTING"
    ? `POLISH-V8-${v8Id}`
    : `VIZ-V8-${v8Id}`;

  const comparableParts = (item.comparable || "").split(/\s*[+]\s*/);
  const primary = comparableParts[0] || "Bloomberg Terminal";
  const crossDomain = comparableParts[1] || "TradingView";

  return {
    id: v9Id,
    title: item.name,
    track: cls.track,
    rw_class: "READ-WRITE",
    status: cls.status as any,
    priority: 50, // mid-priority by default — V9-charter items take 80-100
    created_at: now,
    updated_at: now,
    age_hours: 0,
    blocked_by: cls.status === "blocked" ? "manual_review" : null,
    rationale: `Migrated from V8 task-ledger ${v8Id}. ${cls.rationale}`,
    end_state: item.verification || "(migrated — verification not specified in V8 entry; needs Planner enrichment)",
    comparable_primary: primary,
    comparable_cross_domain: crossDomain,
    signature_move: item.signature_move || "(migrated — signature move not specified)",
    doctrine_quote: item.doctrine_quote || "Pillar 1 — Data Visualization Is The Brand.",
    why_this_quote_applies: "(migrated — Planner to author on iter dispatch)",
    load_bearing_file: (item.files_to_touch || [""])[0] || "(migrated — needs Planner enrichment)",
    spot_read_target: (item.files_to_touch || [""])[0] || "(migrated — needs Planner enrichment)",
    estimated_effort: "M",
    estimated_minutes: 60,
    added_by: "migrate-v8-queues",
  };
}

function dedupe<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const ids = new Set(existing.map((x) => x.id));
  return [...existing, ...incoming.filter((x) => !ids.has(x.id))];
}

function main() {
  if (!fs.existsSync(V8_LEDGER)) {
    console.error(`V8 ledger not found at ${V8_LEDGER}`);
    process.exit(1);
  }

  const v8 = JSON.parse(fs.readFileSync(V8_LEDGER, "utf-8"));
  const v8Items: V8QueueItem[] = v8.queue || [];

  const reportLines: string[] = [
    "# V8 → V9 Queue Migration Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: loop/v8/state/task-ledger.json (${v8Items.length} items)`,
    "",
    "## Items migrated",
    "",
    "| V8 ID | Name | V8 status | V9 track | V9 status | Rationale |",
    "|---|---|---|---|---|---|",
  ];

  const byTrack: Record<string, V9QueueItem[]> = {
    "DISCOVERABILITY-GAP": [],
    "POLISH-EXISTING": [],
    "VIZ-COMPLETENESS": [],
  };

  for (const v8Item of v8Items) {
    const v9Item = v8ToV9(v8Item);
    if (!v9Item) {
      reportLines.push(`| ${v8Item.id} | ${v8Item.name} | ${v8Item.status || "?"} | — | SKIPPED | already shipped/done |`);
      continue;
    }
    byTrack[v9Item.track].push(v9Item);
    reportLines.push(
      `| ${v8Item.id} | ${v8Item.name} | ${v8Item.status || "queued"} | ${v9Item.track} | ${v9Item.status} | ${v9Item.rationale.slice(0, 80)}... |`,
    );
  }

  reportLines.push("", "## Per-queue summary", "");
  for (const [track, items] of Object.entries(byTrack)) {
    reportLines.push(`- **${track}**: ${items.length} items migrated`);
  }

  // Merge into existing queue files (dedup by id)
  for (const [track, items] of Object.entries(byTrack)) {
    const queuePath = V9_QUEUES[track as keyof typeof V9_QUEUES];
    let existing = { schema_version: "v9", track, queue: [] as V9QueueItem[] };
    if (fs.existsSync(queuePath)) {
      existing = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    }
    existing.queue = dedupe(existing.queue, items);
    fs.writeFileSync(queuePath, JSON.stringify(existing, null, 2));
    console.log(`Wrote ${queuePath}: ${existing.queue.length} items (${items.length} newly added)`);
  }

  // Write report
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines.join("\n"));
  console.log(`Wrote migration report to ${REPORT_PATH}`);

  // Write MIGRATED soft marker
  fs.writeFileSync(MIGRATED_FLAG, `migrated_at: ${new Date().toISOString()}\nmigrated_count: ${v8Items.length}\n`);
  console.log(`Wrote MIGRATED soft marker to ${MIGRATED_FLAG}`);
}

main();
