# Risks — `nba_reference` schema

Five named risks, in declining order of severity. Each names the failure mode, the existing evidence, the explicit boundary, and the kill criterion.

---

## 1. Sportradar scope risk — encyclopedia surface is OUT OF SCOPE

**Failure mode**: The encyclopedia (or any service that reads `nba_reference`) inadvertently surfaces Sportradar-derived data — live stats, NBA Official Media Data, AP/Getty/Reuters/USAT photos — outside the contractually approved Properties (`nbatopshot.com` and `wnba.nbatopshot.com`). Breach of the License Agreement; potential revocation; documented as an existing dapper.market blocker.

**Contract excerpt** — from `/Users/ro/dapper/claude-conversations/kaaos-knowledge/answers/dapper-market-contract-review-2026-05-13/partners/data-licensing.md`:

> Sportradar — **Scope of license**: Non-exclusive, worldwide, fully paid-up, royalty-free, revocable license to use… the Licensed Materials, "for the purposes of providing sports information and content on the Properties" (clause 2.2, "Acceptable Use"). Perpetual archive license. Licensed Materials = NBA Realtime Data API (4M calls/yr), WNBA Realtime Data API (2M calls/yr), and NBA/WNBA radar360 Data Analytics Platform.
>
> **Display restrictions**: Properties are scoped to **https://nbatopshot.com/ (Web and Mobile Application) and https://wnba.nbatopshot.com/ (Web and Mobile Application)** per the Information Table. Acceptable Use is defined as use "on the Properties." Anything outside the Properties is unauthorized use (Appendix 1, clause 1.1.e).
>
> **Downstream redistribution**: Sub-licensing is prohibited (Appendix 1, clause 1.1.d) without "express, written approval of Sportradar."

**Boundary in this schema**: zero Sportradar columns. No `sportradar_player_id`, no `nba_official_media_data_*`, no AP/Getty/Reuters/USAT image_url. Lane operators MUST NOT ingest from `developer.sportradar.com` endpoints. The encyclopedia ingests only the free corpus (stats.nba.com via swar/nba_api, Basketball-Reference, Wikidata, Wikipedia, pbpstats, podcasts, ProSportsTransactions) — the same corpus Sportradar competes with, not derives from.

**Note on stats.nba.com**: `stats.nba.com` is the NBA's own public-internet stats site, distinct from the Sportradar-delivered "NBA Realtime Data API" and "Official Media Data." Sportradar's exclusive partnership covers commercial redistribution rights to NBA-Official Data, not the NBA's public stats site. The `swar/nba_api` library scrapes the public site, which is a separate (greyer) legal posture under Sports Reference / NBA ToS — addressed in Risk #3.

**Kill criterion**: if the encyclopedia is ever proposed as a customer-facing surface, this risk re-opens at full force and Sportradar contract amendment becomes a hard gate.

---

## 2. Basketball-Reference ToS — AI-training prohibition

**Failure mode**: BR-sourced data trains a model, breaching the explicit ToS prohibition; Sports Reference cease-and-desist or rate-limit ban; legal exposure on the AI training claim.

**Source excerpt** — `https://www.sports-reference.com/data_use.html`, captured in `/Users/ro/.jarvis/memory/researcher/findings/2026-05-16-nba-data-sources-map.md`:

> Sharing, using, modifying, repackaging, or publishing data found on individual SRL webpages is welcomed for both commercial and non-commercial purposes, but any such use should explicitly credit SRL as the source… You should not create websites or tools based on data you scrape from Sports Reference… or use their data to train generative artificial intelligence models without permission.

**The line we cannot cross**: BR data may enter `nba_reference` as *structured stats only* — games, draft picks, transactions, awards, historical box scores. BR data may NOT enter `nba_narratives`. BR data may NOT be used to fine-tune or train any model, including downstream embeddings that feed retrieval-augmented generation. The encyclopedia is internal-use, non-commercial; that posture allows the structured-stat ingestion but does not relax the AI-training prohibition.

**Schema-level enforcement**:
- `nba_narratives.license` CHECK excludes a "basketball_reference" value — there is no valid license tag for BR prose, so it cannot be written.
- `nba_narratives.ai_training_allowed` defaults to `false`. Any row with `ai_training_allowed = true` MUST have a license value in `('CC0','CC_BY_SA_4.0','CC_BY_4.0')`. Lane operators write `false` until explicitly proven otherwise.

**Kill criterion**: if any model training pipeline (RAG fine-tune, embedding training, prompt-distillation) is built on top of `nba_reference`, every row referenced must be checked against `ai_training_allowed = true` before inclusion. A wholesale `SELECT chunk_text FROM nba_narratives` into a training pipeline is the exact prohibited pattern. Build a `vw_nba_narratives_training_safe` view that hard-filters on the flag, and require all training code to use only that view.

---

## 3. Schema-creep risk — `nba_narratives` and the temptation to make this a content platform

**Failure mode**: `nba_narratives` is the loosest table in the schema. It has a `chunk_text` column, an entity-link graph, and weak constraints on source. Without discipline it becomes a general-purpose content store. Every new data type ("we should also store transcripts of post-game pressers", "let's add Twitter threads", "what about Wikipedia talk pages?") gets shoved in there. Two years later it is the de facto knowledge base for the company, schema-creep has produced 50 source_type variants, and the license audit is unanswerable.

**Why this is more likely than it looks**: the schema explicitly invites this. The whole point of `nba_narratives` is to be a corpus. Resisting the gravity is on the human operators.

**Discipline**:
- `source_type` is a CHECK enum, NOT a free-text column. Adding a new value requires a migration.
- `license` is a CHECK enum, NOT free text. Same.
- `ai_training_allowed` is a hard boolean with a structural default of `false`.
- Per-source ingest scripts must declare both fields at write time; missing either fails the upsert.
- Quarterly review: every distinct `(source_type, license)` pair gets re-audited. Anything legally ambiguous gets deleted, not archived.

**Kill criterion**: if `nba_narratives.source_type` distinct count exceeds the original ETL DAG's enumeration (`wikipedia, wikidata_note, podcast_transcript, book_excerpt, article, reddit_thread, youtube_caption`), pause new ingestion until the schema is re-audited.

---

## 4. Top Shot Supabase blast-radius — RLS misconfiguration in migrations

**Failure mode**: A migration adds an RLS policy that mistakenly references the wrong schema, or grants anon-read on a `nba_reference` table that should be service-role-only, or accidentally REVOKEs from `service_role` on a `topshot.*` table because a DO block iterated over the wrong table list. Worst case: `topshot.transactions` is silently exposed to anon because a stray `GRANT SELECT … TO anon` lands on the wrong target. Top Shot data portal is public-read by design, but PII filtering happens at ETL time — a misconfigured grant downstream of that has limited blast radius. The bigger concern is a `REVOKE` that takes Top Shot read traffic offline.

**Existing mitigation in the conventions**:
- The `topshot` schema's `0003_topshot_rls_policies.sql` enumerates table names in DO blocks. A copy-paste-and-extend approach for `nba_reference` should NOT reuse those array variables — `0001_nba_reference_schema.sql` has its own `tables_to_secure` list, scoped to nba_reference.
- `ALTER TABLE … FORCE ROW LEVEL SECURITY` is applied per table. FORCE means service_role itself respects RLS — useful for blast-radius containment but requires explicit ALL policies for service_role (which `0001` declares).

**Additional mitigations to add before first production apply**:
1. Run every migration first against a Supabase branch (preview) DB and diff the policy graph against main before promoting. `supabase db diff` plus `pg_dump --schema-only --section=post-data` on both schemas.
2. Create a separate `nba_reference_etl` service-role key whose Postgres role has GRANT only on `nba_reference.*`. The encyclopedia ETL never holds the broad `service_role` key. This is a Supabase project config change, not a migration — file as deployment-prep.
3. Pre-merge RLS checklist (4 items): (i) every new table has FORCE ROW LEVEL SECURITY; (ii) no policy references the wrong schema by name; (iii) anon and authenticated have no policy on this schema yet (intentional); (iv) `\dp nba_reference.*` output reviewed.

**Kill criterion**: if the post-migration grant audit shows any GRANT or POLICY referencing `topshot.*` from inside a nba_reference migration, the migration is reverted before any production rollout.

---

## 5. Wikipedia/podcast license drift over time

**Failure mode**: Wikipedia's CC BY-SA 4.0 license is stable, but downstream changes (a page is deleted, a license is challenged, an article is plagiarized from a copyrighted source) can produce orphaned rows in `nba_narratives` that no longer have the license posture they were ingested under. Podcast transcripts are worse — `fair_use_internal` is a posture, not a license, and the line between internal-use research and commercial product can be re-drawn around us if the encyclopedia gets surfaced beyond its original scope.

**Why this is below the other four**: it is reversible. Discovering a problem row means deleting it; we never lock ourselves into anything. The cost is operational discipline, not contractual exposure.

**Mitigation**:
- `nba_narratives.snapshot_at` records when the row was ingested. Re-ingesting a Wikipedia page at a later date creates a new row (different chunk hash) and the old row is retained for audit.
- `source_url` is stored on every row. If a page is deleted from Wikipedia or a podcast pulled from the public feed, the row's `source_url` becomes a 404, surfaceable via a monthly check.
- For Internet Archive book excerpts: any row sourced from a IA-borrowable digitization is `license = fair_use_internal`. The Hachette v. IA 2nd Cir. 2024 ruling against IA makes commercial use of CDL-borrowed text legally hazardous. If the encyclopedia is ever proposed for commercial use, every row with `license = fair_use_internal` is purged before exposure.

**Kill criterion**: monthly `vw_nba_narratives_license_audit` job that counts rows by `(source_type, license, ai_training_allowed)` and alerts if any pair has zero corresponding license documentation in the operations log.

---

## What I am NOT flagging as a risk

- **Pre-1996 PBP "missing" from the schema**: this is a deliberate design choice, not a risk. Pre-1996 PBP does not exist; pretending we have it would be the risk.
- **Cross-schema soft FK on `topshot.moments`**: this is the only realistic design (independent hydrators). ETL validation covers the integrity concern. If it ever produces orphaned join rows, that's a Lane F bug, not a schema risk.
- **Wikidata coverage thin for pre-1980 journeymen**: the unresolved-entity quarantine pattern is established (see `architecture.md`). It's an operational issue, not a schema-level one.
- **NBA stats.nba.com endpoint deprecation**: the NBA has withdrawn endpoints before (player tracking 2017). If `nba_plays` ingestion breaks because an endpoint dies, that's an ETL recovery problem, not a schema risk. The schema does not assume any particular endpoint is forever.
