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

function runCLVBacktest() {
  const results = [];
  
  for (const candidate of CANDIDATES) {
    const historicalFile = path.join(process.cwd(), `public/data/historical/${candidate.sport}.json`);
    if (!fs.existsSync(historicalFile)) continue;
    
    const hData = JSON.parse(fs.readFileSync(historicalFile, 'utf-8'));
    const normalizedName = candidate.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const entry = hData.entries?.find(e => {
        const n = (e.nameNormalized || e.name).toLowerCase().replace(/[^a-zA-Z]/g, '');
        return n.includes(normalizedName) || normalizedName.includes(n);
    });

    if (entry && entry.history && entry.history.length > 1) {
      const opening = entry.history[0].odds;
      const closing = entry.history[entry.history.length - 1].odds;
      
      const pOpen = impliedProb(opening);
      const pClose = impliedProb(closing);
      
      const clv = pClose - pOpen;
      
      const liveFile = path.join(process.cwd(), `public/data/live/${candidate.sport}.json`);
      let liveOdds = closing;
      if (fs.existsSync(liveFile)) {
         const lData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
         const lEntry = lData.entries?.find(e => {
            const n = (e.nameNormalized || e.name).toLowerCase().replace(/[^a-zA-Z]/g, '');
            return n.includes(normalizedName) || normalizedName.includes(n);
         });
         if (lEntry) liveOdds = lEntry.bestOdds;
      }
      const pLive = impliedProb(liveOdds);
      const continuation = pLive - pClose;

      results.push({
        name: candidate.name,
        sport: candidate.sport,
        clv: parseFloat((clv * 100).toFixed(2)),
        continuation: parseFloat((continuation * 100).toFixed(2))
      });
    }
  }

  const positiveCLV = results.filter(r => r.clv > 0);
  const negativeCLV = results.filter(r => r.clv < 0);
  const flatCLV = results.filter(r => r.clv === 0);

  console.log("--- BACKTEST: CLOSING LINE VALUE (CLV) MOMENTUM ---");
  console.log(`Positive Initial CLV: Count=${positiveCLV.length}, Avg Follow-on Momentum: ${(positiveCLV.reduce((a,b)=>a+b.continuation,0)/(positiveCLV.length||1)).toFixed(2)}%`);
  console.log(`Negative Initial CLV: Count=${negativeCLV.length}, Avg Follow-on Momentum: ${(negativeCLV.reduce((a,b)=>a+b.continuation,0)/(negativeCLV.length||1)).toFixed(2)}%`);
  console.log(`Flat Initial CLV: Count=${flatCLV.length}, Avg Follow-on Momentum: ${(flatCLV.reduce((a,b)=>a+b.continuation,0)/(flatCLV.length||1)).toFixed(2)}%`);

  console.log("\n--- Top CLV Momentum Targets ---");
  console.table(results.sort((a,b) => b.clv - a.clv).slice(0, 5));
}

runCLVBacktest();
