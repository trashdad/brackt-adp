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

function runBacktest() {
  const socialScoresPath = path.join(process.cwd(), 'public/data/social-scores.json');
  const socialData = JSON.parse(fs.readFileSync(socialScoresPath, 'utf-8'));

  const backtestResults = CANDIDATES.map(candidate => {
    const sData = socialData[candidate.id];
    if (!sData) return null;

    const sq = sData.socialQuotient || 1.0;
    
    let openingOdds = null;
    if (sData.sources?.expert?.notes) {
      const match = sData.sources.expert.notes.match(/(\+[0-9]+|\-[0-9]+|[0-9]+\/[0-9]+)/);
      if (match) {
        if (match[1].includes('/')) {
            const [num, den] = match[1].split('/');
            const prob = parseInt(den) / (parseInt(num) + parseInt(den));
            const amOdds = prob < 0.5 ? Math.round((1 - prob) / prob * 100) : Math.round(-100 * prob / (1 - prob));
            openingOdds = amOdds > 0 ? `+${amOdds}` : `${amOdds}`;
        } else {
            openingOdds = match[1];
        }
      }
    }

    let liveOdds = "+5000";
    const liveFile = path.join(process.cwd(), `public/data/live/${candidate.sport}.json`);
    if (fs.existsSync(liveFile)) {
      const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
      const normalizedName = candidate.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      const entry = liveData.entries.find(e => e.nameNormalized.includes(normalizedName) || normalizedName.includes(e.nameNormalized));
      if (entry && entry.bestOdds) liveOdds = entry.bestOdds;
    }

    if (!openingOdds) return null;

    const startProb = impliedProb(openingOdds);
    const endProb = impliedProb(liveOdds);
    const appreciation = ((endProb - startProb) / (startProb || 0.001)) * 100;

    return {
      name: candidate.name,
      sq: parseFloat(sq.toFixed(2)),
      opening: openingOdds,
      live: liveOdds,
      appreciation: parseFloat(appreciation.toFixed(2))
    };
  }).filter(Boolean);

  const highSQ = backtestResults.filter(r => r.sq >= 1.12);
  const midSQ = backtestResults.filter(r => r.sq >= 1.08 && r.sq < 1.12);
  const lowSQ = backtestResults.filter(r => r.sq < 1.08);

  const avgAppHigh = highSQ.length ? highSQ.reduce((a, b) => a + b.appreciation, 0) / highSQ.length : 0;
  const avgAppMid = midSQ.length ? midSQ.reduce((a, b) => a + b.appreciation, 0) / midSQ.length : 0;
  const avgAppLow = lowSQ.length ? lowSQ.reduce((a, b) => a + b.appreciation, 0) / lowSQ.length : 0;

  console.log("--- BACKTEST: SOCIAL QUOTIENT VS ODDS APPRECIATION ---");
  console.log(`High SQ (>=1.12): Count=${highSQ.length}, Avg Odds Movement: ${avgAppHigh.toFixed(2)}%`);
  console.log(`Mid SQ (1.08-1.12): Count=${midSQ.length}, Avg Odds Movement: ${avgAppMid.toFixed(2)}%`);
  console.log(`Low SQ (<1.08): Count=${lowSQ.length}, Avg Odds Movement: ${avgAppLow.toFixed(2)}%`);
  
  console.log("\n--- Top Outperformers (High SQ + Shortened Odds) ---");
  console.table(highSQ.filter(r => r.appreciation > 0).slice(0, 5));
}

runBacktest();
