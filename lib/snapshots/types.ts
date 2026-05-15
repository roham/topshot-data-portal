// V2 STAGE-3 — snapshot payload shapes. One per cadence.

export interface MarketAggregateSnapshot {
  ts: number;            // unix ms
  windowMs: number;      // 30 minutes typically
  txCount: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  medianPriceCents: number;
  meanPriceCents: number;
  // Top movers in the window (placeholder; iter-1 expands).
  topPlayersByVolume: Array<{ playerName: string; count: number; medianPriceCents: number }>;
  topSetsByVolume: Array<{ setFlowName: string; count: number; medianPriceCents: number }>;
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
