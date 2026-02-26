import { STANDARD_SCORING } from '../data/scoring';
import { americanToImpliedProbability, probabilityToAmerican } from './oddsConverter';
import SPORTS from '../data/sports';

/**
 * Probability weights for ranks 1–16 derived from QP_SCORING point values.
 * These define the shape of the finishing distribution tail:
 * P(rank=1) = winProb (exact), and ranks 2–16 decay proportionally to these weights,
 * mirroring the scoring table's point decay (100→70→50→40→25→15→…).
 */
const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];

/**
 * Build a calibrated rank probability distribution.
 * P(rank=1) = winProb exactly.
 * Remaining probability distributed across ranks 2–16 proportional to RANK_WEIGHTS.
 *
 * @param {number} winProb - Implied win probability (0–1).
 * @param {number} numPositions - Number of finishing positions (default 16).
 * @returns {number[]} Array of probabilities indexed 0 = rank 1, 15 = rank 16.
 */
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

/**
 * Build the finishing position distribution for an entry with a given win probability.
 * Returns an object { 1: prob, 2: prob, …, 16: prob } where keys are rank integers.
 *
 * P(rank=1) equals winProb exactly. All 16 probabilities sum to 1.
 *
 * @param {number} winProb - Implied probability of winning (1st place).
 * @returns {Object} Distribution map of { position: probability }.
 */
export function runFinishSimulation(winProb) {
  const distribution = {};
  const probs = buildRankProbabilities(winProb);
  for (let i = 0; i < 16; i++) {
    distribution[i + 1] = probs[i];
  }
  return distribution;
}

/**
 * Calculate EV based on a finish distribution and scoring table.
 */
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

/**
 * Calculate single-event EV. Capped at 100.
 * All sports (including Golf, Tennis, CS:Go) use this same formula.
 * For Golf/Tennis/CS:Go, the odds passed in are already the average of available
 * tournament-specific odds (resolved upstream in useOddsData).
 */
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
 * Golf, Tennis, and CS:Go have their odds pre-averaged in useOddsData before this call.
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
 * Apply positional scarcity premium to the raw EV.
 */
export function applyPositionalScarcity(sportEntries) {
  if (!sportEntries || sportEntries.length < 2) return;

  const sportId = sportEntries[0].sport;
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const baseMultiplier = sportConfig?.scarcityWeight ?? 0.5;
  const rankDecay = 0.9;

  sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));

  for (let i = 0; i < sportEntries.length; i++) {
    const current = sportEntries[i];
    const prev = sportEntries[i - 1];
    const next = sportEntries[i + 1] || { ev: { seasonTotal: 0 } };

    const rawEV = current.ev?.seasonTotal || 0;
    const prevEV = prev ? (prev.ev?.seasonTotal || 0) : rawEV;
    const nextEV = next.ev?.seasonTotal || 0;

    const gapToNext = rawEV - nextEV;
    const gapFromPrev = prevEV - rawEV;

    const timeDecay = Math.pow(rankDecay, i);
    const proximityMultiplier = 1 / (1 + (gapFromPrev * 0.1));
    const effectiveMultiplier = baseMultiplier * timeDecay * proximityMultiplier;

    current.evGap = parseFloat(gapToNext.toFixed(2));
    current.scarcityBonus = parseFloat((gapToNext * effectiveMultiplier).toFixed(2));
    current.adpScore = parseFloat((rawEV + current.scarcityBonus).toFixed(2));
  }
}

const CURRENT_WEIGHT = 0.7;
const HISTORICAL_WEIGHT = 0.3;

export function calculateHistoricallyWeightedEV(americanOdds, category, eventsPerSeason, historicalData) {
  const currentEV = calculateSeasonTotalEV(americanOdds, category, eventsPerSeason);

  if (!historicalData || !historicalData.history || historicalData.history.length < 2) {
    return currentEV;
  }

  const historicalOdds = historicalData.history.map((h) => h.odds).filter(Boolean);
  if (historicalOdds.length === 0) return currentEV;

  const avgHistoricalProb = historicalOdds.reduce((sum, odds) => sum + americanToImpliedProbability(odds), 0) / historicalOdds.length;
  const historicalAmericanOdds = probabilityToAmerican(avgHistoricalProb);
  const historicalEV = calculateSeasonTotalEV(historicalAmericanOdds, category, eventsPerSeason);

  const blendedSeasonTotal = CURRENT_WEIGHT * currentEV.seasonTotal + HISTORICAL_WEIGHT * historicalEV.seasonTotal;

  return {
    ...currentEV,
    seasonTotal: parseFloat(blendedSeasonTotal.toFixed(2)),
    historicalBlend: true,
  };
}
