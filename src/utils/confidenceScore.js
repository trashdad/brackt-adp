/**
 * Confidence Score System — Error bands for WizardEV
 *
 * Composite Confidence Score (CCS) combines three signals:
 *   1. Distribution entropy (50%) — how spread out posProbs are across positions
 *   2. Model agreement (25%) — |ikynEV - waEV| divergence
 *   3. Sport predictability (25%) — from SPORT_GAMMA + stability samples
 *
 * CCS drives:
 *   - ± range displayed on each entry (higher CCS = tighter bands)
 *   - Color coding (green = tight, red = wide)
 *   - Risk-Adjusted WizardEV (RA-WEV) with 8% max discount
 */

import { SPORT_GAMMA, WA_CONCENTRATION_GAMMA_DEFAULT } from './ikynEV';
import { STABILITY_SAMPLES, SPORT_VOLATILITY_SCALING } from '../services/evCalculator';

const NUM_POSITIONS = 8;
const MAX_ENTROPY = Math.log2(NUM_POSITIONS); // 3.0

// Weights for composite score
const W_ENTROPY = 0.50;
const W_MODEL_AGREEMENT = 0.25;
const W_SPORT_PREDICTABILITY = 0.25;

// RA-WEV max discount (8% = midpoint of 5-10% range)
const RA_MAX_DISCOUNT = 0.08;

// Plus-minus scaling: entropyRatio=1 → ± 40% of wizardEV
const PM_SCALE = 0.40;

/**
 * Shannon entropy of a probability distribution.
 * Returns 0 (all mass on one outcome) to MAX_ENTROPY (uniform).
 */
export function computeEntropy(probs) {
  if (!probs || probs.length === 0) return MAX_ENTROPY;
  let H = 0;
  for (const p of probs) {
    if (p > 0) H -= p * Math.log2(p);
  }
  return H;
}

/**
 * Model agreement: how close ikynEV and waEV are.
 * Returns 0 (completely disagree) to 1 (perfect agreement).
 */
export function computeModelAgreement(ikynEV, waEV) {
  if (ikynEV == null || waEV == null) return null; // can't compute
  const spread = Math.abs(ikynEV - waEV);
  // Normalize: spread of 0 = 1.0, spread of 100+ = 0.0
  return Math.max(0, 1 - spread / 100);
}

/**
 * Sport predictability score from existing constants.
 * Returns 0 (chaotic) to 1 (highly predictable).
 */
export function computeSportPredictability(sportId) {
  const gamma = SPORT_GAMMA[sportId] ?? WA_CONCENTRATION_GAMMA_DEFAULT;
  const samples = STABILITY_SAMPLES[sportId] || 1;
  const volatility = SPORT_VOLATILITY_SCALING[sportId] || 1.0;

  // Gamma contribution: scale 0.85-1.50 to 0-1
  const gammaScore = Math.min(Math.max((gamma - 0.85) / (1.50 - 0.85), 0), 1);

  // Sample stability: more events per season → more stable
  const sampleScore = Math.min(Math.sqrt(samples) / Math.sqrt(162), 1);

  // Volatility penalty: >1 = more volatile
  const volScore = Math.min(1 / volatility, 1);

  return gammaScore * 0.5 + sampleScore * 0.3 + volScore * 0.2;
}

/**
 * Composite Confidence Score (CCS): 0 to 1.
 * 1 = highest confidence, 0 = pure uncertainty.
 */
export function computeCCS(entropy, modelAgreement, sportPredictability) {
  // Entropy component: low entropy = high confidence
  const entropyScore = 1 - (entropy / MAX_ENTROPY);

  if (modelAgreement != null) {
    return (
      W_ENTROPY * entropyScore +
      W_MODEL_AGREEMENT * modelAgreement +
      W_SPORT_PREDICTABILITY * sportPredictability
    );
  }
  // No model agreement available — redistribute weight to entropy + sport
  return 0.65 * entropyScore + 0.35 * sportPredictability;
}

/**
 * Compute ± value from wizardEV and CCS.
 * Higher CCS = tighter band (smaller ±).
 */
export function computePlusMinus(wizardEV, ccs) {
  if (wizardEV == null || wizardEV <= 0) return null;
  // Invert CCS: low confidence = wide band
  const entropyRatio = 1 - ccs;
  return wizardEV * entropyRatio * PM_SCALE;
}

/**
 * Plus-minus as a percentage of wizardEV.
 */
export function plusMinusPct(plusMinus, wizardEV) {
  if (!wizardEV || wizardEV <= 0 || plusMinus == null) return null;
  return (plusMinus / wizardEV) * 100;
}

/**
 * Risk-Adjusted WizardEV: light discount based on CCS.
 * Max 8% discount for CCS=0; no discount for CCS=1.
 */
export function computeRiskAdjustedWEV(wizardEV, ccs) {
  if (wizardEV == null) return null;
  const discount = 1 - (RA_MAX_DISCOUNT * (1 - ccs));
  return wizardEV * discount;
}

/**
 * Tailwind color class for confidence ± value.
 * Based on ± as percentage of wizardEV.
 */
export function getConfidenceColor(pct) {
  if (pct == null) return 'text-retro-light/30';
  if (pct < 10) return 'text-retro-lime';   // tight band — high confidence
  if (pct < 20) return 'text-retro-cyan';   // moderate
  if (pct < 30) return 'text-retro-gold';   // caution
  return 'text-retro-red';                   // wide band — low confidence
}

/**
 * Human-readable confidence tier label.
 */
export function getConfidenceTier(pct) {
  if (pct == null) return 'N/A';
  if (pct < 10) return 'HIGH';
  if (pct < 20) return 'MODERATE';
  if (pct < 30) return 'WIDE';
  return 'VERY WIDE';
}

/**
 * Enrich an array of entries with confidence data.
 * Expects each entry to have: ikynEV, waEV, wizardEV, sport,
 * and ikynDetail (with posProbs/waPosProbs from computeIkynEV).
 */
export function enrichWithConfidence(entries, ikynEVMap) {
  for (const entry of entries) {
    const detail = ikynEVMap[entry.id];
    if (!detail || entry.isPlaceholder) {
      entry.ccs = null;
      entry.plusMinus = null;
      entry.plusMinusPct = null;
      entry.riskAdjustedWEV = null;
      entry.confidenceColor = 'text-retro-light/30';
      entry.confidenceTier = 'N/A';
      continue;
    }

    // Use the model's probability distribution for entropy
    const probs = detail.wizardModel === 'ikyn'
      ? detail.posProbs
      : detail.waPosProbs;

    const entropy = computeEntropy(probs);
    const modelAgree = computeModelAgreement(detail.ev, detail.waEV);
    const sportPred = computeSportPredictability(entry.sport);
    const ccs = computeCCS(entropy, modelAgree, sportPred);
    const wev = detail.wizardEV ?? 0;
    const pm = computePlusMinus(wev, ccs);
    const pmPct = plusMinusPct(pm, wev);

    entry.ccs = ccs;
    entry.plusMinus = pm;
    entry.plusMinusPct = pmPct;
    entry.riskAdjustedWEV = computeRiskAdjustedWEV(wev, ccs);
    entry.confidenceColor = getConfidenceColor(pmPct);
    entry.confidenceTier = getConfidenceTier(pmPct);
  }
}
