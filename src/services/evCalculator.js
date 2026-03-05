import { STANDARD_SCORING, QP_SCORING, QP_SPORT_IDS } from '../data/scoring.js';
import { americanToImpliedProbability, probabilityToAmerican } from './oddsConverter.js';
import SPORTS from '../data/sports.js';

/**
 * --- MATHEMATICAL DISTRIBUTION MODEL ---
 * Uses a Plackett-Luce inspired Field Approximation to determine the probability
 * of finishing in each rank (1st-16th) based on win probability.
 */
export function buildRankProbabilities(winProb, numPositions = 16, fieldSize = 30) {
  const probs = new Array(numPositions).fill(0);
  probs[0] = winProb;
  const q = (1 - winProb) / (fieldSize - 1);
  let probAccumulated = probs[0];
  for (let k = 1; k < numPositions; k++) {
      const pNotSelectedYet = 1 - probAccumulated;
      // Phase 1: Numerical guard for extreme favorites (winProb > 0.5)
      const removedFieldProb = Math.min(Math.min(0.99 - winProb, k * q), 0.90);
      const denominator = Math.max(1 - removedFieldProb, 0.01);
      const relativeProb = winProb / denominator;
      const pThisRank = Math.min(pNotSelectedYet * relativeProb, pNotSelectedYet);
      probs[k] = pThisRank;
      probAccumulated += pThisRank;
  }
  // Normalization pass — ensure probabilities sum to 1.0
  const total = probs.reduce((a, b) => a + b, 0);
  if (total > 0 && (total < 0.99 || total > 1.01)) {
    for (let i = 0; i < numPositions; i++) probs[i] /= total;
  } else if (probAccumulated < 1) {
    probs[numPositions - 1] += (1 - probAccumulated);
  }
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

// ============================================================================
// DATA CONSTANTS
// ============================================================================

export const STABILITY_SAMPLES = {
  mlb: 162, nba: 82, nhl: 82, f1: 24, afl: 23, indycar: 18, nfl: 17,
  ucl: 13, llws: 6, tennis_m: 4, tennis_w: 4, pga: 4,
  csgo: 4, ncaaf: 12, ncaab: 31, fifa: 7,
  darts: 1, snooker: 1, wnba: 1, ncaaw: 1
};

// Phase 2: VOR replacement levels — 75th-percentile EV per sport
const SPORT_REPLACEMENT_LEVELS = {
  afl: 4.50, darts: 2.80, fifa: 3.10, f1: 5.20,
  indycar: 4.80, llws: 3.50, mlb: 14.33, nba: 10.92, ncaab: 2.10,
  ncaaf: 6.80, ncaaw: 3.50, nfl: 16.37, nhl: 9.50,
  snooker: 3.20, ucl: 5.50, wnba: 7.20,
  pga: 14.00, tennis_m: 12.00, tennis_w: 12.00, csgo: 12.00,
};

export const SPORT_VOLATILITY_SCALING = {
  nhl: 1.12, mlb: 1.08, nba: 0.94, f1: 0.85, llws: 1.10
};

const BASE_SIGMA = 35;
function getStabilitySigma(sportId) {
    const samples = STABILITY_SAMPLES[sportId] || 1;
    const scaling = SPORT_VOLATILITY_SCALING[sportId] || 1.0;
    return (BASE_SIGMA * scaling) / Math.sqrt(samples);
}

// ============================================================================
// MAIN DPS PIPELINE — applyPositionalScarcity
// ============================================================================

export function applyPositionalScarcity(sportEntries, globalModifier) {
  if (!sportEntries || sportEntries.length < 2) return;
  const sportId = sportEntries[0].sport;
  const replacementEV = SPORT_REPLACEMENT_LEVELS[sportId] || 0;
  const sigma = getStabilitySigma(sportId);

  sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));

  // ── QP Sports Pre-Pass: Convert expected QP rankings → expected standard points ──
  if (QP_SPORT_IDS.includes(sportId)) {
    const stdPts = [100, 70, 50, 40, 25, 25, 15, 15];
    const qpSorted = [...sportEntries].sort((a, b) =>
      (b.ev?.totalExpectedQP || b.ev?.seasonTotal || 0) - (a.ev?.totalExpectedQP || a.ev?.seasonTotal || 0)
    );
    const topQP = Math.max(qpSorted[0]?.ev?.totalExpectedQP || qpSorted[0]?.ev?.seasonTotal || 1, 0.01);

    for (let r = 0; r < qpSorted.length; r++) {
      const entry = qpSorted[r];
      const myQP = entry.ev?.totalExpectedQP || entry.ev?.seasonTotal || 0;
      const gapAbove = r > 0 ? ((qpSorted[r-1]?.ev?.totalExpectedQP || qpSorted[r-1]?.ev?.seasonTotal || 0) - myQP) : topQP;
      const gapBelow = r < qpSorted.length - 1
        ? myQP - (qpSorted[r+1]?.ev?.totalExpectedQP || qpSorted[r+1]?.ev?.seasonTotal || 0)
        : myQP;
      const totalGap = Math.max(gapAbove + gapBelow, 0.01);
      const upRisk = gapAbove / totalGap;
      const downRisk = gapBelow / totalGap;

      const thisPts = stdPts[Math.min(r, stdPts.length - 1)] || 0;
      const abovePts = r > 0 ? (stdPts[Math.min(r - 1, stdPts.length - 1)] || 0) : thisPts;
      const belowPts = stdPts[Math.min(r + 1, stdPts.length - 1)] || 0;

      const blendWeight = 0.80;
      const neighborWeight = 0.10;
      const qpStandardEV = thisPts * blendWeight
        + abovePts * neighborWeight * (1 - upRisk)
        + belowPts * neighborWeight * (1 - downRisk);

      entry._qpStandardEV = parseFloat(Math.max(qpStandardEV, 0).toFixed(2));
    }
  }

  for (let i = 0; i < sportEntries.length; i++) {
    const current = sportEntries[i];
    const rawEV = (QP_SPORT_IDS.includes(sportId) && current._qpStandardEV != null)
      ? current._qpStandardEV
      : (current.ev?.seasonTotal || 0);

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

    const marginalValue = Math.max(0.1, rawEV - replacementEV);
    const hybridValue = (marginalValue * 0.5) + (rawEV * 0.5);
    const efficiency = hybridValue / Math.sqrt(sigma);

    current.math = {
      rawEV, replacementEV, marginalValue, hybridValue, sigma,
      efficiency, scarcityBonus,
      adjSq: current.adjSq || 1.0,
      events: STABILITY_SAMPLES[sportId] || 1,
      qpRankConverted: QP_SPORT_IDS.includes(sportId) && current._qpStandardEV != null,
      qpExpectedQP: current.ev?.totalExpectedQP || null,
    };

    current.evGap = parseFloat(gapToNext.toFixed(2));
    current.remainingUndrafted = remainingUndrafted;
    current.scarcityBonus = parseFloat(scarcityBonus.toFixed(2));
    current.adpScore = parseFloat((efficiency * 10 + scarcityBonus).toFixed(2));
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

// ============================================================================
// HISTORICAL BLENDING
// ============================================================================

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
