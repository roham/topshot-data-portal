// Hand-rolled types matching supabase/migrations/0002 + 0005 + 0006.
// Replace via `npx supabase gen types typescript --project-id <ref> --schema topshot`
// once creds are wired. The shapes here cover the rows the portal reads;
// extend as new columns become first-class.
//
// All numeric columns from Postgres come back as `number | null` from the JS
// driver (it parses the wire format). text → string | null. timestamptz → ISO
// string | null. bigint can come back as string in some configurations — we
// type as number with the understanding the portal Number()-coerces at read
// boundaries.

export interface Tables {
  // ─── core ────────────────────────────────────────────────────────────
  teams: {
    team_id: string;
    league: string | null;
    team_name: string | null;
    team_alternate_name: string | null;
    team_safe_name: string | null;
  };
  players: {
    player_id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    league: string | null;
    last_known_team_id: string | null;
    last_known_team_full_name: string | null;
    last_known_primary_position: string | null;
    draft_year: string | null;
    draft_round: string | null;
    draft_selection: string | null;
    birthplace: string | null;
    birthdate: string | null;
    date_of_first_play: string | null;
    date_of_last_play: string | null;
    first_minted_moment_date: string | null;
    last_minted_moment_date: string | null;
  };
  sets: {
    set_id: string;
    set_name: string | null;
    set_flow_id: string | null;
    series_number: number | null;
    series_name: string | null;
    primary_league: string | null;
    description: string | null;
    is_locked: boolean | null;
    is_minted: boolean | null;
    is_hidden: boolean | null;
    set_tier_id: string | null;
    set_tier_name: string | null;
    set_rarity: number | null;
  };
  editions: {
    edition_id: string;
    edition_name: string | null;
    set_id: string | null;
    play_id: string | null;
    series_name: string | null;
    description: string | null;
    short_description: string | null;
    mint_count: number | null;
    league: string | null;
    player_id: string | null;
    player_name: string | null;
    team_at_moment_team_id: string | null;
    team_at_moment_historical_name: string | null;
    team_at_moment_current_name: string | null;
    tier_id: string | null;
    tier_name: string | null;
    rarity: number | null;
  };
  moments: {
    moment_id: string;
    moment_flow_id: string | null;
    edition_id: string | null;
    subedition_id: string | null;
    edition_name: string | null;
    serial_number: number | null;
    owner_flow_address: string | null;
    top_shot_score: number | null;
    moment_status: string | null;
    released_at: string | null;
    locked_at: string | null;
    listed_at: string | null;
    listing_price_usd: number | null;
    set_id: string | null;
    set_name: string | null;
    play_id: string | null;
    play_name: string | null;
    description: string | null;
    last_updated_at: string | null;
  };
  transactions: {
    transaction_id: string;
    moment_id: string | null;
    transaction_type_id: string | null;
    transaction_state_id: string | null;
    platform: string | null;
    buyer_safe_name: string | null;
    seller_safe_name: string | null;
    client_marketplace_safe_name: string | null;
    amount: number | null;
    currency: string | null;
    gross_amount_usd: number | null;
    net_amount_usd: number | null;
    list_price_usd: number | null;
    completed_at: string | null;
    source_updated_at: string | null;
    row_updated_at: string | null;
  };
  plays: {
    play_id: string;
    play_name: string | null;
    play_category: string | null;
    play_type: string | null;
    date_of_play: string | null;
    season_code: string | null;
    season_name: string | null;
    description: string | null;
    short_description: string | null;
    override_headline: string | null;
    player_id: string | null;
    player_name: string | null;
    team_at_moment_team_id: string | null;
    team_at_moment_current_name: string | null;
    home_team_score: number | null;
    away_team_score: number | null;
    image_urls: string[] | null;
  };
  market_caps: {
    date: string;
    edition_id: string;
    num_moments_in_circulation: number | null;
    lowest_ask_price: number | null;
    highest_offer_price: number | null;
    market_cap: number | null;
  };

  // ─── materialized views ─────────────────────────────────────────────
  // Market summary — single-row per window. Migration 0007 dropped the
  // buyer/seller distinct-count columns because the BQ source returns
  // NULL for those identifiers on privacy-stripped marketplace txs,
  // surfacing 0/1 which is misleading UX.
  mv_market_summary_24h: {
    singleton_id: number;
    total_tx_count: number;
    total_volume_usd: number;
    unique_moments_traded: number;
    median_price_usd: number | null;
    avg_price_usd: number | null;
    max_price_usd: number | null;
    min_price_usd: number | null;
    refreshed_at: string;
  };
  mv_market_summary_7d: Tables["mv_market_summary_24h"];
  mv_market_summary_30d: Tables["mv_market_summary_24h"];
  mv_market_summary_90d: Tables["mv_market_summary_24h"];
  mv_market_summary_1y: Tables["mv_market_summary_24h"];
  mv_market_summary_all_time: Tables["mv_market_summary_24h"];

  // Player volume — per-window per-player. Buyer/seller distinct-count
  // columns dropped (see market summary rationale above);
  // last_known_team_full_name is present on the older 24h/7d/30d MVs but
  // absent on the newer 90d/1y/all_time MVs (migration 0007 selects only
  // last_known_team_id). The shape below covers the post-migration union
  // — joins surface the team name when missing.
  mv_player_24h_volume: {
    player_id: string;
    player_name: string | null;
    last_known_team_id: string | null;
    last_known_team_full_name?: string | null;
    tx_count: number;
    total_volume_usd: number;
    avg_price_usd: number | null;
    median_price_usd: number | null;
    max_price_usd: number | null;
    unique_moments_traded: number;
    refreshed_at?: string;
  };
  mv_player_7d_volume: Tables["mv_player_24h_volume"];
  mv_player_30d_volume: Tables["mv_player_24h_volume"];
  mv_player_90d_volume: Tables["mv_player_24h_volume"];
  mv_player_1y_volume: Tables["mv_player_24h_volume"];
  mv_player_all_time_volume: Tables["mv_player_24h_volume"];

  // Edition activity — per-window per-edition. Post-migration 0007 the
  // new variants emit total_volume_usd; the legacy 24h variant uses
  // volume_usd. Component reads both via `volume_usd ?? total_volume_usd`.
  mv_edition_24h_activity: {
    edition_id: string;
    edition_name: string | null;
    set_id: string | null;
    set_name?: string | null;
    play_id: string | null;
    play_name?: string | null;
    player_id: string | null;
    player_name?: string | null;
    tier_name: string | null;
    tx_count: number;
    volume_usd?: number;
    total_volume_usd?: number;
    unique_traders?: number;
    median_price_usd: number | null;
    min_price_usd?: number | null;
    max_price_usd?: number | null;
    refreshed_at?: string;
  };
  mv_edition_7d_activity: Tables["mv_edition_24h_activity"];
  mv_edition_30d_activity: Tables["mv_edition_24h_activity"];
  mv_edition_1y_activity: Tables["mv_edition_24h_activity"];
  mv_edition_all_time_activity: Tables["mv_edition_24h_activity"];

  // Set rollup — unchanged by migration 0007 but the buyer/seller
  // distinct-count columns the BQ source returned have been removed from
  // portal surfaces (they were always 0/1 due to privacy stripping; better
  // to omit than mislead).
  mv_set_24h_activity: {
    set_id: string;
    set_name: string | null;
    series_number: number | null;
    series_name: string | null;
    set_tier_name: string | null;
    tx_count: number;
    volume_usd: number;
    unique_editions_traded: number;
    median_price_usd: number | null;
    refreshed_at: string;
  };

  mv_largest_sales_24h: {
    transaction_id: string;
    moment_id: string | null;
    gross_amount_usd: number;
    net_amount_usd: number | null;
    buyer_safe_name: string | null;
    seller_safe_name: string | null;
    transaction_type_id: string | null;
    client_marketplace_safe_name: string | null;
    sold_at: string | null;
    serial_number: number | null;
    edition_id: string | null;
    edition_name: string | null;
    top_shot_score: number | null;
    play_id: string | null;
    play_name: string | null;
    set_id: string | null;
    set_name: string | null;
    player_id: string | null;
    player_name: string | null;
    // migration 0007 drops tier_name from the largest_sales MV family —
    // the new 7d/30d/1y/all_time variants don't select it. Component
    // renders TierChip(null) when absent.
    tier_name?: string | null;
  };
  mv_largest_sales_7d: Tables["mv_largest_sales_24h"];
  mv_largest_sales_30d: Tables["mv_largest_sales_24h"];
  mv_largest_sales_1y: Tables["mv_largest_sales_24h"];
  mv_largest_sales_all_time: Tables["mv_largest_sales_24h"];
  mv_set_completion_distribution: {
    set_id: string;
    set_name: string | null;
    series_number: number | null;
    bucket: string;
    owner_count: number;
    total_editions_in_set: number | null;
    refreshed_at: string;
  };
  mv_player_market_cap: {
    player_id: string;
    player_name: string | null;
    last_known_team_id: string | null;
    last_known_team_full_name: string | null;
    total_market_cap_usd: number;
    total_moments_in_circulation: number;
    edition_count: number;
    as_of_date: string | null;
    refreshed_at: string;
  };

  // ─── packs + drops ──────────────────────────────────────────────────
  packs: {
    pack_id: string;
    pack_listing_id: string | null;
    pack_flow_id: string | null;
    drop_id: string | null;
    reservation_id: string | null;
    version: string | null;
    pack_name: string | null;
    description: string | null;
    image_url: string | null;
    is_starter_pack: boolean | null;
    is_reward: boolean | null;
    max_order_quantity: number | null;
    moments_per_pack: number | null;
    total_packs: number | null;
    total_moments: number | null;
    pack_status: "SEALED" | "OPENED" | null;
    opened_at: string | null;
    fulfillment_tx_hash: string | null;
    is_preorder: boolean | null;
    price: number | null;
    currency: string | null;
    leagues: string[] | null;
    primary_league: string | null;
    secondary_league: string | null;
    gated_criteria: string | null;
    sale_type: string | null;
    pack_tier_id: string | null;
    pack_tier_name: string | null;
    pack_rarity: number | null;
    started_at: string | null;
    expired_at: string | null;
    container_pack_id: string | null;
    is_container: boolean | null;
    inserted_at: string;
    updated_at: string;
  };
  drops: {
    drop_id: string;
    started_at: string | null;
    expired_at: string | null;
    drop_duration_type: string | null;
    is_active: boolean | null;
    has_preorders: boolean | null;
    total_pack_listings: number | null;
    total_packs: number | null;
    total_moments: number | null;
    percent_reserved_packs: number | null;
    is_queued: boolean | null;
    inserted_at: string;
    updated_at: string;
  };

  // ─── ETL heartbeat (anon-read) ─────────────────────────────────────
  _etl_heartbeat: {
    id: number;
    last_success_at: string | null;
    last_run_duration_ms: number | null;
    tables_synced_count: number | null;
  };
}
