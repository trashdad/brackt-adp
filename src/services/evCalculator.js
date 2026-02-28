import { STANDARD_SCORING } from '../data/scoring.js';
import { americanToImpliedProbability, probabilityToAmerican } from './oddsConverter.js';
import SPORTS from '../data/sports.js';

const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];

function buildRankProbabilities(winProb, numPositions = 16) {
  const probs = new Array(numPositions).fill(0);
  probs[0] = winProb;
  const remaining = 1 - winProb;
  const tailWeights = RANK_WEIGHTS.slice(1, numPositions);
  const tailSum = tailWeights.reduce((a, b) => a + b, 0);
  for (let k = 1; k < numPositions; k++) {
    probs[k] = remaining * (tailWeights[k - 1] / tailSum);
  }
  return probs;
}

export function runFinishSimulation(winProb) {
  const distribution = {};
  const probs = buildRankProbabilities(winProb);
  for (let i = 0; i < 16; i++) {
    distribution[i + 1] = probs[i];
  }
  return distribution;
}

function calculateEVFromDist(dist, scoringTable) {
  let ev = 0;
  const perFinish = {};
  const tieAdjusted = withTieAdjustment(scoringTable);
  for (const tier of tieAdjusted) {
    const [start, end] = tier.range;
    let tierEV = 0;
    for (let pos = start; pos <= end; pos++) {
      tierEV += (dist[pos] || 0) * tier.points;
    }
    ev += tierEV;
    perFinish[tier.finish] = parseFloat(tierEV.toFixed(2));
  }
  return { ev, perFinish };
}

const TIE_PROB = 0.05;
function withTieAdjustment(scoringTable) {
  return scoringTable.map((tier, i) => {
    const next = scoringTable[i + 1];
    if (!next) return tier;
    const effectivePts = (1 - TIE_PROB) * tier.points + TIE_PROB * (tier.points + next.points) / 2;
    return { ...tier, points: effectivePts };
  });
}

export function calculateSingleEventEV(americanOdds) {
  const winProb = americanToImpliedProbability(americanOdds);
  const dist = runFinishSimulation(winProb);
  const { ev, perFinish } = calculateEVFromDist(dist, STANDARD_SCORING);
  return {
    singleEvent: parseFloat(Math.min(ev, 100).toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
    dist,
  };
}

/**
 * Calculate total season EV. All sports treated identically.
 */
export function calculateSeasonTotalEV(americanOdds, category, eventsPerSeason) {
  const res = calculateSingleEventEV(americanOdds);
  return {
    ...res,
    seasonTotal: res.singleEvent,
    eventsPerSeason,
  };
}

/**
 * --- PER-SPORT DPS ALGORITHMS ---
 */

const NBA_MINUTES_WEIGHTED_AGE = {
  'oklahomacitythunder': 25.6, 'orlandomagic': 24.9, 'houstonrockets': 26.1, 'brooklynnets': 23.8,
  'charlottehornets': 24.0, 'atlantahawks': 25.3, 'detroitpistons': 25.8, 'sanantoniospurs': 26.2,
  'memphisgrizzlies': 26.5, 'utahjazz': 26.4, 'portlandtrailblazers': 26.2, 'indianapacers': 27.1,
  'neworleanspelicans': 27.4, 'torontoraptors': 27.2, 'washingtonwizards': 26.8, 'sacramentokings': 27.8,
  'minnesotatimberwolves': 27.9, 'clevelandcavaliers': 27.6, 'dallasmavericks': 28.1, 'philadelphia76ers': 28.4,
  'bostonceltics': 28.2, 'miamiheat': 28.9, 'newyorkknicks': 28.7, 'denvernuggets': 28.2,
  'milwaukeebucks': 29.1, 'phoenixsuns': 29.2, 'lalakers': 28.5, 'goldenstatewarriors': 29.4,
  'laclippers': 31.1, 'chicagobulls': 28.2
};

const NFL_SNAP_WEIGHTED_AGE = {
  'greenbaypackers': 24.8, 'newyorkjets': 25.1, 'seattleseahawks': 25.3, 'philadelphiaeagles': 25.4,
  'dallascowboys': 25.5, 'washingtoncommanders': 28.1, 'pittsburghsteelers': 27.9, 'clevelandbrowns': 27.8,
  'denverbroncos': 27.7, 'minnesotavikings': 27.6
};

const NFL_ELITE_OL_CONTINUITY = ['philadelphiaeagles', 'denverbroncos', 'detroitlions', 'tampabaybuccaneers', 'buffalobills', 'chicagobears'];

const NFL_2026_DRAFT_CAPITAL = {
  'newyorkjets': 1.25, 'clevelandbrowns': 1.18, 'lasvegasraiders': 1.15, 'pittsburghsteelers': 1.12,
  'tennesseetitans': 1.10, 'dallascowboys': 1.10, 'losangelesrams': 1.10
};

const NFL_COACHING_ALPHA = {
  'chicagobears': 1.15, 'arizonacardinals': 1.12, 'buffalobills': 1.08, 'atlantafalcons': 1.05, 'lasvegasraiders': 1.10
};

/**
 * --- GLOBAL CONFIDENCE INDEX (GCI) ---
 * Balances the board by predictability.
 */
const GLOBAL_CONFIDENCE_INDEX = {
  nba: 1.15, f1: 1.15, llws: 1.15,
  afl: 1.10, ncaab: 1.10, tennis_m: 1.10, tennis_w: 1.10, snooker: 1.10, darts: 1.10,
  nfl: 1.05, ncaaf: 1.05, ucl: 1.05, fifa: 1.05,
  nhl: 0.95, mlb: 0.95, indycar: 0.95, pga: 0.95,
  csgo: 0.90, wnba: 0.90, ncaaw: 0.90
};

// --- CALCULATORS ---

const genericCalc = (ev, scarcity, sq, entry) => {
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj;
};

const nflCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const name = entry.nameNormalized || '';
  const age = NFL_SNAP_WEIGHTED_AGE[name] || 26.5; 
  const notes = (entry.notes || '').toLowerCase();
  const odds = typeof entry.bestOdds === 'string' ? parseInt(entry.bestOdds.replace('+', '')) : 0;

  if (age <= 25.5) multiplier *= 1.15;
  if (NFL_ELITE_OL_CONTINUITY.includes(name) || notes.includes('elite ol') || notes.includes('continuity')) multiplier *= 1.12;
  if (NFL_2026_DRAFT_CAPITAL[name]) multiplier *= NFL_2026_DRAFT_CAPITAL[name];
  if (NFL_COACHING_ALPHA[name]) multiplier *= NFL_COACHING_ALPHA[name];
  if (odds >= 4000 && odds <= 8000) multiplier *= 1.16;
  if (notes.includes('elite defense') && notes.includes('poor offense') || ['pittsburghsteelers', 'clevelandbrowns'].includes(name)) multiplier *= 0.90;
  if (notes.includes('rookie qb') || notes.includes('new playcaller') || notes.includes('draft capital')) multiplier *= 1.10;

  const sqDampened = 1.0 / (1.0 + Math.max(0, sq - 1.15));
  return (ev + scarcity) * sqDampened * multiplier;
};

const nbaCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const age = NBA_MINUTES_WEIGHTED_AGE[name] || 27.0;
  let multiplier = 1.0;
  const notes = (entry.notes || '').toLowerCase();
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;

  if (age < 25.5) multiplier *= 1.05; 
  else if (age > 28.5) multiplier *= 0.95;
  if (notes.includes('new') || notes.includes('reset') || notes.includes('rookie') || notes.includes('draft')) multiplier *= 1.05;

  return (ev + scarcity) * sqAdj * multiplier;
};

const mlbCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const notes = (entry.notes || '').toLowerCase();
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  if (notes.includes('stuff+') || notes.includes('pitching+') || notes.includes('high stuff')) multiplier *= 1.15;
  if (notes.includes('breakout rotation') || notes.includes('young pitching') || notes.includes('velo')) multiplier *= 1.12;
  const name = entry.nameNormalized || '';
  if (notes.includes('veteran core') || notes.includes('aging') || ['newyorkmets', 'losangelesdodgers'].includes(name)) multiplier *= 0.85; 
  return (ev + (scarcity * 1.2)) * sqAdj * multiplier;
};

const f1Calc = (ev, scarcity, sq, entry) => {
  const expertValue = (sq * 20); 
  return (ev * 0.6 + expertValue * 0.4) + scarcity;
};

const llwsCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const notes = (entry.notes || '').toLowerCase();
  const region = (entry.region || '').toLowerCase();
  const name = entry.nameNormalized || '';
  if (['asia-pacific', 'japan', 'taiwan', 'south korea', 'chinese taipei'].includes(region) || ['taipei', 'tokyo', 'seoul', 'taoyuan'].some(r => name.includes(r))) multiplier *= 1.35; 
  else if (region === 'caribbean' || notes.includes('curacao') || name.includes('willemstad')) multiplier *= 1.25; 
  else if (['west', 'hawaii', 'california', 'honolulu', 'el segundo'].some(r => name.includes(r) || region.includes(r))) multiplier *= 1.20;
  if (notes.includes('pitching depth') || notes.includes('multiple aces') || notes.includes('3+ arms')) multiplier *= 1.25;
  else if (notes.includes('one-man team') || notes.includes('single ace') || notes.includes('relies on one')) multiplier *= 0.85; 
  if (notes.includes('high run differential') || notes.includes('gamechanger') || notes.includes('run rule') || notes.includes('elite ops')) multiplier *= 1.15;
  if (!['asia-pacific', 'japan', 'taiwan', 'south korea'].includes(region) && (notes.includes('size advantage') || notes.includes('power hitting') || notes.includes('thick'))) multiplier *= 1.10;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const indycarCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let equipmentMult = 1.0;
  let participationMult = 1.0;
  if (['alexpalou', 'scottdixon', 'coltonherta', 'kylekirkwood', 'marcusericsson'].includes(name)) equipmentMult = 1.25;
  else if (['josefnewgarden', 'scottmclaughlin', 'davidmalukas', 'patooward'].includes(name)) equipmentMult = 1.12;
  else if (['willpower', 'christianlundgaard', 'felixrosenqvist'].includes(name)) equipmentMult = 1.0;
  else equipmentMult = 0.85;
  if (name === 'takumasato' || notes.includes('500 only')) participationMult = 0.05;
  else if (['conordaly', 'christianrasmussen', 'mickschumacher'].includes(name) || notes.includes('partial') || notes.includes('road course only')) participationMult = 0.55; 
  if (notes.includes('pay driver') || notes.includes('funded') || ['stingrayrobb', 'kyffinsimpson', 'nolansiegel', 'devlindefrancesco'].includes(name)) equipmentMult *= 0.80;
  const sqTiebreaker = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.15;
  return (ev + scarcity) * equipmentMult * participationMult * sqTiebreaker;
};

const SPORT_CALCULATORS = {
  nfl: nflCalc, nba: nbaCalc, mlb: mlbCalc, 
  nhl: (ev, s, sq) => (ev + s) * (1.0 + (sq - 1) * 0.5),
  ncaaf: (ev, s, sq) => (ev + s) * (1.0 / (1.0 + Math.max(0, sq - 1.10) * 1.5)), 
  ncaab: genericCalc, ncaaw: genericCalc, wnba: genericCalc,
  afl: (ev, s, sq) => (ev + s) * (1.0 + (sq - 1) * 0.5),
  f1: f1Calc, ucl: genericCalc, fifa: genericCalc,
  darts: (ev, s, sq) => (ev * 0.5 + (sq * 15) * 0.5) + s, 
  snooker: (ev, s, sq) => (ev * 0.5 + (sq * 15) * 0.5) + s, 
  llws: llwsCalc, indycar: indycarCalc, 
  pga: (ev, s, sq) => (ev * 0.6 + (sq * 20) * 0.4) + s, 
  tennis_m: genericCalc, tennis_w: genericCalc, 
  csgo: (ev, s, sq) => (ev + s) * (1.0 + (sq - 1) * 0.5) * 1.15
};

export function applyPositionalScarcity(sportEntries, globalModifier) {
  if (!sportEntries || sportEntries.length < 2) return;
  const sportId = sportEntries[0].sport;
  const calc = SPORT_CALCULATORS[sportId] || genericCalc;
  const confidenceMult = GLOBAL_CONFIDENCE_INDEX[sportId] || 1.0;
  sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));
  for (let i = 0; i < sportEntries.length; i++) {
    const current = sportEntries[i];
    const rawEV = current.ev?.seasonTotal || 0;
    let nextUndraftedIndex = -1;
    for (let j = i + 1; j < sportEntries.length; j++) {
      if (!sportEntries[j].drafted) { nextUndraftedIndex = j; break; }
    }
    let gapToNext = 0;
    if (nextUndraftedIndex !== -1) {
      gapToNext = rawEV - (sportEntries[nextUndraftedIndex].ev?.seasonTotal || 0);
    }
    const remainingUndrafted = sportEntries.filter((e, idx) => idx >= i && !e.drafted).length;
    const scarcityBonus = remainingUndrafted > 0 ? (gapToNext * 2) / remainingUndrafted : 0;
    const baseAdpScore = calc(rawEV, scarcityBonus, (current.adjSq || 1.0), current);
    current.evGap = parseFloat(gapToNext.toFixed(2));
    current.remainingUndrafted = remainingUndrafted;
    current.scarcityBonus = parseFloat(scarcityBonus.toFixed(2));
    current.adpScore = parseFloat((baseAdpScore * confidenceMult).toFixed(2));
  }
  // Velocity pass
  const undraftedOnly = sportEntries.filter(e => !e.drafted);
  for (const current of sportEntries) {
    const uIdx = undraftedOnly.findIndex(e => e.id === current.id);
    let velocity = 1.0;
    if (uIdx !== -1 && undraftedOnly.length > 3) {
      const getScore = (idx) => undraftedOnly[idx]?.adpScore || 0;
      const score = current.adpScore || 0;
      const dropAbove1 = uIdx > 0 ? getScore(uIdx - 1) - score : 0;
      const dropAbove2 = uIdx > 1 ? getScore(uIdx - 2) - getScore(uIdx - 1) : dropAbove1;
      const avgInertia = (dropAbove1 + dropAbove2) / 2;
      const dropBelow1 = uIdx < undraftedOnly.length - 1 ? score - getScore(uIdx + 1) : 0;
      const dropBelow2 = uIdx < undraftedOnly.length - 2 ? getScore(uIdx + 1) - getScore(uIdx + 2) : dropBelow1;
      const avgMomentum = (dropBelow1 + dropBelow2) / 2;
      velocity = avgMomentum / (Math.max(avgInertia, 0.5));
    }
    current.dropoffVelocity = parseFloat(velocity.toFixed(2));
  }
}

const CURRENT_WEIGHT = 0.7;
const HISTORICAL_WEIGHT = 0.3;

export function calculateHistoricallyWeightedEV(americanOdds, category, eventsPerSeason, historicalData) {
  const currentEV = calculateSeasonTotalEV(americanOdds, category, eventsPerSeason);
  if (!historicalData || !historicalData.history || historicalData.history.length < 2) return currentEV;
  const historicalOdds = historicalData.history.map((h) => h.odds).filter(Boolean);
  if (historicalOdds.length === 0) return currentEV;
  const avgHistoricalProb = historicalOdds.reduce((sum, odds) => sum + americanToImpliedProbability(odds), 0) / historicalOdds.length;
  const historicalAmericanOdds = probabilityToAmerican(avgHistoricalProb);
  const historicalEV = calculateSeasonTotalEV(historicalAmericanOdds, category, eventsPerSeason);
  const blendedSeasonTotal = CURRENT_WEIGHT * currentEV.seasonTotal + HISTORICAL_WEIGHT * historicalEV.seasonTotal;
  return { ...currentEV, seasonTotal: parseFloat(blendedSeasonTotal.toFixed(2)), historicalBlend: true };
}
