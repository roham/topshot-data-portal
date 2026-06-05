-- 0037_collectors_anon_read.sql
-- topshot.collectors had RLS enabled (0016) with a SELECT grant to anon, but NO
-- policy — so RLS default-deny blocked every anon read and usernames never
-- surfaced (/u, holders, leaderboards, appreciation owner lines all fell back
-- to bare flow addresses). Add the public-read policy to match the 0003 posture.
--
-- Usernames are public (shown on the Top Shot site). dapper_id is internal but
-- never selected by the public queries.
--
-- Idempotent. Rollback: DROP POLICY collectors_anon_read / collectors_authenticated_read.

DO $$
BEGIN
  DROP POLICY IF EXISTS "collectors_anon_read" ON topshot.collectors;
  DROP POLICY IF EXISTS "collectors_authenticated_read" ON topshot.collectors;
  DROP POLICY IF EXISTS "collectors_service_role_all" ON topshot.collectors;

  CREATE POLICY "collectors_anon_read" ON topshot.collectors FOR SELECT TO anon USING (true);
  CREATE POLICY "collectors_authenticated_read" ON topshot.collectors FOR SELECT TO authenticated USING (true);
  CREATE POLICY "collectors_service_role_all" ON topshot.collectors FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

GRANT SELECT ON topshot.collectors TO anon, authenticated;
GRANT ALL ON topshot.collectors TO service_role;
