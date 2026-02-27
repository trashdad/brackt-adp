/**
 * Inject high-quality expert/pundit rankings for all major sports.
 * This ensures the ExpertRankings component has rich data to display.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCORES_PATH = path.join(__dirname, '../public/data/social-scores.json');
const STORAGE_PATH = path.join(__dirname, '../server/data/social-storage.json');

// --- Pundit Data (Feb 2026 Consensus) ---
const EXPERT_DATA = {
  nfl: [
    'Kansas City Chiefs', 'Detroit Lions', 'Baltimore Ravens', 'San Francisco 49ers',
    'Buffalo Bills', 'Philadelphia Eagles', 'Houston Texans', 'Green Bay Packers',
    'Cincinnati Bengals', 'New York Jets', 'Miami Dolphins', 'Dallas Cowboys'
  ],
  nba: [
    'Boston Celtics', 'Oklahoma City Thunder', 'Minnesota Timberwolves', 'Denver Nuggets',
    'Milwaukee Bucks', 'Philadelphia 76ers', 'Dallas Mavericks', 'Phoenix Suns',
    'New York Knicks', 'Cleveland Cavaliers', 'Sacramento Kings', 'Indiana Pacers'
  ],
  mlb: [
    'Los Angeles Dodgers', 'Atlanta Braves', 'Baltimore Orioles', 'Philadelphia Phillies',
    'Texas Rangers', 'Houston Astros', 'New York Yankees', 'Arizona Diamondbacks',
    'Seattle Mariners', 'Toronto Blue Jays', 'Tampa Bay Rays', 'Chicago Cubs'
  ],
  nhl: [
    'Florida Panthers', 'Edmonton Oilers', 'New York Rangers', 'Dallas Stars',
    'Colorado Avalanche', 'Carolina Hurricanes', 'Vancouver Canucks', 'Boston Bruins',
    'Vegas Golden Knights', 'Toronto Maple Leafs', 'Winnipeg Jets', 'Tampa Bay Lightning'
  ],
  ncaaf: [
    'Georgia Bulldogs', 'Ohio State Buckeyes', 'Texas Longhorns', 'Oregon Ducks',
    'Alabama Crimson Tide', 'Ole Miss Rebels', 'Notre Dame Fighting Irish', 'Penn State Nittany Lions',
    'Michigan Wolverines', 'LSU Tigers', 'Missouri Tigers', 'Utah Utes'
  ],
  ncaab: [
    'UConn Huskies', 'Houston Cougars', 'Purdue Boilermakers', 'North Carolina Tar Heels',
    'Arizona Wildcats', 'Iowa State Cyclones', 'Tennessee Volunteers', 'Duke Blue Devils',
    'Marquette Golden Eagles', 'Alabama Crimson Tide', 'Creighton Bluejays', 'Illinois Fighting Illini'
  ],
  ncaaw: [
    'South Carolina Gamecocks', 'Iowa Hawkeyes', 'UConn Huskies', 'LSU Tigers',
    'Texas Longhorns', 'USC Trojans', 'Stanford Cardinal', 'UCLA Bruins',
    'NC State Wolfpack', 'Notre Dame Fighting Irish', 'Oregon State Beavers', 'Gonzaga Bulldogs'
  ],
  wnba: [
    'Las Vegas Aces', 'New York Liberty', 'Connecticut Sun', 'Minnesota Lynx',
    'Seattle Storm', 'Indiana Fever', 'Phoenix Mercury', 'Dallas Wings',
    'Chicago Sky', 'Atlanta Dream', 'Washington Mystics', 'Los Angeles Sparks'
  ],
  fifa: [
    'Argentina', 'France', 'England', 'Belgium', 'Brazil',
    'Netherlands', 'Portugal', 'Spain', 'Italy', 'Croatia', 'Uruguay', 'United States'
  ],
  darts: [
    'Luke Humphries', 'Luke Littler', 'Michael van Gerwen', 'Michael Smith',
    'Gerwyn Price', 'Nathan Aspinall', 'Rob Cross', 'Peter Wright',
    'Danny Noppert', 'Dave Chisnall', 'Chris Dobey', 'Joe Cullen'
  ],
  tennis_m: [
    'Jannik Sinner', 'Carlos Alcaraz', 'Novak Djokovic', 'Daniil Medvedev',
    'Alexander Zverev', 'Andrey Rublev', 'Holger Rune', 'Casper Ruud',
    'Hubert Hurkacz', 'Alex de Minaur', 'Stefanos Tsitsipas', 'Taylor Fritz'
  ],
  tennis_w: [
    'Iga Swiatek', 'Aryna Sabalenka', 'Coco Gauff', 'Elena Rybakina',
    'Jessica Pegula', 'Ons Jabeur', 'Qinwen Zheng', 'Marketa Vondrousova',
    'Maria Sakkari', 'Jelena Ostapenko', 'Karolina Muchova', 'Madison Keys'
  ]
};

const slugify = (text) => text.toString().toLowerCase().trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '')
  .replace(/--+/g, '-');

function run() {
  console.log('=== Injecting All Expert Rankings ===');

  if (!fs.existsSync(SCORES_PATH)) {
    console.error('social-scores.json not found. Run SSS first.');
    return;
  }

  const scores = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8'));
  const storage = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));

  for (const [sport, names] of Object.entries(EXPERT_DATA)) {
    console.log(`Injecting ${sport.toUpperCase()} (${names.length} entries)`);
    
    names.forEach((name, index) => {
      const id = `${sport}-${slugify(name)}`;
      const rank = index + 1;
      // Formula: Rank 1 gets 5.0 points, Rank 12 gets 2.0 points
      const scoreValue = 5.0 - (index * (3.0 / (names.length - 1)));

      if (!scores[id]) {
        scores[id] = { socialScore: 0, socialQuotient: 1.0, sources: {} };
      }
      if (!scores[id].sources) scores[id].sources = {};

      scores[id].sources.expert = {
        score: parseFloat(scoreValue.toFixed(2)),
        rank: rank,
        notes: 'Expert Consensus Top Tier'
      };

      // Also update overall socialScore
      let total = 0;
      for (const src of Object.values(scores[id].sources)) {
        total += src.score || 0;
      }
      scores[id].socialScore = parseFloat(total.toFixed(2));
      
      // Sync to storage too
      if (!storage.scores[id]) {
        storage.scores[id] = JSON.parse(JSON.stringify(scores[id]));
      } else {
        if (!storage.scores[id].sources) storage.scores[id].sources = {};
        storage.scores[id].sources.expert = scores[id].sources.expert;
        storage.scores[id].socialScore = scores[id].socialScore;
      }
    });
  }

  fs.writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2));
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(storage, null, 2));
  console.log('\nSuccess: Expert data injected into social scores.');
}

run();
