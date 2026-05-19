#!/usr/bin/env node
// loop/v8/scripts/compress-transcript.mjs
// P12 — Haiku-based transcript compression when transcript > 100K tokens.
//
// Usage:
//   node loop/v8/scripts/compress-transcript.mjs <input.txt> <output.md>
//
// Reads ANTHROPIC_API_KEY from env (canonical: refresh-secrets exports it on kaaos-daemon).

import { readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('usage: compress-transcript.mjs <input> <output>');
  process.exit(1);
}

const transcript = readFileSync(inputPath, 'utf-8');
const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-haiku-4-6',
  max_tokens: 4096,
  system:
    'You compress engineering session transcripts. Preserve: decisions, file paths touched, ' +
    'verdicts, error messages verbatim, next-step intent. Drop: chit-chat, repeated reads, ' +
    'verbose tool output. Output markdown with sections: ## Decisions / ## Files touched / ' +
    '## Verdicts / ## Errors / ## Next.',
  messages: [{
    role: 'user',
    content: `Compress this transcript to under 4000 tokens:\n\n${transcript}`,
  }],
});

const out = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n');
writeFileSync(outputPath, out);
process.stdout.write(`compressed ${transcript.length} chars -> ${out.length} chars\n`);
