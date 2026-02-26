import { getScoringTable, STANDARD_SCORING, QP_SCORING } from '../data/scoring';
import { americanToImpliedProbability } from './oddsConverter';

const QP_MAX = 20; // max QP points awarded for a 1st-place finish

// Probability that a finish position ties with the adjacent position.
// Brackt rules split tied positions equally: e.g. 2nd+3rd tie → (70+50)/2 = 60 each.
const TIE_PROB = 0.05;

/**
 * Adjust a scoring table's point values to account for the probability of tying
 * with the next adjacent tier. Returns a new table with effective (blended) points.
 */
function withTieAdjustment(scoringTable) {
  return scoringTable.map((tier, i) => {
    const next = scoringTable[i + 1];
    if (!next) return tier;
    const effectivePts = (1 - TIE_PROB) * tier.points + TIE_PROB * (tier.points + next.points) / 2;
    return { ...tier, points: effectivePts };
  });
}

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
  const scoringTable = withTieAdjustment(getScoringTable(category));

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
 * Calculate EV for a QP sport (Golf, Tennis, Counter-Strike).
 *
 * The Brackt rules say: QP accumulates across all majors in the season,
 * and the season-end QP ranking earns standard points (100/70/50/40/25/15).
 * QP values themselves are NOT the fantasy scoring unit.
 *
 * Model:
 *  1. Compute expected QP per event from the per-event finish probability distribution.
 *  2. Derive "season strength" = E[QP/event] / QP_MAX (fraction of perfect performance).
 *     A player averaging 18/20 QP per event dominates season standings; one averaging
 *     2/20 will finish near the bottom.
 *  3. Apply standard scoring to the season-rank distribution driven by season strength.
 */
function calculateQPSeasonEV(americanOdds, eventsPerSeason, tournaments = null) {
  let expectedQPPerEvent = 0;
  const perFinish = {};
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
      const tProbs = estimateFinishProbabilities(tWinProb);
      let tQP = 0;
      for (const tier of withTieAdjustment(QP_SCORING)) {
        const [start, end] = tier.range;
        for (let pos = start; pos <= end; pos++) {
          tQP += (tProbs[pos] || 0) * tier.points;
        }
      }
      totalExpectedQP += tQP;
    }
    
    if (tKeys.length > 0) {
      expectedQPPerEvent = totalExpectedQP / tKeys.length;
      baseWinProb = sumProb / tKeys.length;
    }
    
    // For tooltip perFinish, use the average probability
    const probs = estimateFinishProbabilities(baseWinProb);
    for (const tier of withTieAdjustment(QP_SCORING)) {
      const [start, end] = tier.range;
      let tierEV = 0;
      for (let pos = start; pos <= end; pos++) {
        tierEV += (probs[pos] || 0) * tier.points;
      }
      perFinish[tier.finish] = parseFloat(tierEV.toFixed(2));
    }
  } else {
    baseWinProb = americanToImpliedProbability(americanOdds);
    const probs = estimateFinishProbabilities(baseWinProb);

    // Step 1: per-event QP breakdown
    for (const tier of withTieAdjustment(QP_SCORING)) {
      const [start, end] = tier.range;
      let tierEV = 0;
      for (let pos = start; pos <= end; pos++) {
        tierEV += (probs[pos] || 0) * tier.points;
      }
      expectedQPPerEvent += tierEV;
      perFinish[tier.finish] = parseFloat(tierEV.toFixed(2));
    }
  }

  // Step 2: season strength — how dominant is this player relative to perfect?
  const seasonStrength = Math.min(1, expectedQPPerEvent / QP_MAX);

  // Step 3: season-end rank distribution driven by season strength
  const seasonRankProbs = estimateFinishProbabilities(seasonStrength);
  let seasonEV = 0;
  const seasonPerFinish = {};
  for (const tier of withTieAdjustment(STANDARD_SCORING)) {
    const [start, end] = tier.range;
    let tierEV = 0;
    for (let pos = start; pos <= end; pos++) {
      tierEV += (seasonRankProbs[pos] || 0) * tier.points;
    }
    seasonEV += tierEV;
    seasonPerFinish[tier.finish] = parseFloat(tierEV.toFixed(2));
  }

  return {
    singleEvent: parseFloat(expectedQPPerEvent.toFixed(2)), // E[QP] per event (informational)
    seasonTotal: parseFloat(seasonEV.toFixed(2)),           // season standard-points EV
    winProbability: parseFloat((baseWinProb * 100).toFixed(1)),
    perFinish,           // per-event QP contributions by finish tier
    eventsPerSeason,
    // QP-specific fields used by the tooltip
    expectedQPPerEvent: parseFloat(expectedQPPerEvent.toFixed(2)),
    seasonStrength: parseFloat((seasonStrength * 100).toFixed(1)),
    seasonPerFinish,     // season rank → standard points contributions
    isQP: true,
  };
}

/**
 * Calculate season-total EV (for ADP ranking across sports).
 * Routes QP sports through the two-stage QP model.
 */
export function calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, tournaments = null) {
  if (category === 'qp') {
    return calculateQPSeasonEV(americanOdds, eventsPerSeason, tournaments);
  }

  const { singleEvent, winProbability, perFinish } = calculateSingleEventEV(americanOdds, category);
  return {
    singleEvent,
    seasonTotal: parseFloat((singleEvent * eventsPerSeason).toFixed(2)),
    winProbability,
    perFinish,
    eventsPerSeason,
  };
}

// Historical weighting constants
const CURRENT_WEIGHT = 0.7;
const HISTORICAL_WEIGHT = 0.3;
const TREND_MODIFIER = 0.03; // 3% boost/reduction for shortening/lengthening

/**
 * Calculate EV with historical weighting blended in.
 * Blends current odds (70%) with historical average (30%), then applies a trend modifier.
 *
 * @param americanOdds - current odds string
 * @param category - scoring category ('standard' or 'qp')
 * @param eventsPerSeason - events per season
 * @param historicalData - { history: [{ odds, date, source }], trend: 'shortening'|'stable'|'lengthening' }
 */
export function calculateHistoricallyWeightedEV(americanOdds, category, eventsPerSeason, historicalData, tournaments = null) {
  // Calculate EV from current odds
  const currentEV = calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, tournaments);

  if (!historicalData || !historicalData.history || historicalData.history.length < 2) {
    return currentEV;
  }

  // Calculate average historical implied probability
  const historicalOdds = historicalData.history
    .map((h) => h.odds)
    .filter(Boolean);

  if (historicalOdds.length === 0) return currentEV;

  const avgHistoricalProb =
    historicalOdds.reduce((sum, odds) => sum + americanToImpliedProbability(odds), 0) /
    historicalOdds.length;

  // Convert avg historical probability back to American odds for EV calculation
  let historicalAmericanOdds;
  if (avgHistoricalProb > 0.5) {
    historicalAmericanOdds = `${Math.round((-avgHistoricalProb * 100) / (1 - avgHistoricalProb))}`;
  } else if (avgHistoricalProb > 0) {
    historicalAmericanOdds = `+${Math.round((100 * (1 - avgHistoricalProb)) / avgHistoricalProb)}`;
  } else {
    return currentEV;
  }

  const historicalEV = calculateSeasonTotalEV(historicalAmericanOdds, category, eventsPerSeason);

  // Blend current (70%) and historical (30%) season totals
  let blendedSeasonTotal =
    CURRENT_WEIGHT * currentEV.seasonTotal + HISTORICAL_WEIGHT * historicalEV.seasonTotal;

  // Apply trend modifier
  const trend = historicalData.trend || 'stable';
  if (trend === 'shortening') {
    blendedSeasonTotal *= 1 + TREND_MODIFIER; // slight boost
  } else if (trend === 'lengthening') {
    blendedSeasonTotal *= 1 - TREND_MODIFIER; // slight reduction
  }

  return {
    ...currentEV,
    seasonTotal: parseFloat(blendedSeasonTotal.toFixed(2)),
    historicalBlend: true,
    historicalAvgOdds: historicalAmericanOdds,
    trend,
  };
}
