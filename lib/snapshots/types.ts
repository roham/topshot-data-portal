// V2 STAGE-3 — snapshot payload shapes. One per cadence.

export interface MarketAggregateSnapshot {
  ts: number;            // unix ms
  windowMs: number;      // 30m for /market; 24h/7d/30d for day/week/month tiers
  windowLabel?: string;  // "30m" | "24h" | "7d" | "30d"
  txCount: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  medianPriceCents: number;
  meanPriceCents: number;
  topPlayersByVolume: Array<{ playerName: string; count: number; medianPriceCents: number }>;
  topSetsByVolume: Array<{ setFlowName: string; count: number; medianPriceCents: number }>;
  // iter-16 additions — the ownership-graph wedge surfaced in the snapshot itself.
  topBuyers?: Array<{
    username: string;
    spendCents: number;
    count: number;
    biggestCents: number;
    biggestFlowId: string | null;
  }>;
  topSellers?: Array<{
    username: string;
    revenueCents: number;
    count: number;
    biggestCents: number;
    biggestFlowId: string | null;
  }>;
  largestSales?: Array<{
    priceCents: number;
    playerName: string | null;
    setFlowName: string | null;
    tier: string | null;
    serial: string | null;
    flowId: string | null;
    buyerUsername: string | null;
    sellerUsername: string | null;
    updatedAt: string | null;
  }>;
}

export interface PerEditionFloorSnapshot {
  setUuid: string;
  playUuid: string;
  setFlowName: string;
  playerName: string;
  ts: number;
  floorCents: number;
  listingCount: number;
  topAsksCents: number[];   // bottom-50 sample (or however many listed)
  circulationCount: number;
}

export interface HotEditionsSnapshot {
  ts: number;
  editions: PerEditionFloorSnapshot[];
}

export interface PerPlayerRollupSnapshot {
  ts: number;
  players: Array<{
    playerId: string;
    playerName: string;
    totalMomentsMinted: number;
    distinctEditions: number;
    medianRecentSaleCents: number;
    recentSaleCount: number;
  }>;
}

export interface PortfolioSnapshot {
  ts: number;
  flowAddress: string;
  username: string | null;
  totalMoments: number;
  estimatedValueCents: number;
  topHoldingsByValue: Array<{
    flowId: string;
    playerName: string;
    setFlowName: string;
    serial: number;
    lowAskCents: number;
  }>;
}

export interface NBAGamesSnapshot {
  ts: number;
  date: string; // YYYY-MM-DD
  games: Array<{
    id: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: string;
    topScorers?: Array<{ playerName: string; points: number; team: string }>;
  }>;
}
