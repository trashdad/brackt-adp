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

// ── Source sharpness weights ──────────────────────────────────────────────────
// Higher weight = more trusted. Pinnacle is the gold standard for sharp odds.
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
  return 0.70; // unknown source default
}

// ── Devigging methods ────────────────────────────────────────────────────────

/**
 * Power method — raises implied probabilities to a constant exponent k
 * such that they sum to 1. Moderately corrects favorite-longshot bias.
 * Recommended default; best balance of accuracy and robustness.
 */
export function powerDevig(impliedProbs) {
  const total = impliedProbs.reduce((s, p) => s + p, 0);
  if (total <= 1) return [...impliedProbs];
  // Binary search for exponent k where Σ(p_i^k) = 1
  let lo = 1.0, hi = 3.0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const sum = impliedProbs.reduce((s, p) => s + Math.pow(p, mid), 0);
    if (sum > 1) lo = mid;
    else hi = mid;
    if (Math.abs(sum - 1) < 1e-10) break;
  }
  const k = (lo + hi) / 2;
  return impliedProbs.map(p => Math.pow(p, k));
}

/**
 * Shin's method — solves for insider trading proportion z to correct
 * favorite-longshot bias. Most accurate for full-field markets.
 * Reference: Shin (1993), "Measuring the Incidence of Insider Trading in a Market for State-Contingent Claims"
 */
export function shinDevig(impliedProbs) {
  const n = impliedProbs.length;
  const total = impliedProbs.reduce((s, p) => s + p, 0);
  if (total <= 1) return [...impliedProbs];

  let z = 1 - 1 / total; // initial guess
  for (let iter = 0; iter < 100; iter++) {
    const trueProbs = impliedProbs.map(pi => {
      const disc = pi * pi - 4 * (1 - z) * (pi - z / n);
      return (pi + Math.sqrt(Math.max(disc, 0))) / (2 * (1 - z));
    });
    const sum = trueProbs.reduce((s, p) => s + p, 0);
    if (Math.abs(sum - 1) < 1e-8) return trueProbs;
    z = z + (sum - 1) * 0.3; // damped step
    z = Math.max(0, Math.min(z, 0.5));
  }
  // Fallback: return final iteration result
  return impliedProbs.map(pi => {
    const disc = pi * pi - 4 * (1 - z) * (pi - z / n);
    return (pi + Math.sqrt(Math.max(disc, 0))) / (2 * (1 - z));
  });
}

/**
 * Basic multiplicative normalization (original method).
 * Does NOT correct for favorite-longshot bias.
 */
export function basicDevig(impliedProbs) {
  const total = impliedProbs.reduce((s, p) => s + p, 0);
  if (total <= 1) return [...impliedProbs];
  return impliedProbs.map(p => p / total);
}

/**
 * Remove vig from a set of odds-by-source and return vig-free odds + consensus.
 * @param {Object} oddsBySource - e.g. { draftkings: "+150", fanduel: "+160" }
 * @param {string} method - 'power' (default), 'shin', or 'basic'
 * @returns {{ vigFreeOdds: Object, consensus: string }}
 */
export function removeVig(oddsBySource, method = 'power') {
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

  const impliedArr = probs.map(([, p]) => p);
  const totalImplied = impliedArr.reduce((s, p) => s + p, 0);

  // If total <= 1 (no vig detected), compute weighted consensus and return
  if (totalImplied <= 1) {
    const vigFreeOdds = {};
    for (const [src, odds] of parsed) {
      vigFreeOdds[src] = (odds > 0 ? '+' : '') + odds;
    }
    let wSum = 0, wTotal = 0;
    for (const [src, prob] of probs) {
      const w = getSharpness(src);
      wSum += prob * w;
      wTotal += w;
    }
    const consensusNum = probabilityToAmerican(wTotal > 0 ? wSum / wTotal : impliedArr[0]);
    return {
      vigFreeOdds,
      consensus: consensusNum != null ? (consensusNum > 0 ? '+' + consensusNum : '' + consensusNum) : null,
    };
  }

  // Apply selected devig method
  const devigFn = method === 'shin' ? shinDevig : method === 'basic' ? basicDevig : powerDevig;
  const trueProbs = devigFn(impliedArr);

  // Build vig-free odds per source
  const vigFreeOdds = {};
  for (let i = 0; i < probs.length; i++) {
    const [src] = probs[i];
    const american = probabilityToAmerican(trueProbs[i]);
    vigFreeOdds[src] = american != null ? (american > 0 ? '+' + american : '' + american) : null;
  }

  // Consensus = sharpness-weighted average of true probabilities → American
  let wSum = 0, wTotal = 0;
  for (let i = 0; i < probs.length; i++) {
    const [src] = probs[i];
    const w = getSharpness(src);
    wSum += trueProbs[i] * w;
    wTotal += w;
  }
  const avgTrueProb = wTotal > 0 ? wSum / wTotal : trueProbs[0];
  const consensusNum = probabilityToAmerican(avgTrueProb);
  const consensus = consensusNum != null ? (consensusNum > 0 ? '+' + consensusNum : '' + consensusNum) : null;

  return { vigFreeOdds, consensus };
}
