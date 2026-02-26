import { getScoringTable, STANDARD_SCORING, QP_SCORING } from '../data/scoring';
import { americanToImpliedProbability, probabilityToAmerican } from './oddsConverter';

const QP_MAX = 20; 
const SIM_ITERATIONS = 5000;

/**
 * Monte Carlo simulation to estimate finishing position distribution.
 * 
 * @param {number} winProb - The implied probability of winning (1st place).
 * @returns {Object} - Probability distribution for positions 1-16.
 */
export function runFinishSimulation(winProb) {
  const distribution = {};
  for (let i = 1; i <= 16; i++) distribution[i] = 0;

  // Strength of the player based on win probability
  // Higher win prob means they are more likely to finish higher.
  for (let i = 0; i < SIM_ITERATIONS; i++) {
    // Generate a performance score. 1st place is roughly 1.0, 16th is 0.
    // We use a power distribution to model the "reach" of a favorite vs underdog.
    // Favorites have a tighter, higher performance floor.
    const performance = Math.pow(Math.random(), 1 / (winProb * 10 + 0.5));
    
    // Map performance to a rank (simulated)
    let rank;
    if (performance > 0.95) rank = 1;
    else if (performance > 0.85) rank = 2;
    else if (performance > 0.75) rank = 3;
    else if (performance > 0.65) rank = 4;
    else if (performance > 0.50) rank = Math.floor(Math.random() * 2) + 5; // 5-6
    else if (performance > 0.35) rank = Math.floor(Math.random() * 2) + 7; // 7-8
    else if (performance > 0.15) rank = Math.floor(Math.random() * 4) + 9; // 9-12
    else rank = Math.floor(Math.random() * 4) + 13; // 13-16
    
    distribution[rank]++;
  }

  for (let i = 1; i <= 16; i++) {
    distribution[i] /= SIM_ITERATIONS;
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
 */
export function calculateSingleEventEV(americanOdds, category) {
  const winProb = americanToImpliedProbability(americanOdds);
  const dist = runFinishSimulation(winProb);
  const { ev, perFinish } = calculateEVFromDist(dist, getScoringTable(category));

  return {
    singleEvent: parseFloat(Math.min(ev, 100).toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
  };
}

/**
 * Calculate QP Season EV. Capped at 100.
 */
function calculateQPSeasonEV(americanOdds, eventsPerSeason, tournaments = null) {
  let expectedQPPerEvent = 0;
  let baseWinProb = 0;

  if (tournaments && Object.keys(tournaments).length > 0) {
    let totalExpectedQP = 0;
    const tKeys = Object.keys(tournaments);
    let sumProb = 0;
    
    for (const tId of tKeys) {
      const tOdds = tournaments[tId].odds;
      if (!tOdds) continue;
      const tWinProb = americanToImpliedProbability(tOdds);
      sumProb += tWinProb;
      const tDist = runFinishSimulation(tWinProb);
      const { ev: tQP } = calculateEVFromDist(tDist, QP_SCORING);
      totalExpectedQP += tQP;
    }
    
    expectedQPPerEvent = totalExpectedQP / tKeys.length;
    baseWinProb = sumProb / tKeys.length;
  } else {
    baseWinProb = americanToImpliedProbability(americanOdds);
    const dist = runFinishSimulation(baseWinProb);
    const { ev } = calculateEVFromDist(dist, QP_SCORING);
    expectedQPPerEvent = ev;
  }

  // Season Strength is the likelihood of finishing top of the QP table
  const seasonStrength = Math.min(1, expectedQPPerEvent / QP_MAX);
  
  // Final league points are determined by the season-end QP ranking simulation
  const seasonDist = runFinishSimulation(seasonStrength);
  const { ev: seasonEV, perFinish: seasonPerFinish } = calculateEVFromDist(seasonDist, STANDARD_SCORING);

  return {
    singleEvent: parseFloat(expectedQPPerEvent.toFixed(2)),
    seasonTotal: parseFloat(Math.min(seasonEV, 100).toFixed(2)),
    winProbability: parseFloat((baseWinProb * 100).toFixed(1)),
    eventsPerSeason,
    expectedQPPerEvent: parseFloat(expectedQPPerEvent.toFixed(2)),
    seasonStrength: parseFloat((seasonStrength * 100).toFixed(1)),
    seasonPerFinish,
    isQP: true,
  };
}

/**
 * Calculate total season EV. Always capped at 100 for any single roster spot.
 */
export function calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, tournaments = null) {
  if (category === 'qp') {
    return calculateQPSeasonEV(americanOdds, eventsPerSeason, tournaments);
  }

  const res = calculateSingleEventEV(americanOdds, category);
  return {
    ...res,
    seasonTotal: res.singleEvent, // For standard sports, one spot = one outcome (max 100)
    eventsPerSeason,
  };
}

/**
 * Apply positional scarcity premium to the raw EV.
 * 
 * "We need to pay particular attention to players or teams that have a high amount 
 * of percentage points difference between them and the next lowest team or player, 
 * as that increases their EV by showing positional scarcity."
 */
export function applyPositionalScarcity(sportEntries) {
  if (!sportEntries || sportEntries.length < 2) return;

  // Sort by raw seasonTotal EV descending
  sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));

  for (let i = 0; i < sportEntries.length; i++) {
    const current = sportEntries[i];
    const next = sportEntries[i + 1] || { ev: { seasonTotal: 0 } };
    
    const rawEV = current.ev?.seasonTotal || 0;
    const nextEV = next.ev?.seasonTotal || 0;
    const gap = rawEV - nextEV;

    // Scarcity Bonus: Boost EV based on the gap to the next player.
    // If you are 20 points better than the next guy, you are significantly more valuable.
    // We add a fraction of the gap to the "effective" score.
    const scarcityMultiplier = 0.5; // 50% of the gap is added as a 'value' bonus
    current.evGap = parseFloat(gap.toFixed(2));
    current.scarcityBonus = parseFloat((gap * scarcityMultiplier).toFixed(2));
    current.adpScore = parseFloat((rawEV + current.scarcityBonus).toFixed(2));
  }
}

// Keep historical weighting but use the new simulation-based EV
const CURRENT_WEIGHT = 0.7;
const HISTORICAL_WEIGHT = 0.3;

export function calculateHistoricallyWeightedEV(americanOdds, category, eventsPerSeason, historicalData, tournaments = null) {
  const currentEV = calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, tournaments);

  if (!historicalData || !historicalData.history || historicalData.history.length < 2) {
    return currentEV;
  }

  const historicalOdds = historicalData.history.map((h) => h.odds).filter(Boolean);
  if (historicalOdds.length === 0) return currentEV;

  const avgHistoricalProb = historicalOdds.reduce((sum, odds) => sum + americanToImpliedProbability(odds), 0) / historicalOdds.length;
  const historicalAmericanOdds = probabilityToAmerican(avgHistoricalProb);
  const historicalEV = calculateSeasonTotalEV(historicalAmericanOdds, category, eventsPerSeason);

  let blendedSeasonTotal = CURRENT_WEIGHT * currentEV.seasonTotal + HISTORICAL_WEIGHT * historicalEV.seasonTotal;

  return {
    ...currentEV,
    seasonTotal: parseFloat(blendedSeasonTotal.toFixed(2)),
    historicalBlend: true,
  };
}

