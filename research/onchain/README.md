# On-Chain GRAIL Whitelist Snapshot

## Source
- Contract: `A.3a54ff5b392d115b.GRAILExchangeV2` (Flow mainnet)
- Account: `0x3a54ff5b392d115b` — **0 active keys** (immutable, non-upgradeable)
- Getter: `getWhitelist() -> {UInt32: {UInt32: EditionRule}}`
- Read via Flow REST API: `POST https://rest-mainnet.onflow.org/v1/scripts`

## Snapshot 2026-05-20

- **On-chain whitelist count: 220** (via `getWhitelistEditionCount()`)
- Unique setIDs covered: 62
- Top sets by play count: set 4 Holo MMXX-S1 (27 plays), set 8 Cosmic-S1 (16), set 165 (14), set 211 (13), set 169 (10)

Litepaper target: 225 (top by asp_180d with filters). Gap: 5 editions pending addition.

## File: grail-whitelist-onchain-pairs-2026-05-20.json

Array of `[setID, playID]` uint32 tuples. 220 entries.

## Open: uint32 ↔ UUID mapping

The on-chain whitelist uses Flow uint32 IDs; our DB uses UUIDs for set/play. Bridges:
- `production_sem_open.asset_nba_set.set_flow_id` (uint32 string) ↔ `set_id` (UUID) — DIRECT mapping exists
- `production_sem_open.asset_nba_play` — does NOT expose play_flow_id directly
- Cadence `TopShot.getPlayMetaData(playID: UInt32)` returns dict with FullName, JerseyNumber, PlayCategory, Date — can match against `asset_nba_play.play_name` via string comparison
- Alternative bridge: any moment_flow_id maps deterministically to its (setID, playID) on-chain — pick one rep per edition

Full mapping is a ~half-day ETL build (220 Cadence calls or BQ join). Filed as follow-up.
