-- =============================================================================
-- 0015 — topshot.feature_reviews: /admin/review supervision surface.
--
-- Stores per-iteration proposals, cross-vendor verdicts, and CEO votes
-- (✓ / ✗ / 🎨) for both Loop A and Loop B iterations. This is the bootstrap
-- migration — it creates the table that all future loop iterations write to
-- when surfacing proposals for Roham's review.
--
-- Row lifecycle:
--   1. Loop A (or B) builder inserts a row at the start of each iteration
--      with iteration_id, loop, track, proposal, diff_preview, and
--      axis_scores from the cross-vendor reviewer.
--   2. /admin/review page renders the row + vote buttons.
--   3. POST /api/admin/review upserts vote + comment + voted_at.
--   4. Orchestrator reads vote before deciding whether to proceed.
--
-- RLS: service_role has full access (write + read). authenticated can SELECT
-- so the admin page can read without exposing the service-role key to the
-- browser (anon role has no access — intentional).
-- =============================================================================

CREATE TABLE IF NOT EXISTS topshot.feature_reviews (
    id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id                text          NOT NULL,
    loop                        text          NOT NULL CHECK (loop IN ('A', 'B')),
    track                       text          NOT NULL,
    proposal                    text,
    diff_preview                text,
    axis_scores                 jsonb,
    cross_vendor_verdict        text          CHECK (cross_vendor_verdict IN ('PASS', 'FAIL', 'NEEDS-WORK', NULL)),
    cross_vendor_path           text,
    rendered_screenshot_url     text,
    comparable_screenshot_url   text,
    vote                        text          CHECK (vote IN ('✓', '✗', '🎨', NULL)) DEFAULT NULL,
    comment                     text,
    voted_at                    timestamptz,
    created_at                  timestamptz   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_reviews_iteration_id
    ON topshot.feature_reviews (iteration_id);

CREATE INDEX IF NOT EXISTS idx_feature_reviews_vote
    ON topshot.feature_reviews (vote);

CREATE INDEX IF NOT EXISTS idx_feature_reviews_created_at
    ON topshot.feature_reviews (created_at DESC);

-- Row-level security
ALTER TABLE topshot.feature_reviews ENABLE ROW LEVEL SECURITY;

-- Service role: full access (bypasses RLS automatically, but explicit policy
-- prevents confusion if direct-SQL tooling checks for policies).
CREATE POLICY "service_role_all" ON topshot.feature_reviews
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated role: read-only (admin page reads without service-role key
-- if needed; no authenticated writes — votes go through the API which uses
-- the service-role key server-side).
CREATE POLICY "authenticated_select" ON topshot.feature_reviews
    FOR SELECT
    TO authenticated
    USING (true);

-- Grants so PostgREST can see the table (service_role bypasses RLS but still
-- needs the table-level grant to read through the REST layer).
GRANT SELECT, INSERT, UPDATE, DELETE ON topshot.feature_reviews TO service_role;
GRANT SELECT ON topshot.feature_reviews TO authenticated;

-- Seed: bootstrap iteration-1 proposal so /admin/review shows content
-- immediately after the migration is applied (no manual seed step required).
INSERT INTO topshot.feature_reviews (
    iteration_id,
    loop,
    track,
    proposal,
    diff_preview,
    axis_scores
) VALUES (
    'loop-a-1',
    'A',
    'BOOTSTRAP',
    'Built /admin/review supervision surface (migration, page, API). This is the bootstrap iteration. Cross-vendor review runs even without prior CEO signal. Verify: migration 0015 applied, GET /api/admin/review returns rows, POST /api/admin/review upserts vote correctly, /admin/review renders the review list.',
    'supabase/migrations/0015_topshot_feature_reviews.sql
app/admin/review/page.tsx
app/api/admin/review/route.ts
app/api/admin/review/seed-iter1/route.ts',
    '{"a4_schema_correctness": 95, "a5_organization": 90, "note": "bootstrap iteration — data axes not applicable"}'::jsonb
) ON CONFLICT DO NOTHING;
