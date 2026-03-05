/**
 * ikyn_EV — Two complementary models:
 *
 * 1. Plackett-Luce Monte Carlo (PL_EV)
 *    Sequential without-replacement draws using DPS as relative strength.
 *    Captures competitive field dynamics. 300k sims per sport.
 *    Sum per sport = 340 (guaranteed when n ≥ 8).
 *
 * 2. Probability-First PL-WA (wizardEV)
 *    Market Odds → Implied Win% → gamma concentration → wizardWinPct
 *    → PL rank distribution → wizardEV (naturally ≤340/sport)
 *
 *    PL distribution from real probabilities naturally produces ≤340 per sport.
 */

import { buildRankProbabilities } from '../services/evCalculator.js';
import SPORTS from '../data/sports.js';

export const IKYN_SCORE_TABLE = [100, 70, 50, 40, 25, 25, 15, 15];
export const IKYN_SIMS = 300_000;
const PLACEHOLDER_DPS_MULT = 0.5;

// Fixed-field sports use PL-MC (ikynEV) as wizardEV — known stable roster every year
const WIZARD_IKYN_SPORTS = new Set([
  'nfl', 'nba', 'mlb', 'nhl', 'wnba', 'afl', 'f1', 'darts', 'snooker', 'ucl', 'fifa',
]);

// gamma = 1 for all sports: pure market ordering, no parity adjustment.
export const SPORT_GAMMA = {};
export const WA_CONCENTRATION_GAMMA_DEFAULT = 1.0;

const REG_CHANGE_DAMPENING = {};

function getEffectiveGamma(sport) {
  const baseGamma = SPORT_GAMMA[sport] ?? WA_CONCENTRATION_GAMMA_DEFAULT;
  const regChange = REG_CHANGE_DAMPENING[sport];
  if (!regChange) return baseGamma;
  const d = regChange.dampening;
  return baseGamma * (1 - d) + 1.0 * d;
}

/**
 * Plackett-Luce analytical EV for a single win probability.
 * Uses buildRankProbabilities (PL field approximation) to compute rank distribution,
 * then EV = Σ score[k] × rankProb[k].
 * @param {number} winProb - Win probability (0-1)
 * @param {number} fieldSize - Number of competitors in the field
 * @returns {{ waEV: number, waPosProbs: number[] }} or null if winProb invalid
 */
function plackettLuceEV(winProb, fieldSize) {
  if (!winProb || winProb <= 0 || winProb >= 1) return null;
  const numPositions = IKYN_SCORE_TABLE.length; // 8
  const probs = buildRankProbabilities(winProb, numPositions, fieldSize);
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
      ...phEntries.map(e => ({ id: e.id, s: baseDPS, winProb: null, isPlaceholder: true })),
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
    // Step 1: collect market win probabilities per entry
    const winPcts = allEntries.map(e => e.winProb != null ? e.winProb : null);

    // Placeholders: assign small proxy probability from remaining mass
    const realProbSum = winPcts.filter(p => p != null).reduce((s, p) => s + p, 0);
    const phCount = allEntries.filter(e => e.isPlaceholder).length;
    const phProb = phCount > 0 ? Math.max((1 - realProbSum) / phCount, 0.001) : 0;
    const allWinPcts = winPcts.map(p => p ?? phProb);

    // Step 2: gamma concentration on win probabilities
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
      const rawWaEV = pl ? pl.waEV : null;
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
