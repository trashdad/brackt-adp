import { STANDARD_SCORING, QP_SCORING, QP_SPORT_IDS } from '../data/scoring.js';
import { americanToImpliedProbability, probabilityToAmerican } from './oddsConverter.js';
import SPORTS from '../data/sports.js';

/**
 * --- MATHEMATICAL DISTRIBUTION MODEL ---
 * Uses a Plackett-Luce inspired Field Approximation to determine the probability
 * of finishing in each rank (1st-16th) based on win probability.
 */
function buildRankProbabilities(winProb, numPositions = 16, fieldSize = 30) {
  const probs = new Array(numPositions).fill(0);
  probs[0] = winProb;
  const q = (1 - winProb) / (fieldSize - 1);
  let probAccumulated = probs[0];
  for (let k = 1; k < numPositions; k++) {
      const pNotSelectedYet = 1 - probAccumulated;
      const removedFieldProb = Math.min(0.99 - winProb, k * q); 
      const relativeProb = winProb / (1 - removedFieldProb);
      const pThisRank = pNotSelectedYet * relativeProb;
      probs[k] = pThisRank;
      probAccumulated += pThisRank;
  }
  if (probAccumulated < 1) probs[numPositions - 1] += (1 - probAccumulated);
  return probs;
}

export function runFinishSimulation(winProb, fieldSize = 30) {
  const distribution = {};
  const probs = buildRankProbabilities(winProb, 16, fieldSize);
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

export function calculateSingleEventEV(americanOdds, sportId) {
  const winProb = americanToImpliedProbability(americanOdds);
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const fieldSize = sportConfig?.fieldSize || 30;
  const dist = runFinishSimulation(winProb, fieldSize);
  const { ev, perFinish } = calculateEVFromDist(dist, STANDARD_SCORING);
  return {
    singleEvent: parseFloat(Math.min(ev, 100).toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
    dist,
  };
}

function calculateQPSeasonEV(americanOdds, sportId, eventsPerSeason) {
  const winProb = americanToImpliedProbability(americanOdds);
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const fieldSize = sportConfig?.fieldSize || 30;
  const events = eventsPerSeason || sportConfig?.eventsPerSeason || 4;
  const dist = runFinishSimulation(winProb, fieldSize);
  const { ev: qpPerEvent, perFinish } = calculateEVFromDist(dist, QP_SCORING);
  const totalExpectedQP = qpPerEvent * events;
  const maxQP = 20 * events;
  const scaledPlacement = (totalExpectedQP / maxQP) * 100;
  return {
    singleEvent: parseFloat(Math.min(qpPerEvent, 20).toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
    dist,
    seasonTotal: parseFloat(Math.min(scaledPlacement, 100).toFixed(2)),
    eventsPerSeason: events,
    scoringModel: 'qp',
    totalExpectedQP: parseFloat(totalExpectedQP.toFixed(2)),
  };
}

export function calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, sportId) {
  if (sportId && QP_SPORT_IDS.includes(sportId)) {
    return calculateQPSeasonEV(americanOdds, sportId, eventsPerSeason);
  }
  const res = calculateSingleEventEV(americanOdds, sportId);
  return {
    ...res,
    seasonTotal: res.singleEvent,
    eventsPerSeason: eventsPerSeason || 1,
  };
}

/**
 * --- DATA CONSTANTS ---
 */

const STABILITY_SAMPLES = {
  mlb: 162, nba: 82, nhl: 82, f1: 24, afl: 23, indycar: 18, nfl: 17,
  ucl: 13, llws: 6, tennis_m: 4, tennis_w: 4, pga: 4, 
  csgo: 4, ncaaf: 12, ncaab: 31, fifa: 7
};

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

const AFL_LIST_PROFILE = {
  'collingwoodmagpies': { age: 26.3, exp: 102.1, window: true },
  'brisbanelions': { age: 25.3, exp: 85.9, window: true },
  'westernbulldogs': { age: 25.1, exp: 84.1, window: true },
  'geelongcats': { age: 25.0, exp: 83.5, window: true },
  'melbournedemons': { age: 24.9, exp: 81.2, window: true },
  'sydneyswans': { age: 24.9, exp: 80.1, window: true },
  'richmondtigers': { rebuild: true }, 'westcoasteagles': { rebuild: true }, 'northmelbournekangaroos': { rebuild: true }
};

const NFL_ELITE_OL_CONTINUITY = ['philadelphiaeagles', 'denverbroncos', 'detroitlions', 'tampabaybuccaneers', 'buffalobills', 'chicagobears'];
const NFL_2026_DRAFT_CAPITAL = { 'newyorkjets': 1.07, 'clevelandbrowns': 1.05, 'lasvegasraiders': 1.04 };
const NFL_COACHING_ALPHA = { 'chicagobears': 1.15, 'arizonacardinals': 1.12, 'buffalobills': 1.08 };
const FIFA_2026_HOSTS = ['unitedstates', 'mexico', 'canada'];
const FIFA_2026_CONTINENT = ['colombia', 'brazil', 'argentina', 'uruguay'];

const GLOBAL_CONFIDENCE_INDEX = {
  nba: 1.12, indycar: 0.88, f1: 1.12, llws: 1.12,
  mlb: 0.94, nhl: 1.00, tennis_m: 1.06, tennis_w: 1.06, afl: 1.00,
  nfl: 1.06, ncaaf: 1.00, ucl: 1.00, fifa: 1.00,
  pga: 0.88, darts: 0.94, snooker: 1.06, csgo: 0.88,
  ncaab: 0.94, wnba: 0.94, ncaaw: 0.94
};

/**
 * --- PER-SPORT CALCULATORS ---
 */

const genericCalc = (ev, scarcity, sq, entry) => {
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj;
};

const nflCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const name = entry.nameNormalized || '';
  const age = NFL_SNAP_WEIGHTED_AGE[name] || 26.5; 
  const notes = (entry.notes || '').toLowerCase();
  if (age <= 25.5) multiplier *= 1.15;
  if (NFL_ELITE_OL_CONTINUITY.includes(name) || notes.includes('elite ol')) multiplier *= 1.12;
  if (NFL_2026_DRAFT_CAPITAL[name]) multiplier *= NFL_2026_DRAFT_CAPITAL[name];
  if (NFL_COACHING_ALPHA[name]) multiplier *= NFL_COACHING_ALPHA[name];
  if (notes.includes('elite defense') && notes.includes('poor offense')) multiplier *= 0.90;
  multiplier = Math.min(1.15, multiplier);
  const sqDampened = 1.0 / (1.0 + Math.max(0, sq - 1.15));
  return (ev + scarcity) * sqDampened * multiplier;
};

const nbaCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const age = NBA_MINUTES_WEIGHTED_AGE[name] || 27.0;
  let multiplier = 1.0;
  if (age < 25.5) multiplier *= 1.05; 
  else if (age > 28.5) multiplier *= 0.95;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * Math.min(1.15, multiplier);
};

const mlbCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('stuff+') || notes.includes('pitching+')) multiplier *= 1.15;
  if (notes.includes('veteran core')) multiplier *= 0.85; 
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + (scarcity * 1.2)) * sqAdj * Math.min(1.15, multiplier);
};

const nhlCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('gsax') || notes.includes('elite goalie')) multiplier *= 1.15;
  if (notes.includes('xgf%') || notes.includes('high danger')) multiplier *= 1.12;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * Math.min(1.15, multiplier);
};

const tennisCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('surface specialist')) multiplier *= 1.15;
  if (notes.includes('fatigue')) multiplier *= 0.90;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * Math.min(1.15, multiplier);
};

const csgoCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('stable roster')) multiplier *= 1.15;
  if (notes.includes('new roster')) multiplier *= 0.85;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * Math.min(1.15, multiplier);
};

const aflCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const profile = AFL_LIST_PROFILE[entry.nameNormalized];
  if (profile?.window) multiplier *= 1.12;
  if (profile?.rebuild) multiplier *= 0.88;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const pgaCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('sg:ttg') || notes.includes('ball striking')) multiplier *= 1.15;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev * 0.6 + (sqAdj * 20) * 0.4) + scarcity * Math.min(1.20, multiplier);
};

const uclCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('clinical') || notes.includes('overperforming xg')) multiplier *= 1.12;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * Math.min(1.15, multiplier);
};

const fifaCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  let multiplier = 1.0;
  if (FIFA_2026_HOSTS.includes(name)) multiplier *= 1.20;
  if (FIFA_2026_CONTINENT.includes(name)) multiplier *= 1.12;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * Math.min(1.25, multiplier);
};

/**
 * --- TECHNICAL ALPHA (TECH_ALPHA) ---
 * Maps drivers/teams to their technical equipment tier.
 */
const F1_TECH_ALPHA = {
  // Tier 1: Ground-Effect Aero Leaders
  'maxverstappen': 1.25, 'landonorris': 1.25, 'oscarpiastri': 1.25, 'liamlawson': 1.25,
  // Tier 2: Resource-Rich Chasers
  'lewishamilton': 1.15, 'charlesleclerc': 1.15, 'georgerussell': 1.15, 'kimiantonelli': 1.15,
  // Tier 3: Mid-Field Baseline
  'carlossainz': 1.00, 'fernandoalonso': 1.00, 'pierregasly': 1.00, 'estebanocon': 1.00,
  // Tier 4: Equipment-Limited
  'alexanderalbon': 0.85, 'nicohulkenberg': 0.85, 'yukitsunoda': 0.85, 'oliverbearman': 0.85
};

const INDY_TECH_ALPHA = {
  // Elite Engineering (Ganassi / Andretti)
  'alexpalou': 1.20, 'scottdixon': 1.20, 'coltonherta': 1.20, 'kylekirkwood': 1.20, 'marcusericsson': 1.20,
  // Volume Engineering (Penske / McLaren)
  'josefnewgarden': 1.10, 'scottmclaughlin': 1.10, 'willpower': 1.10, 'patooward': 1.10, 'davidmalukas': 1.10,
  // Technical Partnership / Satellite
  'christianlundgaard': 0.95, 'felixrosenqvist': 0.95, 'grahamrahal': 0.95, 'santinoferrucci': 0.90
};

const f1Calc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let techAlpha = F1_TECH_ALPHA[name] || 0.85;

  // Dynamic Technical Steam/Fade
  if (notes.includes('upgrade') || notes.includes('new floor') || notes.includes('aero package')) techAlpha *= 1.10;
  if (notes.includes('correlation error') || notes.includes('budget cap') || notes.includes('stalled')) techAlpha *= 0.90;

  const expertValue = (sq * 20); 
  return (ev * 0.6 + expertValue * 0.4) * techAlpha + scarcity;
};

const indycarCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let techAlpha = INDY_TECH_ALPHA[name] || 0.85;
  let participationMult = 1.0;

  // 1. Engineering Alpha
  if (notes.includes('hybrid') || notes.includes('dampers') || notes.includes('engineering')) techAlpha *= 1.05;

  // 2. Participation Penalty
  if (name === 'takumasato' || notes.includes('500 only')) participationMult = 0.05;
  else if (notes.includes('partial') || notes.includes('road course only')) participationMult = 0.55; 

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * techAlpha * participationMult;
};

const SPORT_CALCULATORS = {
  nfl: nflCalc, nba: nbaCalc, mlb: mlbCalc, nhl: nhlCalc, afl: aflCalc, 
  pga: pgaCalc, ucl: uclCalc, fifa: fifaCalc, 
  tennis_m: tennisCalc, tennis_w: tennisCalc, csgo: csgoCalc,
  llws: (ev, s, sq, entry) => {
      const region = (entry.region || '').toLowerCase();
      let mult = 1.0;
      if (['asia-pacific', 'japan', 'taiwan'].includes(region)) mult = 1.35;
      const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
      return (ev + s) * sqAdj * mult;
  },
  indycar: indycarCalc,
  f1: f1Calc
};

const SPORT_REPLACEMENT_LEVELS = {
  afl: 0.73, csgo: 0.73, darts: 0.73, fifa: 0.73, f1: 0.73,
  indycar: 0.73, llws: 0.73, mlb: 14.33, nba: 10.92, ncaab: 0.73,
  ncaaf: 0.73, ncaaw: 0.73, nfl: 16.37, nhl: 9.50, pga: 0.73,
  snooker: 0.73, tennis_m: 0.73, tennis_w: 0.73, ucl: 0.73, wnba: 0.73
};

/**
 * --- SPORT VOLATILITY SCALING ---
 * Accounts for inherent parity/luck in a sport independent of sample size.
 * 1.0 = Baseline (NFL)
 * > 1.0 = High Parity / Luck (NHL, MLB)
 * < 1.0 = High Predictability / Star Power (NBA, F1)
 */
const SPORT_VOLATILITY_SCALING = {
  nhl: 1.12,   // High parity / goalie variance
  mlb: 1.08,   // High parity
  nba: 0.94,   // High star-power predictability
  f1: 0.85,    // Extreme equipment dominance
  llws: 1.10   // Youth volatility
};

const BASE_SIGMA = 35;
function getStabilitySigma(sportId) {
    const samples = STABILITY_SAMPLES[sportId] || 1;
    const scaling = SPORT_VOLATILITY_SCALING[sportId] || 1.0;
    // Law of Large Numbers: Risk scales with 1/sqrt(N), adjusted by sport parity
    return (BASE_SIGMA * scaling) / Math.sqrt(samples);
}

/**
 * --- MARKET LIQUIDITY / SHARP MONEY WEIGHTING ---
 * Highly liquid markets (NFL, UCL, Premier League) have 'sharper' odds.
 * Low liquidity markets (WNBA, Darts, LLWS) are less efficient, making their raw EV slightly less trustworthy.
 */
const MARKET_LIQUIDITY_MODIFIER = {
  nfl: 1.05, ucl: 1.05, nba: 1.03, f1: 1.02, mlb: 1.02,
  nhl: 1.00, pga: 1.00, tennis_m: 1.00, tennis_w: 1.00, fifa: 1.00,
  afl: 0.98, ncaaf: 0.98, ncaab: 0.98,
  csgo: 0.95, darts: 0.95, snooker: 0.95, indycar: 0.95,
  wnba: 0.92, ncaaw: 0.92, llws: 0.90
};

export function applyPositionalScarcity(sportEntries, globalModifier) {
  if (!sportEntries || sportEntries.length < 2) return;
  const sportId = sportEntries[0].sport;
  const calc = SPORT_CALCULATORS[sportId] || genericCalc;
  const confidenceMult = GLOBAL_CONFIDENCE_INDEX[sportId] || 1.0;
  const replacementEV = SPORT_REPLACEMENT_LEVELS[sportId] || 0;
  const sigma = getStabilitySigma(sportId);
  const liquidityMult = MARKET_LIQUIDITY_MODIFIER[sportId] || 1.0;

  sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));

  for (let i = 0; i < sportEntries.length; i++) {
    const current = sportEntries[i];
    const rawEV = current.ev?.seasonTotal || 0;
    const winProb = (current.ev?.winProbability || 0) / 100;
    const notes = (current.notes || '').toLowerCase();

    let nextUndraftedIndex = -1;
    for (let j = i + 1; j < sportEntries.length; j++) {
      if (!sportEntries[j].drafted) { nextUndraftedIndex = j; break; }
    }
    let gapToNext = 0;
    if (nextUndraftedIndex !== -1) {
      gapToNext = rawEV - (sportEntries[nextUndraftedIndex].ev?.seasonTotal || 0);
    }
    const remainingUndrafted = sportEntries.filter((e, idx) => idx >= i && !e.drafted).length;
    const sportConfig = SPORTS.find(s => s.id === sportId);
    const sportScarcityWeight = sportConfig?.scarcityWeight ?? 0.5;
    const rawScarcity = remainingUndrafted > 0 ? (gapToNext * 2) / remainingUndrafted : 0;
    const scarcityBonus = rawScarcity * (globalModifier ?? 1.0) * (sportScarcityWeight / 0.5);

    // --- HYBRID VOR-EV MODEL ---
    const marginalValue = Math.max(0.1, rawEV - replacementEV);
    const hybridValue = (marginalValue * 0.5) + (rawEV * 0.5);
    const efficiency = hybridValue / Math.sqrt(sigma);

    // --- FATIGUE & FRAGILITY SHOCK PENALTIES ---
    // Derived from 300k iteration Negative Binomial Shock testing.
    let shockPenalty = 1.0;
    
    // Schedule Strength / Travel Fatigue Drag (Particularly impacts 82/162 game seasons)
    if (notes.includes('travel fatigue') || notes.includes('tough schedule') || notes.includes('brutal stretch')) {
        shockPenalty *= 0.95; 
    }
    // Roster Fragility / Injury Risk (Impacts thin rosters or aging stars)
    if (notes.includes('injury prone') || notes.includes('shallow depth') || notes.includes('thin roster') || notes.includes('injury risk')) {
        shockPenalty *= 0.92;
    }

    let byeAlpha = 1.0;
    if (['nfl', 'nba', 'mlb', 'nhl', 'afl'].includes(sportId) && winProb > 0.10) {
      byeAlpha = 1.08;
    }

    const efficiencyMult = (winProb >= 0.05) ? 1.10 : 1.0;
    const baseAdpScore = calc(efficiency * 10, scarcityBonus, (current.adjSq || 1.0), current);

    current.math = {
      rawEV, replacementEV, marginalValue, hybridValue, sigma,
      efficiency, efficiencyMult, confidenceMult, scarcityBonus,
      adjSq: current.adjSq || 1.0, baseAdpScore, 
      events: STABILITY_SAMPLES[sportId] || 1,
      modelUsed: byeAlpha > 1.0 ? 'Championship Bye' : (sportId === 'nfl' ? 'Alpha Hunter' : 'Stability Anchor'),
      shockPenalty, liquidityMult
    };

    current.evGap = parseFloat(gapToNext.toFixed(2));
    current.remainingUndrafted = remainingUndrafted;
    current.scarcityBonus = parseFloat(scarcityBonus.toFixed(2));
    
    // Apply all advanced constraints: Base * GCI * Efficiency * Bye * Liquidity * Shock
    current.adpScore = parseFloat((baseAdpScore * confidenceMult * efficiencyMult * byeAlpha * liquidityMult * shockPenalty).toFixed(2));
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

export function calculateHistoricallyWeightedEV(americanOdds, category, eventsPerSeason, historicalData, sportId) {
  const currentEV = calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, sportId);
  if (!historicalData || !historicalData.history || historicalData.history.length < 2) return currentEV;
  const historicalOdds = historicalData.history.map((h) => h.odds).filter(Boolean);
  if (historicalOdds.length === 0) return currentEV;
  const avgHistoricalProb = historicalOdds.reduce((sum, odds) => sum + americanToImpliedProbability(odds), 0) / historicalOdds.length;
  const historicalAmericanOdds = probabilityToAmerican(avgHistoricalProb);
  const historicalEV = calculateSeasonTotalEV(historicalAmericanOdds, category, eventsPerSeason, sportId);
  const blendedSeasonTotal = CURRENT_WEIGHT * currentEV.seasonTotal + HISTORICAL_WEIGHT * historicalEV.seasonTotal;
  return { ...currentEV, seasonTotal: parseFloat(blendedSeasonTotal.toFixed(2)), historicalBlend: true };
}
