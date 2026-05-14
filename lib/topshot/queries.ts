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

// ---- EDITIONS PER SET (for completion math) ----
export async function editionsInSet(setUuid: string): Promise<Array<{ id: string; playId: string; circulationCount: number; tier: string; parallelID: number }>> {
  const PAGE = 100;
  const out: Array<{ id: string; playId: string; circulationCount: number; tier: string; parallelID: number }> = [];
  let cursor = "";
  for (let i = 0; i < 6; i++) {
    const q = `query($s: [ID], $c: Cursor!, $l: Int!) {
      searchEditions(input: {
        filters: { bySetIDs: $s }
        searchInput: { pagination: { cursor: $c, direction: RIGHT, limit: $l } }
      }) {
        searchSummary {
          pagination { rightCursor }
          data { ... on Editions { data { id circulationCount tier parallelID play { id } } } }
        }
      }
    }`;
    type R = {
      searchEditions: {
        searchSummary: {
          pagination?: { rightCursor?: string };
          data: { data: Array<{ id: string; play?: { id: string }; circulationCount: number; tier: string; parallelID: number }> };
        };
      };
    };
    try {
      const d = await gqlFetch<R>(q, { s: [setUuid], c: cursor, l: PAGE }, { ttlMs: 12 * 60 * 60_000 });
      const items = d.searchEditions.searchSummary.data.data;
      out.push(
        ...items.map((it) => ({
          id: it.id,
          playId: it.play?.id ?? "",
          circulationCount: it.circulationCount,
          tier: it.tier,
          parallelID: it.parallelID,
        }))
      );
      cursor = d.searchEditions.searchSummary.pagination?.rightCursor ?? "";
      if (!cursor || items.length < PAGE) break;
    } catch {
      break;
    }
  }
  return out;
}

// ---- SET METADATA + ALL PLAYS ----
export async function setDetail(setUuid: string) {
  const q = `query($s: ID!) {
    getSet(input: { setID: $s }) {
      set {
        id flowId flowName flowSeriesNumber
        plays { id headline }
      }
    }
  }`;
  type R = {
    getSet: {
      set: {
        id: string;
        flowId: number;
        flowName: string;
        flowSeriesNumber?: number;
        plays?: Array<{ id: string; headline?: string }>;
      } | null;
    } | null;
  };
  try {
    const d = await gqlFetch<R>(q, { s: setUuid }, { ttlMs: 24 * 60 * 60_000 });
    return d.getSet?.set ?? null;
  } catch {
    return null;
  }
}

// ---- PER-EDITION RECENT SALES (for V5 confidence amplifier) ----
export async function editionRecentSales(setUuid: string, playUuid: string, limit: number = 20): Promise<Array<{ price: number; date?: string; serial: string }>> {
  const q = `query($s: ID!, $p: ID!, $lim: Int!) {
    searchMarketplaceTransactions(input: {
      filters: { byEditions: [{ setID: $s, playID: $p }] }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: $lim } }
    }) {
      data {
        searchSummary {
          data { ... on MarketplaceTransactions { data { id price moment { flowSerialNumber } } } }
        }
      }
    }
  }`;
  type R = {
    searchMarketplaceTransactions: {
      data: { searchSummary: { data: { data: Array<{ price: string; moment?: { flowSerialNumber?: string } }> } } };
    };
  };
  try {
    const d = await gqlFetch<R>(q, { s: setUuid, p: playUuid, lim: limit }, { ttlMs: 30 * 60_000 });
    return d.searchMarketplaceTransactions.data.searchSummary.data.data.map((t) => ({
      price: Number(t.price),
      serial: t.moment?.flowSerialNumber ?? "?",
    }));
  } catch {
    return [];
  }
}

// ---- LISTED SERIALS IN AN EDITION (for edge / arbitrage) ----
export async function editionListedSerials(setUuid: string, playUuid: string, limit: number = 50): Promise<Array<{ flowId: string; serial: number; lowAsk: number; circulation: number }>> {
  const q = `query($s: ID!, $p: ID!, $lim: Int!) {
    searchMintedMoments(input: {
      filters: { byEditions: { setID: $s, playID: $p }, byForSale: FOR_SALE }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: $lim } }
    }) {
      data {
        searchSummary {
          totalCount
          data { ... on MintedMoments { data {
            flowId flowSerialNumber lowAsk edition { circulationCount }
          } } }
        }
      }
    }
  }`;
  type R = {
    searchMintedMoments: {
      data: { searchSummary: { totalCount: number | null; data: { data: Array<{ flowId: string; flowSerialNumber: string; lowAsk: number; edition?: { circulationCount: number } }> } } };
    };
  };
  try {
    const d = await gqlFetch<R>(q, { s: setUuid, p: playUuid, lim: limit }, { ttlMs: 5 * 60_000 });
    return d.searchMintedMoments.data.searchSummary.data.data.map((m) => ({
      flowId: m.flowId,
      serial: Number(m.flowSerialNumber),
      lowAsk: Number(m.lowAsk ?? 0),
      circulation: m.edition?.circulationCount ?? 0,
    }));
  } catch {
    return [];
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

// ---- PLAY HISTORY (paginate searchPlays for date-of-moment matching) ----
export interface PlayRow {
  id: string;
  headline?: string;
  stats?: {
    playerName?: string;
    dateOfMoment?: string;
    teamAtMoment?: string;
    playCategory?: string;
  };
}
export async function paginatedPlays(maxPages: number = 4, perPage: number = 100): Promise<PlayRow[]> {
  const out: PlayRow[] = [];
  let cursor = "";
  for (let i = 0; i < maxPages; i++) {
    const q = `query($c: Cursor!, $l: Int!) {
      searchPlays(input: {
        searchInput: { pagination: { cursor: $c, direction: LEFT, limit: $l } }
      }) {
        searchSummary {
          pagination { rightCursor leftCursor }
          data { ... on Plays { data { id headline stats { playerName dateOfMoment teamAtMoment playCategory } } } }
        }
      }
    }`;
    type R = {
      searchPlays: {
        searchSummary: {
          pagination?: { rightCursor?: string; leftCursor?: string };
          data: { data: PlayRow[] };
        };
      };
    };
    try {
      const d = await gqlFetch<R>(q, { c: cursor, l: perPage }, { ttlMs: 60 * 60_000 });
      const items = d.searchPlays.searchSummary.data.data;
      out.push(...items);
      cursor = d.searchPlays.searchSummary.pagination?.leftCursor ?? "";
      if (!cursor || !items.length) break;
    } catch {
      break;
    }
  }
  return out;
}

// ---- ALL-TIME BIGGEST SALES (sortBy: PRICE_DESC) ----
export async function biggestSalesAllTime(limit: number = 25): Promise<import("./types").MarketplaceTransaction[]> {
  const q = `query($lim: Int!) {
    searchMarketplaceTransactions(input: {
      filters: {}
      sortBy: PRICE_DESC
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: $lim } }
    }) {
      data {
        searchSummary {
          data { ... on MarketplaceTransactions { data {
            id price txHash
            buyer { username flowAddress dapperID }
            seller { username flowAddress dapperID }
            moment {
              flowId flowSerialNumber tier
              set { flowName flowId flowSeriesNumber }
              play { stats { playerName jerseyNumber teamAtMoment dateOfMoment } }
              edition { circulationCount tier parallelID }
            }
          } } }
        }
      }
    }
  }`;
  type R = {
    searchMarketplaceTransactions: {
      data: { searchSummary: { data: { data: import("./types").MarketplaceTransaction[] } } };
    };
  };
  try {
    const d = await gqlFetch<R>(q, { lim: limit }, { ttlMs: 60 * 60_000 });
    return d.searchMarketplaceTransactions.data.searchSummary.data.data;
  } catch {
    return [];
  }
}

// ---- RECENT SALES BULK (for volume + trend analysis) ----
// Pulls a larger window of recent transactions to enable
// sliding-window sale-count and per-player volume metrics.
export async function recentSalesBulk(limit: number = 200): Promise<import("./types").MarketplaceTransaction[]> {
  // The public API paginates via cursor; pull in chunks until target.
  const PAGE = 50;
  const out: import("./types").MarketplaceTransaction[] = [];
  let cursor = "";
  while (out.length < limit) {
    const q = `query($cur: Cursor!, $lim: Int!) {
      searchMarketplaceTransactions(input: {
        filters: {}
        searchInput: { pagination: { cursor: $cur, direction: RIGHT, limit: $lim } }
      }) {
        data {
          searchSummary {
            pagination { rightCursor }
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
          searchSummary: {
            pagination?: { rightCursor?: string };
            data: { data: import("./types").MarketplaceTransaction[] };
          };
        };
      };
    };
    try {
      const d = await gqlFetch<R>(q, { cur: cursor, lim: PAGE }, { ttlMs: 30_000 });
      const ss = d.searchMarketplaceTransactions.data.searchSummary;
      const items = ss.data.data;
      out.push(...items);
      cursor = ss.pagination?.rightCursor ?? "";
      if (!cursor || items.length === 0) break;
    } catch {
      break;
    }
  }
  return out.slice(0, limit);
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

// ---- TEAM TOTAL MINTED (per-team aggregate) ----
export async function teamTotalMinted(teamId: string): Promise<number | null> {
  const q = `query($t: [ID]) {
    searchMintedMoments(input: {
      filters: { byTeams: $t }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: 1 } }
    }) { data { searchSummary { totalCount } } }
  }`;
  type R = { searchMintedMoments: { data: { searchSummary: { totalCount: number | null } } } };
  try {
    const d = await gqlFetch<R>(q, { t: [teamId] }, { ttlMs: 60 * 60_000 });
    return d.searchMintedMoments.data.searchSummary.totalCount ?? null;
  } catch {
    return null;
  }
}

// ---- TEAM RECENT MINTS (per-team newest moments) ----
export async function teamRecentMints(teamId: string, limit: number = 12) {
  const q = `query($t: [ID], $lim: Int!) {
    searchMintedMoments(input: {
      filters: { byTeams: $t }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: $lim } }
    }) {
      data { searchSummary { totalCount data { ... on MintedMoments { data { ${MINTED_MOMENT_LITE} } } } } }
    }
  }`;
  type R = {
    searchMintedMoments: {
      data: { searchSummary: { totalCount: number | null; data: { data: import("./types").MintedMoment[] } } };
    };
  };
  try {
    const d = await gqlFetch<R>(q, { t: [teamId], lim: limit }, { ttlMs: 5 * 60_000 });
    return {
      total: d.searchMintedMoments.data.searchSummary.totalCount ?? 0,
      items: d.searchMintedMoments.data.searchSummary.data.data,
    };
  } catch {
    return { total: 0, items: [] };
  }
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
