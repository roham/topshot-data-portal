# Handover — read this BEFORE doing anything in this repo

If you are a Claude Code session that just landed in this repo: **stop, do not author code yet.** Read the full handover first.

**Canonical handover:** [kaaos-knowledge/research-reports/handovers/HANDOVER-topshot-portal-v5-orchestrator-build-2026-05-16.md](https://github.com/roham/kaaos-knowledge/blob/main/research-reports/handovers/HANDOVER-topshot-portal-v5-orchestrator-build-2026-05-16.md)

Local path: `/Users/ro/dapper/claude-conversations/kaaos-knowledge/research-reports/handovers/HANDOVER-topshot-portal-v5-orchestrator-build-2026-05-16.md`

## TL;DR — what this session does

Build the autonomous build loop's orchestrator at `loop/runner/orchestrator.mjs` plus self-contained prompt templates at `loop/prompts/{research,build,judge}.md`. Smoke-test by dispatching against feature #2 (`moment-detail-chart`) and verify the judge flips the flag.

**Do not author features yourself. The orchestrator ships features.** The build-agent substrate-default is to deflate from "build a system" to "author one feature inline"; you are guarding against that. The UserPromptSubmit hook at `~/agents/dexter/hooks/orchestrator-first-check.sh` will fire and remind you.

## DO NOT list (full version in §3 of canonical handover)

- Do not author any feature inline.
- Do not re-author foundation artifacts (charter, features.json, persona, comp-diff, wiki).
- Do not flip `passes` flags in features.json by hand (only the judge does that).
- Do not push to `main` directly (auto-classifier blocks it; use feature branches + PRs).
- Do not skip the boot ritual.
- Do not skip the Learning at `~/agents/cgs-template-rg/THE-LEARNINGS.md` → `on-being-the-author-when-you-are-supposed-to-be-the-orchestrator`.

Read the canonical handover in full before any tool call.
