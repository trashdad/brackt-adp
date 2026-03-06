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

// ── Source sharpness weights (keep in sync with client) ──────────────────────
const SOURCE_SHARPNESS = {
  pinnacle: 1.0,
  betfair: 0.95,
  bet365: 0.85,
  draftkings: 0.75,
  fanduel: 0.75,
  betmgm: 0.70,
  caesars: 0.70,
  manual: 0.60,
};
function getSharpness(source) {
  const key = source.toLowerCase().replace(/[\s_-]/g, '');
  for (const [k, v] of Object.entries(SOURCE_SHARPNESS)) {
    if (key.includes(k)) return v;
  }
  return 0.70;
}

/** Power method — raises implied probs to exponent k so they sum to 1. */
export function powerDevig(impliedProbs) {
  const total = impliedProbs.reduce((s, p) => s + p, 0);
  if (total <= 1) return [...impliedProbs];
  let lo = 1.0, hi = 3.0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const sum = impliedProbs.reduce((s, p) => s + Math.pow(p, mid), 0);
    if (sum > 1) lo = mid; else hi = mid;
    if (Math.abs(sum - 1) < 1e-10) break;
  }
  const k = (lo + hi) / 2;
  return impliedProbs.map(p => Math.pow(p, k));
}

/** Basic multiplicative normalization (original method). */
function basicDevig(impliedProbs) {
  const total = impliedProbs.reduce((s, p) => s + p, 0);
  if (total <= 1) return [...impliedProbs];
  return impliedProbs.map(p => p / total);
}

/**
 * Remove vig from a set of odds-by-source and return consensus.
 * Uses Power method by default to correct for favorite-longshot bias.
 * Weights sources by sharpness (Pinnacle > soft books).
 * @param {Object} oddsBySource - e.g. { draftkings: "+150", fanduel: "+160" }
 * @param {string} method - 'power' (default) or 'basic'
 * @returns {{ consensus: string|null, bestOdds: string|null, bestSource: string|null }}
 */
export function computeConsensus(oddsBySource, method = 'power') {
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

  const impliedArr = probs.map(([, p]) => p);
  const totalImplied = impliedArr.reduce((s, p) => s + p, 0);

  // Devig
  const devigFn = method === 'basic' ? basicDevig : powerDevig;
  const trueProbs = totalImplied > 1 ? devigFn(impliedArr) : impliedArr;

  // Consensus = sharpness-weighted average → American
  let wSum = 0, wTotal = 0;
  for (let i = 0; i < probs.length; i++) {
    const [src] = probs[i];
    const w = getSharpness(src);
    wSum += trueProbs[i] * w;
    wTotal += w;
  }
  const avgProb = wTotal > 0 ? wSum / wTotal : trueProbs[0];
  const consensusNum = probabilityToAmerican(avgProb);
  const consensus = consensusNum != null ? formatOdds(consensusNum) : null;

  // Best odds = lowest implied probability (best value for bettor)
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
