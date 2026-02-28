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

function runExpertBacktest() {
  const socialScoresPath = path.join(process.cwd(), 'public/data/social-scores.json');
  const socialData = JSON.parse(fs.readFileSync(socialScoresPath, 'utf-8'));

  const expertResults = CANDIDATES.map(candidate => {
    const sData = socialData[candidate.id];
    if (!sData || !sData.sources?.expert?.rank) return null;

    const expertRank = sData.sources.expert.rank;
    const liveFile = path.join(process.cwd(), `public/data/live/${candidate.sport}.json`);
    if (!fs.existsSync(liveFile)) return null;
    
    const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
    const sortedEntries = liveData.entries.sort((a, b) => impliedProb(b.bestOdds) - impliedProb(a.bestOdds));
    
    const normalizedCandidateName = candidate.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const marketIndex = sortedEntries.findIndex(e => {
        const n = (e.nameNormalized || e.name).toLowerCase().replace(/[^a-zA-Z]/g, '');
        return n.includes(normalizedCandidateName) || normalizedCandidateName.includes(n);
    });
    const marketRank = marketIndex + 1;

    if (marketRank === 0) return null;
    const rankDiff = marketRank - expertRank;

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

    const liveOdds = sortedEntries[marketIndex]?.bestOdds || "+5000";
    const appreciation = impliedProb(liveOdds) - impliedProb(openingOdds);

    return {
      name: candidate.name,
      expertRank,
      marketRank,
      rankDiff,
      appreciation
    };
  }).filter(Boolean);

  const expertBullish = expertResults.filter(r => r.rankDiff > 3);
  const expertNeutral = expertResults.filter(r => Math.abs(r.rankDiff) <= 3);
  const expertBearish = expertResults.filter(r => r.rankDiff < -3);

  console.log("--- BACKTEST: EXPERT RANK VS MARKET ODDS ALPHA ---");
  console.log(`Expert Bullish (ExpRank < MktRank): Count=${expertBullish.length}, Avg Prob Gain: ${(expertBullish.reduce((a, b) => a + b.appreciation, 0) / (expertBullish.length || 1) * 100).toFixed(2)}%`);
  console.log(`Expert Neutral: Count=${expertNeutral.length}, Avg Prob Gain: ${(expertNeutral.reduce((a, b) => a + b.appreciation, 0) / (expertNeutral.length || 1) * 100).toFixed(2)}%`);
  console.log(`Expert Bearish (ExpRank > MktRank): Count=${expertBearish.length}, Avg Prob Gain: ${(expertBearish.reduce((a, b) => a + b.appreciation, 0) / (expertBearish.length || 1) * 100).toFixed(2)}%`);

  console.log("\n--- Top 'Expert Alpha' Targets (Experts bullish, Market lagging) ---");
  console.table(expertBullish.sort((a, b) => b.rankDiff - a.rankDiff).slice(0, 5));
}

runExpertBacktest();
