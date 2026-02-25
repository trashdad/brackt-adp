/**
 * Convert American odds to implied probability.
 * Negative odds: probability = |odds| / (|odds| + 100)
 * Positive odds: probability = 100 / (odds + 100)
 */
export function americanToImpliedProbability(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
  return 100 / (odds + 100);
}

/**
 * Convert American odds to decimal odds.
 */
export function americanToDecimal(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) {
    return 1 + 100 / Math.abs(odds);
  }
  return 1 + odds / 100;
}

/**
 * Format American odds with +/- prefix.
 */
export function formatAmericanOdds(odds) {
  const n = typeof odds === 'string' ? parseFloat(odds) : odds;
  if (isNaN(n)) return '--';
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Convert a probability (0-1) back to American odds.
 */
export function probabilityToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

/**
 * Remove vig from a set of odds-by-source and return vig-free odds + consensus.
 * @param {Object} oddsBySource - e.g. { draftkings: "+150", fanduel: "+160" }
 * @returns {{ vigFreeOdds: Object, consensus: string }} vig-free odds per source + consensus American odds
 */
export function removeVig(oddsBySource) {
  const entries = Object.entries(oddsBySource);
  const parsed = entries
    .map(([src, odds]) => [src, typeof odds === 'string' ? parseFloat(odds) : odds])
    .filter(([, n]) => !isNaN(n));

  if (parsed.length === 0) return { vigFreeOdds: {}, consensus: null };

  // Calculate implied probabilities
  const probs = parsed.map(([src, odds]) => {
    const prob = odds < 0
      ? Math.abs(odds) / (Math.abs(odds) + 100)
      : 100 / (odds + 100);
    return [src, prob];
  });

  // Total overround (vig)
  const totalImplied = probs.reduce((sum, [, p]) => sum + p, 0);

  // If total <= 1 (no vig detected), return as-is
  if (totalImplied <= 1) {
    const vigFreeOdds = {};
    for (const [src, odds] of parsed) {
      vigFreeOdds[src] = (odds > 0 ? '+' : '') + odds;
    }
    const avgProb = probs.reduce((sum, [, p]) => sum + p, 0) / probs.length;
    const consensusNum = probabilityToAmerican(avgProb);
    return {
      vigFreeOdds,
      consensus: consensusNum != null ? (consensusNum > 0 ? '+' + consensusNum : '' + consensusNum) : null,
    };
  }

  // Normalize probabilities to remove vig
  const vigFreeOdds = {};
  const trueProbs = [];
  for (const [src, prob] of probs) {
    const trueProb = prob / totalImplied;
    trueProbs.push(trueProb);
    const american = probabilityToAmerican(trueProb);
    vigFreeOdds[src] = american != null ? (american > 0 ? '+' + american : '' + american) : null;
  }

  // Consensus = average of true probabilities → American
  const avgTrueProb = trueProbs.reduce((s, p) => s + p, 0) / trueProbs.length;
  const consensusNum = probabilityToAmerican(avgTrueProb);
  const consensus = consensusNum != null ? (consensusNum > 0 ? '+' + consensusNum : '' + consensusNum) : null;

  return { vigFreeOdds, consensus };
}
