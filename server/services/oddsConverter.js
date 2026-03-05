/**
 * Odds conversion utilities for server-side use.
 * Mirrors src/services/oddsConverter.js — keep in sync.
 */

export function americanToImpliedProbability(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

export function probabilityToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

function formatOdds(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Remove vig from a set of odds-by-source and return consensus.
 * @param {Object} oddsBySource - e.g. { draftkings: "+150", fanduel: "+160" }
 * @returns {{ consensus: string|null, bestOdds: string|null, bestSource: string|null }}
 */
export function computeConsensus(oddsBySource) {
  const entries = Object.entries(oddsBySource);
  const parsed = entries
    .map(([src, val]) => [src, typeof val === 'string' ? parseFloat(val) : val])
    .filter(([, n]) => !isNaN(n));

  if (parsed.length === 0) return { consensus: null, bestOdds: null, bestSource: null };

  // Calculate implied probabilities
  const probs = parsed.map(([src, odds]) => {
    const prob = odds < 0
      ? Math.abs(odds) / (Math.abs(odds) + 100)
      : 100 / (odds + 100);
    return [src, prob];
  });

  const totalImplied = probs.reduce((sum, [, p]) => sum + p, 0);

  // Normalize if there's vig (total > 1), otherwise use raw
  const trueProbs = totalImplied > 1
    ? probs.map(([src, p]) => [src, p / totalImplied])
    : probs;

  // Consensus = average of true probabilities → American
  const avgProb = trueProbs.reduce((s, [, p]) => s + p, 0) / trueProbs.length;
  const consensusNum = probabilityToAmerican(avgProb);
  const consensus = consensusNum != null ? formatOdds(consensusNum) : null;

  // Best odds = lowest implied probability (longest shot = best value for bettor)
  let bestSrc = null, bestVal = null, bestProb = Infinity;
  for (const [src, prob] of probs) {
    if (prob > 0 && prob < bestProb) {
      bestProb = prob;
      bestSrc = src;
      const rawOdds = parsed.find(([s]) => s === src)?.[1];
      bestVal = rawOdds != null ? formatOdds(rawOdds) : null;
    }
  }

  return { consensus, bestOdds: bestVal, bestSource: bestSrc };
}
