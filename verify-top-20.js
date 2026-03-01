import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- ROSTER CONSTRAINTS ---
const MAJOR_BASED_SPORTS = ['pga', 'tennis_m', 'tennis_w', 'csgo', 'indycar'];

// --- MATH CONSTANTS (Drawn directly from evCalculator.js) ---
const STABILITY_SAMPLES = {
  mlb: 162, nba: 82, nhl: 82, f1: 24, afl: 23, indycar: 18, nfl: 17,
  ucl: 13, llws: 6, tennis_m: 4, tennis_w: 4, pga: 4, 
  csgo: 4, ncaaf: 12, ncaab: 31, fifa: 7
};

const GLOBAL_CONFIDENCE_INDEX = {
  nba: 1.12, indycar: 0.88, f1: 1.12, llws: 1.12,
  mlb: 0.94, nhl: 1.00, tennis_m: 1.06, tennis_w: 1.06, afl: 1.00,
  nfl: 1.06, ncaaf: 1.00, ucl: 1.00, fifa: 1.00,
  pga: 0.88, darts: 0.94, snooker: 1.06, csgo: 0.88,
  ncaab: 0.94, wnba: 0.94, ncaaw: 0.94
};

const SPORT_REPLACEMENT_LEVELS = {
  afl: 0.73, csgo: 0.73, darts: 0.73, fifa: 0.73, f1: 0.73,
  indycar: 0.73, llws: 0.73, mlb: 14.33, nba: 10.92, ncaab: 0.73,
  ncaaf: 0.73, ncaaw: 0.73, nfl: 16.37, nhl: 9.50, pga: 0.73,
  snooker: 0.73, tennis_m: 0.73, tennis_w: 0.73, ucl: 0.73, wnba: 0.73
};

const BASE_SIGMA = 35;

const NFL_SNAP_WEIGHTED_AGE = {
  'greenbaypackers': 24.8, 'newyorkjets': 25.1, 'seattleseahawks': 25.3, 'philadelphiaeagles': 25.4,
  'dallascowboys': 25.5, 'washingtoncommanders': 28.1, 'pittsburghsteelers': 27.9, 'clevelandbrowns': 27.8,
  'denverbroncos': 27.7, 'minnesotavikings': 27.6
};
const NFL_ELITE_OL_CONTINUITY = ['philadelphiaeagles', 'denverbroncos', 'detroitlions', 'tampabaybuccaneers', 'buffalobills', 'chicagobears'];
const NFL_2026_DRAFT_CAPITAL = { 'newyorkjets': 1.07, 'clevelandbrowns': 1.05, 'lasvegasraiders': 1.04 };
const NFL_COACHING_ALPHA = { 'chicagobears': 1.15, 'arizonacardinals': 1.12, 'buffalobills': 1.08 };

// --- HELPERS ---
function americanToImpliedProbability(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

function probabilityToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

function removeVig(oddsBySource) {
  const entries = Object.entries(oddsBySource);
  const parsed = entries
    .map(([src, odds]) => [src, typeof odds === 'string' ? parseFloat(odds) : odds])
    .filter(([, n]) => !isNaN(n));
  if (parsed.length === 0) return { vigFreeOdds: {}, consensus: null };
  const probs = parsed.map(([src, odds]) => [src, odds < 0 ? Math.abs(odds) / (Math.abs(odds) + 100) : 100 / (odds + 100)]);
  const totalImplied = probs.reduce((sum, [, p]) => sum + p, 0);
  if (totalImplied <= 1) {
    const avgProb = totalImplied / probs.length;
    const consensusNum = probabilityToAmerican(avgProb);
    return { consensus: consensusNum != null ? (consensusNum > 0 ? '+' + consensusNum : '' + consensusNum) : null };
  }
  const trueProbs = probs.map(([, p]) => p / totalImplied);
  const avgTrueProb = trueProbs.reduce((s, p) => s + p, 0) / trueProbs.length;
  const consensusNum = probabilityToAmerican(avgTrueProb);
  return { consensus: consensusNum != null ? (consensusNum > 0 ? '+' + consensusNum : '' + consensusNum) : null };
}

// --- LOGIC REPLICATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import SPORTS from './src/data/sports.js';
import ROSTERS from './src/data/rosters.js';
import { calculateSeasonTotalEV } from './src/services/evCalculator.js';

const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const liveDir = path.join(__dirname, 'public', 'data', 'live');
const liveFiles = fs.readdirSync(liveDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');

const socialData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'social-scores.json'), 'utf8'));
const manualOdds = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'manual-odds.json'), 'utf8'));
const draftState = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'draft-state.json'), 'utf8'));

const rawBySport = {};
for (const file of liveFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(liveDir, file), 'utf8'));
    rawBySport[data.sport] = data.entries.map(e => ({
        name: e.name,
        odds: e.consensusOdds || e.bestOdds,
        oddsBySource: e.oddsBySource || {},
        oddsByTournament: e.oddsByTournament || {},
        bestOdds: e.bestOdds,
        region: e.region
    }));
}

// Merge Manual
for (const [id, manual] of Object.entries(manualOdds)) {
    const { sport, name, oddsBySource, oddsByTournament } = manual;
    if (!sport) continue;
    if (!rawBySport[sport]) rawBySport[sport] = [];
    const key = normalize(name);
    const existing = rawBySport[sport].find(item => normalize(item.name) === key);
    if (existing) {
        if (oddsBySource) Object.assign(existing.oddsBySource, oddsBySource);
        if (oddsByTournament) {
            if (!existing.oddsByTournament) existing.oddsByTournament = {};
            for (const [tId, tSources] of Object.entries(oddsByTournament)) {
                if (!existing.oddsByTournament[tId]) existing.oddsByTournament[tId] = {};
                Object.assign(existing.oddsByTournament[tId], tSources);
            }
        }
    } else {
        rawBySport[sport].push({
            name,
            oddsBySource: oddsBySource || {},
            oddsByTournament: oddsByTournament || {},
            bestOdds: manual.bestOdds || null,
            region: manual.region
        });
    }
}

// Consolidate consensus/tournament
for (const [sId, items] of Object.entries(rawBySport)) {
    const sport = SPORTS.find(s => s.id === sId);
    for (const item of items) {
        if (item.oddsBySource && Object.keys(item.oddsBySource).length > 0) {
            const { consensus } = removeVig(item.oddsBySource);
            item.odds = consensus || Object.values(item.oddsBySource)[0];
        }
        const hasTournamentData = item.oddsByTournament && Object.keys(item.oddsByTournament).length > 0;
        if (hasTournamentData) {
            let sumProb = 0, count = 0;
            for (const [tId, tSources] of Object.entries(item.oddsByTournament)) {
                const { consensus } = removeVig(tSources);
                const tOdds = consensus || Object.values(tSources)[0];
                if (tOdds) { sumProb += americanToImpliedProbability(tOdds); count++; }
            }
            if (count > 0 && sport?.tournaments) {
                item.odds = probabilityToAmerican(sumProb / count);
                if (item.odds > 0) item.odds = '+' + item.odds;
            }
        }
    }
}

let entries = [];
for (const sport of SPORTS) {
    if (!sport.active) continue;
    const apiItems = rawBySport[sport.id] || [];
    const rosterNames = ROSTERS[sport.id] || [];
    const apiLookup = new Map();
    apiItems.forEach(i => apiLookup.set(normalize(i.name), i));
    const matchedApiKeys = new Set();
    
    for (const name of rosterNames) {
        const key = normalize(name);
        const apiItem = apiLookup.get(key);
        const entryId = `${sport.id}-${slugify(name)}`;
        const social = socialData[entryId] || { pos: 0, neg: 0, socialQuotient: 1.0, mktVsExp: 0 };
        if (apiItem) {
            matchedApiKeys.add(key);
            const ev = calculateSeasonTotalEV(apiItem.odds, sport.category, sport.eventsPerSeason);
            entries.push({ id: entryId, name, sport: sport.id, odds: apiItem.odds, bestOdds: apiItem.bestOdds || apiItem.odds, ev, adjSq: social.socialQuotient || 1.0, isPlaceholder: false, region: apiItem.region, nameNormalized: key });
        }
    }
    for (const item of apiItems) {
        const key = normalize(item.name);
        if (!matchedApiKeys.has(key)) {
            const entryId = `${sport.id}-${slugify(item.name)}`;
            const social = socialData[entryId] || { socialQuotient: 1.0 };
            const ev = calculateSeasonTotalEV(item.odds, sport.category, sport.eventsPerSeason);
            entries.push({ id: entryId, name: item.name, sport: sport.id, odds: item.odds, bestOdds: item.bestOdds || item.odds, ev, adjSq: social.socialQuotient || 1.0, isPlaceholder: false, region: item.region, nameNormalized: key });
        }
    }
}

// Group and Apply Scarcity
const bySport = {};
entries.forEach(e => {
    if (!bySport[e.sport]) bySport[e.sport] = [];
    bySport[e.sport].push(e);
});

// CALCULATORS (Inlined)
const SPORT_CALCULATORS = {
  nfl: (ev, s, sq, entry) => {
    let mult = 1.0;
    const name = entry.nameNormalized;
    if (NFL_SNAP_WEIGHTED_AGE[name] <= 25.5) mult *= 1.15;
    if (NFL_ELITE_OL_CONTINUITY.includes(name)) mult *= 1.12;
    if (NFL_2026_DRAFT_CAPITAL[name]) mult *= NFL_2026_DRAFT_CAPITAL[name];
    if (NFL_COACHING_ALPHA[name]) mult *= NFL_COACHING_ALPHA[name];
    mult = Math.min(1.15, mult);
    return (ev + s) * (1.0 / (1.0 + Math.max(0, sq - 1.15))) * mult;
  },
  nba: (ev, s, sq, entry) => (ev + s) * (1.0 + (sq - 1) * 0.5) * 1.05,
  llws: (ev, s, sq, entry) => {
      let mult = (['asia-pacific', 'japan', 'taiwan'].includes(entry.region)) ? 1.35 : 1.0;
      return (ev + s) * (1.0 + (sq - 1) * 0.5) * mult;
  }
};

for (const [sId, sportEntries] of Object.entries(bySport)) {
    const calc = SPORT_CALCULATORS[sId] || ((ev, s, sq) => (ev + s) * (1.0 + (sq - 1) * 0.5));
    const confidenceMult = GLOBAL_CONFIDENCE_INDEX[sId] || 1.0;
    const replacementEV = SPORT_REPLACEMENT_LEVELS[sId] || 0;
    const sigma = BASE_SIGMA / Math.sqrt(STABILITY_SAMPLES[sId] || 1);

    sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));
    
    for (let i = 0; i < sportEntries.length; i++) {
        const current = sportEntries[i];
        const rawEV = current.ev?.seasonTotal || 0;
        const winProb = (current.ev?.winProbability || 0) / 100;
        let nextUIndex = -1;
        for (let j = i+1; j < sportEntries.length; j++) { if (!draftState[sportEntries[j].id]?.drafted) { nextUIndex = j; break; } }
        let gap = nextUIndex !== -1 ? rawEV - (sportEntries[nextUIndex].ev?.seasonTotal || 0) : 0;
        const remainingU = sportEntries.filter((e, idx) => idx >= i && !draftState[e.id]?.drafted).length;
        const scarcity = remainingU > 0 ? (gap * 2) / remainingU : 0;
        
        const hybrid = (Math.max(0.1, rawEV - replacementEV) * 0.5) + (rawEV * 0.5);
        const efficiency = hybrid / Math.sqrt(sigma);
        const byeAlpha = (['nfl', 'nba', 'mlb', 'nhl', 'afl'].includes(sId) && winProb > 0.10) ? 1.08 : 1.0;
        const baseScore = calc(efficiency * 10, scarcity, current.adjSq, current);
        current.adpScore = baseScore * confidenceMult * (winProb >= 0.05 ? 1.10 : 1.0) * byeAlpha;
    }
}

const undrafted = entries.filter(e => !draftState[e.id]?.drafted).sort((a,b) => b.adpScore - a.adpScore);

console.log("--- FINAL VERIFIED TOP 20 UNDRAFTED ---");
console.table(undrafted.slice(0, 20).map((e, i) => ({
    Rank: i + 1,
    Name: e.name,
    Sport: e.sport.toUpperCase(),
    Odds: e.odds,
    DPS: e.adpScore.toFixed(2),
    EV: e.ev.seasonTotal.toFixed(2),
    SQ: e.adjSq.toFixed(2)
})));
