import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const USER_AGENTS = require(path.join(__dirname, '../../pipeline/config/user-agents.json'));

// Source weights — how much each mention/item contributes to the raw socialScore
export const WEIGHTS = {
  reddit: 1.0,
  redditRankBonus: 2.5,       // max bonus for rank #1 detection
  bluesky: 0.8,
  news: 3.0,
  premiumNews: 4.5,
  rankingsBase: 2.0,
  rankingsMax: 5.0,           // rank #1 gets this total weight
};

// Quotient tuning — strong signal (max 1.35x EV multiplier)
export const QUOTIENT = {
  coefficient: 0.12,
  maxQuotient: 1.35,
  decayFactor: 0.85,          // multiply existing scores by this each run
};

// Reddit subreddits per sport (searched in addition to global /search)
export const SUBREDDITS = {
  nfl: ['nfl', 'sportsbook', 'fantasyfootball'],
  nba: ['nba', 'sportsbook', 'fantasybball'],
  mlb: ['baseball', 'sportsbook', 'fantasybaseball'],
  nhl: ['hockey', 'sportsbook'],
  ncaaf: ['CFB', 'sportsbook'],
  ncaab: ['CollegeBasketball', 'sportsbook'],
  ncaaw: ['NCAAW'],
  wnba: ['wnba'],
  afl: ['AFL'],
  f1: ['formula1', 'sportsbook'],
  ucl: ['soccer', 'sportsbook'],
  fifa: ['soccer', 'worldcup'],
  darts: ['Darts'],
  snooker: ['snooker'],
  llws: ['baseball'],
  indycar: ['INDYCAR', 'sportsbook'],
  pga: ['golf', 'sportsbook'],
  tennis_m: ['tennis', 'sportsbook'],
  tennis_w: ['tennis', 'sportsbook'],
  csgo: ['GlobalOffensive', 'esports'],
};

// Power ranking URLs per sport
// Each entry: { url, selector hint for parsing }
export const RANKING_URLS = {
  nfl: [
    { source: 'CBS', url: 'https://www.cbssports.com/nfl/powerrankings/' },
    { source: 'ESPN', url: 'https://www.espn.com/nfl/story/_/id/41102144/nfl-power-rankings-2024-preseason-poll-teams-rank-1-32' },
    { source: 'NBC', url: 'https://www.nbcsports.com/nfl/news/nfl-power-rankings' },
    { source: 'PFN', url: 'https://www.profootballnetwork.com/nfl-power-rankings/' },
  ],
  nba: [
    { source: 'CBS', url: 'https://www.cbssports.com/nba/powerrankings/' },
    { source: 'BR', url: 'https://bleacherreport.com/nba-power-rankings' },
    { source: 'NBA', url: 'https://www.nba.com/news/category/power-rankings' },
  ],
  mlb: [
    { source: 'CBS', url: 'https://www.cbssports.com/mlb/powerrankings/' },
    { source: 'BR', url: 'https://bleacherreport.com/mlb-power-rankings' },
    { source: 'MLB', url: 'https://www.mlb.com/news/topic/power-rankings' },
  ],
  nhl: [
    { source: 'CBS', url: 'https://www.cbssports.com/nhl/powerrankings/' },
    { source: 'NBC', url: 'https://www.nbcsports.com/nhl/news/nhl-power-rankings' },
    { source: 'NHL', url: 'https://www.nhl.com/news/topic/power-rankings' },
  ],
  ncaaf: [
    { source: 'AP Poll', url: 'https://apnews.com/hub/ap-top-25-college-football-poll' },
    { source: 'Coaches', url: 'https://www.usatoday.com/sports/ncaaf/polls/coaches-poll/' },
    { source: 'ESPN', url: 'https://www.espn.com/college-football/rankings' },
  ],
  ncaab: [
    { source: 'AP Poll', url: 'https://apnews.com/hub/ap-top-25-college-basketball-poll' },
    { source: 'Coaches', url: 'https://www.usatoday.com/sports/ncaab/polls/coaches-poll/' },
    { source: 'ESPN', url: 'https://www.espn.com/mens-college-basketball/rankings' },
  ],
  ncaaw: [
    { source: 'AP Poll', url: 'https://apnews.com/hub/ap-top-25-womens-college-basketball-poll' },
    { source: 'ESPN', url: 'https://www.espn.com/womens-college-basketball/rankings' },
  ],
  wnba: [
    { source: 'ESPN', url: 'https://www.espn.com/wnba/story/_/page/WNBAPowerRankings/wnba-power-rankings' },
    { source: 'CBS', url: 'https://www.cbssports.com/wnba/powerrankings/' },
    { source: 'WNBA', url: 'https://www.wnba.com/news/category/power-rankings' },
  ],
  fifa: [
    { source: 'FIFA', url: 'https://www.fifa.com/fifa-world-ranking/men' },
    { source: 'Oddspedia', url: 'https://oddspedia.com/soccer/world-cup/standings' },
  ],
  darts: [
    { source: 'PDC', url: 'https://www.pdc.tv/order-of-merit/pdc-order-merit' },
    { source: 'DartsRankings', url: 'https://www.dartsrankings.com/' },
  ],
  tennis_m: [
    { source: 'ATP', url: 'https://www.atptour.com/en/rankings/singles' },
    { source: 'Live-Tennis', url: 'https://www.live-tennis.eu/en/atp-live-ranking' },
  ],
  tennis_w: [
    { source: 'WTA', url: 'https://www.wtatennis.com/rankings/singles' },
    { source: 'Live-Tennis', url: 'https://www.live-tennis.eu/en/wta-live-ranking' },
  ],
  // Individual sport rankings
  pga: [
    { source: 'OWGR', url: 'https://www.owgr.com/ranking' },
    { source: 'Datagolf', url: 'https://datagolf.com/raw-rankings' },
  ],
  f1: [
    { source: 'F1', url: 'https://www.formula1.com/en/results/2026/drivers' },
    { source: 'Covers', url: 'https://www.covers.com/f1/drivers-championship-constructors-championship-odds' },
    { source: 'SkySports', url: 'https://www.skysports.com/f1/standings' },
  ],
  // Niche sports
  snooker: [
    { source: 'WST', url: 'https://www.wst.tv//rankings' },
    { source: 'Snooker.org', url: 'https://www.snooker.org/res/index.asp?template=31' },
  ],
  afl: [
    { source: 'Squiggle', url: 'https://squiggle.com.au/power-rankings/' },
    { source: 'ZeroHanger', url: 'https://www.zerohanger.com/afl/power-rankings/' },
  ],
  csgo: [
    { source: 'HLTV', url: 'https://www.hltv.org/ranking/teams' },
    { source: 'ESL', url: 'https://pro.eslgaming.com/worldranking/csgo/' },
  ],
  ucl: [
    { source: 'JustBookies', url: 'https://www.justbookies.com/champions-league-odds/' },
    { source: 'UEFA', url: 'https://www.uefa.com/nationalassociations/uefarankings/club/' },
  ],
  indycar: [
    { source: 'FOX', url: 'https://www.foxsports.com/stories/motor/2026-indycar-title-odds' },
    { source: 'IndyCar', url: 'https://www.indycar.com/Drivers' },
  ],
};

// Premium news sources that get higher weight
export const PREMIUM_SOURCES = [
  'ESPN', 'CBS Sports', 'Yahoo Sports', 'The Athletic', 'Sports Illustrated',
  'Bleacher Report', 'Fox Sports', 'NBC Sports', 'Sky Sports',
];

// Sports that are individual (not team) — affects query construction
export const INDIVIDUAL_SPORTS = ['pga', 'tennis_m', 'tennis_w', 'f1', 'indycar', 'darts', 'snooker'];

// Sports with tournaments — query includes tournament names
export const TOURNAMENT_SPORTS = ['pga', 'tennis_m', 'tennis_w', 'indycar', 'csgo'];

// File paths
export const PATHS = {
  rosters: path.join(__dirname, '../../src/data/rosters.js'),
  storage: path.join(__dirname, '../../server/data/social-storage.json'),
  scores: path.join(__dirname, '../../server/data/social-scores.json'),
  draftState: path.join(__dirname, '../../server/data/draft-state.json'),
};
