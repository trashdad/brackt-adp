import fs from 'fs';
import path from 'path';

const CANDIDATES = [
  { name: 'Vegas Golden Knights', id: 'nhl-vegas-golden-knights', sport: 'nhl' },
  { name: 'Sydney Swans', id: 'afl-sydney-swans', sport: 'afl' },
  { name: 'Caribbean', id: 'llws-caribbean', sport: 'llws' },
  { name: 'Cleveland Cavaliers', id: 'nba-cleveland-cavaliers', sport: 'nba' },
  { name: 'Boston Celtics', id: 'nba-boston-celtics', sport: 'nba' },
  { name: 'Oregon', id: 'ncaaf-oregon-ducks', sport: 'ncaaf' },
  { name: 'US - Southeast', id: 'llws-usa-southeast', sport: 'llws' },
  { name: 'Chelsea', id: 'ucl-chelsea', sport: 'ucl' },
  { name: 'Edmonton Oilers', id: 'nhl-edmonton-oilers', sport: 'nhl' },
  { name: 'New York Knicks', id: 'nba-new-york-knicks', sport: 'nba' },
  { name: 'LSU (W)', id: 'ncaaw-lsu-tigers', sport: 'ncaaw' },
  { name: 'Georgia', id: 'ncaaf-georgia-bulldogs', sport: 'ncaaf' },
  { name: 'Latin America', id: 'llws-latin-america', sport: 'llws' },
  { name: 'US - Southwest', id: 'llws-usa-southwest', sport: 'llws' },
  { name: 'Western Bulldogs', id: 'afl-western-bulldogs', sport: 'afl' },
  { name: 'Fremantle Dockers', id: 'afl-fremantle-dockers', sport: 'afl' },
  { name: 'Seattle Mariners', id: 'mlb-seattle-mariners', sport: 'mlb' },
  { name: 'Baltimore Ravens', id: 'nfl-baltimore-ravens', sport: 'nfl' },
  { name: 'Buffalo Bills', id: 'nfl-buffalo-bills', sport: 'nfl' },
  { name: 'Iowa', id: 'ncaab-iowa-hawkeyes', sport: 'ncaab' },
  { name: 'Florida', id: 'ncaab-florida-gators', sport: 'ncaab' },
  { name: 'Will Power', id: 'indycar-will-power', sport: 'indycar' },
  { name: 'Bryson DeChambeau', id: 'pga-bryson-dechambeau', sport: 'pga' },
  { name: 'Amanda Anisimova', id: 'tennis_w-amanda-anisimova', sport: 'tennis_w' },
  { name: 'New York Mets', id: 'mlb-new-york-mets', sport: 'mlb' },
  { name: 'Mexico', id: 'llws-mexico', sport: 'llws' },
  { name: 'Toronto Blue Jays', id: 'mlb-toronto-blue-jays', sport: 'mlb' },
  { name: 'Collingwood Magpies', id: 'afl-collingwood-magpies', sport: 'afl' },
  { name: 'St Kilda Saints', id: 'afl-st-kilda-saints', sport: 'afl' },
  { name: 'Germany', id: 'fifa-germany', sport: 'fifa' },
  { name: 'Florida', id: 'ncaaf-florida-gators', sport: 'ncaaf' },
  { name: 'Green Bay Packers', id: 'nfl-green-bay-packers', sport: 'nfl' },
  { name: 'Ronnie O’Sullivan', id: 'snooker-ronnie-osullivan', sport: 'snooker' },
  { name: 'Boston Red Sox', id: 'mlb-boston-red-sox', sport: 'mlb' },
  { name: 'Philadelphia Phillies', id: 'mlb-philadelphia-phillies', sport: 'mlb' },
  { name: 'Houston Rockets', id: 'nba-houston-rockets', sport: 'nba' },
  { name: 'Los Angeles Chargers', id: 'nfl-los-angeles-chargers', sport: 'nfl' },
  { name: 'LSU', id: 'ncaaf-lsu-tigers', sport: 'ncaaf' },
  { name: 'Newcastle United', id: 'ucl-newcastle', sport: 'ucl' },
  { name: 'Philadelphia Eagles', id: 'nfl-philadelphia-eagles', sport: 'nfl' },
  { name: 'Minnesota Wild', id: 'nhl-minnesota-wild', sport: 'nhl' },
  { name: 'Atlanta Braves', id: 'mlb-atlanta-braves', sport: 'mlb' },
  { name: 'Fernando Alonso', id: 'f1-fernando-alonso', sport: 'f1' },
  { name: 'Panama', id: 'llws-panama', sport: 'llws' },
  { name: 'Dallas Stars', id: 'nhl-dallas-stars', sport: 'nhl' },
  { name: 'Detroit Lions', id: 'nfl-detroit-lions', sport: 'nfl' }
];

function impliedProb(americanOdds) {
  if (!americanOdds) return 0;
  let odds = americanOdds;
  if (typeof odds === 'string') {
    odds = parseInt(odds.replace('+', ''), 10);
  }
  if (odds > 0) return 100 / (odds + 100);
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 0;
}

function runAdvancedBacktests() {
  const socialScoresPath = path.join(process.cwd(), 'public/data/social-scores.json');
  const socialData = JSON.parse(fs.readFileSync(socialScoresPath, 'utf-8'));

  const coverageResults = [];

  for (const candidate of CANDIDATES) {
    const sData = socialData[candidate.id];
    if (!sData) continue;

    const coverage = sData.sources?.expert?.sourcesUsed || 0;
    const rank = sData.sources?.expert?.rank || 25;
    
    let liveOdds = "+5000";
    const liveFile = path.join(process.cwd(), `public/data/live/${candidate.sport}.json`);
    if (fs.existsSync(liveFile)) {
      const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
      const normalizedName = candidate.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      const entry = liveData.entries?.find(e => {
          const n = (e.nameNormalized || e.name).toLowerCase().replace(/[^a-zA-Z]/g, '');
          return n.includes(normalizedName) || normalizedName.includes(n);
      });
      if (entry && entry.bestOdds) liveOdds = entry.bestOdds;
    }

    let openingOdds = "+5000";
    if (sData.sources?.expert?.notes) {
      const match = sData.sources.expert.notes.match(/(\+[0-9]+|\-[0-9]+|[0-9]+\/[0-9]+)/);
      if (match) openingOdds = match[1];
    }

    const gain = impliedProb(liveOdds) - impliedProb(openingOdds);
    coverageResults.push({ name: candidate.name, coverage, rank, gain });
  }

  const highCoverage = coverageResults.filter(r => r.coverage >= 8);
  const lowCoverage = coverageResults.filter(r => r.coverage > 0 && r.coverage < 8);

  console.log("--- BACKTEST 4: EXPERT COVERAGE VS STABILITY ---");
  console.log(`High Coverage (8+ sites): Count=${highCoverage.length}, Avg Prob Gain: ${(highCoverage.reduce((a,b)=>a+b.gain,0)/(highCoverage.length||1)*100).toFixed(2)}%`);
  console.log(`Low Coverage (<8 sites): Count=${lowCoverage.length}, Avg Prob Gain: ${(lowCoverage.reduce((a,b)=>a+b.gain,0)/(lowCoverage.length||1)*100).toFixed(2)}%`);

  console.log("\n--- BACKTEST 5: MARKET CONSENSUS DIVERGENCE ---");
  const divergenceResults = CANDIDATES.map(c => {
      const liveFile = path.join(process.cwd(), `public/data/live/${c.sport}.json`);
      if (!fs.existsSync(liveFile)) return null;
      const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
      const normalizedName = c.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      const entry = liveData.entries?.find(e => {
          const n = (e.nameNormalized || e.name).toLowerCase().replace(/[^a-zA-Z]/g, '');
          return n.includes(normalizedName) || normalizedName.includes(n);
      });
      if (!entry || !entry.consensusOdds || !entry.bestOdds) return null;
      
      const div = impliedProb(entry.bestOdds) - impliedProb(entry.consensusOdds);
      return { name: c.name, divergence: div };
  }).filter(Boolean);

  const highDiv = divergenceResults.filter(r => r.divergence > 0.02);
  const lowDiv = divergenceResults.filter(r => r.divergence <= 0.02);

  console.log(`High Divergence (>2% spread): Count=${highDiv.length}, Predicted Volatility: HIGH`);
  console.log(`Low Divergence (<2% spread): Count=${lowDiv.length}, Predicted Volatility: LOW (Stable)`);
  
  console.table(divergenceResults.sort((a,b) => b.divergence - a.divergence).slice(0, 5));
}

runAdvancedBacktests();
