// NBA team primary + secondary colors.
// Source: publicly published team brand colors (teamcolorcodes.com cross-checked
// against NBA.com brand pages). Hardcoded reference data; no API hit per render.
//
// Use these as scoped accents on team pages. Never use them as foreground text on
// the dark base — primaries like Spurs black (#000000) or Nets black are illegible.
// Default to using `primary` for borders, glyphs, and chart fills; `secondary` for
// hover/active states. The `text` field is a guaranteed-readable variant for chips.

export interface TeamColors {
  primary: string;
  secondary: string;
  text: string; // readable on dark base (lightened where primary is too dark)
}

// Keyed by NBA team abbreviation. The Top Shot API exposes both tricode and
// teamId; if you have only teamId, use teamIdToAbbr() below.
export const TEAM_COLORS: Record<string, TeamColors> = {
  ATL: { primary: "#E03A3E", secondary: "#C1D32F", text: "#E03A3E" },
  BOS: { primary: "#007A33", secondary: "#BA9653", text: "#1FAE6F" },
  BKN: { primary: "#FFFFFF", secondary: "#000000", text: "#E5E5E5" },
  CHA: { primary: "#1D1160", secondary: "#00788C", text: "#7A6FE6" },
  CHI: { primary: "#CE1141", secondary: "#000000", text: "#FF3D5D" },
  CLE: { primary: "#860038", secondary: "#FDBB30", text: "#C73066" },
  DAL: { primary: "#00538C", secondary: "#002B5E", text: "#3A8FCB" },
  DEN: { primary: "#0E2240", secondary: "#FEC524", text: "#FEC524" },
  DET: { primary: "#C8102E", secondary: "#1D42BA", text: "#E03A52" },
  GSW: { primary: "#1D428A", secondary: "#FFC72C", text: "#FFC72C" },
  HOU: { primary: "#CE1141", secondary: "#000000", text: "#FF3D5D" },
  IND: { primary: "#002D62", secondary: "#FDBB30", text: "#FDBB30" },
  LAC: { primary: "#C8102E", secondary: "#1D428A", text: "#E03A52" },
  LAL: { primary: "#552583", secondary: "#FDB927", text: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F", text: "#7A95C9" },
  MIA: { primary: "#98002E", secondary: "#F9A01B", text: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6", text: "#22A157" },
  MIN: { primary: "#0C2340", secondary: "#236192", text: "#4A88C2" },
  NOP: { primary: "#0C2340", secondary: "#C8102E", text: "#E03A52" },
  NYK: { primary: "#006BB6", secondary: "#F58426", text: "#F58426" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24", text: "#1FA4F0" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4", text: "#2E9DE6" },
  PHI: { primary: "#006BB6", secondary: "#ED174C", text: "#2E9DE6" },
  PHX: { primary: "#1D1160", secondary: "#E56020", text: "#E56020" },
  POR: { primary: "#E03A3E", secondary: "#000000", text: "#E03A3E" },
  SAC: { primary: "#5A2D81", secondary: "#63727A", text: "#8A5BAF" },
  SAS: { primary: "#C4CED4", secondary: "#000000", text: "#C4CED4" },
  TOR: { primary: "#CE1141", secondary: "#000000", text: "#FF3D5D" },
  UTA: { primary: "#002B5C", secondary: "#00471B", text: "#3A6FC0" },
  WAS: { primary: "#002B5C", secondary: "#E31837", text: "#E83D5C" },
};

// NBA stats.nba.com / cdn.nba.com use these integer team IDs.
export const TEAM_ID_TO_ABBR: Record<number, string> = {
  1610612737: "ATL",
  1610612738: "BOS",
  1610612751: "BKN",
  1610612766: "CHA",
  1610612741: "CHI",
  1610612739: "CLE",
  1610612742: "DAL",
  1610612743: "DEN",
  1610612765: "DET",
  1610612744: "GSW",
  1610612745: "HOU",
  1610612754: "IND",
  1610612746: "LAC",
  1610612747: "LAL",
  1610612763: "MEM",
  1610612748: "MIA",
  1610612749: "MIL",
  1610612750: "MIN",
  1610612740: "NOP",
  1610612752: "NYK",
  1610612760: "OKC",
  1610612753: "ORL",
  1610612755: "PHI",
  1610612756: "PHX",
  1610612757: "POR",
  1610612758: "SAC",
  1610612759: "SAS",
  1610612761: "TOR",
  1610612762: "UTA",
  1610612764: "WAS",
};

export function teamIdToAbbr(teamId: number | string): string | undefined {
  const id = typeof teamId === "string" ? parseInt(teamId, 10) : teamId;
  return TEAM_ID_TO_ABBR[id];
}

export function colorsForTeamId(teamId: number | string): TeamColors | undefined {
  const abbr = teamIdToAbbr(teamId);
  return abbr ? TEAM_COLORS[abbr] : undefined;
}

export function colorsForAbbr(abbr: string): TeamColors | undefined {
  return TEAM_COLORS[abbr.toUpperCase()];
}

// Official NBA CDN paths. Use these — never substitute synthesized art.
export const NBA_HEADSHOT = (playerId: number | string) =>
  `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;

export const NBA_TEAM_LOGO_LIGHT = (teamId: number | string) =>
  `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;

export const NBA_TEAM_LOGO_DARK = (teamId: number | string) =>
  `https://cdn.nba.com/logos/nba/${teamId}/global/D/logo.svg`;

// Top Shot media gateway. mediaType is one of:
//   hero, hero-wide, video-square, video-tall, player, jersey,
//   transparent, logos, game, category
// Append ?format=webp&width={px}&quality=90 for Cloudflare resize.
export type TopShotMediaType =
  | "hero"
  | "hero-wide"
  | "video-square"
  | "video-tall"
  | "player"
  | "jersey"
  | "transparent"
  | "logos"
  | "game"
  | "category";

export function topShotMedia(
  flowId: number | string,
  mediaType: TopShotMediaType,
  width?: number,
): string {
  const base = `https://assets.nbatopshot.com/media/${flowId}/${mediaType}`;
  if (width === undefined) return base;
  return `${base}?format=webp&width=${width}&quality=90`;
}
