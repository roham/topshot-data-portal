-- 0035_supply_timeline.sql
-- Moment supply over time — the "ever minted / burned / locked" curve.
-- Governing spec: specs/001-supply-timeline/spec.md
--
-- Why a dedicated aggregate table (not an MV over topshot.moments):
--   The Supabase topshot.moments mirror is PARTIAL (~8.6M of 52.2M moments).
--   The full supply history lives only in BigQuery
--   (dapperlabs-data.production_sem_open.asset_nba_moment, 52.18M rows).
--   So these two tables are populated by an ETL that aggregates IN BigQuery and
--   upserts the rolled-up result here:  scripts/etl/bq-refresh-supply-timeline.mjs
--
-- Mint date semantics: minting = NFT creation, keyed on BQ `created_at`
--   (100% populated). NOT `released_at` (the later release-to-collector event,
--   NULL for ~5M moments — undercounts the true mint curve).
--
-- Deflation: burns keyed on `burned_at`. Locking: locked_at (gross lock events)
--   + the current LOCKED status count in the snapshot.
--
-- Apply after 0034. Idempotent (CREATE ... IF NOT EXISTS).
--
-- Rollback:
--   DROP TABLE IF EXISTS topshot.supply_timeline;
--   DROP TABLE IF EXISTS topshot.supply_snapshot;

-- =============================================================================
-- supply_timeline — one row per calendar month, from first mint to now.
-- =============================================================================
CREATE TABLE IF NOT EXISTS topshot.supply_timeline (
    month          date     NOT NULL PRIMARY KEY,  -- first day of the month (UTC)
    minted         bigint   NOT NULL DEFAULT 0,    -- moments created in this month (created_at)
    burned         bigint   NOT NULL DEFAULT 0,    -- moments burned in this month (burned_at)
    lock_events    bigint   NOT NULL DEFAULT 0,    -- moments locked in this month (locked_at; gross inflow)
    lock_exits     bigint   NOT NULL DEFAULT 0,    -- locks ending this month (unlocked_at) + locked-then-burned (burned_at while locked)
    inserted_at    timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER supply_timeline_updated_at
    BEFORE UPDATE ON topshot.supply_timeline
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.supply_timeline IS
    'Monthly moment supply facts (mint / burn / lock events). Source: BigQuery asset_nba_moment, aggregated by scripts/etl/bq-refresh-supply-timeline.mjs. Cumulative curves are computed at read time.';
COMMENT ON COLUMN topshot.supply_timeline.minted IS
    'Moments minted (NFT created) in this month — BQ created_at. The "ever minted" curve is the running sum of this column.';
COMMENT ON COLUMN topshot.supply_timeline.burned IS
    'Moments burned in this month — BQ burned_at. Deflation began 2021-11; the big burns are 2022-11 and 2023-05.';
COMMENT ON COLUMN topshot.supply_timeline.lock_events IS
    'Lock INFLOW this month — BQ locked_at. Gross locks initiated. Locking launched 2022-07.';
COMMENT ON COLUMN topshot.supply_timeline.lock_exits IS
    'Lock OUTFLOW this month — unlocked_at events + moments burned this month while still locked (locked_at set, unlocked_at null, burned_at set). Net-locked over time = running sum of (lock_events - lock_exits); reconciles exactly to supply_snapshot.currently_locked.';

-- =============================================================================
-- supply_snapshot — singleton headline totals + reconciliation meta.
-- =============================================================================
CREATE TABLE IF NOT EXISTS topshot.supply_snapshot (
    singleton_id            integer  NOT NULL PRIMARY KEY DEFAULT 1
        CHECK (singleton_id = 1),
    total_minted            bigint   NOT NULL,            -- all moments ever created
    total_burned            bigint   NOT NULL,            -- moment_status = BURNED
    currently_locked        bigint   NOT NULL,            -- moment_status = LOCKED (net of unlocks)
    currently_minted        bigint   NOT NULL,            -- moment_status = MINTED (live, unlocked, unburned)
    circulating             bigint   NOT NULL,            -- total_minted - total_burned (LOCKED + MINTED)
    first_mint_month        date,
    first_burn_month        date,
    lock_launch_month       date,
    spanner_reported_count  bigint,                       -- ground-truth anchor supplied out-of-band
    bq_total_rows           bigint,                       -- BQ row count at refresh (reconciliation)
    refreshed_at            timestamptz NOT NULL DEFAULT now(),
    inserted_at             timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER supply_snapshot_updated_at
    BEFORE UPDATE ON topshot.supply_snapshot
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.supply_snapshot IS
    'Single-row headline supply totals + reconciliation. status partition is exact: total_burned + currently_locked + currently_minted = total_minted. Source: BigQuery asset_nba_moment.';
COMMENT ON COLUMN topshot.supply_snapshot.circulating IS
    'Moments not burned (LOCKED + MINTED). = total_minted - total_burned.';
COMMENT ON COLUMN topshot.supply_snapshot.spanner_reported_count IS
    'Out-of-band ground-truth count from the production Spanner DB, stored for reconciliation against bq_total_rows.';

-- =============================================================================
-- RLS — anon/authenticated read, service_role write (mirrors 0003 posture).
-- =============================================================================
ALTER TABLE topshot.supply_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE topshot.supply_timeline FORCE ROW LEVEL SECURITY;
ALTER TABLE topshot.supply_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE topshot.supply_snapshot FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['supply_timeline','supply_snapshot']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%I_anon_read" ON topshot.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%I_authenticated_read" ON topshot.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%I_service_role_all" ON topshot.%I', t, t);

        EXECUTE format('CREATE POLICY "%I_anon_read" ON topshot.%I FOR SELECT TO anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%I_authenticated_read" ON topshot.%I FOR SELECT TO authenticated USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%I_service_role_all" ON topshot.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);

        EXECUTE format('GRANT SELECT ON topshot.%I TO anon, authenticated', t);
        EXECUTE format('GRANT ALL ON topshot.%I TO service_role', t);
    END LOOP;
END $$;
