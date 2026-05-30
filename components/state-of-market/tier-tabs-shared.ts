// Server-safe tier-tab constants + parser. No client code here so server
// components (page, MarketActivity) can import parseTier without crossing the
// client boundary. The interactive <TierTabs> client component imports from here.

export const TIER_TABS = ["All", "Common", "Rare", "Fandom", "Legendary", "Ultimate"] as const;
export type TierTab = (typeof TIER_TABS)[number];

export function parseTier(raw: string | string[] | undefined): TierTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (TIER_TABS as readonly string[]).includes(v ?? "") ? (v as TierTab) : "All";
}
