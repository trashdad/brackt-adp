/**
 * ikyn_EV — Two complementary models:
 *
 * 1. Plackett-Luce Monte Carlo (PL_EV)
 *    Sequential without-replacement draws using DPS as relative strength.
 *    Captures competitive field dynamics. 300k sims per sport.
 *    Sum per sport = 340 (guaranteed when n ≥ 8).
 *
 * 2. Probability-First PL-WA (wizardEV)
 *    Market Odds → Implied Win% → ×modifiers via log-odds → wizardWinPct
 *    → PL rank distribution → wizardEV (naturally ≤340/sport)
 *
 *    Modifiers adjust win probability via log-odds transform, NOT EV directly.
 *    PL distribution from real probabilities naturally produces ≤340 per sport.
 */

import { buildRankProbabilities } from '../services/evCalculator.js';
import SPORTS from '../data/sports.js';

export const IKYN_SCORE_TABLE = [100, 70, 50, 40, 25, 25, 15, 15];
export const IKYN_SIMS = 300_000;
const PLACEHOLDER_DPS_MULT = 0.5;

// Fixed-field sports: use PL-MC (ikynEV) as wizardEV — known stable roster every year
const WIZARD_IKYN_SPORTS = new Set([
  'nfl', 'nba', 'mlb', 'nhl', 'wnba', 'afl', 'f1', 'darts', 'snooker', 'ucl', 'fifa',
]);

// Sport-specific concentration gammas based on historical parity analysis (2016-2025).
// gamma > 1 concentrates value on favorites (low-parity sports).
// gamma < 1 flattens distribution (high-parity sports where upsets are common).
// gamma = 1 preserves raw market ordering.
export const SPORT_GAMMA = {
  // Very low parity — dominant favorites win most of the time
  f1:        1.50,   // Verstappen/Hamilton won 8/10 years; fav wins ~60%
  tennis_m:  1.45,   // Big Three → Sinner/Alcaraz; fav wins ~35% per slam
  // Low-moderate parity — strong favorites but upsets happen
  nba:       1.35,   // Fav wins ~40%; top-3 wins ~65-70%
  ncaaw:     1.30,   // UConn/SC dominate; fav wins ~30%
  indycar:   1.30,   // Penske/Ganassi only; Palou won 4 straight
  ncaaf:     1.25,   // Same 5-8 programs; fav wins ~25%
  wnba:      1.25,   // Small league, star-driven; fav wins ~30%
  // Moderate parity — competitive but top contenders recognizable
  darts:     1.15,   // Knockout format; fav wins ~25%; 6 diff winners in 10yr
  snooker:   1.15,   // Deep field but legends win half; fav wins ~25%
  fifa:      1.15,   // Only ~8 realistic nations; fav wins ~18%
  ucl:       1.10,   // Top 6-8 clubs; fav wins ~12% but upsets frequent
  csgo:      1.10,   // Roster churn, patch changes; fav wins ~20%
  // High parity — anyone in top 10 can win, favorites overpriced
  nfl:       1.05,   // Hard cap + single-elim; fav wins ~17%
  afl:       1.05,   // Salary cap + draft; 8 diff winners in 10yr
  tennis_w:  1.00,   // 15+ diff slam winners in 10yr; very unpredictable
  nhl:       1.00,   // Hard cap + goalie variance; Blues 2019 from last place
  ncaab:     1.00,   // 68-team single-elim chaos; fav wins ~10%
  // Very high parity — essentially flat, market favorites systematically overpriced
  mlb:       0.95,   // Only 2/9 favs won; Rangers at +4500 in 2023
  pga:       0.90,   // 150-player fields; fav wins ~10% per major
  llws:      0.85,   // Youth baseball, teams change every year, unpickable
};
export const WA_CONCENTRATION_GAMMA_DEFAULT = 1.10; // fallback for unlisted sports

// Regulation-change dampening: blends base gamma toward 1.0 (neutral) for seasons
// where major rule/equipment changes increase parity beyond what historical norms capture.
// Formula: effectiveGamma = baseGamma × (1 - d) + 1.0 × d
const REG_CHANGE_DAMPENING = {
  // F1 2026: 50% electric power, active aero, tighter cost cap — largest overhaul since 2014.
  f1: { dampening: 0.30, reason: '2026 PU + active aero overhaul' },
};

function getEffectiveGamma(sport) {
  const baseGamma = SPORT_GAMMA[sport] ?? WA_CONCENTRATION_GAMMA_DEFAULT;
  const regChange = REG_CHANGE_DAMPENING[sport];
  if (!regChange) return baseGamma;
  const d = regChange.dampening;
  return baseGamma * (1 - d) + 1.0 * d;
}

/**
 * Adjust a base probability using a multiplier via log-odds transform.
 * This converts the multiplicative modifier into probability space while
 * preserving (0,1) bounds via the logistic function.
 * @param {number} baseProb - Implied win probability from market odds (0-1)
 * @param {number} multiplier - Combined modifier (>1 = boost, <1 = penalize)
 * @returns {number} Adjusted probability
 */
function adjustProbability(baseProb, multiplier) {
  if (baseProb <= 0 || baseProb >= 1 || multiplier === 1) return baseProb;
  const logOdds = Math.log(baseProb / (1 - baseProb));
  return 1 / (1 + Math.exp(-(logOdds + Math.log(multiplier))));
}

/**
 * Plackett-Luce analytical EV for a single adjusted win probability.
 * Uses buildRankProbabilities (PL field approximation) to compute rank distribution,
 * then EV = Σ score[k] × rankProb[k].
 * @param {number} adjProb - Adjusted win probability (0-1)
 * @param {number} fieldSize - Number of competitors in the field
 * @returns {{ waEV: number, waPosProbs: number[] }} or null if adjProb invalid
 */
function plackettLuceEV(adjProb, fieldSize) {
  if (!adjProb || adjProb <= 0 || adjProb >= 1) return null;
  const numPositions = IKYN_SCORE_TABLE.length; // 8
  const probs = buildRankProbabilities(adjProb, numPositions, fieldSize);
  let waEV = 0;
  for (let k = 0; k < numPositions; k++) {
    waEV += IKYN_SCORE_TABLE[k] * probs[k];
  }
  return { waEV, waPosProbs: probs };
}

/**
 * Apply concentration exponent to an array of probabilities.
 * Raises each to gamma, then rescales so the sum is preserved.
 * This widens gaps between favorites and longshots.
 */
function concentrateProbabilities(probs, gamma) {
  if (gamma === 1) return probs;
  const origSum = probs.reduce((s, p) => s + p, 0);
  if (origSum <= 0) return probs;
  const powered = probs.map(p => p > 0 ? Math.pow(p, gamma) : 0);
  const powSum = powered.reduce((s, p) => s + p, 0);
  if (powSum <= 0) return probs;
  const scale = origSum / powSum;
  return powered.map(p => p * scale);
}

/**
 * Compute ikyn_EV (PL-MC) and wizardEV (probability-first PL-WA) for every entry.
 * @param {Array} entries - boardEntries array
 * @returns {Object} map of entry.id → {
 *   ev, posProbs, dps, sportTotal, fieldSize, isPlaceholder,
 *   waEV, waPosProbs, winProb, wizardWinPct, wizardEV, wizardModel
 * }
 */
export function computeIkynEV(entries) {
  if (!entries?.length) return {};

  const realBySport = {};
  const placeholderBySport = {};
  for (const e of entries) {
    if (!e.id || !e.sport) continue;
    if (e.adpScore != null && e.adpScore > 0) {
      (realBySport[e.sport] ??= []).push({
        id: e.id,
        s: e.adpScore,
        winProb: e.ev?.winProbability != null ? e.ev.winProbability / 100 : null,
        probMultiplier: e.probMultiplier ?? 1.0,
        scarcityBonus: e.scarcityBonus ?? 0,
      });
    } else if (e.isPlaceholder) {
      (placeholderBySport[e.sport] ??= []).push({ id: e.id });
    }
  }
  // Second pass: for sports where ALL real entries have adpScore=0
  for (const e of entries) {
    if (!e.id || !e.sport || e.isPlaceholder || e.adpScore !== 0 || e.ev == null) continue;
    if (!realBySport[e.sport]) {
      (realBySport[e.sport] ??= []).push({
        id: e.id,
        s: 0.01,
        winProb: e.ev.winProbability != null ? e.ev.winProbability / 100 : null,
        probMultiplier: e.probMultiplier ?? 1.0,
        scarcityBonus: e.scarcityBonus ?? 0,
      });
    }
  }

  const result = {};
  const allSports = new Set([...Object.keys(realBySport), ...Object.keys(placeholderBySport)]);

  for (const sport of allSports) {
    const realEntries = realBySport[sport] ?? [];
    const phEntries   = placeholderBySport[sport] ?? [];

    if (realEntries.length === 0) continue;

    const minRealDPS = Math.min(...realEntries.map(e => e.s));
    const baseDPS    = Math.max(minRealDPS * PLACEHOLDER_DPS_MULT, 0.01);

    const allEntries = [
      ...realEntries,
      ...phEntries.map(e => ({ id: e.id, s: baseDPS, winProb: null, isPlaceholder: true, probMultiplier: 1.0, scarcityBonus: 0 })),
    ];
    const n      = allEntries.length;
    const numPos = Math.min(n, IKYN_SCORE_TABLE.length);

    // ── PL-MC simulation ────────────────────────────────────────
    const strengths = new Float64Array(allEntries.map(e => e.s));
    const totals    = new Float64Array(n);
    const posCounts = Array.from({ length: n }, () => new Float64Array(numPos));
    const pool      = new Float64Array(n);
    const poolIdx   = new Int32Array(n);

    for (let sim = 0; sim < IKYN_SIMS; sim++) {
      for (let i = 0; i < n; i++) { pool[i] = strengths[i]; poolIdx[i] = i; }
      let poolSize = n;
      for (let pos = 0; pos < numPos; pos++) {
        let total = 0;
        for (let j = 0; j < poolSize; j++) total += pool[j];
        if (total <= 0) break;
        let r = Math.random() * total;
        let wi = poolSize - 1;
        for (let j = 0; j < poolSize; j++) { r -= pool[j]; if (r <= 0) { wi = j; break; } }
        const winner = poolIdx[wi];
        totals[winner] += IKYN_SCORE_TABLE[pos];
        posCounts[winner][pos] += 1;
        poolSize--;
        if (wi !== poolSize) { pool[wi] = pool[poolSize]; poolIdx[wi] = poolIdx[poolSize]; }
      }
    }

    // ── WA_EV: Probability-First PL-WA model ──
    // Step 1: compute wizardWinPct per entry via log-odds adjustment
    const wizardWinPcts = allEntries.map(e =>
      e.winProb != null ? adjustProbability(e.winProb, e.probMultiplier) : null
    );

    // Placeholders: assign small proxy probability from remaining mass
    const realProbSum = wizardWinPcts.filter(p => p != null).reduce((s, p) => s + p, 0);
    const phCount = allEntries.filter(e => e.isPlaceholder).length;
    const phProb = phCount > 0 ? Math.max((1 - realProbSum) / phCount, 0.001) : 0;
    const allWinPcts = wizardWinPcts.map(p => p ?? phProb);

    // Step 2: gamma concentration on wizardWinPct
    const sportGamma = getEffectiveGamma(sport);
    const concWinPcts = concentrateProbabilities(allWinPcts, sportGamma);

    // Field size: use sports.js value, or allEntries.length for indeterminate sports
    const sportConfig = SPORTS.find(s => s.id === sport);
    const fieldSize   = sportConfig?.fieldSize || n;

    const useIkyn = WIZARD_IKYN_SPORTS.has(sport);
    const sportDPSTotal = allEntries.reduce((s, e) => s + e.s, 0);
    const MAX_ENTRY_EV = IKYN_SCORE_TABLE[0]; // 100

    // Step 3: compute PL-WA EV from concentrated win probabilities
    const sportEntryData = [];
    for (let i = 0; i < n; i++) {
      const e = allEntries[i];
      const wizWinPct = concWinPcts[i];
      const pl = plackettLuceEV(wizWinPct, fieldSize);
      const ikynEV = totals[i] / IKYN_SIMS;
      const dpsShare = sportDPSTotal > 0 ? e.s / sportDPSTotal : 0;
      // Add scarcity bonus as small additive
      const rawWaEV = pl ? pl.waEV + (e.scarcityBonus || 0) : null;
      sportEntryData.push({ e, wizWinPct, pl, ikynEV, dpsShare, rawWaEV, idx: i });
    }

    // Safety check: log warning if sport total exceeds 340 (should be natural with real probs)
    const sportWaTotal = sportEntryData
      .filter(d => !d.e.isPlaceholder)
      .reduce((s, d) => s + (d.rawWaEV ?? 0), 0);
    if (sportWaTotal > 340) {
      console.warn(`[ikynEV] ${sport} waEV total ${sportWaTotal.toFixed(1)} exceeds 340 — check probabilities`);
    }

    for (const d of sportEntryData) {
      const waEV = d.rawWaEV;

      result[d.e.id] = {
        // PL-MC
        ev:            d.ikynEV,
        posProbs:      Array.from(posCounts[d.idx], (c) => c / IKYN_SIMS),
        dps:           d.e.s,
        sportTotal:    sportDPSTotal,
        fieldSize:     n,
        isPlaceholder: d.e.isPlaceholder ?? false,
        // PL-WA (probability-first)
        winProb:       d.e.winProb,
        wizardWinPct:  d.wizWinPct,
        dpsShare:      d.dpsShare,
        waEV,
        waPosProbs:    d.pl?.waPosProbs ?? null,
        // wizardEV: PL-MC for fixed-field sports, PL-WA for variable-field
        wizardEV:      Math.min(useIkyn ? d.ikynEV : (waEV ?? 0), MAX_ENTRY_EV),
        wizardModel:   useIkyn ? 'ikyn' : 'wa',
      };
    }
  }
  return result;
}
