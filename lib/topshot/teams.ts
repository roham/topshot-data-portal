export const TEAM_NAMES: Record<string, string> = {
  "1610612737": "Atlanta Hawks",
  "1610612738": "Boston Celtics",
  "1610612739": "Cleveland Cavaliers",
  "1610612740": "New Orleans Pelicans",
  "1610612741": "Chicago Bulls",
  "1610612742": "Dallas Mavericks",
  "1610612743": "Denver Nuggets",
  "1610612744": "Golden State Warriors",
  "1610612745": "Houston Rockets",
  "1610612746": "LA Clippers",
  "1610612747": "Los Angeles Lakers",
  "1610612748": "Miami Heat",
  "1610612749": "Milwaukee Bucks",
  "1610612750": "Minnesota Timberwolves",
  "1610612751": "Brooklyn Nets",
  "1610612752": "New York Knicks",
  "1610612753": "Orlando Magic",
  "1610612754": "Indiana Pacers",
  "1610612755": "Philadelphia 76ers",
  "1610612756": "Phoenix Suns",
  "1610612757": "Portland Trail Blazers",
  "1610612758": "Sacramento Kings",
  "1610612759": "San Antonio Spurs",
  "1610612760": "Oklahoma City Thunder",
  "1610612761": "Toronto Raptors",
  "1610612762": "Utah Jazz",
  "1610612763": "Memphis Grizzlies",
  "1610612764": "Washington Wizards",
  "1610612765": "Detroit Pistons",
  "1610612766": "Charlotte Hornets",
};

export const TEAM_IDS: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_NAMES).map(([id, name]) => [name.toLowerCase(), id])
);

// Tatum is on Celtics. Wemby plays for the San Antonio Spurs. Cooper Flagg = 1642843 (Mavs draft 2025-26).
export const FEATURED_PLAYERS = [
  { id: "1641705", name: "Victor Wembanyama" },
  { id: "1642843", name: "Cooper Flagg" },
  { id: "2544", name: "LeBron James" },
  { id: "1628369", name: "Jayson Tatum" },
  { id: "201939", name: "Stephen Curry" },
  { id: "1629029", name: "Luka Dončić" },
  { id: "1630162", name: "Anthony Edwards" },
  { id: "1630170", name: "Tyrese Haliburton" },
  { id: "203507", name: "Giannis Antetokounmpo" },
  { id: "1628983", name: "Shai Gilgeous-Alexander" },
];
