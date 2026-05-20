
## V9 ITER-7 — supply-breakdown MV + Grail methodology honesty

### What this adds
- `topshot.mv_edition_supply_breakdown` — per-edition supply counts: active (MINTED), locked, burned, in_circulation, total. Computed from `topshot.moments` table. 9,453 editions covered.

### What it reveals
- Some editions have incomplete moments in our DB (e.g., LeBron Holo Icon S3 Legendary has 6 records here but Vaultopolis lists 22+68 = ~90 expected). Ingest gap.
- Vaultopolis's "supply" methodology in their canonical Grail CSV varies — sometimes matches our active-count, sometimes listed-for-sale count, sometimes neither. Methodology unlocked.

### How to refresh
`REFRESH MATERIALIZED VIEW CONCURRENTLY topshot.mv_edition_supply_breakdown;` — daily cron OR after every moments-table ingest.

### Open follow-ups
- Re-ingest moments for the 41 unmatched + the under-populated editions in the Grail basket.
- Reach Vaultopolis for supply-tier methodology, or reverse-engineer across the full 225-row set.
- Once methodology locks: update Grail synthesizer to honor (edition_id, supply-flavor) per Vaultopolis row + use mcap_active or mcap_total accordingly.
