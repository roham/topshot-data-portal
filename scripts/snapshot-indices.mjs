// V4-iter-4 — build-time precompute writer for tier/team/series indices.
//
// Invoked by .github/workflows/snapshot-indices.yml on 2h cadence. Runs
// the three computeXIndices synthesizers sequentially (team is the heavy
// path, ~3 min) so a mid-stream failure doesn't leave the other two with
// an inconsistent timestamp band. Writes one JSON per scope under
// .snapshots/indices/<scope>-<ISO>.json; rotates keeping 3 newest per
// scope.
//
// Schema contract: lib/indices/types.ts → IndexSnapshot<T>.
// Reader: read{Tier,Team,Series}IndicesSnapshot() in the three synth files.

import {
  writeFileSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// tsx makes the .ts imports resolvable from this .mjs entry point.
// The workflow invokes: `node --import tsx scripts/snapshot-indices.mjs`.
const tierMod = await import(
  pathToFileURL(
    path.resolve(process.cwd(), "lib/indices/tier-synthesizer.ts"),
  ).href
);
const teamMod = await import(
  pathToFileURL(
    path.resolve(process.cwd(), "lib/indices/team-synthesizer.ts"),
  ).href
);
const seriesMod = await import(
  pathToFileURL(
    path.resolve(process.cwd(), "lib/indices/series-synthesizer.ts"),
  ).href
);

// Filesystem-safe ISO: 2026-05-15T19-42-03Z (colons → dashes, lex = chrono).
const isoNow = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace(/-\d{3}Z$/, "Z");

const outDir = path.join(process.cwd(), ".snapshots", "indices");
mkdirSync(outDir, { recursive: true });

const jobs = [
  ["tier", () => tierMod.computeTierIndices(30)],
  ["team", () => teamMod.computeTeamIndices(30, 10)],
  ["series", () => seriesMod.computeSeriesIndices(30, 6)],
];

for (const [scope, compute] of jobs) {
  const t0 = Date.now();
  const data = await compute();
  const snapshot = {
    schema_version: 1,
    computed_at: new Date().toISOString(),
    scope,
    data,
  };
  const file = path.join(outDir, `${scope}-${isoNow}.json`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(
    JSON.stringify({
      scope,
      rows: Array.isArray(data) ? data.length : 0,
      file,
      elapsedMs: Date.now() - t0,
    }),
  );

  // Rotate: keep 3 most recent per scope (ISO ⇒ lex == chrono).
  const existing = readdirSync(outDir)
    .filter((f) => f.startsWith(`${scope}-`) && f.endsWith(".json"))
    .sort()
    .reverse();
  for (const f of existing.slice(3)) {
    unlinkSync(path.join(outDir, f));
  }
}
