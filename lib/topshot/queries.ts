import { gqlFetch } from "./proxy";
import type {
  LeaderboardEntry,
  MarketplaceTransaction,
  MintedMoment,
  UserPublicInfo,
} from "./types";

const MINTED_MOMENT_FRAGMENT = `
  flowId
  flowSerialNumber
  tier
  lowAsk
  forSale
  lastPurchasePrice
  acquiredAt
  assetPathPrefix
  set { id flowId flowName flowSeriesNumber }
  edition { id circulationCount parallelID tier }
  play {
    id description headline
    stats { playerName playCategory jerseyNumber teamAtMoment dateOfMoment }
  }
  ownerV2 {
    __typename
    ... on User { dapperID username profileImageUrl userFlow: flowAddress }
    ... on NonCustodialUser { ncFlow: flowAddress }
  }
`;

// Lite fragment for paginated bag pulls; includes lowAsk + forSale so the
// portfolio P&L view can compute cost-basis vs current floor without a
// second pass per moment.
const MINTED_MOMENT_LITE = `
  flowId
  flowSerialNumber
  tier
  acquiredAt
  lastPurchasePrice
  lowAsk
  forSale
  assetPathPrefix
  play { headline stats { playerName teamAtMoment dateOfMoment jerseyNumber playCategory } }
  set { flowName flowSeriesNumber flowId }
  edition { id circulationCount parallelID tier }
`;

// ---- USER ----
export async function getUserByUsername(username: string): Promise<UserPublicInfo | null> {
  const q = `query($u: String!) {
    getUserProfileByUsername(input: { username: $u }) {
      publicInfo { username dapperID flowAddress profileImageUrl favoriteTeamID }
    }
  }`;
  try {
    const d = await gqlFetch<{ getUserProfileByUsername: { publicInfo: UserPublicInfo } | null }>(
      q,
      { u: username },
      { ttlMs: 5 * 60_000 }
    );
    return d.getUserProfileByUsername?.publicInfo ?? null;
  } catch {
    return null;
  }
}

export async function getUserByFlow(flowAddress: string): Promise<UserPublicInfo | null> {
  const q = `query($a: String!) {
    getUserProfile(input: { flowAddress: $a }) {
      publicInfo { username dapperID flowAddress profileImageUrl favoriteTeamID }
    }
  }`;
  try {
    const d = await gqlFetch<{ getUserProfile: { publicInfo: UserPublicInfo } | null }>(q, { a: flowAddress }, { ttlMs: 5 * 60_000 });
    return d.getUserProfile?.publicInfo ?? null;
  } catch {
    return null;
  }
}

// ---- COLLECTION ----
export interface SearchResult<T> {
  totalCount: number | null;
  rightCursor?: string;
  leftCursor?: string;
  items: T[];
}

export async function searchMomentsByOwner(
  flowAddress: string,
  cursor: string = "",
  limit: number = 100
): Promise<SearchResult<MintedMoment>> {
  const q = `query($addr: [String], $cur: Cursor!, $lim: Int!) {
    searchMintedMoments(input: {
      filters: { byOwnerFlowAddress: $addr }
      searchInput: { pagination: { cursor: $cur, direction: RIGHT, limit: $lim } }
    }) {
      data {
        searchSummary {
          totalCount
          pagination { rightCursor leftCursor }
          data { ... on MintedMoments { data { ${MINTED_MOMENT_FRAGMENT} } } }
        }
      }
    }
  }`;
  type R = {
    searchMintedMoments: {
      data: {
        searchSummary: {
          totalCount: number | null;
          pagination?: { rightCursor?: string; leftCursor?: string };
          data: { data: MintedMoment[] };
        };
      };
    };
  };
  const d = await gqlFetch<R>(q, { addr: [flowAddress], cur: cursor, lim: limit }, { ttlMs: 60_000 });
  const ss = d.searchMintedMoments.data.searchSummary;
  return {
    totalCount: ss.totalCount ?? null,
    rightCursor: ss.pagination?.rightCursor,
    leftCursor: ss.pagination?.leftCursor,
    items: ss.data.data,
  };
}

export async function searchMomentsByPlayers(
  playerIds: string[],
  cursor: string = "",
  limit: number = 24
): Promise<SearchResult<MintedMoment>> {
  const q = `query($ids: [ID], $cur: Cursor!, $lim: Int!) {
    searchMintedMoments(input: {
      filters: { byPlayers: $ids }
      searchInput: { pagination: { cursor: $cur, direction: RIGHT, limit: $lim } }
    }) {
      data {
        searchSummary {
          totalCount
          pagination { rightCursor leftCursor }
          data { ... on MintedMoments { data { ${MINTED_MOMENT_FRAGMENT} } } }
        }
      }
    }
  }`;
  type R = {
    searchMintedMoments: {
      data: {
        searchSummary: {
          totalCount: number | null;
          pagination?: { rightCursor?: string; leftCursor?: string };
          data: { data: MintedMoment[] };
        };
      };
    };
  };
  const d = await gqlFetch<R>(q, { ids: playerIds, cur: cursor, lim: limit }, { ttlMs: 60_000 });
  const ss = d.searchMintedMoments.data.searchSummary;
  return {
    totalCount: ss.totalCount ?? null,
    rightCursor: ss.pagination?.rightCursor,
    leftCursor: ss.pagination?.leftCursor,
    items: ss.data.data,
  };
}

// ---- SINGLE MOMENT ----
export async function getMoment(flowId: string): Promise<MintedMoment | null> {
  const q = `query($id: ID!) {
    getMintedMoment(momentId: $id) {
      data { ${MINTED_MOMENT_FRAGMENT} }
    }
  }`;
  type R = { getMintedMoment: { data: MintedMoment | null } | null };
  try {
    const d = await gqlFetch<R>(q, { id: flowId }, { ttlMs: 30_000 });
    return d.getMintedMoment?.data ?? null;
  } catch {
    return null;
  }
}

// ---- ALL EDITIONS FOR A PLAY (parallel matrix) ----
export interface EditionRow {
  id: string;
  circulationCount: number;
  parallelID: number;
  tier: string;
  set: { flowName: string; flowSeriesNumber?: number };
}
export async function editionsForPlay(playUuid: string): Promise<EditionRow[]> {
  const q = `query($p: [ID]) {
    searchEditions(input: {
      filters: { byPlayIDs: $p }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: 30 } }
    }) {
      searchSummary {
        data { ... on Editions { data { id circulationCount parallelID tier set { flowName flowSeriesNumber } } } }
      }
    }
  }`;
  type R = {
    searchEditions: {
      searchSummary: { data: { data: EditionRow[] } };
    };
  };
  try {
    const d = await gqlFetch<R>(q, { p: [playUuid] }, { ttlMs: 60 * 60_000 });
    return d.searchEditions.searchSummary.data.data;
  } catch {
    return [];
  }
}

// ---- EDITION ----
export async function getEdition(setFlowID: string, playFlowID: string) {
  const q = `query($s: ID!, $p: ID!) {
    getEditionByFlowIDs(input: { setFlowID: $s, playFlowID: $p }) {
      edition {
        id circulationCount parallelID tier
        set { id flowId flowName flowSeriesNumber }
        play {
          id description headline
          stats { playerName playCategory jerseyNumber teamAtMoment dateOfMoment }
        }
      }
    }
  }`;
  type R = { getEditionByFlowIDs: { edition: unknown } | null };
  const d = await gqlFetch<R>(q, { s: setFlowID, p: playFlowID }, { ttlMs: 24 * 60 * 60_000 });
  return d.getEditionByFlowIDs?.edition ?? null;
}

// ---- ACTIVITY (recent global sales) ----
export async function recentSales(limit: number = 30): Promise<MarketplaceTransaction[]> {
  const q = `query($lim: Int!) {
    searchMarketplaceTransactions(input: {
      filters: {}
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: $lim } }
    }) {
      data {
        searchSummary {
          data { ... on MarketplaceTransactions { data {
            id price txHash
            buyer { username flowAddress dapperID }
            seller { username flowAddress dapperID }
            moment {
              flowId flowSerialNumber tier lowAsk forSale
              set { flowName flowId }
              play { stats { playerName jerseyNumber teamAtMoment } }
              edition { circulationCount tier parallelID }
            }
          } } }
        }
      }
    }
  }`;
  type R = {
    searchMarketplaceTransactions: {
      data: {
        searchSummary: { data: { data: MarketplaceTransaction[] } };
      };
    };
  };
  const d = await gqlFetch<R>(q, { lim: limit }, { ttlMs: 20_000 });
  return d.searchMarketplaceTransactions.data.searchSummary.data.data;
}

// ---- LEADERBOARD (anonymous score ladder per player/team) ----
export async function getLeaderboard(
  kind: "PLAYER" | "TEAM",
  id: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const q = `query($k: LeaderboardKind!, $id: String!, $lim: Int!) {
    getLeaderboard(input: {
      kind: $k, id: $id, sortBy: SCORE_DESC,
      pagination: { cursor: "", direction: RIGHT, limit: $lim }
    }) {
      leaderboard {
        ... on PlayerLeaderboard { entries { rank score } }
        ... on TeamLeaderboard { entries { rank score } }
      }
    }
  }`;
  type R = { getLeaderboard: { leaderboard: { entries: LeaderboardEntry[] } } | null };
  try {
    const d = await gqlFetch<R>(q, { k: kind, id, lim: limit }, { ttlMs: 60 * 60_000 });
    return d.getLeaderboard?.leaderboard?.entries ?? [];
  } catch {
    return [];
  }
}

// ---- TEAM SHARE (for share-of-bag math) ----
export async function teamShare(flowAddress: string, teamId: string): Promise<number | null> {
  const q = `query($a: [String], $t: [ID]) {
    searchMintedMoments(input: {
      filters: { byOwnerFlowAddress: $a, byTeams: $t }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: 1 } }
    }) { data { searchSummary { totalCount } } }
  }`;
  try {
    const d = await gqlFetch<{
      searchMintedMoments: { data: { searchSummary: { totalCount: number | null } } };
    }>(q, { a: [flowAddress], t: [teamId] }, { ttlMs: 5 * 60_000 });
    return d.searchMintedMoments.data.searchSummary.totalCount;
  } catch {
    return null;
  }
}

// ---- BAG PAGINATION (lite for full-bag pull) ----
export async function fetchBagPage(
  flowAddress: string,
  cursor: string = "",
  limit: number = 100
) {
  const q = `query($a:[String],$c:Cursor!,$l:Int!){
    searchMintedMoments(input:{
      filters:{ byOwnerFlowAddress: $a }
      searchInput:{ pagination:{ cursor:$c, direction:RIGHT, limit:$l } }
    }){
      data{ searchSummary{
        totalCount
        pagination{ rightCursor }
        data{ ... on MintedMoments{ data{ ${MINTED_MOMENT_LITE} } } }
      } }
    }
  }`;
  type R = {
    searchMintedMoments: {
      data: {
        searchSummary: {
          totalCount: number | null;
          pagination?: { rightCursor?: string };
          data: { data: import("./types").MintedMoment[] };
        };
      };
    };
  };
  const d = await gqlFetch<R>(q, { a: [flowAddress], c: cursor, l: limit }, { ttlMs: 60_000 });
  const ss = d.searchMintedMoments.data.searchSummary;
  return {
    totalCount: ss.totalCount ?? null,
    rightCursor: ss.pagination?.rightCursor ?? "",
    items: ss.data.data,
  };
}

// ---- SETS DIRECTORY ----
export interface SetRow {
  id: string;
  flowId: number;
  flowName: string;
  flowSeriesNumber?: number;
}
export async function allSets(limit: number = 200): Promise<SetRow[]> {
  const q = `query($lim: Int!) {
    searchSets(input: { searchInput: { pagination: { cursor: "", direction: RIGHT, limit: $lim } } }) {
      searchSummary {
        data { ... on Sets { data { id flowId flowName flowSeriesNumber } } }
      }
    }
  }`;
  type R = { searchSets: { searchSummary: { data: { data: SetRow[] } } } };
  try {
    const d = await gqlFetch<R>(q, { lim: limit }, { ttlMs: 24 * 60 * 60_000 });
    return d.searchSets.searchSummary.data.data;
  } catch {
    return [];
  }
}

// ---- PLAYERS DIRECTORY ----
export async function allPlayers(): Promise<Array<{ id: string; name: string }>> {
  const q = `query { allPlayers { data { id name } } }`;
  type R = { allPlayers: { data: Array<{ id: string; name: string }> } };
  const d = await gqlFetch<R>(q, {}, { ttlMs: 24 * 60 * 60_000 });
  // dedupe by id
  const seen = new Set<string>();
  return d.allPlayers.data.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
