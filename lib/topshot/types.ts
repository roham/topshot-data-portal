export type MomentTier =
  | "MOMENT_TIER_COMMON"
  | "MOMENT_TIER_FANDOM"
  | "MOMENT_TIER_RARE"
  | "MOMENT_TIER_LEGENDARY"
  | "MOMENT_TIER_ULTIMATE";

export interface PlayStats {
  playerName: string;
  jerseyNumber?: string;
  playCategory?: string;
  teamAtMoment?: string;
  dateOfMoment?: string;
}

export interface Play {
  id?: string;
  description?: string;
  headline?: string;
  stats?: PlayStats;
}

export interface Set {
  id?: string;
  flowId?: number;
  flowName: string;
  flowSeriesNumber?: number;
}

export interface Edition {
  id?: string;
  circulationCount: number;
  parallelID?: number;
  tier?: MomentTier;
}

export interface Owner {
  __typename: "User" | "NonCustodialUser";
  username?: string;
  dapperID?: string;
  profileImageUrl?: string;
  // The raw API aliases these to avoid union-conflict; we expose both and
  // normalize via the ownerAddr() helper.
  userFlow?: string;
  ncFlow?: string;
}

export function ownerAddr(o: Owner | null | undefined): string | null {
  if (!o) return null;
  return o.userFlow ?? o.ncFlow ?? null;
}

export interface MintedMoment {
  flowId: string;
  flowSerialNumber: string;
  tier?: MomentTier;
  set?: Set;
  edition?: Edition;
  play?: Play;
  ownerV2?: Owner;
  lowAsk?: number | string | null;
  forSale?: boolean;
  lastPurchasePrice?: number | string | null;
  acquiredAt?: string | null;
}

export interface UserPublicInfo {
  username: string;
  dapperID: string;
  flowAddress: string;
  profileImageUrl?: string;
  favoriteTeamID?: string;
}

export interface MarketplaceTransaction {
  id: string;
  price: string;
  txHash: string;
  /** ISO timestamp; surfaced by STAGE-1 UNLOCK-02 (UPDATED_AT_DESC sort exposes this). */
  updatedAt?: string;
  buyer?: { username?: string; flowAddress: string; dapperID?: string };
  seller?: { username?: string; flowAddress: string; dapperID?: string };
  moment?: MintedMoment;
}

export interface LeaderboardEntry {
  rank: number;
  score: number;
}
