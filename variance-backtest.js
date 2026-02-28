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

function runVarianceBacktest() {
  const socialScoresPath = path.join(process.cwd(), 'public/data/social-scores.json');
  const socialData = JSON.parse(fs.readFileSync(socialScoresPath, 'utf-8'));

  // Define sports that are high-variance (tournaments/playoffs) vs low-variance (cumulative points)
  const HIGH_VAR_SPORTS = ['ncaab', 'ncaaw', 'ucl', 'nfl', 'mlb', 'nhl']; // Playoff elimination
  const LOW_VAR_SPORTS = ['f1', 'indycar', 'snooker', 'pga', 'nba', 'afl']; // Multi-event cumulative or long series
  const SHORT_TERM_DOMINANCE = ['llws', 'fifa']; // Intense short tournaments with historical heavyweights

  const results = CANDIDATES.map(candidate => {
    let openingOdds = "+5000";
    const sData = socialData[candidate.id];
    if (sData?.sources?.expert?.notes) {
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

    const liveFile = path.join(process.cwd(), `public/data/live/${candidate.sport}.json`);
    let liveOdds = openingOdds;
    if (fs.existsSync(liveFile)) {
      const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
      const normalizedName = candidate.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      const entry = liveData.entries?.find(e => {
          const n = (e.nameNormalized || e.name).toLowerCase().replace(/[^a-zA-Z]/g, '');
          return n.includes(normalizedName) || normalizedName.includes(n);
      });
      if (entry && entry.bestOdds) liveOdds = entry.bestOdds;
    }

    const probGain = impliedProb(liveOdds) - impliedProb(openingOdds);
    
    let varianceProfile = "Medium";
    if (HIGH_VAR_SPORTS.includes(candidate.sport)) varianceProfile = "High Variance (Playoffs)";
    if (LOW_VAR_SPORTS.includes(candidate.sport)) varianceProfile = "Low Variance (Cumulative)";
    if (SHORT_TERM_DOMINANCE.includes(candidate.sport)) varianceProfile = "Short-Term Heavyweight";

    return {
      name: candidate.name,
      sport: candidate.sport,
      profile: varianceProfile,
      oddsGain: parseFloat((probGain * 100).toFixed(2))
    };
  });

  const highVar = results.filter(r => r.profile === "High Variance (Playoffs)");
  const lowVar = results.filter(r => r.profile === "Low Variance (Cumulative)");
  const stHeavy = results.filter(r => r.profile === "Short-Term Heavyweight");

  console.log("--- BACKTEST: SPORT VARIANCE PROFILE VS OUTCOME STABILITY ---");
  console.log(`Low Variance (Cumulative): Count=${lowVar.length}, Avg Odds Stability Gain: ${(lowVar.reduce((a,b)=>a+b.oddsGain,0)/(lowVar.length||1)).toFixed(2)}%`);
  console.log(`Short-Term Heavyweight: Count=${stHeavy.length}, Avg Odds Stability Gain: ${(stHeavy.reduce((a,b)=>a+b.oddsGain,0)/(stHeavy.length||1)).toFixed(2)}%`);
  console.log(`High Variance (Playoffs): Count=${highVar.length}, Avg Odds Stability Gain: ${(highVar.reduce((a,b)=>a+b.oddsGain,0)/(highVar.length||1)).toFixed(2)}%`);
  
}

runVarianceBacktest();
