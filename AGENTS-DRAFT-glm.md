> DRAFT — GLM-authored 2026-07-02, workstream W5. Unverified until reviewed. Do not treat as canon.

# AGENTS.md — topshot-data-portal

This is a CODE repository of **Dapper Collectibles**. It does not carry its own worldmodel or
constitution — that context lives in the BU's HQ repo, and you must load it from there.

## Before working here, read (in order):
1. `collect-hq/worldmodel.md` — what this business believes and is doing
2. `collect-hq/constitution.md` — the rules (inherits the Dapper Labs company constitution)
3. `collect-hq/specs/REGISTRY.md` — the spec registry; this repo primarily serves charter(s):
   002-marketplace, 003-collection-experience (Top Shot data portal — analytics, supply data,
   collector leaderboards)
4. The charter spec(s) above before changing behavior they govern.

## Rules that always apply in this repo
- It is "Flow Network" — never the technical-primitive two-word form.
- Customers are "L/XL collectors" / "collectors" / "owners" — never the casino big-spender term.
- Ungoverned work is not allowed: changes that alter a charter-governed behavior cite the
  charter spec (repo-qualified: `collect-hq#<NNN>`) in the PR description.
- Learnings from work here that generalize belong in `collect-hq/learnings/` — write them.

## Repo specifics
- Build/test/run: `npm run dev` / `npm run build` / `npm run start` / `npm run lint` (source:
  package.json scripts)
- Primary language/framework: TypeScript / Next.js (source: package.json name
  "topshot-data-portal"; README.md)
- Owner pod: Top Shot pod (source: collect-hq/repos.md)

> NOTE: An existing `AGENTS.md` was found in this repo (Next.js agent rules). This draft was
> written beside it as `AGENTS-DRAFT-glm.md` per the W5 conflict protocol. Merge the two when
> ready — the existing file contains framework-specific rules that complement this BU-context
> file.
