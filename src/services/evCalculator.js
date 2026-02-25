import { getScoringTable } from '../data/scoring';
import { americanToImpliedProbability } from './oddsConverter';

/**
 * Given a win probability, estimate the probability distribution for each finish position.
 * Uses a probability decay model as described in the plan.
 */
function estimateFinishProbabilities(winProb) {
  const p1 = winProb;
  const p2 = Math.min(winProb * 1.2, 0.4);
  const p3 = Math.min(winProb * 1.1, 0.35);
  const p4 = Math.min(winProb * 1.0, 0.3);

  const usedTop4 = p1 + p2 + p3 + p4;
  const remaining = Math.max(0, 1 - usedTop4);

  // Distribute remaining across positions 5-16
  const p5_6 = remaining * 0.25; // each of 5th, 6th
  const p7_8 = remaining * 0.15; // each of 7th, 8th
  const p9_12 = remaining * 0.06; // each of 9-12
  const p13_16 = remaining * 0.02; // each of 13-16

  return {
    1: p1,
    2: p2,
    3: p3,
    4: p4,
    5: p5_6, 6: p5_6,
    7: p7_8, 8: p7_8,
    9: p9_12, 10: p9_12, 11: p9_12, 12: p9_12,
    13: p13_16, 14: p13_16, 15: p13_16, 16: p13_16,
  };
}

/**
 * Calculate single-event EV for a player/team given American odds and scoring category.
 */
export function calculateSingleEventEV(americanOdds, category) {
  const winProb = americanToImpliedProbability(americanOdds);
  const probs = estimateFinishProbabilities(winProb);
  const scoringTable = getScoringTable(category);

  let ev = 0;
  const perFinish = {};

  for (const tier of scoringTable) {
    const [start, end] = tier.range;
    let tierEV = 0;
    for (let pos = start; pos <= end; pos++) {
      tierEV += (probs[pos] || 0) * tier.points;
    }
    ev += tierEV;
    perFinish[tier.finish] = parseFloat(tierEV.toFixed(2));
  }

  return {
    singleEvent: parseFloat(ev.toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
  };
}

/**
 * Calculate season-total EV (for ADP ranking across sports).
 */
export function calculateSeasonTotalEV(americanOdds, category, eventsPerSeason) {
  const { singleEvent, winProbability, perFinish } = calculateSingleEventEV(americanOdds, category);
  return {
    singleEvent,
    seasonTotal: parseFloat((singleEvent * eventsPerSeason).toFixed(2)),
    winProbability,
    perFinish,
    eventsPerSeason,
  };
}
