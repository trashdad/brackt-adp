/**
 * Refine raw ingest data into structured formats for the Brackt ADP site.
 *
 * Reads raw JSON blobs from server/data/ingest/objective/ and subjective/,
 * parses odds, validates they are championship futures, deduplicates across
 * files, and merges into the existing live odds / manual-odds / social-scores
 * data files.
 *
 * Usage:
 *   node scripts/refine-ingest.js
 *   node scripts/refine-ingest.js --dry-run   (preview without writing files)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_DATA = join(__dirname, '..', 'server', 'data');
const INGEST_DIR = join(SERVER_DATA, 'ingest');
const LIVE_DIR = join(SERVER_DATA, 'live');
const CACHE_DIR = join(INGEST_DIR, 'cache');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ── Odds math (mirrors src/services/oddsConverter.js) ──────────────────────

function americanToImpliedProbability(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  return odds < 0
    ? Math.abs(odds) / (Math.abs(odds) + 100)
    : 100 / (odds + 100);
}

function probabilityToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

function formatAmerican(n) {
  if (n == null || isNaN(n)) return null;
  return n > 0 ? `+${n}` : `${n}`;
}

function fractionalToAmerican(frac) {
  const [num, den] = frac.split('/').map(Number);
  if (!den) return null;
  const decimal = num / den;
  return decimal >= 1 ? Math.round(decimal * 100) : Math.round(-100 / decimal);
}

function decimalToAmerican(dec) {
  if (dec <= 1) return null;
  const profit = dec - 1;
  return profit >= 1 ? Math.round(profit * 100) : Math.round(-100 / profit);
}

// ── Name matching ──────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Common short-name → full-name aliases for fuzzy matching
const ALIASES = {
  // NFL
  seahawks: 'Seattle Seahawks', rams: 'Los Angeles Rams', ravens: 'Baltimore Ravens',
  chiefs: 'Kansas City Chiefs', bills: 'Buffalo Bills', lions: 'Detroit Lions',
  niners: 'San Francisco 49ers', '49ers': 'San Francisco 49ers',
  packers: 'Green Bay Packers', eagles: 'Philadelphia Eagles',
  cowboys: 'Dallas Cowboys', bengals: 'Cincinnati Bengals', dolphins: 'Miami Dolphins',
  vikings: 'Minnesota Vikings', chargers: 'Los Angeles Chargers', texans: 'Houston Texans',
  colts: 'Indianapolis Colts', jaguars: 'Jacksonville Jaguars', broncos: 'Denver Broncos',
  steelers: 'Pittsburgh Steelers', saints: 'New Orleans Saints', bears: 'Chicago Bears',
  raiders: 'Las Vegas Raiders', falcons: 'Atlanta Falcons', panthers: 'Carolina Panthers',
  browns: 'Cleveland Browns', giants: 'New York Giants', jets: 'New York Jets',
  cardinals: 'Arizona Cardinals', buccaneers: 'Tampa Bay Buccaneers',
  bucs: 'Tampa Bay Buccaneers', titans: 'Tennessee Titans',
  commanders: 'Washington Commanders', patriots: 'New England Patriots',
  // MLB
  dodgers: 'Los Angeles Dodgers', yankees: 'New York Yankees', mariners: 'Seattle Mariners',
  braves: 'Atlanta Braves', astros: 'Houston Astros', mets: 'New York Mets',
  padres: 'San Diego Padres', phillies: 'Philadelphia Phillies', orioles: 'Baltimore Orioles',
  'red sox': 'Boston Red Sox',
  // NHL
  avalanche: 'Colorado Avalanche', lightning: 'Tampa Bay Lightning',
  hurricanes: 'Carolina Hurricanes', canadiens: 'Montreal Canadiens',
  oilers: 'Edmonton Oilers', panthers_nhl: 'Florida Panthers',
  // NBA
  celtics: 'Boston Celtics', thunder: 'Oklahoma City Thunder', nuggets: 'Denver Nuggets',
  bucks: 'Milwaukee Bucks', cavaliers: 'Cleveland Cavaliers', lakers: 'LA Lakers',
  warriors: 'Golden State Warriors', heat: 'Miami Heat', suns: 'Phoenix Suns',
  // NCAAF
  'ohio state': 'Ohio State Buckeyes', 'notre dame': 'Notre Dame Fighting Irish',
  texas: 'Texas Longhorns', michigan: 'Michigan Wolverines',
  // NCAAB
  duke: 'Duke Blue Devils', arizona: 'Arizona Wildcats',
  // WNBA
  aces: 'Las Vegas Aces', fever: 'Indiana Fever', lynx: 'Minnesota Lynx',
  // AFL
  'brisbane lions': 'Brisbane Lions', geelong: 'Geelong Cats',
  // FIFA
  spain: 'Spain', england: 'England', france: 'France', argentina: 'Argentina',
  // UCL
  arsenal: 'Arsenal', bayern: 'Bayern Munich', 'man city': 'Manchester City',
  'borussia dortmund': 'Borussia Dortmund',
  'paris saint-germain': 'PSG', 'paris sg': 'PSG',
  'newcastle united': 'Newcastle',
  'tottenham hotspur': 'Tottenham',
  'bodo/glimt': 'Bodo Glimt', 'bodoakglimt': 'Bodo Glimt',
  // F1
  'george russell': 'George Russell', 'max verstappen': 'Max Verstappen',
  mercedes: 'Mercedes', 'red bull': 'Red Bull',
  'gabriel bortoleto': 'Gabriel Bortoleto',
  'kimi antonelli': 'Kimi Antonelli',
  'arvid lindblad': 'Arvid Lindblad',
  'valtteri bottas': 'Valtteri Bottas',
  'sergio perez': 'Sergio Perez',
  // IndyCar
  'alex palou': 'Alex Palou',
  'pato o ward': "Pato O'Ward",
  // Darts
  'luke littler': 'Luke Littler', 'luke humphries': 'Luke Humphries',
  'gian van veen': 'Gian van Veen',
  'michael van gerwen': 'Michael van Gerwen',
  'rob cross': 'Rob Cross',
  'mike de decker': 'Mike De Decker',
  'dave chisnall': 'Dave Chisnall',
  'dirk van duijvenbode': 'Dirk van Duijvenbode',
  'dimitri van den bergh': 'Dimitri Van den Bergh',
  // Snooker
  'judd trump': 'Judd Trump', 'ronnie o\'sullivan': 'Ronnie O\'Sullivan',
  'ronnie o sullivan': 'Ronnie O\'Sullivan',
  'zhao xintong': 'Zhao Xintong',
  'luca brecel': 'Luca Brecel',
  'ding junhui': 'Ding Junhui',
  'si jiahui': 'Si Jiahui',
  'zhang anda': 'Zhang Anda',
  'xiao guodong': 'Xiao Guodong',
  'wu yize': 'Wu Yize',
  'mark williams': 'Mark Williams',
  'mark allen': 'Mark Allen',
  'jack lisowski': 'Jack Lisowski',
  'barry hawkins': 'Barry Hawkins',
  'stuart bingham': 'Stuart Bingham',
  'fan zhengyi': 'Fan Zhengyi',
  'ryan day': 'Ryan Day',
  'matthew selt': 'Matthew Selt',
  'anthony mcgill': 'Anthony McGill',
  // NCAAB
  'gonzaga bulldogs': 'Gonzaga Bulldogs',
  'creighton bluejays': 'Creighton Bluejays',
  'marquette golden eagles': 'Marquette Golden Eagles',
  // PGA
  'scottie scheffler': 'Scottie Scheffler', 'tommy fleetwood': 'Tommy Fleetwood',
  'ryan gerard': 'Ryan Gerard',
  // Tennis
  alcaraz: 'Carlos Alcaraz', djokovic: 'Novak Djokovic',
  sabalenka: 'Aryna Sabalenka', rybakina: 'Elena Rybakina',
  // CS:GO handled if data arrives
  // LLWS regional name normalization
  curacao: 'Caribbean',
  'latin america': 'Latin America',
  'asia-pacific': 'Asia-Pacific',
  'asia pacific': 'Asia-Pacific',
  'europe-africa': 'Europe-Africa',
  'europe africa': 'Europe-Africa',
  // NCAAW short names
  uconn: 'UConn Huskies',
  'south carolina': 'South Carolina Gamecocks',
  ucla: 'UCLA Bruins',
  lsu: 'LSU Tigers',
  vanderbilt: 'Vanderbilt Commodores',
  iowa: 'Iowa Hawkeyes',
  tennessee: 'Tennessee Lady Volunteers',
  'nc state': 'NC State Wolfpack',
};

// ── Category → Sport ID mapping ────────────────────────────────────────────

const CATEGORY_TO_SPORT = {
  'NFL': 'nfl',
  'NBA': 'nba',
  'MLB': 'mlb',
  'NHL': 'nhl',
  'NCAA Basketball': 'ncaab',
  'NCAA Football': 'ncaaf',
  "NCAA Women's Basketball": 'ncaaw',
  'NCAA Womens Basketball': 'ncaaw',
  'NCAAW': 'ncaaw',
  'PGA Golf': 'pga',
  'Tennis': '_tennis',        // split into tennis_m and tennis_w later
  'Formula 1': 'f1',
  'Indycar': 'indycar',
  'AFL': 'afl',
  'FIFA World Cup': 'fifa',
  'PDC Darts': 'darts',
  'Snooker': 'snooker',
  'WNBA': 'wnba',
  'UEFA Champions League': 'ucl',
  'Counter Strike': 'csgo',
  'LLWS': 'llws',
};

// ── Championship event key patterns ────────────────────────────────────────

const CHAMPIONSHIP_PATTERNS = {
  nfl:     [/super bowl/i, /championship/i, /futures/i, /odds/i],
  nba:     [/nba/i, /championship/i, /finals/i, /futures/i, /mvp/i, /odds/i],
  mlb:     [/world series/i, /championship/i, /futures/i, /odds/i],
  nhl:     [/stanley cup/i, /championship/i, /futures/i, /odds/i],
  ncaaf:   [/championship/i, /playoff/i, /futures/i, /odds/i],
  ncaab:   [/march madness/i, /championship/i, /tournament/i, /futures/i, /odds/i],
  ncaaw:   [/march madness/i, /championship/i, /tournament/i, /futures/i, /odds/i, /women/i],
  wnba:    [/championship/i, /futures/i, /odds/i],
  afl:     [/premiership/i, /championship/i, /futures/i, /odds/i],
  fifa:    [/world cup/i, /winner/i, /futures/i, /odds/i],
  ucl:     [/champions league/i, /tournament/i, /futures/i, /odds/i],
  f1:      [/championship/i, /drivers/i, /futures/i, /odds/i],
  indycar: [/championship/i, /futures/i, /odds/i],
  darts:   [/world championship/i, /futures/i, /odds/i],
  snooker: [/world championship/i, /futures/i, /odds/i],
  llws:    [/world series/i, /championship/i, /futures/i],
  // QP sports also accept per-tournament keys
  pga:     [/masters/i, /pga champ/i, /us open/i, /open champ/i, /world/i, /futures/i, /odds/i, /favorite/i, /the players/i, /match play/i, /genesis/i, /arnold palmer/i, /bmw/i, /riviera/i, /bay hill/i],
  tennis_m:[/australian open/i, /french open/i, /wimbledon/i, /us open/i, /grand slam/i, /futures/i, /finals/i, /indian wells/i, /miami open/i, /monte.carlo/i, /madrid open/i, /italian open/i, /roland garros/i, /rome/i, /canada open/i, /cincinnati/i],
  tennis_w:[/australian open/i, /french open/i, /wimbledon/i, /us open/i, /grand slam/i, /futures/i, /finals/i, /indian wells/i, /miami open/i, /madrid open/i, /italian open/i, /roland garros/i, /rome/i, /canada open/i, /cincinnati/i],
  csgo:    [/blast/i, /iem/i, /pgl/i, /major/i, /futures/i, /odds/i],
};

// Map ingest key text → tournament ID for QP sports
// Includes both QP-scoring events and reference-only events (qpEvent: false in sports.js).
// All are tracked in oddsByTournament; the QP calc only uses eventsPerSeason worth of events.
const TOURNAMENT_KEY_MAP = {
  pga: {
    // QP events
    'masters': 'masters', 'the masters': 'masters',
    'pga championship': 'pga-champ', 'pga champ': 'pga-champ',
    'us open': 'us-open',
    'open championship': 'open-champ', 'the open': 'open-champ', 'british open': 'open-champ',
    // Reference events (form signal only — highest value: The Players, WGC Match Play)
    'the players': 'the-players', 'players championship': 'the-players', 'tpc sawgrass': 'the-players',
    'wgc match play': 'wgc-match-play', 'dell match play': 'wgc-match-play', 'match play': 'wgc-match-play',
    'genesis invitational': 'genesis', 'genesis': 'genesis', 'riviera': 'genesis',
    'arnold palmer': 'arnold-palmer', 'bay hill': 'arnold-palmer',
    'bmw championship': 'bmw-championship', 'bmw': 'bmw-championship',
  },
  tennis_m: {
    // QP events (Grand Slams)
    'australian open': 'aus-open', 'aus open': 'aus-open',
    'french open': 'french-open', 'roland garros': 'french-open',
    'wimbledon': 'wimbledon',
    'us open': 'us-open',
    // Reference events — clay swing is highest signal (immediate pre-French Open form)
    'indian wells': 'indian-wells', 'bnp paribas open': 'indian-wells',
    'miami open': 'miami-open', 'miami': 'miami-open',
    'monte carlo': 'monte-carlo', 'monte-carlo masters': 'monte-carlo', 'rolex monte carlo': 'monte-carlo',
    'madrid open': 'madrid-open', 'mutua madrid': 'madrid-open',
    'italian open': 'rome', 'rome': 'rome', 'internazionali bnl': 'rome',
    'canada open': 'canada-open', 'canadian open': 'canada-open', 'national bank open': 'canada-open',
    'cincinnati open': 'cincinnati', 'western & southern': 'cincinnati', 'cincinnati': 'cincinnati',
  },
  tennis_w: {
    // QP events (Grand Slams)
    'australian open': 'aus-open', 'aus open': 'aus-open',
    'french open': 'french-open', 'roland garros': 'french-open',
    'wimbledon': 'wimbledon',
    'us open': 'us-open',
    // Reference events — same high-signal clay swing as men's
    'indian wells': 'indian-wells', 'bnp paribas open': 'indian-wells',
    'miami open': 'miami-open', 'miami': 'miami-open',
    'madrid open': 'madrid-open', 'mutua madrid': 'madrid-open',
    'italian open': 'rome', 'rome': 'rome', 'internazionali bnl': 'rome',
    'canada open': 'canada-open', 'canadian open': 'canada-open', 'national bank open': 'canada-open',
    'cincinnati open': 'cincinnati', 'western & southern': 'cincinnati', 'cincinnati': 'cincinnati',
  },
  csgo: {
    // QP events (BLAST Opens only)
    'blast spring': 'blast-spring-2026', 'blast open spring': 'blast-spring-2026',
    'blast fall': 'blast-fall-2026', 'blast open fall': 'blast-fall-2026',
    // Reference events
    'iem cologne': 'cologne-2026', 'cologne': 'cologne-2026',
    'pgl singapore': 'singapore-2026', 'singapore': 'singapore-2026',
  },
};

const QP_SPORT_IDS = ['pga', 'tennis_m', 'tennis_w', 'csgo'];

// Known women's tennis players for splitting Tennis → tennis_m / tennis_w
const WOMENS_TENNIS = new Set([
  'sabalenka', 'rybakina', 'swiatek', 'gauff', 'pegula', 'keys', 'zheng',
  'ostapenko', 'muchova', 'jabeur', 'kasatkina', 'haddad maia', 'paolini',
  'navarro', 'andreeva', 'boulter', 'sakkari', 'garcia', 'vondrousova',
  'krejcikova', 'badosa', 'collins', 'raducanu', 'cornet', 'kostyuk',
]);

// ── Load rosters from src/data/rosters.js ──────────────────────────────────

function loadRosters() {
  const rostersPath = join(__dirname, '..', 'src', 'data', 'rosters.js');
  const content = readFileSync(rostersPath, 'utf8');
  // Extract the ROSTERS object by evaluating the module content
  // We'll parse it manually since it's a simple object with string arrays
  const rosters = {};
  const sportMatch = content.matchAll(/(\w+):\s*\[([\s\S]*?)\]/g);
  for (const match of sportMatch) {
    const sportId = match[1];
    const names = [...match[2].matchAll(/'([^']+)'/g)].map(m => m[1]);
    if (names.length > 0) rosters[sportId] = names;
  }
  return rosters;
}

function findRosterMatch(name, sportId, rosters) {
  const sportRoster = rosters[sportId];
  if (!sportRoster) return name; // no roster for this sport, use raw name

  const normInput = normalize(name);

  // Direct normalized match
  for (const rosterName of sportRoster) {
    if (normalize(rosterName) === normInput) return rosterName;
  }

  // Check aliases
  const aliasKey = name.toLowerCase().trim();
  if (ALIASES[aliasKey]) {
    const aliasNorm = normalize(ALIASES[aliasKey]);
    for (const rosterName of sportRoster) {
      if (normalize(rosterName) === aliasNorm) return rosterName;
    }
  }

  // Partial match: check if input is a suffix of a roster name (e.g., "Seahawks" matches "Seattle Seahawks")
  for (const rosterName of sportRoster) {
    const rNorm = normalize(rosterName);
    if (rNorm.endsWith(normInput) || rNorm.startsWith(normInput)) return rosterName;
  }

  // Fallback: return the raw name
  return name;
}

// ── Parse odds from free-text value strings ────────────────────────────────

function parseOddsEntries(value, source) {
  const results = [];

  // Skip "vs" matchup entries (e.g., "Alcaraz vs Djokovic")
  if (/\bvs\.?\b/i.test(value) && !/[+-]\d+/.test(value) && !/\d+\/\d+/.test(value) && !/\$\d/.test(value)) {
    return results;
  }

  // Try American odds: "Name +/-NNN"
  const americanPattern = /([A-Za-z][A-Za-z\s.'''-]+?)\s+([+-]\d{3,})/g;
  let match;
  while ((match = americanPattern.exec(value)) !== null) {
    results.push({ name: match[1].trim(), odds: match[2], source });
  }
  if (results.length > 0) return results;

  // Try fractional odds: "Name N/N"
  const fracPattern = /([A-Za-z][A-Za-z\s.'''-]+?)\s+(\d+\/\d+)/g;
  while ((match = fracPattern.exec(value)) !== null) {
    const american = fractionalToAmerican(match[2]);
    if (american != null) {
      results.push({ name: match[1].trim(), odds: formatAmerican(american), source });
    }
  }
  if (results.length > 0) return results;

  // Try decimal (AUD) odds: "Name $N.NN"
  const decPattern = /([A-Za-z][A-Za-z\s.'''-]+?)\s+\$(\d+\.?\d*)/g;
  while ((match = decPattern.exec(value)) !== null) {
    const american = decimalToAmerican(parseFloat(match[2]));
    if (american != null) {
      results.push({ name: match[1].trim(), odds: formatAmerican(american), source });
    }
  }
  if (results.length > 0) return results;

  // Try just American odds without comma-separated names: "Name1 +NNN, Name2 +NNN"
  const commaSplit = value.split(',').map(s => s.trim());
  for (const chunk of commaSplit) {
    const m = chunk.match(/^([A-Za-z][A-Za-z\s.'''-]+?)\s+([+-]\d{3,})$/);
    if (m) results.push({ name: m[1].trim(), odds: m[2], source });
  }

  return results;
}

// ── Detect tournament from key text ────────────────────────────────────────

function detectTournament(key, sportId) {
  const map = TOURNAMENT_KEY_MAP[sportId];
  if (!map) return null;
  const keyLower = key.toLowerCase();
  for (const [pattern, tournamentId] of Object.entries(map)) {
    if (keyLower.includes(pattern)) return tournamentId;
  }
  return null;
}

// ── Check if key is a valid championship event ─────────────────────────────

function isChampionshipEvent(key, sportId) {
  const patterns = CHAMPIONSHIP_PATTERNS[sportId];
  if (!patterns) return true; // unknown sport, accept all
  return patterns.some(p => p.test(key));
}

// ── Determine tennis gender ────────────────────────────────────────────────

function classifyTennisGender(name) {
  const norm = name.toLowerCase().trim();
  for (const wName of WOMENS_TENNIS) {
    if (norm.includes(wName)) return 'tennis_w';
  }
  return 'tennis_m';
}

// ── MAIN ───────────────────────────────────────────────────────────────────

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch { return null; }
}

function writeJson(path, data) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would write ${path}`);
    return;
  }
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getCacheKey(filename) {
  return filename.replace(/\.json$/, '.txt');
}

function isProcessed(filename) {
  if (FORCE) return false;
  return existsSync(join(CACHE_DIR, getCacheKey(filename)));
}

function markProcessed(filename) {
  if (DRY_RUN) return;
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, getCacheKey(filename)), 'ok\n', 'utf8');
}

function main() {
  const rosters = loadRosters();
  console.log(`Loaded rosters for ${Object.keys(rosters).length} sports`);

  // ── Part 1: Read and parse objective (odds) data ───────────────────────

  const objectiveDir = join(INGEST_DIR, 'objective');
  const subjectiveDir = join(INGEST_DIR, 'subjective');

  if (!existsSync(objectiveDir)) {
    console.log('No objective ingest directory found. Nothing to process.');
    return;
  }

  const objectiveFiles = readdirSync(objectiveDir).filter(f => f.endsWith('.json'));
  const subjectiveFiles = existsSync(subjectiveDir)
    ? readdirSync(subjectiveDir).filter(f => f.endsWith('.json'))
    : [];

  console.log(`Found ${objectiveFiles.length} objective files, ${subjectiveFiles.length} subjective files`);

  // Collect parsed odds per sport: { sportId: { entryKey: { name, oddsBySource, oddsByTournament, timestamp } } }
  const parsedOdds = {};
  let totalParsed = 0;
  let totalSkipped = 0;

  for (const file of objectiveFiles) {
    if (isProcessed(file)) {
      continue; // already processed
    }

    const data = readJson(join(objectiveDir, file));
    if (!data || !data.data) continue;

    let sportId = CATEGORY_TO_SPORT[data.category];
    if (!sportId) {
      console.warn(`  Unknown category: "${data.category}" in ${file}`);
      continue;
    }

    const sourceLabel = slugify(data.source || 'unknown');
    const timestamp = data.timestamp || new Date().toISOString();

    for (const entry of data.data) {
      if (entry.type !== 'objective') continue;

      const isTennis = sportId === '_tennis';
      const resolvedSportIds = isTennis ? ['tennis_m', 'tennis_w'] : [sportId];

      for (const sid of resolvedSportIds) {
        if (!isChampionshipEvent(entry.key, sid)) {
          totalSkipped++;
          continue;
        }

        const tournamentId = QP_SPORT_IDS.includes(sid) ? detectTournament(entry.key, sid) : null;
        const odds = parseOddsEntries(entry.value, sourceLabel);

        for (const o of odds) {
          // For tennis, classify gender
          let finalSportId = sid;
          if (isTennis) {
            finalSportId = classifyTennisGender(o.name);
          }

          const matchedName = findRosterMatch(o.name, finalSportId, rosters);
          const entryKey = `${finalSportId}-${slugify(matchedName)}`;

          if (!parsedOdds[finalSportId]) parsedOdds[finalSportId] = {};
          if (!parsedOdds[finalSportId][entryKey]) {
            parsedOdds[finalSportId][entryKey] = {
              name: matchedName,
              oddsBySource: {},
              oddsByTournament: {},
              timestamp,
            };
          }

          const existing = parsedOdds[finalSportId][entryKey];

          if (tournamentId && QP_SPORT_IDS.includes(finalSportId)) {
            if (!existing.oddsByTournament[tournamentId]) {
              existing.oddsByTournament[tournamentId] = {};
            }
            existing.oddsByTournament[tournamentId][sourceLabel] = o.odds;
          } else {
            existing.oddsBySource[sourceLabel] = o.odds;
          }
          totalParsed++;
        }
      }
    }

    markProcessed(file);
  }

  console.log(`\nParsed ${totalParsed} odds entries, skipped ${totalSkipped} non-championship entries`);

  // ── Part 2 & 3: Merge into live odds and manual-odds ───────────────────

  const now = new Date().toISOString();
  const manifestData = readJson(join(LIVE_DIR, 'manifest.json')) || {
    lastUpdated: now,
    sports: {},
  };

  let liveUpdated = 0;
  let manualUpdated = 0;

  // Read existing manual-odds.json (may not exist)
  const manualOddsPath = join(SERVER_DATA, 'manual-odds.json');
  const manualOdds = readJson(manualOddsPath) || {};

  for (const [sportId, entries] of Object.entries(parsedOdds)) {
    const isQP = QP_SPORT_IDS.includes(sportId);

    if (isQP) {
      // QP sports → merge into manual-odds.json with oddsByTournament
      for (const [entryKey, entry] of Object.entries(entries)) {
        if (!manualOdds[entryKey]) {
          manualOdds[entryKey] = {
            sport: sportId,
            name: entry.name,
            oddsBySource: {},
            oddsByTournament: {},
            timestamp: Date.now(),
          };
        }

        // Merge oddsByTournament
        for (const [tId, tSources] of Object.entries(entry.oddsByTournament)) {
          if (!manualOdds[entryKey].oddsByTournament[tId]) {
            manualOdds[entryKey].oddsByTournament[tId] = {};
          }
          for (const [src, odds] of Object.entries(tSources)) {
            if (!manualOdds[entryKey].oddsByTournament[tId][src]) {
              manualOdds[entryKey].oddsByTournament[tId][src] = odds;
              manualUpdated++;
            }
          }
        }

        // Merge oddsBySource (overall championship odds for QP sport)
        for (const [src, odds] of Object.entries(entry.oddsBySource)) {
          if (!manualOdds[entryKey].oddsBySource[src]) {
            manualOdds[entryKey].oddsBySource[src] = odds;
            manualUpdated++;
          }
        }

        manualOdds[entryKey].timestamp = Date.now();
      }
    } else {
      // Standard sports → merge into live/{sportId}.json
      const livePath = join(LIVE_DIR, `${sportId}.json`);
      const liveData = readJson(livePath) || {
        sport: sportId,
        lastUpdated: now,
        sources: [],
        entries: [],
      };

      // Build lookup by nameNormalized
      const entryMap = {};
      for (const e of liveData.entries) {
        entryMap[e.nameNormalized] = e;
      }

      const newSources = new Set(liveData.sources || []);

      for (const [entryKey, entry] of Object.entries(entries)) {
        const nameNorm = normalize(entry.name);

        if (!entryMap[nameNorm]) {
          entryMap[nameNorm] = {
            name: entry.name,
            nameNormalized: nameNorm,
            bestOdds: null,
            bestOddsSource: null,
            consensusOdds: null,
            oddsBySource: {},
            impliedProbability: 0,
            market: 'outrights',
          };
        }

        const existing = entryMap[nameNorm];

        // Add new source odds (don't overwrite existing)
        for (const [src, odds] of Object.entries(entry.oddsBySource)) {
          if (!existing.oddsBySource[src]) {
            existing.oddsBySource[src] = odds;
            newSources.add(src);
            liveUpdated++;
          }
        }

        // Recalculate consensus, bestOdds, impliedProbability
        recalculateEntry(existing);
      }

      liveData.entries = Object.values(entryMap);
      liveData.sources = [...newSources];
      liveData.lastUpdated = now;

      writeJson(livePath, liveData);

      // Update manifest
      manifestData.sports[sportId] = {
        entryCount: liveData.entries.length,
        sources: liveData.sources,
        lastUpdated: now,
      };
    }
  }

  // Write manual-odds.json if QP data was added
  if (manualUpdated > 0) {
    writeJson(manualOddsPath, manualOdds);
  }

  // Write manifest
  manifestData.lastUpdated = now;
  writeJson(join(LIVE_DIR, 'manifest.json'), manifestData);

  console.log(`Live odds updated: ${liveUpdated} new source entries`);
  console.log(`Manual odds updated: ${manualUpdated} new tournament/source entries`);

  // ── Part 4: Process subjective data ────────────────────────────────────

  const positiveSignals = [];
  const negativeSignals = [];
  const neutralSignals = [];

  const socialScoresPath = join(SERVER_DATA, 'social-scores.json');
  const socialScores = readJson(socialScoresPath) || {};

  // Generic catalysts (fallback for sports without specific patterns)
  const POSITIVE_CATALYSTS = /\b(rookie|recruit|return|breakout|sleeper|debut|emerge|prospect|core|elite|favorite|champion|dominant|dynasty|upgrade|acquisition|blockbuster)\b/i;
  const NEGATIVE_CATALYSTS = /\b(transfer|leaving|fired|traded|exit|curse|fade|risk|volatility|aging|decline|depart|withdraw|suspension|injury|out for season|key loss|interim|rebuild)\b/i;

  // Sport-specific catalyst keywords — stronger adjSq nudge when matched
  const SPORT_CATALYSTS = {
    nfl: {
      positive: /\b(elite qb|franchise qb|coaching upgrade|new coach|coordinator promoted|cap space|draft capital|offensive line|top pick|qb upgrade)\b/i,
      negative: /\b(cap hell|coaching carousel|fired mid-season|interim|aging roster|turnover prone|qb controversy|key departure|torn acl|out for season)\b/i,
    },
    nba: {
      positive: /\b(trade acquisition|blockbuster trade|chemistry|young core|all-star|mvp candidate|playoff experience|deep bench|superteam)\b/i,
      negative: /\b(aging core|tanking|chemistry issues|trade demand|key loss|max contract|luxury tax|load management|injury prone)\b/i,
    },
    nhl: {
      positive: /\b(elite goalie|gsax|vezina|depth scoring|power play|strong defense|cup contender|deadline acquisition)\b/i,
      negative: /\b(goalie crisis|cap crunch|aging core|defensive issues|penalty kill|rebuild|key departure|injury prone)\b/i,
    },
    mlb: {
      positive: /\b(stuff\+|bullpen depth|pitching\+|rotation depth|lineup stacked|farm system|deadline acquisition|cy young)\b/i,
      negative: /\b(aging rotation|bullpen issues|payroll cut|rebuild|prospect bust|injury prone|declining|regression)\b/i,
    },
    tennis_m: {
      positive: /\b(surface specialist|clay king|grass expert|hard court|hot streak|peak form|dominant serve|fitness)\b/i,
      negative: /\b(declining|injury prone|aging|fitness concerns|slump|surface weakness|mental fragility)\b/i,
    },
    tennis_w: {
      positive: /\b(surface specialist|clay queen|grass expert|hard court|hot streak|peak form|dominant serve|consistency)\b/i,
      negative: /\b(declining|injury prone|aging|fitness concerns|slump|surface weakness|inconsistent)\b/i,
    },
    f1: {
      positive: /\b(new regulations|wind tunnel|budget advantage|constructor upgrade|engine upgrade|aero package|race pace)\b/i,
      negative: /\b(budget cap penalty|reliability issues|engine penalty|aero deficit|team orders|number two driver)\b/i,
    },
    indycar: {
      positive: /\b(team upgrade|equipment advantage|oval specialist|road course|race pace|championship pedigree)\b/i,
      negative: /\b(equipment downgrade|team change|reliability|oval weakness|road course weakness)\b/i,
    },
    pga: {
      positive: /\b(sg:ttg|strokes gained|course history|driving accuracy|putting hot|iron play|major contender)\b/i,
      negative: /\b(missed cut|putting woes|driving issues|course fit poor|form slump|injury)\b/i,
    },
  };

  // Movement catalysts — traded/acquired/departed trigger stronger adjustments
  const MOVEMENT_CATALYSTS = /\b(traded|acquired|departed|signed|free agent|blockbuster trade|key loss|out for season|torn acl|season-ending|waived|released|called up)\b/i;

  for (const file of subjectiveFiles) {
    if (isProcessed(file)) continue;

    const data = readJson(join(subjectiveDir, file));
    if (!data || !data.data) continue;

    let sportId = CATEGORY_TO_SPORT[data.category];
    if (!sportId) continue;

    for (const entry of data.data) {
      if (entry.type !== 'subjective') continue;

      const sentiment = (entry.sentiment || 'neutral').toLowerCase();
      const value = entry.value || '';
      const key = entry.key || '';

      // Extract entity name from key (e.g., "Seahawks Outlook" → "Seahawks")
      const entityName = key
        .replace(/\b(outlook|breakout|sleeper|fade|curse|risk|volatility|debut|effect|defense|advantage|pacesetter|longevity|value)\b/gi, '')
        .trim();

      const isTennis = sportId === '_tennis';
      const resolvedSportIds = isTennis ? ['tennis_m', 'tennis_w'] : [sportId];

      for (const sid of resolvedSportIds) {
        let finalSportId = sid;
        if (isTennis) {
          finalSportId = classifyTennisGender(entityName);
          if (finalSportId !== sid) continue; // skip mismatched gender
        }

        const matchedName = findRosterMatch(entityName, finalSportId, rosters);
        const entryId = `${finalSportId}-${slugify(matchedName)}`;

        const signal = {
          sport: finalSportId,
          name: matchedName,
          entryId,
          value,
          sentiment,
          key,
        };

        if (sentiment === 'positive') {
          positiveSignals.push(signal);
        } else if (sentiment === 'negative') {
          negativeSignals.push(signal);
        } else {
          neutralSignals.push(signal);
        }

        // Update social scores
        if (socialScores[entryId]) {
          const ss = socialScores[entryId];

          // Append to expertComments (avoid duplicates)
          if (!ss.expertComments) ss.expertComments = [];
          if (!ss.expertComments.includes(value)) {
            ss.expertComments.push(value);
          }

          // Adjust pos/neg counts
          if (sentiment === 'positive') {
            ss.pos = (ss.pos || 0) + 1;
          } else if (sentiment === 'negative') {
            ss.neg = (ss.neg || 0) + 1;
          }

          // Apply adjSq nudges based on catalyst strength
          if (ss.adjSq != null) {
            const sportCatalysts = SPORT_CATALYSTS[finalSportId];
            const isMovement = MOVEMENT_CATALYSTS.test(value);

            if (sentiment === 'positive') {
              const isSportSpecific = sportCatalysts && sportCatalysts.positive.test(value);
              const isGeneric = POSITIVE_CATALYSTS.test(value);
              // Sport-specific or movement: ±0.04, generic: ±0.02
              const nudge = (isSportSpecific || isMovement) ? 0.04 : (isGeneric ? 0.02 : 0);
              ss.adjSq = Math.min(ss.adjSq + nudge, 1.50);
            } else if (sentiment === 'negative') {
              const isSportSpecific = sportCatalysts && sportCatalysts.negative.test(value);
              const isGeneric = NEGATIVE_CATALYSTS.test(value);
              const nudge = (isSportSpecific || isMovement) ? 0.04 : (isGeneric ? 0.02 : 0);
              ss.adjSq = Math.max(ss.adjSq - nudge, 0.70);
            }
          }

          // Parse expertComments for calculator-ready notes keywords
          if (ss.expertComments && ss.expertComments.length > 0) {
            const allComments = ss.expertComments.join(' ').toLowerCase();
            const noteKeywords = [];
            const sportCatalysts = SPORT_CATALYSTS[finalSportId];
            if (sportCatalysts) {
              const posMatches = allComments.match(sportCatalysts.positive);
              const negMatches = allComments.match(sportCatalysts.negative);
              if (posMatches) noteKeywords.push(...posMatches);
              if (negMatches) noteKeywords.push(...negMatches);
            }
            const movMatches = allComments.match(MOVEMENT_CATALYSTS);
            if (movMatches) noteKeywords.push(...movMatches);
            if (noteKeywords.length > 0) {
              const existing = ss.sources?.expert?.notes || '';
              const unique = [...new Set(noteKeywords.map(k => k.toLowerCase()))];
              const combined = existing ? `${existing}, ${unique.join(', ')}` : unique.join(', ');
              if (!ss.sources) ss.sources = {};
              if (!ss.sources.expert) ss.sources.expert = {};
              ss.sources.expert.notes = combined;
            }
          }

          ss.lastUpdated = now;
        }
      }
    }

    markProcessed(file);
  }

  // Write updated social scores
  if (positiveSignals.length > 0 || negativeSignals.length > 0 || neutralSignals.length > 0) {
    writeJson(socialScoresPath, socialScores);
  }

  // ── Part 5: Print summary report ───────────────────────────────────────

  console.log('\n' + '='.repeat(60));
  console.log('=== SUBJECTIVE SIGNAL SUMMARY ===');
  console.log('='.repeat(60));

  if (positiveSignals.length > 0) {
    console.log('\n\x1b[32m=== POSITIVE SIGNALS ===\x1b[0m');
    // Deduplicate by entryId
    const seen = new Set();
    for (const s of positiveSignals) {
      const key = `${s.entryId}:${s.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  ${s.sport.toUpperCase()} - ${s.name}: "${s.value}" (${s.sentiment})`);
    }
  }

  if (negativeSignals.length > 0) {
    console.log('\n\x1b[31m=== NEGATIVE SIGNALS ===\x1b[0m');
    const seen = new Set();
    for (const s of negativeSignals) {
      const key = `${s.entryId}:${s.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  ${s.sport.toUpperCase()} - ${s.name}: "${s.value}" (${s.sentiment})`);
    }
  }

  if (neutralSignals.length > 0) {
    console.log('\n\x1b[33m=== NEUTRAL / CONTEXT ===\x1b[0m');
    const seen = new Set();
    for (const s of neutralSignals) {
      const key = `${s.entryId}:${s.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`  ${s.sport.toUpperCase()} - ${s.name}: "${s.value}" (${s.sentiment})`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${positiveSignals.length} positive, ${negativeSignals.length} negative, ${neutralSignals.length} neutral`);
  if (DRY_RUN) console.log('\n[DRY RUN] No files were written.');
  console.log('Done.');
}

// ── Helper: recalculate consensus/best for a live entry ────────────────────

function recalculateEntry(entry) {
  const sources = Object.entries(entry.oddsBySource);
  if (sources.length === 0) return;

  let bestProb = 1;
  let bestSrc = null;
  let bestVal = null;
  let sumProb = 0;
  let count = 0;

  for (const [src, odds] of sources) {
    const prob = americanToImpliedProbability(odds);
    if (prob > 0) {
      sumProb += prob;
      count++;
      if (prob < bestProb) {
        bestProb = prob;
        bestSrc = src;
        bestVal = odds;
      }
    }
  }

  if (bestSrc) {
    entry.bestOdds = bestVal;
    entry.bestOddsSource = bestSrc;
    entry.impliedProbability = Math.round(bestProb * 10000) / 10000;
  }

  if (count > 0) {
    const avgProb = sumProb / count;
    const consensusNum = probabilityToAmerican(avgProb);
    entry.consensusOdds = formatAmerican(consensusNum);
  }
}

main();
