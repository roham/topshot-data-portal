-- =============================================================================
-- 0012 — topshot.parallel_types: named parallels + editions.parallel_id
--
-- Source: Top Shot public GraphQL `query { parallels { name } }` returns 22
-- named parallels. Per public-API probe 2026-05-17 ~17:55Z, the array order
-- is treated as the parallelID mapping (1-indexed, with 0 reserved for "Base"
-- / no-parallel). This MUST be sanity-checked against at least one moment-id
-- whose Top Shot edition.parallelID > 0 before being treated as canonical.
--
-- editions.parallel_id is added as a new int column, defaulted to NULL
-- until backfilled by scripts/etl/bq-backfill-parallels.mjs (next step).
--
-- This is fill-side schema work — the portal reads via Supabase JOIN at
-- query time. Zero GraphQL/BQ at request time per Roham 2026-05-17 17:45Z.
-- =============================================================================

CREATE TABLE IF NOT EXISTS topshot.parallel_types (
    parallel_id       integer PRIMARY KEY,
    name              text NOT NULL,
    description       text,
    source            text NOT NULL DEFAULT 'topshot-graphql-parallels-2026-05-17',
    sourced_at        timestamptz NOT NULL DEFAULT now(),
    verified          boolean NOT NULL DEFAULT false,
    inserted_at       timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER parallel_types_updated_at
    BEFORE UPDATE ON topshot.parallel_types
    FOR EACH ROW EXECUTE FUNCTION topshot.set_updated_at();

COMMENT ON TABLE topshot.parallel_types IS
    'Top Shot parallel-name dimension. parallel_id 0 = "Base" (no parallel). parallel_id 1..N = named parallels from Top Shot GraphQL `{ parallels { name } }` array, 1-indexed by position. HYPOTHESIS: array order = parallel_id; needs cross-check against a moment with known non-zero parallelID before declaring canonical.';

COMMENT ON COLUMN topshot.parallel_types.parallel_id IS
    'Canonical Top Shot parallelID integer. 0 = Base/no-parallel (sentinel; not in GraphQL parallels array).';
COMMENT ON COLUMN topshot.parallel_types.verified IS
    'Set true after Roham (or operator) confirms the name matches what shows on nbatopshot.com for at least one moment in that parallel.';

-- Seed the 22 named parallels + the Base sentinel.
-- Source: `query { parallels { name } }` probe at 2026-05-17 17:55Z.
-- Order in the response array is preserved here as the parallel_id assignment.
INSERT INTO topshot.parallel_types (parallel_id, name, verified) VALUES
    (0,  'Base',           false),
    (1,  'Explosion',      false),
    (2,  'Torn',            false),
    (3,  'Vortex',          false),
    (4,  'Rippled',         false),
    (5,  'Coded',           false),
    (6,  'Halftone',        false),
    (7,  'Bubbled',         false),
    (8,  'Diced',           false),
    (9,  'Bit',             false),
    (10, 'Vibe',            false),
    (11, 'Astra',           false),
    (12, 'Diamond',         false),
    (13, 'Voltage',         false),
    (14, 'Livewire',        false),
    (15, 'Championship',    false),
    (16, 'Club Collection', false),
    (17, 'Blockchain',      false),
    (18, 'Hardcourt',       false),
    (19, 'Hexwave',         false),
    (20, 'Jukebox',         false),
    (21, 'Galactic',        false),
    (22, 'Omega',           false)
ON CONFLICT (parallel_id) DO UPDATE
    SET name = EXCLUDED.name,
        source = EXCLUDED.source,
        sourced_at = now();

-- Add parallel_id column on editions. Defaults to NULL until backfill populates.
ALTER TABLE topshot.editions
    ADD COLUMN IF NOT EXISTS parallel_id integer REFERENCES topshot.parallel_types(parallel_id);

COMMENT ON COLUMN topshot.editions.parallel_id IS
    'Edition''s parallel variant. NULL = not yet backfilled. 0 = Base parallel (no visual parallel applied). 1..N = named parallel from topshot.parallel_types. Sourced from Top Shot GraphQL Edition.parallelID via scripts/etl/bq-backfill-parallels.mjs.';

CREATE INDEX IF NOT EXISTS idx_editions_parallel_id
    ON topshot.editions (parallel_id);

-- Grants — parallel_types is read-only public; service_role refreshes seed
GRANT SELECT ON topshot.parallel_types TO anon, authenticated, service_role;
