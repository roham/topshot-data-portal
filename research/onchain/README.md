# On-Chain GRAIL Whitelist Snapshot

## Source
- Contract: `A.3a54ff5b392d115b.GRAILExchangeV2` (Flow mainnet)
- Account: `0x3a54ff5b392d115b` — **0 active keys** (immutable, non-upgradeable)
- Getter: `getWhitelist() -> {UInt32: {UInt32: EditionRule}}`
- Read via Flow REST API: `POST https://rest-mainnet.onflow.org/v1/scripts`

## Snapshot 2026-05-20

- **On-chain edition count: 225** when expanded at the contract's true keying granularity `(setID, playID, subeditionID)`.
- `getWhitelistEditionCount()` returns 220 — but it counts `(setID, playID)` PAIRS, not subedition-expanded triples.
- 4 pairs have multiple specific subedition variants in their `EditionRule.allowedSubeditions` dict:
  - `(238, 8011)` → subs `[19, 20, 0]` (3 variants)
  - `(219, 7408)` → subs `[18, 17]` (2 variants)
  - `(223, 7516)` → subs `[20, 19]` (2 variants)
  - `(233, 7730)` → subs `[19, 20]` (2 variants)
- 216 pairs use the "allow-all" convention (empty `allowedSubeditions` + `allowNoSubedition=false` → accept every subedition variant of that pair)
- Total: 216 × 1 + 3 + 2 + 2 + 2 = **225** ✓ (matches litepaper target)
- Unique setIDs: 62. Top sets: 4 Holo MMXX-S1 (27 plays), 8 Cosmic-S1 (16), 165 (14), 211 (13), 169 (10).

## Files

- `grail-whitelist-onchain-pairs-2026-05-20.json` — 220 `(setID, playID)` uint32 pair tuples
- `grail-whitelist-onchain-triples-2026-05-20.json` — 225 `(setID, playID, subeditionID, allowAll)` records (the authoritative whitelist as the contract intends it)

## Open: uint32 ↔ UUID mapping

The on-chain whitelist uses Flow uint32 IDs; our DB uses UUIDs for set/play. Bridges:
- `production_sem_open.asset_nba_set.set_flow_id` (uint32 string) ↔ `set_id` (UUID) — DIRECT mapping exists
- `production_sem_open.asset_nba_play` — does NOT expose play_flow_id directly
- Cadence `TopShot.getPlayMetaData(playID: UInt32)` returns dict with FullName, JerseyNumber, PlayCategory, Date — can match against `asset_nba_play.play_name` via string comparison
- Alternative bridge: any moment_flow_id maps deterministically to its (setID, playID) on-chain — pick one rep per edition

Full mapping is a ~half-day ETL build (220 Cadence calls or BQ join). Filed as follow-up.
