/**
 * WizardEV Recalculation + Backtest
 *
 * PART 1 — LIVE SNAPSHOT
 *   Runs computeIkynEV on current board data.
 *   Reports per-sport wizardEV totals, ikynEV totals, waEV totals,
 *   per-sport alpha, and top-5 rankings by wizardEV.
 *
 * PART 2 — HISTORICAL BACKTEST (2021–2024)
 *   Three-way comparison for each season's actual winner:
 *     • Market rank  — sort by vigless implied probability
 *     • DPS rank     — sort by adpScore (our current system)
 *     • WizardEV rank — sort by waEV (geometric transform, same model as live)
 *   Sports covered: NFL, NBA, NHL, MLB, F1 (fixed-field: ikyn model in prod)
 *                   NCAAB, NCAAF (variable-field: wa model in prod)
 *
 * Usage:
 *   node scripts/backtest-wizardev.js
 *   node scripts/backtest-wizardev.js --verbose
 */

import { readFileSync } from 'fs';
import SPORTS from '../src/data/sports.js';
import ROSTERS from '../src/data/rosters.js';
import { calculateSeasonTotalEV, applyPositionalScarcity } from '../src/services/evCalculator.js';
import { americanToImpliedProbability } from '../src/services/oddsConverter.js';
import { computeIkynEV, IKYN_SCORE_TABLE } from '../src/utils/ikynEV.js';

const VERBOSE = process.argv.includes('--verbose');
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify  = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

// ─── Pipeline (mirrors useOddsData + test-alpha) ─────────────────────────────

const manualOdds = JSON.parse(readFileSync('server/data/manual-odds.json', 'utf8'));

function buildRawBySport() {
  const rawBySport = {};
  for (const [, item] of Object.entries(manualOdds)) {
    if (!item.sport) continue;
    let bestOdds = null;
    if (item.oddsByTournament?.season) {
      for (const src of Object.values(item.oddsByTournament.season)) { bestOdds = src; break; }
    }
    if (!bestOdds && item.oddsBySource) {
      for (const src of Object.values(item.oddsBySource)) { bestOdds = src; break; }
    }
    if (!bestOdds && item.oddsByTournament) {
      for (const [, sources] of Object.entries(item.oddsByTournament)) {
        for (const src of Object.values(sources)) { bestOdds = src; break; }
        if (bestOdds) break;
      }
    }
    if (!bestOdds) continue;
    (rawBySport[item.sport] ??= []).push({ name: item.name, odds: bestOdds });
  }
  return rawBySport;
}

function buildEntries(rawBySport, scarcityModifier = 0.5) {
  const entries = [];
  for (const sport of SPORTS) {
    if (!sport.active) continue;
    const apiItems = rawBySport[sport.id] || [];
    const rosterNames = ROSTERS[sport.id] || [];
    const apiLookup = new Map();
    for (const item of apiItems) apiLookup.set(normalize(item.name), item);
    const matchedApiKeys = new Set();
    const processedRosterKeys = new Set();

    for (const name of rosterNames) {
      const key = normalize(name);
      if (processedRosterKeys.has(key)) continue;
      processedRosterKeys.add(key);
      const apiItem = apiLookup.get(key);
      const entryId = `${sport.id}-${slugify(name)}`;
      if (apiItem) {
        matchedApiKeys.add(key);
        let ev = calculateSeasonTotalEV(apiItem.odds, sport.category, sport.eventsPerSeason, sport.id);
        if (sport.evMultiplier != null && ev) {
          ev = { ...ev, singleEvent: ev.singleEvent * sport.evMultiplier, seasonTotal: ev.seasonTotal * sport.evMultiplier };
        }
        entries.push({ id: entryId, name, sport: sport.id, sportName: sport.name, odds: apiItem.odds, ev, adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL', adpScore: 0, scarcityBonus: 0, evGap: 0, isPlaceholder: false, drafted: false, draftedBy: null });
      } else {
        entries.push({ id: entryId, name, sport: sport.id, sportName: sport.name, odds: null, ev: null, adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL', adpScore: -1, scarcityBonus: 0, evGap: 0, isPlaceholder: true, drafted: false, draftedBy: null });
      }
    }
    for (const item of apiItems) {
      const key = normalize(item.name);
      if (!matchedApiKeys.has(key)) {
        matchedApiKeys.add(key);
        const entryId = `${sport.id}-${slugify(item.name)}`;
        let ev = calculateSeasonTotalEV(item.odds, sport.category, sport.eventsPerSeason, sport.id);
        if (sport.evMultiplier != null && ev) {
          ev = { ...ev, singleEvent: ev.singleEvent * sport.evMultiplier, seasonTotal: ev.seasonTotal * sport.evMultiplier };
        }
        entries.push({ id: entryId, name: item.name, sport: sport.id, sportName: sport.name, odds: item.odds, ev, adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL', adpScore: 0, scarcityBonus: 0, evGap: 0, isPlaceholder: false, drafted: false, draftedBy: null });
      }
    }
  }
  const bySport = {};
  for (const e of entries) {
    if (e.isPlaceholder) continue;
    (bySport[e.sport] ??= []).push(e);
  }
  for (const sportEntries of Object.values(bySport)) {
    applyPositionalScarcity(sportEntries, scarcityModifier);
  }
  entries.sort((a, b) => {
    if (a.isPlaceholder && !b.isPlaceholder) return 1;
    if (!a.isPlaceholder && b.isPlaceholder) return -1;
    return (b.adpScore || 0) - (a.adpScore || 0);
  });
  entries.forEach((e, i) => { e.adpRank = i + 1; });
  return entries;
}

// ─── Inline WA_EV for backtest (no PL-MC, uses vigless p) ────────────────────

function geometricWaEV(p) {
  if (!p || p <= 0 || p >= 1) return 0;
  let ev = 0;
  for (let k = 0; k < IKYN_SCORE_TABLE.length; k++) {
    ev += IKYN_SCORE_TABLE[k] * p * Math.pow(1 - p, k);
  }
  return ev;
}

function computeWaEVForEntries(entries) {
  // Group by sport, normalize probabilities within sport (remove overround)
  const bySport = {};
  for (const e of entries) {
    (bySport[e.sport] ??= []).push(e);
  }
  const result = {};
  for (const [, sportEntries] of Object.entries(bySport)) {
    const sumP = sportEntries.reduce((s, e) => s + (e.rawP || 0), 0);
    const scale = sumP > 1 ? 1 / sumP : 1;
    for (const e of sportEntries) {
      const pNorm = (e.rawP || 0) * scale;
      result[e.id] = geometricWaEV(pNorm);
    }
  }
  return result;
}

// ─── Historical data ──────────────────────────────────────────────────────────

// Approximate consensus pre-season American odds, 2021–2024
// Same source base as backtest-historical.js, extended with WA-model sports.
const HISTORICAL = {
  nfl: [
    { season: '2021', winner: 'Los Angeles Rams', odds: [
      { name: 'Kansas City Chiefs', o: '+500' }, { name: 'Tampa Bay Buccaneers', o: '+600' },
      { name: 'Buffalo Bills', o: '+800' }, { name: 'Green Bay Packers', o: '+1000' },
      { name: 'San Francisco 49ers', o: '+1200' }, { name: 'Los Angeles Rams', o: '+1400' },
      { name: 'Baltimore Ravens', o: '+1600' }, { name: 'Cleveland Browns', o: '+2000' },
      { name: 'Seattle Seahawks', o: '+2500' }, { name: 'Tennessee Titans', o: '+3000' },
      { name: 'Dallas Cowboys', o: '+2500' }, { name: 'New England Patriots', o: '+3500' },
      { name: 'Los Angeles Chargers', o: '+3000' }, { name: 'Indianapolis Colts', o: '+3000' },
      { name: 'Pittsburgh Steelers', o: '+3500' }, { name: 'Indianapolis Colts', o: '+4000' },
    ] },
    { season: '2022', winner: 'Kansas City Chiefs', odds: [
      { name: 'Buffalo Bills', o: '+600' }, { name: 'Kansas City Chiefs', o: '+750' },
      { name: 'Tampa Bay Buccaneers', o: '+800' }, { name: 'Los Angeles Rams', o: '+1000' },
      { name: 'Green Bay Packers', o: '+1000' }, { name: 'Denver Broncos', o: '+1400' },
      { name: 'San Francisco 49ers', o: '+1400' }, { name: 'Los Angeles Chargers', o: '+1600' },
      { name: 'Cincinnati Bengals', o: '+1600' }, { name: 'Baltimore Ravens', o: '+1800' },
      { name: 'Dallas Cowboys', o: '+2000' }, { name: 'Philadelphia Eagles', o: '+2500' },
    ] },
    { season: '2023', winner: 'Kansas City Chiefs', odds: [
      { name: 'Kansas City Chiefs', o: '+550' }, { name: 'Philadelphia Eagles', o: '+650' },
      { name: 'Buffalo Bills', o: '+800' }, { name: 'San Francisco 49ers', o: '+800' },
      { name: 'Cincinnati Bengals', o: '+1000' }, { name: 'Dallas Cowboys', o: '+1200' },
      { name: 'Miami Dolphins', o: '+1400' }, { name: 'Detroit Lions', o: '+2000' },
      { name: 'New York Jets', o: '+1600' }, { name: 'Baltimore Ravens', o: '+2000' },
    ] },
    { season: '2024', winner: 'Philadelphia Eagles', odds: [
      { name: 'Kansas City Chiefs', o: '+500' }, { name: 'San Francisco 49ers', o: '+600' },
      { name: 'Detroit Lions', o: '+800' }, { name: 'Baltimore Ravens', o: '+1000' },
      { name: 'Philadelphia Eagles', o: '+1200' }, { name: 'Buffalo Bills', o: '+1200' },
      { name: 'Cincinnati Bengals', o: '+1400' }, { name: 'Green Bay Packers', o: '+1600' },
      { name: 'Houston Texans', o: '+1800' }, { name: 'Dallas Cowboys', o: '+2000' },
    ] },
  ],
  nba: [
    { season: '2021', winner: 'Milwaukee Bucks', odds: [
      { name: 'Brooklyn Nets', o: '+250' }, { name: 'LA Lakers', o: '+400' },
      { name: 'Milwaukee Bucks', o: '+700' }, { name: 'LA Clippers', o: '+600' },
      { name: 'Golden State Warriors', o: '+1400' }, { name: 'Philadelphia 76ers', o: '+1200' },
      { name: 'Phoenix Suns', o: '+2000' }, { name: 'Miami Heat', o: '+1800' },
      { name: 'Denver Nuggets', o: '+2000' }, { name: 'Utah Jazz', o: '+2500' },
      { name: 'Boston Celtics', o: '+3000' }, { name: 'Dallas Mavericks', o: '+3500' },
    ] },
    { season: '2022', winner: 'Golden State Warriors', odds: [
      { name: 'Brooklyn Nets', o: '+300' }, { name: 'LA Lakers', o: '+450' },
      { name: 'Milwaukee Bucks', o: '+600' }, { name: 'Golden State Warriors', o: '+1000' },
      { name: 'Phoenix Suns', o: '+1200' }, { name: 'Utah Jazz', o: '+1400' },
      { name: 'Miami Heat', o: '+1800' }, { name: 'Philadelphia 76ers', o: '+1800' },
      { name: 'Denver Nuggets', o: '+2000' }, { name: 'Boston Celtics', o: '+2500' },
      { name: 'Dallas Mavericks', o: '+4000' },
    ] },
    { season: '2023', winner: 'Denver Nuggets', odds: [
      { name: 'Boston Celtics', o: '+450' }, { name: 'Milwaukee Bucks', o: '+550' },
      { name: 'Golden State Warriors', o: '+700' }, { name: 'LA Clippers', o: '+800' },
      { name: 'Phoenix Suns', o: '+1000' }, { name: 'Denver Nuggets', o: '+1000' },
      { name: 'Philadelphia 76ers', o: '+1200' }, { name: 'Memphis Grizzlies', o: '+1400' },
      { name: 'Dallas Mavericks', o: '+2500' }, { name: 'Miami Heat', o: '+2000' },
    ] },
    { season: '2024', winner: 'Boston Celtics', odds: [
      { name: 'Boston Celtics', o: '+350' }, { name: 'Denver Nuggets', o: '+500' },
      { name: 'Milwaukee Bucks', o: '+700' }, { name: 'Phoenix Suns', o: '+900' },
      { name: 'Philadelphia 76ers', o: '+1000' }, { name: 'Golden State Warriors', o: '+1400' },
      { name: 'Oklahoma City Thunder', o: '+1400' }, { name: 'LA Lakers', o: '+1600' },
      { name: 'Dallas Mavericks', o: '+2000' }, { name: 'Minnesota Timberwolves', o: '+2000' },
    ] },
  ],
  nhl: [
    { season: '2021', winner: 'Tampa Bay Lightning', odds: [
      { name: 'Tampa Bay Lightning', o: '+600' }, { name: 'Colorado Avalanche', o: '+700' },
      { name: 'Vegas Golden Knights', o: '+800' }, { name: 'Toronto Maple Leafs', o: '+1000' },
      { name: 'Boston Bruins', o: '+1200' }, { name: 'Carolina Hurricanes', o: '+1400' },
      { name: 'New York Islanders', o: '+2000' }, { name: 'Washington Capitals', o: '+2000' },
      { name: 'Edmonton Oilers', o: '+2000' }, { name: 'Montreal Canadiens', o: '+5000' },
    ] },
    { season: '2022', winner: 'Colorado Avalanche', odds: [
      { name: 'Colorado Avalanche', o: '+500' }, { name: 'Tampa Bay Lightning', o: '+700' },
      { name: 'Vegas Golden Knights', o: '+900' }, { name: 'Toronto Maple Leafs', o: '+1000' },
      { name: 'Carolina Hurricanes', o: '+1200' }, { name: 'Florida Panthers', o: '+1400' },
      { name: 'Edmonton Oilers', o: '+1800' }, { name: 'Boston Bruins', o: '+1600' },
      { name: 'New York Rangers', o: '+2000' }, { name: 'Calgary Flames', o: '+2500' },
    ] },
    { season: '2023', winner: 'Vegas Golden Knights', odds: [
      { name: 'Colorado Avalanche', o: '+600' }, { name: 'Tampa Bay Lightning', o: '+800' },
      { name: 'Carolina Hurricanes', o: '+900' }, { name: 'Toronto Maple Leafs', o: '+1000' },
      { name: 'Edmonton Oilers', o: '+1000' }, { name: 'New York Rangers', o: '+1200' },
      { name: 'Calgary Flames', o: '+1400' }, { name: 'Vegas Golden Knights', o: '+1400' },
      { name: 'Boston Bruins', o: '+1600' }, { name: 'Florida Panthers', o: '+2000' },
    ] },
    { season: '2024', winner: 'Florida Panthers', odds: [
      { name: 'Edmonton Oilers', o: '+700' }, { name: 'Carolina Hurricanes', o: '+800' },
      { name: 'Colorado Avalanche', o: '+900' }, { name: 'Dallas Stars', o: '+1000' },
      { name: 'Vegas Golden Knights', o: '+1000' }, { name: 'Toronto Maple Leafs', o: '+1200' },
      { name: 'New York Rangers', o: '+1200' }, { name: 'Florida Panthers', o: '+1400' },
      { name: 'Boston Bruins', o: '+1600' }, { name: 'Vancouver Canucks', o: '+2000' },
    ] },
  ],
  mlb: [
    { season: '2021', winner: 'Atlanta Braves', odds: [
      { name: 'Los Angeles Dodgers', o: '+350' }, { name: 'New York Yankees', o: '+700' },
      { name: 'San Diego Padres', o: '+900' }, { name: 'Chicago White Sox', o: '+1000' },
      { name: 'New York Mets', o: '+1200' }, { name: 'Atlanta Braves', o: '+1400' },
      { name: 'Tampa Bay Rays', o: '+1600' }, { name: 'Houston Astros', o: '+1600' },
      { name: 'Boston Red Sox', o: '+2500' },
    ] },
    { season: '2022', winner: 'Houston Astros', odds: [
      { name: 'Los Angeles Dodgers', o: '+400' }, { name: 'Houston Astros', o: '+750' },
      { name: 'Toronto Blue Jays', o: '+900' }, { name: 'New York Yankees', o: '+1000' },
      { name: 'New York Mets', o: '+1000' }, { name: 'Milwaukee Brewers', o: '+1600' },
      { name: 'Tampa Bay Rays', o: '+1800' }, { name: 'Atlanta Braves', o: '+1400' },
      { name: 'San Diego Padres', o: '+1600' },
    ] },
    { season: '2023', winner: 'Texas Rangers', odds: [
      { name: 'Houston Astros', o: '+500' }, { name: 'Los Angeles Dodgers', o: '+600' },
      { name: 'Atlanta Braves', o: '+650' }, { name: 'New York Yankees', o: '+900' },
      { name: 'New York Mets', o: '+1000' }, { name: 'Philadelphia Phillies', o: '+1200' },
      { name: 'Toronto Blue Jays', o: '+1400' }, { name: 'Tampa Bay Rays', o: '+1600' },
      { name: 'Texas Rangers', o: '+2000' },
    ] },
    { season: '2024', winner: 'Los Angeles Dodgers', odds: [
      { name: 'Los Angeles Dodgers', o: '+350' }, { name: 'Atlanta Braves', o: '+600' },
      { name: 'Houston Astros', o: '+800' }, { name: 'Philadelphia Phillies', o: '+900' },
      { name: 'Baltimore Orioles', o: '+1000' }, { name: 'New York Yankees', o: '+1400' },
      { name: 'San Diego Padres', o: '+1800' }, { name: 'Minnesota Twins', o: '+2000' },
    ] },
  ],
  f1: [
    { season: '2021', winner: 'Max Verstappen', odds: [
      { name: 'Lewis Hamilton', o: '-150' }, { name: 'Max Verstappen', o: '+200' },
      { name: 'Valtteri Bottas', o: '+1400' }, { name: 'Lando Norris', o: '+3000' },
      { name: 'Charles Leclerc', o: '+3500' }, { name: 'Carlos Sainz', o: '+5000' },
      { name: 'Sergio Perez', o: '+6000' }, { name: 'Pierre Gasly', o: '+8000' },
    ] },
    { season: '2022', winner: 'Max Verstappen', odds: [
      { name: 'Lewis Hamilton', o: '+150' }, { name: 'Max Verstappen', o: '+175' },
      { name: 'Charles Leclerc', o: '+800' }, { name: 'Lando Norris', o: '+2000' },
      { name: 'Carlos Sainz', o: '+2000' }, { name: 'George Russell', o: '+2500' },
      { name: 'Sergio Perez', o: '+3000' }, { name: 'Fernando Alonso', o: '+10000' },
    ] },
    { season: '2023', winner: 'Max Verstappen', odds: [
      { name: 'Max Verstappen', o: '-175' }, { name: 'Lewis Hamilton', o: '+500' },
      { name: 'Charles Leclerc', o: '+600' }, { name: 'Sergio Perez', o: '+1200' },
      { name: 'Carlos Sainz', o: '+1400' }, { name: 'Lando Norris', o: '+1600' },
      { name: 'George Russell', o: '+2000' }, { name: 'Fernando Alonso', o: '+2000' },
    ] },
    { season: '2024', winner: 'Max Verstappen', odds: [
      { name: 'Max Verstappen', o: '-250' }, { name: 'Charles Leclerc', o: '+500' },
      { name: 'Lando Norris', o: '+600' }, { name: 'Lewis Hamilton', o: '+1200' },
      { name: 'Carlos Sainz', o: '+1400' }, { name: 'George Russell', o: '+2000' },
      { name: 'Oscar Piastri', o: '+2000' }, { name: 'Sergio Perez', o: '+2500' },
    ] },
  ],
  ncaab: [
    { season: '2023', winner: 'UConn Huskies', odds: [
      { name: 'Houston Cougars', o: '+600' }, { name: 'Gonzaga Bulldogs', o: '+700' },
      { name: 'Kansas Jayhawks', o: '+1000' }, { name: 'Duke Blue Devils', o: '+1200' },
      { name: 'UConn Huskies', o: '+1400' }, { name: 'Alabama Crimson Tide', o: '+1600' },
      { name: 'Purdue Boilermakers', o: '+2000' }, { name: 'Kentucky Wildcats', o: '+2000' },
      { name: 'Texas Longhorns', o: '+2500' }, { name: 'UCLA Bruins', o: '+2500' },
    ] },
    { season: '2024', winner: 'UConn Huskies', odds: [
      { name: 'UConn Huskies', o: '+500' }, { name: 'Duke Blue Devils', o: '+700' },
      { name: 'Houston Cougars', o: '+900' }, { name: 'Purdue Boilermakers', o: '+1000' },
      { name: 'Kansas Jayhawks', o: '+1200' }, { name: 'North Carolina Tar Heels', o: '+1600' },
      { name: 'Gonzaga Bulldogs', o: '+1800' }, { name: 'Arizona Wildcats', o: '+2000' },
    ] },
  ],
  ncaaf: [
    { season: '2023', winner: 'Michigan Wolverines', odds: [
      { name: 'Georgia Bulldogs', o: '+250' }, { name: 'Ohio State Buckeyes', o: '+500' },
      { name: 'Alabama Crimson Tide', o: '+600' }, { name: 'Michigan Wolverines', o: '+1000' },
      { name: 'USC Trojans', o: '+1200' }, { name: 'Texas Longhorns', o: '+1400' },
      { name: 'Clemson Tigers', o: '+2000' }, { name: 'Penn State Nittany Lions', o: '+2000' },
    ] },
    { season: '2024', winner: 'Ohio State Buckeyes', odds: [
      { name: 'Georgia Bulldogs', o: '+300' }, { name: 'Ohio State Buckeyes', o: '+400' },
      { name: 'Texas Longhorns', o: '+700' }, { name: 'Oregon Ducks', o: '+1000' },
      { name: 'Alabama Crimson Tide', o: '+1200' }, { name: 'Michigan Wolverines', o: '+1600' },
      { name: 'Penn State Nittany Lions', o: '+2000' }, { name: 'Notre Dame Fighting Irish', o: '+2500' },
    ] },
  ],
  // Variable-field examples — WA model used in prod
  tennis_m: [
    { season: '2023', winner: 'Novak Djokovic', odds: [  // Won AO, FO, Wimbledon in 2023
      { name: 'Novak Djokovic', o: '+200' }, { name: 'Carlos Alcaraz', o: '+350' },
      { name: 'Rafael Nadal', o: '+600' }, { name: 'Daniil Medvedev', o: '+800' },
      { name: 'Casper Ruud', o: '+1200' }, { name: 'Jannik Sinner', o: '+1400' },
      { name: 'Stefanos Tsitsipas', o: '+1400' }, { name: 'Alexander Zverev', o: '+1600' },
      { name: 'Andrey Rublev', o: '+2000' }, { name: 'Taylor Fritz', o: '+2500' },
    ] },
    { season: '2024', winner: 'Jannik Sinner', odds: [ // Won AO + USO 2024
      { name: 'Novak Djokovic', o: '+200' }, { name: 'Carlos Alcaraz', o: '+250' },
      { name: 'Jannik Sinner', o: '+600' }, { name: 'Daniil Medvedev', o: '+900' },
      { name: 'Alexander Zverev', o: '+1200' }, { name: 'Casper Ruud', o: '+1600' },
      { name: 'Andrey Rublev', o: '+1800' }, { name: 'Stefanos Tsitsipas', o: '+2000' },
      { name: 'Taylor Fritz', o: '+2000' }, { name: 'Holger Rune', o: '+2500' },
    ] },
  ],
  pga: [
    { season: '2023', winner: 'Jon Rahm', odds: [ // Masters 2023
      { name: 'Scottie Scheffler', o: '+900' }, { name: 'Rory McIlroy', o: '+1000' },
      { name: 'Jon Rahm', o: '+1100' }, { name: 'Cameron Smith', o: '+1400' },
      { name: 'Xander Schauffele', o: '+1600' }, { name: 'Viktor Hovland', o: '+2000' },
      { name: 'Jordan Spieth', o: '+2500' }, { name: 'Patrick Cantlay', o: '+2500' },
      { name: 'Justin Thomas', o: '+2500' }, { name: 'Collin Morikawa', o: '+3000' },
    ] },
    { season: '2024', winner: 'Scottie Scheffler', odds: [
      { name: 'Scottie Scheffler', o: '+700' }, { name: 'Rory McIlroy', o: '+900' },
      { name: 'Jon Rahm', o: '+1000' }, { name: 'Collin Morikawa', o: '+1600' },
      { name: 'Xander Schauffele', o: '+1600' }, { name: 'Viktor Hovland', o: '+1800' },
      { name: 'Ludvig Aberg', o: '+2000' }, { name: 'Patrick Cantlay', o: '+2500' },
      { name: 'Brooks Koepka', o: '+2800' }, { name: 'Shane Lowry', o: '+3000' },
    ] },
  ],
};

// ─── Part 1: Live Snapshot ───────────────────────────────────────────────────

console.log('='.repeat(72));
console.log('  BRACKT — WIZARDEV RECALCULATION + BACKTEST');
console.log('='.repeat(72));
console.log('\n■ PART 1: LIVE SNAPSHOT — computeIkynEV on current board\n');

const rawBySport = buildRawBySport();
console.log('Building entries...');
const boardEntries = buildEntries(rawBySport, 0.5);
const realEntries = boardEntries.filter(e => !e.isPlaceholder);
const phEntries   = boardEntries.filter(e => e.isPlaceholder);
console.log(`  ${boardEntries.length} total (${realEntries.length} real, ${phEntries.length} placeholders)\n`);

console.log('Running computeIkynEV (300k sims × sports — may take ~10-20s)...');
const t0 = Date.now();
const ikynMap = computeIkynEV(boardEntries);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`  Done in ${elapsed}s\n`);

// Per-sport summary
const WIZARD_FIXED = new Set(['nfl','nba','mlb','nhl','wnba','afl','f1','darts','snooker','ucl','fifa']);
const sportGroups = {};
for (const [id, ev] of Object.entries(ikynMap)) {
  const entry = boardEntries.find(e => e.id === id);
  if (!entry || entry.isPlaceholder) continue;
  (sportGroups[entry.sport] ??= []).push({ entry, ev });
}

let grandIkyn = 0, grandWa = 0, grandWizard = 0;

console.log(pad('SPORT', 14) + pad('MODEL', 7) + pad('α', 6) + rpad('IKYN_EV', 9) + rpad('WA_EV', 9) + rpad('WIZ_EV', 9) + '  FIELD');
console.log('─'.repeat(72));

for (const [sportId, items] of Object.entries(sportGroups).sort((a,b) => a[0].localeCompare(b[0]))) {
  const ikynTotal   = items.reduce((s, x) => s + (x.ev.ev ?? 0), 0);
  const waTotal     = items.reduce((s, x) => s + (x.ev.waEV ?? 0), 0);
  const wizTotal    = items.reduce((s, x) => s + (x.ev.wizardEV ?? 0), 0);
  const model       = WIZARD_FIXED.has(sportId) ? 'ikyn' : 'wa';
  const alpha       = items[0]?.ev.sportAlpha ?? 0;
  const fieldSize   = items.length;
  grandIkyn   += ikynTotal;
  grandWa     += waTotal;
  grandWizard += wizTotal;
  const ikynFlag  = ikynTotal > 340.5 ? ' ⚠' : ikynTotal < 50 ? ' ?' : '';
  const waFlag    = waTotal > 340.5 ? ' ⚠' : '';
  console.log(
    pad(sportId, 14) +
    pad(model, 7) +
    pad((alpha * 100).toFixed(0) + '%', 6) +
    rpad(ikynTotal.toFixed(1), 9) + ikynFlag.padEnd(3) +
    rpad(waTotal.toFixed(1), 9) + waFlag.padEnd(3) +
    rpad(wizTotal.toFixed(1), 9) +
    `  n=${fieldSize}`
  );
}

console.log('─'.repeat(72));
console.log(
  pad('TOTAL', 14) + pad('', 7) + pad('', 6) +
  rpad(grandIkyn.toFixed(1), 9) + '   ' +
  rpad(grandWa.toFixed(1), 9) + '   ' +
  rpad(grandWizard.toFixed(1), 9)
);
console.log();

// Top-10 by wizardEV
const allRanked = Object.entries(ikynMap)
  .map(([id, ev]) => ({ entry: boardEntries.find(e => e.id === id), ev }))
  .filter(x => x.entry && !x.entry.isPlaceholder && (x.ev.wizardEV ?? 0) > 0)
  .sort((a, b) => (b.ev.wizardEV ?? 0) - (a.ev.wizardEV ?? 0));

console.log('TOP 10 GLOBAL BY WIZARD_EV:');
console.log(pad('#', 4) + pad('NAME', 28) + pad('SPORT', 10) + pad('MODEL', 8) + rpad('WIZ', 8) + rpad('IKYN', 8) + rpad('WA', 8));
console.log('─'.repeat(72));
for (let i = 0; i < Math.min(10, allRanked.length); i++) {
  const { entry, ev } = allRanked[i];
  const model = ev.wizardModel === 'ikyn' ? 'PL-MC' : 'WA';
  console.log(
    pad(i + 1, 4) +
    pad(entry.name, 28) +
    pad(entry.sport, 10) +
    pad(model, 8) +
    rpad((ev.wizardEV ?? 0).toFixed(1), 8) +
    rpad((ev.ev ?? 0).toFixed(1), 8) +
    rpad((ev.waEV ?? 0).toFixed(1), 8)
  );
}
console.log();

// Per-sport top-5 if verbose
if (VERBOSE) {
  console.log('PER-SPORT TOP-5 BY WIZARD_EV:\n');
  for (const [sportId, items] of Object.entries(sportGroups).sort((a,b) => a[0].localeCompare(b[0]))) {
    const top5 = items.sort((a,b) => (b.ev.wizardEV??0) - (a.ev.wizardEV??0)).slice(0, 5);
    const model = WIZARD_FIXED.has(sportId) ? 'PL-MC' : 'WA';
    console.log(`  ${sportId.toUpperCase()} (${model}):`);
    top5.forEach((x, i) => {
      console.log(`    ${i+1}. ${pad(x.entry.name, 25)}  wiz=${(x.ev.wizardEV??0).toFixed(1)}  dps=${x.entry.adpScore?.toFixed(1)}`);
    });
    console.log();
  }
}

// ─── Part 2: Historical Backtest ─────────────────────────────────────────────

console.log('='.repeat(72));
console.log('\n■ PART 2: HISTORICAL BACKTEST — winner rank by 3 methods\n');
console.log('  Market rank  = sort by vigless implied probability (raw odds)');
console.log('  DPS rank     = sort by adpScore (our EV+scarcity pipeline)');
console.log('  WizardEV rank = sort by waEV geometric transform (vigless p)');
console.log('  ✓ = winner in top 3  |  ~ = top 5  |  ✗ = outside top 5\n');

const SCARCITY_MOD = 0.5;
let totalSeasons = 0, mktTop3 = 0, mktTop5 = 0, dpsTop3 = 0, dpsTop5 = 0, wizTop3 = 0, wizTop5 = 0;
let mktAvgRank = 0, dpsAvgRank = 0, wizAvgRank = 0;

for (const [sportId, seasons] of Object.entries(HISTORICAL)) {
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const eventsPerSeason = sportConfig?.eventsPerSeason || 1;
  const sportResults = [];

  for (const season of seasons) {
    // Build entries with raw probabilities attached
    const rawOdds = season.odds;
    const seen = new Set();
    const rawEntries = [];
    for (const item of rawOdds) {
      const key = normalize(item.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const p = americanToImpliedProbability(item.o);
      rawEntries.push({ name: item.name, rawOdds: item.o, rawP: p });
    }

    // Market rank: sort by raw implied prob (higher = better)
    const mktSorted = [...rawEntries].sort((a,b) => b.rawP - a.rawP);

    // DPS rank: run EV pipeline
    const dpsPipelineEntries = rawEntries.map((e, i) => {
      const ev = calculateSeasonTotalEV(e.rawOdds, 'standard', eventsPerSeason, sportId);
      return {
        id: `bt-${sportId}-${i}`, name: e.name, sport: sportId, sportName: sportId,
        odds: e.rawOdds, ev, rawP: e.rawP,
        adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL',
        adpScore: 0, scarcityBonus: 0, evGap: 0, isPlaceholder: false,
        drafted: false, draftedBy: null,
      };
    });
    applyPositionalScarcity(dpsPipelineEntries, SCARCITY_MOD);
    const dpsSorted = [...dpsPipelineEntries].sort((a,b) => (b.adpScore||0) - (a.adpScore||0));

    // WizardEV rank: vigless normalization + geometric transform
    const sumP = rawEntries.reduce((s, e) => s + e.rawP, 0);
    const scale = sumP > 1 ? 1 / sumP : 1;
    const wizEntries = rawEntries.map(e => ({
      ...e,
      wizardEV: geometricWaEV(e.rawP * scale),
    }));
    const wizSorted = [...wizEntries].sort((a,b) => b.wizardEV - a.wizardEV);

    // Find winner ranks
    const winNorm = normalize(season.winner);
    const mktRank = mktSorted.findIndex(e => normalize(e.name) === winNorm) + 1 || rawEntries.length + 1;
    const dpsRank = dpsSorted.findIndex(e => normalize(e.name) === winNorm) + 1 || rawEntries.length + 1;
    const wizRank = wizSorted.findIndex(e => normalize(e.name) === winNorm) + 1 || rawEntries.length + 1;

    sportResults.push({ season: season.season, winner: season.winner, mktRank, dpsRank, wizRank, n: rawEntries.length,
      mktTop1: mktSorted[0]?.name, dpsTop1: dpsSorted[0]?.name, wizTop1: wizSorted[0]?.name });

    totalSeasons++;
    if (mktRank <= 3) mktTop3++; if (mktRank <= 5) mktTop5++;
    if (dpsRank <= 3) dpsTop3++; if (dpsRank <= 5) dpsTop5++;
    if (wizRank <= 3) wizTop3++; if (wizRank <= 5) wizTop5++;
    mktAvgRank += mktRank; dpsAvgRank += dpsRank; wizAvgRank += wizRank;
  }

  const sportModel = WIZARD_FIXED.has(sportId) ? 'fixed → PL-MC' : 'variable → WA';
  console.log(`─ ${sportId.toUpperCase()} (${sportModel}) ${'─'.repeat(48 - sportId.length)}`);
  console.log(
    pad('SEASON', 8) +
    pad('WINNER', 28) +
    rpad('MKT', 5) +
    rpad('DPS', 5) +
    rpad('WIZ', 5) +
    '  N'
  );

  for (const r of sportResults) {
    const label = (rank) => rank <= 3 ? '\x1b[32m✓\x1b[0m' : rank <= 5 ? '\x1b[33m~\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(
      pad(r.season, 8) +
      pad(r.winner.substring(0, 26), 28) +
      `${label(r.mktRank)}${rpad('#' + r.mktRank, 4)}` +
      `${label(r.dpsRank)}${rpad('#' + r.dpsRank, 4)}` +
      `${label(r.wizRank)}${rpad('#' + r.wizRank, 4)}` +
      `  (${r.n} listed)`
    );
    if (VERBOSE) {
      console.log(`         Mkt top: ${r.mktTop1} | DPS top: ${r.dpsTop1} | Wiz top: ${r.wizTop1}`);
    }
  }

  const sp3m = sportResults.filter(r => r.mktRank <= 3).length;
  const sp3d = sportResults.filter(r => r.dpsRank <= 3).length;
  const sp3w = sportResults.filter(r => r.wizRank <= 3).length;
  console.log(`  Top-3 rate: Mkt ${sp3m}/${sportResults.length}  DPS ${sp3d}/${sportResults.length}  Wiz ${sp3w}/${sportResults.length}\n`);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('='.repeat(72));
console.log('  AGGREGATE RESULTS');
console.log('='.repeat(72));
console.log(pad('', 28) + rpad('MARKET', 12) + rpad('DPS', 12) + rpad('WIZARDEV', 12));
console.log('─'.repeat(64));
console.log(
  pad(`Winner in Top-3  (${totalSeasons} seasons)`, 28) +
  rpad(`${mktTop3} (${(mktTop3/totalSeasons*100).toFixed(0)}%)`, 12) +
  rpad(`${dpsTop3} (${(dpsTop3/totalSeasons*100).toFixed(0)}%)`, 12) +
  rpad(`${wizTop3} (${(wizTop3/totalSeasons*100).toFixed(0)}%)`, 12)
);
console.log(
  pad('Winner in Top-5', 28) +
  rpad(`${mktTop5} (${(mktTop5/totalSeasons*100).toFixed(0)}%)`, 12) +
  rpad(`${dpsTop5} (${(dpsTop5/totalSeasons*100).toFixed(0)}%)`, 12) +
  rpad(`${wizTop5} (${(wizTop5/totalSeasons*100).toFixed(0)}%)`, 12)
);
console.log(
  pad('Avg winner rank', 28) +
  rpad((mktAvgRank/totalSeasons).toFixed(1), 12) +
  rpad((dpsAvgRank/totalSeasons).toFixed(1), 12) +
  rpad((wizAvgRank/totalSeasons).toFixed(1), 12)
);
console.log();
console.log('  INTERPRETATION:');
console.log('  • WizardEV ≈ Market means the geometric transform preserves ordering');
console.log('  • WizardEV > Market/DPS means the transform amplifies signal — good');
console.log('  • Fixed-field sports (NFL/NBA/NHL/MLB/F1): PL-MC in production');
console.log('    Backtest uses WA proxy (fast). Expect PL-MC ≈ WA for ranking order.');
console.log('  • Variable-field (NCAAB/NCAAF/Tennis/PGA): WA is the live model.');
console.log('  • Top-3 > 50% = meaningful predictor  |  > 70% = strong');
console.log();
