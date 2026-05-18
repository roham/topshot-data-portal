-- 0016_topshot_collectors.sql
-- Collector identity table — populated from Top Shot GraphQL ownerV2.User.
-- Per Roham 2026-05-18: ownership of Top Shot SHOULD BE the Top Shot username
-- not (just) the Flow address. Custodial accounts have usernames; non-custodial
-- (`type='nc'`) have only addresses.
--
-- Data source: Top Shot GraphQL `searchMintedMoments → ownerV2 → User { ... }`
-- Pulled via the fandom-v3 pipeline (scripts/fetch-top40.js).

CREATE TABLE IF NOT EXISTS topshot.collectors (
  flow_address text PRIMARY KEY,
  username text,
  dapper_id text,
  profile_image_url text,
  topshot_score integer,
  type text CHECK (type IN ('user', 'nc')) NOT NULL DEFAULT 'user',
  first_seen_holdings integer,  -- holdings count when first observed
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index username lookups (for /u/[username] route)
CREATE INDEX IF NOT EXISTS collectors_username_idx
  ON topshot.collectors (lower(username))
  WHERE username IS NOT NULL;

-- Index username → flow_address case-insensitive
CREATE INDEX IF NOT EXISTS collectors_dapper_id_idx
  ON topshot.collectors (dapper_id)
  WHERE dapper_id IS NOT NULL;

-- Comment for the doctrine record
COMMENT ON TABLE topshot.collectors IS 'Collector identity mirror. Source: Top Shot GraphQL ownerV2 (custodial Dapper users have username + dapperID; non-custodial type=nc has only flow_address). Refreshed by the fandom-v3 pipeline.';
COMMENT ON COLUMN topshot.collectors.flow_address IS 'Public Flow blockchain account address (16-char hex). PRIMARY KEY because the address is the on-chain identity.';
COMMENT ON COLUMN topshot.collectors.username IS 'Top Shot display username. NULL for non-custodial accounts. CASE-INSENSITIVE for /u/[username] resolution.';
COMMENT ON COLUMN topshot.collectors.dapper_id IS 'Dapper Auth0 user ID. NULL for non-custodial. INTERNAL — do not surface in public UI.';
COMMENT ON COLUMN topshot.collectors.type IS 'user = custodial Dapper account (has username); nc = non-custodial (Flow address only)';
