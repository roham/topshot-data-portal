#!/usr/bin/env node
// audit-copy.mjs — scan app/ + components/ for design-process notes that leaked into production.
//
// Two passes:
//   1. STATIC — regex sweep for known dev-jargon patterns
//   2. LLM — gpt-5.5 reads each candidate string in context and grades it user-facing / dev-leak
//
// Usage:
//   node scripts/audit-copy.mjs                  # static pass only, exit 1 if any P0 hits
//   node scripts/audit-copy.mjs --llm            # also run gpt-5.5 vibe-check on borderline strings
//   node scripts/audit-copy.mjs --output FILE    # write JSON report
//
// Output: structured JSON {file, line, snippet, pattern, severity, suggested_fix}
//
// Per doctrine §P6: trader's verbatim ask is the spec. Internal-dev-notes in
// user-facing copy violate this. Per persona doc: "marketing copy in surfaces
// meant to be instruments is an instant credibility kill."

import fs from "fs";
import path from "path";

const args = process.argv.slice(2).reduce((a, v) => {
  const m = v.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) a[m[1]] = m[2] ?? true;
  return a;
}, {});

const USE_LLM = !!args.llm;
const OUT_PATH = args.output;

// ── PATTERN CATALOG ───────────────────────────────────────────────────────
//
// Each pattern: {label, regex, severity, why, suggested}.
// Severity:
//   P0 — schema name, DB identifier, or doctrine reference. Always wrong in user copy.
//   P1 — implementation jargon ("treemap", "meme-coin", "vision-diff"). Almost always wrong.
//   P2 — comparable reference ("Card Ladder Pro CL50", "StockX size-as-market-segmenter"). Should
//        live in methodology footer at most, never in chart subtitles.
const PATTERNS = [
  // P0 — schema / DB / file paths in copy
  { label: "schema-name", re: /\btopshot\.[a-z_]+\b/, severity: "P0", why: "Postgres schema name visible to users", suggested: "Remove the table reference; describe the data semantically" },
  { label: "mv-prefix", re: /\bmv_[a-z_]+\b/, severity: "P0", why: "Materialized view name visible to users", suggested: "Remove; use plain English ('player market cap snapshot')" },
  { label: "snake-case-table", re: /\b(asset_nba|asset_ownership|user_nba_top_shot|user_nfl)_[a-z_]+\b/, severity: "P0", why: "BQ table identifier visible to users", suggested: "Remove; reference the concept ('ownership data')" },
  { label: "doctrine-section", re: /(doctrine\s+§|§P\d|§0\.\d)/i, severity: "P0", why: "Internal doctrine reference in user copy", suggested: "Move to /methodology page; don't reference in user-facing text" },
  { label: "code-type", re: /<code>type=(user|nc)<\/code>/, severity: "P0", why: "Internal type literal visible to users", suggested: "'Custodial accounts' / 'non-custodial wallets'" },
  { label: "graphql-name", re: /(searchMintedMoments|ownerV2|searchUsers|getUser|getEdition|getMoment)/, severity: "P0", why: "GraphQL query name visible to users", suggested: "Remove" },

  // P1 — implementation jargon
  { label: "meme-coin", re: /\bmeme[- ]?coin\b/i, severity: "P1", why: "Internal styling description leaked", suggested: "Remove; describe the visual outcome instead" },
  { label: "intensity-scaling", re: /\bintensity[- ]?scaling\b/i, severity: "P1", why: "Internal design-system jargon", suggested: "Remove" },
  { label: "chart-type-name", re: /\b(treemap|stacked area|sankey|sunburst|heatmap)\b/i, severity: "P1", why: "Chart-type name in caption is implementation, not content", suggested: "Describe what the chart shows, not how" },
  { label: "vision-diff", re: /\bvision[- ]?diff(?:ing|ed)?\b/i, severity: "P1", why: "Internal QA tool name", suggested: "Remove" },
  { label: "loop-ref", re: /\bLoop [AB]\b/, severity: "P1", why: "Internal loop architecture reference", suggested: "Remove" },
  { label: "etl-mention", re: /\bETL\b|materialized view|materialised view/, severity: "P1", why: "Internal pipeline terminology", suggested: "Remove or rephrase as 'data refresh'" },
  { label: "fandom-pipeline", re: /\bfandom[- ]?v\d/i, severity: "P1", why: "Internal repo name visible to users", suggested: "Remove" },

  // P2 — comparable references (acceptable in methodology, not in titles/subtitles/captions)
  { label: "comparable-name-in-card", re: /^(?:.{0,20})?(?:Card Ladder Pro|Polymarket|Bloomberg|TradingView|Tensor|OTM|StockX|Card Ladder)(?:.{0,20})?$/i, severity: "P2", why: "Comparable name in a card title/subtitle (should be in methodology page)", suggested: "Move to a single methodology page; don't reference per-card" },
  { label: "comparable-signature-name", re: /\b(size[- ]?as[- ]?market[- ]?segmenter|CL50 index|sniper journey|cards[- ]?grid)\b/i, severity: "P2", why: "Comparable's signature-move name in production copy", suggested: "Remove" },

  // P2 — design-process notes
  { label: "design-process", re: /\b(per Roham|per doctrine|cookbook|signature[- ]?move|comparable[- ]?capture)\b/i, severity: "P1", why: "Design-process note in production", suggested: "Remove" },
];

const SCAN_DIRS = [
  "app",
  "components",
];

// File-content filter: skip files that aren't TSX/JSX/TS/JS
const FILE_EXT = /\.(tsx|ts|jsx|js)$/;

// Skip generated/build artifacts
const SKIP_RE = /(\.next|node_modules|test\.|\.spec\.|__test__|playwright-report)/;

// ── COLLECT CANDIDATES ────────────────────────────────────────────────────

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_RE.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (FILE_EXT.test(entry.name)) {
      yield full;
    }
  }
}

const findings = [];

for (const dir of SCAN_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Skip pure comments — comments are dev-facing and OK
      const stripped = line.trim();
      if (stripped.startsWith("//") || stripped.startsWith("*") || stripped.startsWith("/*")) return;

      // We're looking inside JSX/string literals — extract candidate strings
      // Simple heuristic: anything between matching " or ` or > <
      // Use a permissive line-level scan
      // Heuristic — only flag lines that look like user-facing strings/JSX text.
      // Skip pure JS code (imports, function declarations, await calls without string args).
      const isLikelyUserFacing = (
        // JSX prop with string value
        /\b(title|subtitle|caption|body|placeholder|aria-label|description|methodology|label)=["{`]/i.test(line) ||
        // JSX text content between tags
        />[^<>{}]+</.test(line) ||
        // Inside a string template/literal with prose punctuation
        /["`'][^"`']*(\.\.\.|\.|—| · | \| |\s—\s)[^"`']*["`']/.test(line) ||
        // <code> blocks (these render to users)
        /<code[^>]*>[^<]+<\/code>/.test(line)
      );

      // Skip lines that are unambiguously code-only
      const isPureCode = (
        /^\s*(import|export|const|let|var|function|async\s+function|return|await|throw|if|else|for|while|switch)\b/.test(line) &&
        !/["`'][^"`']{15,}["`']/.test(line) && // no long string literals that might be UI text
        !/<\w/.test(line) // no JSX
      );

      if (isPureCode && !isLikelyUserFacing) return;

      for (const p of PATTERNS) {
        const m = line.match(p.re);
        if (m) {
          // Skip if the match is inside a comment that runs to end of line
          const before = line.slice(0, m.index ?? 0);
          if (before.includes("//")) continue;

          // For graphql-name / schema-name / mv-prefix: only flag if the match appears INSIDE quotes or JSX text.
          // For other patterns: more permissive.
          if (["graphql-name", "schema-name", "mv-prefix", "snake-case-table"].includes(p.label)) {
            // Check if the matched token is inside a string literal or JSX text on this line
            const inString = /["`'][^"`']*\b/.test(line.slice(0, (m.index ?? 0) + m[0].length)) &&
                             new RegExp(`["\`'][^"\`']*${m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"\`']*["\`']`).test(line);
            const inJsxText = />[^<>{}]*\b/.test(line.slice(0, m.index ?? 0)) &&
                              new RegExp(`>[^<]*${m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*<`).test(line);
            if (!inString && !inJsxText) continue;
          }

          findings.push({
            file: path.relative(process.cwd(), file),
            line: i + 1,
            col: m.index ?? 0,
            match: m[0],
            snippet: line.trim().slice(0, 180),
            pattern: p.label,
            severity: p.severity,
            why: p.why,
            suggested: p.suggested,
          });
        }
      }
    });
  }
}

// ── DEDUPE + SORT ─────────────────────────────────────────────────────────
const seen = new Set();
const unique = [];
for (const f of findings) {
  const k = `${f.file}:${f.line}:${f.pattern}`;
  if (seen.has(k)) continue;
  seen.add(k);
  unique.push(f);
}
unique.sort((a, b) => {
  if (a.severity !== b.severity) return a.severity.localeCompare(b.severity);
  return a.file.localeCompare(b.file) || a.line - b.line;
});

// ── OPTIONAL LLM VIBE-CHECK ───────────────────────────────────────────────
async function llmVibeCheck(items) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[audit-copy] OPENAI_API_KEY not set — skipping LLM pass");
    return items;
  }
  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  console.log(`[audit-copy] LLM vibe-check on ${items.length} candidates via gpt-5.5...`);
  for (const item of items) {
    const prompt = `You are an editor for an NBA Top Shot data portal targeting pro trader-collectors.
The portal's voice doctrine rejects: marketing copy, internal dev jargon, schema/code references,
chart-type names in user-facing copy, doctrine/process references.

A static scan flagged this line as possibly leaking design-process notes:

File: ${item.file}:${item.line}
Snippet: "${item.snippet}"
Matched pattern: ${item.pattern} (${item.why})

Is this a real violation a pro trader would notice as "internal note in production"? Reply with JSON:
{"verdict": "violation"|"acceptable", "reason": "...", "suggested_replacement": "..."}`;

    try {
      const resp = await client.chat.completions.create({
        model: "gpt-5.5",
        messages: [
          { role: "system", content: "You output JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 300,
      });
      const j = JSON.parse(resp.choices[0].message.content);
      item.llm = j;
    } catch (e) {
      item.llm = { error: e.message.slice(0, 100) };
    }
  }
  return items;
}

let final = unique;
if (USE_LLM) {
  // Only LLM-check the borderline ones (P1/P2). P0 are unambiguous.
  const borderline = unique.filter((u) => u.severity !== "P0");
  await llmVibeCheck(borderline);
}

// ── REPORT ────────────────────────────────────────────────────────────────
const summary = {
  total: final.length,
  by_severity: {
    P0: final.filter((f) => f.severity === "P0").length,
    P1: final.filter((f) => f.severity === "P1").length,
    P2: final.filter((f) => f.severity === "P2").length,
  },
  by_pattern: Object.fromEntries(
    PATTERNS.map((p) => [p.label, final.filter((f) => f.pattern === p.label).length])
  ),
};

console.log("\n=== COPY AUDIT ===");
console.log(`Files scanned under: ${SCAN_DIRS.join(", ")}`);
console.log(`Total findings: ${summary.total}`);
console.log(`  P0 (schema / doctrine / DB names): ${summary.by_severity.P0}`);
console.log(`  P1 (implementation jargon): ${summary.by_severity.P1}`);
console.log(`  P2 (comparable refs / design-process notes): ${summary.by_severity.P2}`);

if (final.length > 0) {
  console.log("\n=== TOP FINDINGS ===");
  for (const f of final.slice(0, 40)) {
    const llmTag = f.llm?.verdict === "violation" ? " [LLM: VIOLATION]" :
                   f.llm?.verdict === "acceptable" ? " [LLM: ok]" : "";
    console.log(`[${f.severity}] ${f.file}:${f.line} — ${f.pattern}${llmTag}`);
    console.log(`    "${f.snippet}"`);
    console.log(`    → ${f.suggested}`);
  }
}

if (OUT_PATH) {
  fs.writeFileSync(OUT_PATH, JSON.stringify({ summary, findings: final }, null, 2));
  console.log(`\nReport written to: ${OUT_PATH}`);
}

// Exit non-zero on any P0 (so CI can fail builds)
const p0Count = summary.by_severity.P0;
if (p0Count > 0) {
  console.log(`\n❌ ${p0Count} P0 violations — exit 1`);
  process.exit(1);
}
console.log("\n✓ No P0 violations");
process.exit(0);
