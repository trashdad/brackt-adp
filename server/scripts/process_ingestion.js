import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BASE_DIR = 'server/data/ingest';
const CACHE_DIR = join(BASE_DIR, 'cache');
const OBJECTIVE_DIR = join(BASE_DIR, 'objective');
const SUBJECTIVE_DIR = join(BASE_DIR, 'subjective');

function ensureDirs() {
  [CACHE_DIR, OBJECTIVE_DIR, SUBJECTIVE_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
}

/**
 * Processes a batch of search results/scraped data
 * @param {string} category - e.g., 'F1', 'FIFA', 'Analyst-ETR'
 * @param {object} data - The raw data to process
 */
export function ingestData(category, source, rawContent, insights) {
  ensureDirs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${category}_${source.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

  // 1. Cache raw content
  writeFileSync(join(CACHE_DIR, `${filename}.txt`), rawContent);

  // 2. Extract Objective Data (Odds, Stats)
  const objectiveData = insights.filter(i => i.type === 'objective');
  if (objectiveData.length > 0) {
    writeFileSync(join(OBJECTIVE_DIR, `${filename}.json`), JSON.stringify({
      source,
      category,
      timestamp,
      data: objectiveData
    }, null, 2));
  }

  // 3. Extract Subjective Data (Talking points, sentiment)
  const subjectiveData = insights.filter(i => i.type === 'subjective');
  if (subjectiveData.length > 0) {
    writeFileSync(join(SUBJECTIVE_DIR, `${filename}.json`), JSON.stringify({
      source,
      category,
      timestamp,
      data: subjectiveData
    }, null, 2));
  }

  console.log(`Ingested data for ${category} from ${source}`);
}

// Example usage structure for the automation
const currentData = [
  {
    category: 'Formula 1',
    source: 'Google Search / Multiple',
    raw: '...', // truncated for brevity
    insights: [
      { type: 'objective', key: 'Championship Odds', value: 'George Russell 2/1, Max Verstappen 3/1', context: '2026 Drivers Championship' },
      { type: 'subjective', key: 'Mercedes Outlook', value: 'Analysts cite historical strength with engine regulation changes.', sentiment: 'positive' },
      { type: 'subjective', key: 'Red Bull Outlook', value: 'Uncertainty surrounding new engine project partnered with Ford.', sentiment: 'negative' }
    ]
  },
  {
    category: 'FIFA World Cup',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Winner Odds', value: 'Spain +450, England +550, France +750', context: '2026 World Cup' },
      { type: 'subjective', key: 'Spain Outlook', value: 'Clear favorite following Euro 2024 success and Lamine Yamal emergence.', sentiment: 'positive' },
      { type: 'subjective', key: 'Argentina Outlook', value: "Likely Lionel Messi's 'last dance'.", sentiment: 'neutral' }
    ]
  },
  {
    category: 'AFL',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Premiership Odds', value: 'Brisbane Lions $4.50, Geelong $8.00', context: '2026 Season' },
      { type: 'subjective', key: 'Brisbane Outlook', value: 'Clear favorites to defend title due to young core.', sentiment: 'positive' },
      { type: 'subjective', key: 'Sydney Swans Outlook', value: 'Identified as best value following key recruits.', sentiment: 'positive' }
    ]
  },
  {
    category: 'Indycar',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Championship Odds', value: 'Alex Palou -200', context: '2026 Season' },
      { type: 'subjective', key: 'Alex Palou Outlook', value: 'Heavy favorite to win fourth consecutive title.', sentiment: 'positive' },
      { type: 'subjective', key: 'Mick Schumacher Debut', value: 'High-profile rookie making IndyCar debut.', sentiment: 'neutral' }
    ]
  },
  {
    category: 'MLB',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'World Series Odds', value: 'Dodgers +350, Yankees +800, Mariners +1300', context: '2026 World Series' },
      { type: 'subjective', key: 'Dodgers Outlook', value: 'Team to beat following back-to-back titles.', sentiment: 'positive' },
      { type: 'subjective', key: 'Mariners Outlook', value: 'Significant value in Seattle citing elite starting pitching.', sentiment: 'positive' }
    ]
  },
  {
    category: 'NBA',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'MVP Favorites', value: 'Giannis Antetokounmpo, Nikola Jokic, Luka Doncic', context: '2025-26 Season' },
      { type: 'subjective', key: 'Giannis MVP Outlook', value: 'Strong analyst pick for MVP.', sentiment: 'positive' },
      { type: 'subjective', key: 'Luka Doncic Move', value: 'Now with the Lakers; significant focus on adjustment.', sentiment: 'neutral' }
    ]
  },
  {
    category: 'NFL',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Super Bowl LXI Odds', value: 'Seahawks +800, Rams +900, Ravens +1200', context: '2027 Season' },
      { type: 'subjective', key: 'Seahawks Outlook', value: 'Opened as favorites to repeat following SB LX win.', sentiment: 'positive' },
      { type: 'subjective', key: 'Kansas City Chiefs Outlook', value: 'High betting handle despite recent playoff exits.', sentiment: 'neutral' }
    ]
  },
  {
    category: 'NCAA Basketball',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'March Madness Odds', value: 'Michigan +375, Arizona +425, Duke +400', context: '2026 Tournament' },
      { type: 'subjective', key: 'Michigan Outlook', value: 'Overwhelming favorite under Dusty May.', sentiment: 'positive' },
      { type: 'subjective', key: 'Arizona Outlook', value: 'Freshman core likened to 2012 Kentucky.', sentiment: 'positive' }
    ]
  },
  {
    category: 'NHL',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Stanley Cup Odds', value: 'Avalanche +270, Lightning +480, Hurricanes +700', context: '2026 Season' },
      { type: 'subjective', key: 'Colorado Avalanche Outlook', value: 'Clear favorite following Milan Olympics.', sentiment: 'positive' },
      { type: 'subjective', key: 'Montreal Canadiens Outlook', value: 'Resurgent value play, sitting second in division.', sentiment: 'positive' }
    ]
  },
  {
    category: 'NCAA Football',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Championship Odds', value: 'Ohio State +600, Notre Dame +650, Texas +700', context: '2026-27 Season' },
      { type: 'subjective', key: 'Ohio State Outlook', value: 'Bolstered by return of Julian Sayin and Jeremiah Smith.', sentiment: 'positive' },
      { type: 'subjective', key: 'Indiana Outlook', value: 'Fifth-best favorite to repeat after historic 16-0 season.', sentiment: 'neutral' }
    ]
  },
  {
    category: 'PDC Darts',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'World Championship Odds', value: 'Luke Littler 10/11, Luke Humphries 4/1', context: '2026 Championship' },
      { type: 'subjective', key: 'Luke Littler Outlook', value: 'Dominance compared to Phil Taylor peak.', sentiment: 'positive' },
      { type: 'subjective', key: 'Gian van Veen Sleeper', value: 'High-value each-way sleeper.', sentiment: 'positive' }
    ]
  },
  {
    category: 'PGA Golf',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'World #1 Favorite', value: 'Scottie Scheffler', context: '2026 Season' },
      { type: 'subjective', key: 'Tommy Fleetwood Breakout', value: 'Top breakout pick after 2025 Tour Championship win.', sentiment: 'positive' },
      { type: 'subjective', key: 'Ryan Gerard Fade', value: 'Experts suggest fading at low co-favorite odds.', sentiment: 'negative' }
    ]
  },
  {
    category: 'WNBA',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Championship Odds', value: 'Aces +300, Fever +375, Lynx +400', context: '2026 Season' },
      { type: 'subjective', key: 'Caitlin Clark Effect', value: 'Continues to drive massive interest in the Fever.', sentiment: 'positive' },
      { type: 'subjective', key: 'Expansion Volatility', value: 'Toronto and Portland expansion creates early-season risk.', sentiment: 'negative' }
    ]
  },
  {
    category: 'UEFA Champions League',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Tournament Odds', value: 'Arsenal +350, Bayern +450, Man City +700', context: '2025-26 Season' },
      { type: 'subjective', key: 'Arsenal Pacesetter', value: 'Current pacesetter in betting markets.', sentiment: 'positive' },
      { type: 'subjective', key: 'Borussia Dortmund Advantage', value: 'Strong home-advantage pick for Round of 16.', sentiment: 'positive' }
    ]
  },
  {
    category: 'Tennis',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'Australian Open Finals', value: 'Alcaraz vs Djokovic, Sabalenka vs Rybakina', context: '2026 Tournament' },
      { type: 'subjective', key: 'Djokovic Longevity', value: 'Ongoing quest for 25th Major despite aging.', sentiment: 'neutral' },
      { type: 'subjective', key: 'Sabalenka Defense', value: 'Entered as favorite to defend title.', sentiment: 'positive' }
    ]
  },
  {
    category: 'Snooker',
    source: 'Google Search / Multiple',
    raw: '...',
    insights: [
      { type: 'objective', key: 'World Championship Odds', value: 'Judd Trump 7/2, Ronnie O Sullivan 5/1', context: '2026 Tournament' },
      { type: 'subjective', key: 'Kyren Wilson Curse', value: 'Defending champion faces the Crucible Curse.', sentiment: 'negative' },
      { type: 'subjective', key: 'Neil Robertson Value', value: 'Best value pick following O Sullivans withdrawal from Masters.', sentiment: 'positive' }
    ]
  }
];

// If running directly
if (process.argv[1].endsWith('process_ingestion.js')) {
  currentData.forEach(d => ingestData(d.category, d.source, d.raw, d.insights));
}
