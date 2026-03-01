/**
 * Backtest Historical DPS System
 *
 * Validates the DPS calculation pipeline against 2021-2025 championship results.
 * Uses pre-season odds (web-researched) to compute DPS ranks and checks where
 * the actual winner ended up in our rankings.
 *
 * Usage:
 *   node scripts/backtest-historical.js
 *   node scripts/backtest-historical.js --verbose
 */

import { americanToImpliedProbability } from '../src/services/oddsConverter.js';
import { calculateSeasonTotalEV, applyPositionalScarcity } from '../src/services/evCalculator.js';
import SPORTS from '../src/data/sports.js';

const VERBOSE = process.argv.includes('--verbose');

// ─── Historical pre-season odds and actual results (2021-2025) ─────────────
// Odds are approximate consensus pre-season American odds from major sportsbooks.
// Sources: ESPN, Action Network, DraftKings historical lines, Vegas Insider archives.

const HISTORICAL_DATA = {
  nfl: [
    {
      season: '2021', winner: 'Los Angeles Rams',
      preSeasonOdds: [
        { name: 'Kansas City Chiefs', odds: '+500' },
        { name: 'Tampa Bay Buccaneers', odds: '+600' },
        { name: 'Buffalo Bills', odds: '+800' },
        { name: 'Green Bay Packers', odds: '+1000' },
        { name: 'San Francisco 49ers', odds: '+1200' },
        { name: 'Los Angeles Rams', odds: '+1400' },
        { name: 'Baltimore Ravens', odds: '+1600' },
        { name: 'Cleveland Browns', odds: '+2000' },
        { name: 'Seattle Seahawks', odds: '+2500' },
        { name: 'Tennessee Titans', odds: '+3000' },
        { name: 'Dallas Cowboys', odds: '+2500' },
        { name: 'New England Patriots', odds: '+3500' },
        { name: 'Los Angeles Chargers', odds: '+3000' },
        { name: 'Indianapolis Colts', odds: '+3000' },
        { name: 'Pittsburgh Steelers', odds: '+3500' },
      ],
    },
    {
      season: '2022', winner: 'Kansas City Chiefs',
      preSeasonOdds: [
        { name: 'Buffalo Bills', odds: '+600' },
        { name: 'Kansas City Chiefs', odds: '+750' },
        { name: 'Tampa Bay Buccaneers', odds: '+800' },
        { name: 'Los Angeles Rams', odds: '+1000' },
        { name: 'Green Bay Packers', odds: '+1000' },
        { name: 'Denver Broncos', odds: '+1400' },
        { name: 'San Francisco 49ers', odds: '+1400' },
        { name: 'Los Angeles Chargers', odds: '+1600' },
        { name: 'Cincinnati Bengals', odds: '+1600' },
        { name: 'Baltimore Ravens', odds: '+1800' },
        { name: 'Dallas Cowboys', odds: '+2000' },
        { name: 'Philadelphia Eagles', odds: '+2500' },
        { name: 'Cleveland Browns', odds: '+2500' },
        { name: 'Indianapolis Colts', odds: '+2800' },
        { name: 'Miami Dolphins', odds: '+3500' },
      ],
    },
    {
      season: '2023', winner: 'Kansas City Chiefs',
      preSeasonOdds: [
        { name: 'Kansas City Chiefs', odds: '+550' },
        { name: 'Philadelphia Eagles', odds: '+650' },
        { name: 'Buffalo Bills', odds: '+800' },
        { name: 'San Francisco 49ers', odds: '+800' },
        { name: 'Cincinnati Bengals', odds: '+1000' },
        { name: 'Dallas Cowboys', odds: '+1200' },
        { name: 'Miami Dolphins', odds: '+1400' },
        { name: 'Detroit Lions', odds: '+2000' },
        { name: 'Jacksonville Jaguars', odds: '+2500' },
        { name: 'New York Jets', odds: '+1600' },
        { name: 'Baltimore Ravens', odds: '+2000' },
        { name: 'Cleveland Browns', odds: '+3000' },
        { name: 'Green Bay Packers', odds: '+3500' },
        { name: 'Los Angeles Chargers', odds: '+2500' },
        { name: 'Denver Broncos', odds: '+5000' },
      ],
    },
    {
      season: '2024', winner: 'Philadelphia Eagles',
      preSeasonOdds: [
        { name: 'Kansas City Chiefs', odds: '+500' },
        { name: 'San Francisco 49ers', odds: '+600' },
        { name: 'Detroit Lions', odds: '+800' },
        { name: 'Baltimore Ravens', odds: '+1000' },
        { name: 'Philadelphia Eagles', odds: '+1200' },
        { name: 'Buffalo Bills', odds: '+1200' },
        { name: 'Cincinnati Bengals', odds: '+1400' },
        { name: 'Green Bay Packers', odds: '+1600' },
        { name: 'Houston Texans', odds: '+1800' },
        { name: 'Dallas Cowboys', odds: '+2000' },
        { name: 'New York Jets', odds: '+2000' },
        { name: 'Miami Dolphins', odds: '+2500' },
        { name: 'Cleveland Browns', odds: '+3000' },
        { name: 'Los Angeles Rams', odds: '+3000' },
        { name: 'Jacksonville Jaguars', odds: '+3500' },
      ],
    },
  ],
  nba: [
    {
      season: '2021', winner: 'Milwaukee Bucks',
      preSeasonOdds: [
        { name: 'Brooklyn Nets', odds: '+250' },
        { name: 'LA Lakers', odds: '+400' },
        { name: 'Milwaukee Bucks', odds: '+700' },
        { name: 'LA Clippers', odds: '+600' },
        { name: 'Golden State Warriors', odds: '+1400' },
        { name: 'Philadelphia 76ers', odds: '+1200' },
        { name: 'Phoenix Suns', odds: '+2000' },
        { name: 'Miami Heat', odds: '+1800' },
        { name: 'Denver Nuggets', odds: '+2000' },
        { name: 'Utah Jazz', odds: '+2500' },
        { name: 'Boston Celtics', odds: '+3000' },
        { name: 'Dallas Mavericks', odds: '+3500' },
      ],
    },
    {
      season: '2022', winner: 'Golden State Warriors',
      preSeasonOdds: [
        { name: 'Brooklyn Nets', odds: '+300' },
        { name: 'LA Lakers', odds: '+450' },
        { name: 'Milwaukee Bucks', odds: '+600' },
        { name: 'Golden State Warriors', odds: '+1000' },
        { name: 'Phoenix Suns', odds: '+1200' },
        { name: 'Utah Jazz', odds: '+1400' },
        { name: 'Miami Heat', odds: '+1800' },
        { name: 'Philadelphia 76ers', odds: '+1800' },
        { name: 'Chicago Bulls', odds: '+2500' },
        { name: 'Denver Nuggets', odds: '+2000' },
        { name: 'Boston Celtics', odds: '+2500' },
        { name: 'Dallas Mavericks', odds: '+4000' },
      ],
    },
    {
      season: '2023', winner: 'Denver Nuggets',
      preSeasonOdds: [
        { name: 'Boston Celtics', odds: '+450' },
        { name: 'Milwaukee Bucks', odds: '+550' },
        { name: 'Golden State Warriors', odds: '+700' },
        { name: 'LA Clippers', odds: '+800' },
        { name: 'Phoenix Suns', odds: '+1000' },
        { name: 'Philadelphia 76ers', odds: '+1200' },
        { name: 'Denver Nuggets', odds: '+1000' },
        { name: 'Memphis Grizzlies', odds: '+1400' },
        { name: 'Miami Heat', odds: '+2000' },
        { name: 'Dallas Mavericks', odds: '+2500' },
        { name: 'Cleveland Cavaliers', odds: '+3000' },
        { name: 'Brooklyn Nets', odds: '+2000' },
      ],
    },
    {
      season: '2024', winner: 'Boston Celtics',
      preSeasonOdds: [
        { name: 'Boston Celtics', odds: '+350' },
        { name: 'Denver Nuggets', odds: '+500' },
        { name: 'Milwaukee Bucks', odds: '+700' },
        { name: 'Phoenix Suns', odds: '+900' },
        { name: 'Philadelphia 76ers', odds: '+1000' },
        { name: 'Golden State Warriors', odds: '+1400' },
        { name: 'Oklahoma City Thunder', odds: '+1400' },
        { name: 'LA Lakers', odds: '+1600' },
        { name: 'Dallas Mavericks', odds: '+2000' },
        { name: 'Minnesota Timberwolves', odds: '+2000' },
        { name: 'Miami Heat', odds: '+2500' },
        { name: 'New York Knicks', odds: '+2500' },
      ],
    },
  ],
  nhl: [
    {
      season: '2021', winner: 'Tampa Bay Lightning',
      preSeasonOdds: [
        { name: 'Tampa Bay Lightning', odds: '+600' },
        { name: 'Colorado Avalanche', odds: '+700' },
        { name: 'Vegas Golden Knights', odds: '+800' },
        { name: 'Toronto Maple Leafs', odds: '+1000' },
        { name: 'Boston Bruins', odds: '+1200' },
        { name: 'Carolina Hurricanes', odds: '+1400' },
        { name: 'New York Islanders', odds: '+2000' },
        { name: 'Washington Capitals', odds: '+2000' },
        { name: 'Minnesota Wild', odds: '+2500' },
        { name: 'Edmonton Oilers', odds: '+2000' },
        { name: 'Pittsburgh Penguins', odds: '+2500' },
        { name: 'Montreal Canadiens', odds: '+5000' },
      ],
    },
    {
      season: '2022', winner: 'Colorado Avalanche',
      preSeasonOdds: [
        { name: 'Colorado Avalanche', odds: '+500' },
        { name: 'Tampa Bay Lightning', odds: '+700' },
        { name: 'Vegas Golden Knights', odds: '+900' },
        { name: 'Toronto Maple Leafs', odds: '+1000' },
        { name: 'Carolina Hurricanes', odds: '+1200' },
        { name: 'Florida Panthers', odds: '+1400' },
        { name: 'Edmonton Oilers', odds: '+1800' },
        { name: 'Boston Bruins', odds: '+1600' },
        { name: 'New York Rangers', odds: '+2000' },
        { name: 'Minnesota Wild', odds: '+2000' },
        { name: 'Calgary Flames', odds: '+2500' },
        { name: 'Pittsburgh Penguins', odds: '+2500' },
      ],
    },
    {
      season: '2023', winner: 'Vegas Golden Knights',
      preSeasonOdds: [
        { name: 'Colorado Avalanche', odds: '+600' },
        { name: 'Tampa Bay Lightning', odds: '+800' },
        { name: 'Carolina Hurricanes', odds: '+900' },
        { name: 'Toronto Maple Leafs', odds: '+1000' },
        { name: 'Edmonton Oilers', odds: '+1000' },
        { name: 'New York Rangers', odds: '+1200' },
        { name: 'Calgary Flames', odds: '+1400' },
        { name: 'Vegas Golden Knights', odds: '+1400' },
        { name: 'Boston Bruins', odds: '+1600' },
        { name: 'Florida Panthers', odds: '+2000' },
        { name: 'Dallas Stars', odds: '+2000' },
        { name: 'Minnesota Wild', odds: '+2500' },
      ],
    },
    {
      season: '2024', winner: 'Florida Panthers',
      preSeasonOdds: [
        { name: 'Edmonton Oilers', odds: '+700' },
        { name: 'Carolina Hurricanes', odds: '+800' },
        { name: 'Colorado Avalanche', odds: '+900' },
        { name: 'Dallas Stars', odds: '+1000' },
        { name: 'Vegas Golden Knights', odds: '+1000' },
        { name: 'Toronto Maple Leafs', odds: '+1200' },
        { name: 'New York Rangers', odds: '+1200' },
        { name: 'Florida Panthers', odds: '+1400' },
        { name: 'Boston Bruins', odds: '+1600' },
        { name: 'Vancouver Canucks', odds: '+2000' },
        { name: 'Winnipeg Jets', odds: '+2500' },
        { name: 'Nashville Predators', odds: '+3000' },
      ],
    },
  ],
  mlb: [
    {
      season: '2021', winner: 'Atlanta Braves',
      preSeasonOdds: [
        { name: 'Los Angeles Dodgers', odds: '+350' },
        { name: 'New York Yankees', odds: '+700' },
        { name: 'San Diego Padres', odds: '+900' },
        { name: 'Chicago White Sox', odds: '+1000' },
        { name: 'New York Mets', odds: '+1200' },
        { name: 'Atlanta Braves', odds: '+1400' },
        { name: 'Tampa Bay Rays', odds: '+1600' },
        { name: 'Minnesota Twins', odds: '+2000' },
        { name: 'Toronto Blue Jays', odds: '+2000' },
        { name: 'Houston Astros', odds: '+1600' },
        { name: 'Boston Red Sox', odds: '+2500' },
        { name: 'Oakland Athletics', odds: '+3000' },
      ],
    },
    {
      season: '2022', winner: 'Houston Astros',
      preSeasonOdds: [
        { name: 'Los Angeles Dodgers', odds: '+400' },
        { name: 'Houston Astros', odds: '+750' },
        { name: 'Toronto Blue Jays', odds: '+900' },
        { name: 'New York Yankees', odds: '+1000' },
        { name: 'New York Mets', odds: '+1000' },
        { name: 'Chicago White Sox', odds: '+1200' },
        { name: 'Milwaukee Brewers', odds: '+1600' },
        { name: 'Tampa Bay Rays', odds: '+1800' },
        { name: 'Atlanta Braves', odds: '+1400' },
        { name: 'San Diego Padres', odds: '+1600' },
        { name: 'Boston Red Sox', odds: '+2000' },
        { name: 'San Francisco Giants', odds: '+2500' },
      ],
    },
    {
      season: '2023', winner: 'Texas Rangers',
      preSeasonOdds: [
        { name: 'Houston Astros', odds: '+500' },
        { name: 'Los Angeles Dodgers', odds: '+600' },
        { name: 'Atlanta Braves', odds: '+650' },
        { name: 'New York Yankees', odds: '+900' },
        { name: 'New York Mets', odds: '+1000' },
        { name: 'San Diego Padres', odds: '+1000' },
        { name: 'Philadelphia Phillies', odds: '+1200' },
        { name: 'Toronto Blue Jays', odds: '+1400' },
        { name: 'Tampa Bay Rays', odds: '+1600' },
        { name: 'Seattle Mariners', odds: '+2000' },
        { name: 'Cleveland Guardians', odds: '+2500' },
        { name: 'Texas Rangers', odds: '+2000' },
      ],
    },
    {
      season: '2024', winner: 'Los Angeles Dodgers',
      preSeasonOdds: [
        { name: 'Los Angeles Dodgers', odds: '+350' },
        { name: 'Atlanta Braves', odds: '+600' },
        { name: 'Houston Astros', odds: '+800' },
        { name: 'Philadelphia Phillies', odds: '+900' },
        { name: 'Baltimore Orioles', odds: '+1000' },
        { name: 'Texas Rangers', odds: '+1200' },
        { name: 'New York Yankees', odds: '+1400' },
        { name: 'Minnesota Twins', odds: '+2000' },
        { name: 'Tampa Bay Rays', odds: '+2000' },
        { name: 'San Diego Padres', odds: '+1800' },
        { name: 'Cleveland Guardians', odds: '+2500' },
        { name: 'Milwaukee Brewers', odds: '+2500' },
      ],
    },
  ],
  f1: [
    {
      season: '2021', winner: 'Max Verstappen',
      preSeasonOdds: [
        { name: 'Lewis Hamilton', odds: '-150' },
        { name: 'Max Verstappen', odds: '+200' },
        { name: 'Valtteri Bottas', odds: '+1400' },
        { name: 'Lando Norris', odds: '+3000' },
        { name: 'Charles Leclerc', odds: '+3500' },
        { name: 'Daniel Ricciardo', odds: '+4000' },
        { name: 'Carlos Sainz', odds: '+5000' },
        { name: 'Sergio Perez', odds: '+6000' },
        { name: 'Pierre Gasly', odds: '+8000' },
        { name: 'Sebastian Vettel', odds: '+10000' },
      ],
    },
    {
      season: '2022', winner: 'Max Verstappen',
      preSeasonOdds: [
        { name: 'Lewis Hamilton', odds: '+150' },
        { name: 'Max Verstappen', odds: '+175' },
        { name: 'Charles Leclerc', odds: '+800' },
        { name: 'Lando Norris', odds: '+2000' },
        { name: 'Carlos Sainz', odds: '+2000' },
        { name: 'George Russell', odds: '+2500' },
        { name: 'Sergio Perez', odds: '+3000' },
        { name: 'Daniel Ricciardo', odds: '+5000' },
        { name: 'Pierre Gasly', odds: '+8000' },
        { name: 'Fernando Alonso', odds: '+10000' },
      ],
    },
    {
      season: '2023', winner: 'Max Verstappen',
      preSeasonOdds: [
        { name: 'Max Verstappen', odds: '-175' },
        { name: 'Lewis Hamilton', odds: '+500' },
        { name: 'Charles Leclerc', odds: '+600' },
        { name: 'Carlos Sainz', odds: '+1400' },
        { name: 'Lando Norris', odds: '+1600' },
        { name: 'George Russell', odds: '+2000' },
        { name: 'Sergio Perez', odds: '+1200' },
        { name: 'Fernando Alonso', odds: '+2000' },
        { name: 'Pierre Gasly', odds: '+6000' },
        { name: 'Oscar Piastri', odds: '+5000' },
      ],
    },
    {
      season: '2024', winner: 'Max Verstappen',
      preSeasonOdds: [
        { name: 'Max Verstappen', odds: '-250' },
        { name: 'Charles Leclerc', odds: '+500' },
        { name: 'Lando Norris', odds: '+600' },
        { name: 'Lewis Hamilton', odds: '+1200' },
        { name: 'Carlos Sainz', odds: '+1400' },
        { name: 'George Russell', odds: '+2000' },
        { name: 'Oscar Piastri', odds: '+2000' },
        { name: 'Sergio Perez', odds: '+2500' },
        { name: 'Fernando Alonso', odds: '+3000' },
        { name: 'Pierre Gasly', odds: '+8000' },
      ],
    },
  ],
  ncaab: [
    {
      season: '2023', winner: 'UConn Huskies',
      preSeasonOdds: [
        { name: 'Houston Cougars', odds: '+600' },
        { name: 'Gonzaga Bulldogs', odds: '+700' },
        { name: 'Kansas Jayhawks', odds: '+1000' },
        { name: 'Duke Blue Devils', odds: '+1200' },
        { name: 'UConn Huskies', odds: '+1400' },
        { name: 'Alabama Crimson Tide', odds: '+1600' },
        { name: 'Purdue Boilermakers', odds: '+2000' },
        { name: 'Kentucky Wildcats', odds: '+2000' },
        { name: 'Texas Longhorns', odds: '+2500' },
        { name: 'UCLA Bruins', odds: '+2500' },
      ],
    },
    {
      season: '2024', winner: 'UConn Huskies',
      preSeasonOdds: [
        { name: 'UConn Huskies', odds: '+500' },
        { name: 'Duke Blue Devils', odds: '+700' },
        { name: 'Houston Cougars', odds: '+900' },
        { name: 'Purdue Boilermakers', odds: '+1000' },
        { name: 'Kansas Jayhawks', odds: '+1200' },
        { name: 'North Carolina Tar Heels', odds: '+1600' },
        { name: 'Gonzaga Bulldogs', odds: '+1800' },
        { name: 'Arizona Wildcats', odds: '+2000' },
        { name: 'Kentucky Wildcats', odds: '+2500' },
        { name: 'Tennessee Volunteers', odds: '+2500' },
      ],
    },
  ],
  ncaaf: [
    {
      season: '2023', winner: 'Michigan Wolverines',
      preSeasonOdds: [
        { name: 'Georgia Bulldogs', odds: '+250' },
        { name: 'Ohio State Buckeyes', odds: '+500' },
        { name: 'Alabama Crimson Tide', odds: '+600' },
        { name: 'Michigan Wolverines', odds: '+1000' },
        { name: 'USC Trojans', odds: '+1200' },
        { name: 'Texas Longhorns', odds: '+1400' },
        { name: 'Clemson Tigers', odds: '+2000' },
        { name: 'Penn State Nittany Lions', odds: '+2000' },
        { name: 'LSU Tigers', odds: '+2500' },
        { name: 'Florida State Seminoles', odds: '+2500' },
      ],
    },
    {
      season: '2024', winner: 'Ohio State Buckeyes',
      preSeasonOdds: [
        { name: 'Georgia Bulldogs', odds: '+300' },
        { name: 'Ohio State Buckeyes', odds: '+400' },
        { name: 'Texas Longhorns', odds: '+700' },
        { name: 'Oregon Ducks', odds: '+1000' },
        { name: 'Alabama Crimson Tide', odds: '+1200' },
        { name: 'Michigan Wolverines', odds: '+1600' },
        { name: 'Penn State Nittany Lions', odds: '+2000' },
        { name: 'Notre Dame Fighting Irish', odds: '+2500' },
        { name: 'Clemson Tigers', odds: '+2500' },
        { name: 'USC Trojans', odds: '+3000' },
      ],
    },
  ],
};

// ─── Run DPS Pipeline on Historical Odds ────────────────────────────────────

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function runDPSPipeline(entries, sportId) {
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const category = sportConfig?.category || 'standard';
  const eventsPerSeason = sportConfig?.eventsPerSeason || 1;

  // Step 1: Calculate EV for each entry
  const enriched = entries.map((e, idx) => {
    const ev = calculateSeasonTotalEV(e.odds, category, eventsPerSeason, sportId);
    return {
      id: `backtest-${sportId}-${idx}`,
      name: e.name,
      nameNormalized: normalize(e.name),
      sport: sportId,
      ev,
      adjSq: 1.0, // neutral for backtesting (no subjective data)
      notes: '',
      trapSignal: 'NEUTRAL',
      drafted: false,
    };
  });

  // Step 2: Apply positional scarcity (DPS calculation)
  applyPositionalScarcity(enriched, 1.0);

  // Step 3: Sort by DPS
  enriched.sort((a, b) => (b.adpScore || 0) - (a.adpScore || 0));

  return enriched;
}

// ─── Main Backtest Logic ────────────────────────────────────────────────────

function runBacktest() {
  console.log('='.repeat(70));
  console.log('  BRACKT ADP — HISTORICAL BACKTEST REPORT');
  console.log('  DPS Pipeline Validation Against 2021-2025 Championship Results');
  console.log('='.repeat(70));
  console.log();

  const sportResults = {};
  let totalSeasons = 0;
  let totalTop3 = 0;
  let totalTop5 = 0;
  let totalTop10 = 0;
  let totalBrier = 0;

  for (const [sportId, seasons] of Object.entries(HISTORICAL_DATA)) {
    const results = [];

    for (const season of seasons) {
      const ranked = runDPSPipeline(season.preSeasonOdds, sportId);

      // Find winner rank
      const winnerNorm = normalize(season.winner);
      const winnerIdx = ranked.findIndex(e => normalize(e.name) === winnerNorm);
      const winnerRank = winnerIdx === -1 ? ranked.length + 1 : winnerIdx + 1;
      const winnerDPS = winnerIdx !== -1 ? ranked[winnerIdx].adpScore : 0;

      // Brier score: (1 - p_winner)^2 where p_winner is the DPS-implied probability
      // Approximate p_winner from rank position
      const totalDPS = ranked.reduce((s, e) => s + (e.adpScore || 0), 0);
      const pWinner = totalDPS > 0 ? winnerDPS / totalDPS : 0;
      const brier = Math.pow(1 - pWinner, 2);

      results.push({
        season: season.season,
        winner: season.winner,
        winnerRank,
        winnerDPS,
        topDPS: ranked[0]?.adpScore || 0,
        topName: ranked[0]?.name || '?',
        brier,
        top5: ranked.slice(0, 5).map(e => `${e.name} (${e.adpScore})`),
      });

      totalSeasons++;
      if (winnerRank <= 3) totalTop3++;
      if (winnerRank <= 5) totalTop5++;
      if (winnerRank <= 10) totalTop10++;
      totalBrier += brier;
    }

    sportResults[sportId] = results;
  }

  // ── Print Results ─────────────────────────────────────────────────────────

  for (const [sportId, results] of Object.entries(sportResults)) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  ${sportId.toUpperCase()} — ${results.length} seasons`);
    console.log(`${'─'.repeat(70)}`);

    for (const r of results) {
      const rankLabel = r.winnerRank <= 3 ? '\x1b[32m✓\x1b[0m' : r.winnerRank <= 5 ? '\x1b[33m~\x1b[0m' : '\x1b[31m✗\x1b[0m';
      console.log(`  ${r.season}: ${rankLabel} ${r.winner} → DPS Rank #${r.winnerRank} (DPS: ${r.winnerDPS}, Top: ${r.topName} @ ${r.topDPS})`);

      if (VERBOSE) {
        console.log(`    Top 5 DPS: ${r.top5.join(', ')}`);
        console.log(`    Brier: ${r.brier.toFixed(4)}`);
      }
    }

    const sportTop3 = results.filter(r => r.winnerRank <= 3).length;
    const sportTop5 = results.filter(r => r.winnerRank <= 5).length;
    const avgRank = results.reduce((s, r) => s + r.winnerRank, 0) / results.length;
    const avgBrier = results.reduce((s, r) => s + r.brier, 0) / results.length;

    console.log(`\n  Hit rates: Top-3 ${sportTop3}/${results.length} (${(sportTop3/results.length*100).toFixed(0)}%) | Top-5 ${sportTop5}/${results.length} (${(sportTop5/results.length*100).toFixed(0)}%)`);
    console.log(`  Avg winner rank: ${avgRank.toFixed(1)} | Avg Brier: ${avgBrier.toFixed(4)}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'='.repeat(70)}`);
  console.log('  AGGREGATE RESULTS');
  console.log(`${'='.repeat(70)}`);
  console.log(`  Seasons analyzed: ${totalSeasons}`);
  console.log(`  Winner in Top-3:  ${totalTop3}/${totalSeasons} (${(totalTop3/totalSeasons*100).toFixed(1)}%)`);
  console.log(`  Winner in Top-5:  ${totalTop5}/${totalSeasons} (${(totalTop5/totalSeasons*100).toFixed(1)}%)`);
  console.log(`  Winner in Top-10: ${totalTop10}/${totalSeasons} (${(totalTop10/totalSeasons*100).toFixed(1)}%)`);
  console.log(`  Avg Brier Score:  ${(totalBrier/totalSeasons).toFixed(4)} (lower is better, 0 = perfect)`);
  console.log();

  // ── Calibration Notes ─────────────────────────────────────────────────────

  console.log(`${'─'.repeat(70)}`);
  console.log('  CALIBRATION NOTES');
  console.log(`${'─'.repeat(70)}`);
  console.log('  - NFL: Chiefs dominated 2022-2024 (3 SBs). Usually top-3 pre-season odds.');
  console.log('  - NBA: Mix of favorites (Celtics 2024) and mid-tier (Warriors 2022, Nuggets 2023).');
  console.log('  - NHL: High parity — Panthers 2024 and Knights 2023 were 7th-8th in pre-season.');
  console.log('  - F1: Verstappen won 4 straight (2021-2024). Always top-2 in odds.');
  console.log('  - MLB: Mix — Dodgers 2024 (favorite), Rangers 2023 (longshot), Braves 2021 (6th).');
  console.log('  - NCAAB: UConn won back-to-back (2023-2024). 5th then 1st in pre-season odds.');
  console.log('  - NCAAF: Michigan 2023 (4th in odds), Ohio State 2024 (2nd in odds).');
  console.log();
  console.log('  TARGET BENCHMARKS:');
  console.log('  - Top-3 hit rate > 50% → DPS successfully identifies contenders');
  console.log('  - Top-5 hit rate > 70% → DPS captures most plausible winners');
  console.log('  - Avg Brier < 0.80 → Better than random, meaningful signal');
  console.log();
}

runBacktest();
