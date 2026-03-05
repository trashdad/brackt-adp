/**
 * ikyn_EV — Two complementary models:
 *
 * 1. Plackett-Luce Monte Carlo (PL_EV)
 *    Sequential without-replacement draws using DPS as relative strength.
 *    Captures competitive field dynamics. 300k sims per sport.
 *    Sum per sport = 340 (guaranteed when n ≥ 8).
 *
 * 2. Geometric Weighted Average (WA_EV)
 *    E(X) = Σ score[k] × p_blend × (1-p_blend)^k  for k = 0..7
 *    p_blend = α × (dps_i / Σdps) + (1-α) × (market_p_i / max(1, Σmarket_p))
 *
 *    α is calibrated PER SPORT via binary search to keep Σ WA_EV ≤ 340 per sport,
 *    as close to 340 as possible. Sports where α=0 already gives ≤340 keep α=0.
 *    Placeholders get waEV from DPS share only (their market component is 0).
 */

export const IKYN_SCORE_TABLE = [100, 70, 50, 40, 25, 25, 15, 15];
export const IKYN_SIMS = 300_000;
const PLACEHOLDER_DPS_MULT = 0.5;

// Fixed-field sports: use PL-MC (ikynEV) as wizardEV — known stable roster every year
const WIZARD_IKYN_SPORTS = new Set([
  'nfl', 'nba', 'mlb', 'nhl', 'wnba', 'afl', 'f1', 'darts', 'snooker', 'ucl', 'fifa',
]);
const WA_TARGET = 340; // per-sport WA_EV ceiling (same as PL-MC guarantee)

/**
 * Geometric EV for a single win probability p.
 * @returns {{ waEV: number, waPosProbs: number[] }} or null if p invalid
 */
function geometricEV(p) {
  if (!p || p <= 0 || p >= 1) return null;
  let waEV = 0;
  const waPosProbs = [];
  for (let k = 0; k < IKYN_SCORE_TABLE.length; k++) {
    const prob = p * Math.pow(1 - p, k);
    waPosProbs.push(prob);
    waEV += IKYN_SCORE_TABLE[k] * prob;
  }
  return { waEV, waPosProbs };
}

/**
 * Compute sport-level WA_EV total for a given alpha and pre-built allEntries.
 */
function sportWaTotal(allEntries, sportDPSTotal, sumP, alpha) {
  const marketScale = sumP > 1 ? 1 / sumP : 1;
  let total = 0;
  for (const e of allEntries) {
    const dpsShare = sportDPSTotal > 0 ? e.s / sportDPSTotal : 0;
    const mktNorm  = e.winProb != null ? e.winProb * marketScale : 0;
    const pBlend   = e.winProb != null
      ? alpha * dpsShare + (1 - alpha) * mktNorm
      : dpsShare;
    const geo = geometricEV(pBlend);
    if (geo) total += geo.waEV;
  }
  return total;
}

/**
 * Binary-search for the smallest α ∈ [0,1] such that sportWaTotal ≤ WA_TARGET,
 * as close to WA_TARGET as possible.
 * Returns { alpha, total }.
 */
function calibrateAlpha(allEntries, sportDPSTotal, sumP) {
  const atZero = sportWaTotal(allEntries, sportDPSTotal, sumP, 0);
  if (atZero <= WA_TARGET) return { alpha: 0, total: atZero };

  // α=0 is over target — binary search upward (more DPS dilutes market concentration)
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (sportWaTotal(allEntries, sportDPSTotal, sumP, mid) > WA_TARGET) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { alpha: hi, total: sportWaTotal(allEntries, sportDPSTotal, sumP, hi) };
}

/**
 * Fast WA_EV-only sweep (no PL-MC) for testing different alpha values.
 * Returns { total, sportTotals } for a given global alpha.
 */
export function sweepWaEV(entries, alpha) {
  if (!entries?.length) return { total: 0, sportTotals: {} };

  const realBySport = {};
  const placeholderBySport = {};
  for (const e of entries) {
    if (!e.id || !e.sport) continue;
    if (!e.isPlaceholder && e.adpScore != null) {
      // Floor at 0.01 so single-entry sports (where applyPositionalScarcity returns early,
      // leaving adpScore=0) still participate and produce a non-null draftEV.
      (realBySport[e.sport] ??= []).push({
        id: e.id, s: Math.max(e.adpScore, 0.01),
        winProb: e.ev?.winProbability != null ? e.ev.winProbability / 100 : null,
      });
    } else if (e.isPlaceholder) {
      (placeholderBySport[e.sport] ??= []).push({ id: e.id });
    }
  }

  let total = 0;
  const sportTotals = {};
  const allSports = new Set([...Object.keys(realBySport), ...Object.keys(placeholderBySport)]);

  for (const sport of allSports) {
    const realEntries = realBySport[sport] ?? [];
    const phEntries   = placeholderBySport[sport] ?? [];
    if (realEntries.length === 0) continue;

    const minRealDPS    = Math.min(...realEntries.map(e => e.s));
    const baseDPS       = Math.max(minRealDPS * PLACEHOLDER_DPS_MULT, 0.01);
    const allEntries    = [
      ...realEntries,
      ...phEntries.map(e => ({ id: e.id, s: baseDPS, winProb: null, isPlaceholder: true })),
    ];
    const sportDPSTotal = allEntries.reduce((s, e) => s + e.s, 0);
    const sumP          = allEntries.reduce((s, e) => s + (e.winProb ?? 0), 0);
    const t             = sportWaTotal(allEntries, sportDPSTotal, sumP, alpha);
    sportTotals[sport]  = t;
    total              += t;
  }
  return { total, sportTotals };
}

/**
 * Compute ikyn_EV (PL-MC) and waEV (per-sport auto-calibrated geometric) for every entry.
 * @param {Array} entries - boardEntries array
 * @returns {Object} map of entry.id → {
 *   ev, posProbs, dps, sportTotal, fieldSize, isPlaceholder,
 *   waEV, waPosProbs, winProb, winProbNorm, dpsShare, pBlend, sportSumP, sportAlpha
 * }
 */
export function computeIkynEV(entries) {
  if (!entries?.length) return {};

  const realBySport = {};
  const placeholderBySport = {};
  for (const e of entries) {
    if (!e.id || !e.sport) continue;
    if (!e.isPlaceholder && e.adpScore != null) {
      // Floor at 0.01 so single-entry sports (where applyPositionalScarcity returns early,
      // leaving adpScore=0) still participate and produce a non-null draftEV.
      (realBySport[e.sport] ??= []).push({
        id: e.id,
        s: Math.max(e.adpScore, 0.01),
        winProb: e.ev?.winProbability != null ? e.ev.winProbability / 100 : null,
      });
    } else if (e.isPlaceholder) {
      (placeholderBySport[e.sport] ??= []).push({ id: e.id });
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

    // ── WA_EV: per-sport calibrated α ───────────────────────────
    const sportDPSTotal = allEntries.reduce((s, e) => s + e.s, 0);
    const sumP          = allEntries.reduce((s, e) => s + (e.winProb ?? 0), 0);
    const marketScale   = sumP > 1 ? 1 / sumP : 1;

    // Find α that keeps this sport's WA_EV ≤ 340, as close as possible
    const { alpha: sportAlpha } = calibrateAlpha(allEntries, sportDPSTotal, sumP);
    const useIkyn = WIZARD_IKYN_SPORTS.has(sport);

    for (let i = 0; i < n; i++) {
      const e        = allEntries[i];
      const dpsShare = sportDPSTotal > 0 ? e.s / sportDPSTotal : 0;
      const mktNorm  = e.winProb != null ? e.winProb * marketScale : 0;
      const pBlend   = e.winProb != null
        ? sportAlpha * dpsShare + (1 - sportAlpha) * mktNorm
        : dpsShare; // placeholders: 100% DPS share
      const geo      = geometricEV(pBlend);
      const ikynEV   = totals[i] / IKYN_SIMS;
      const waEV     = geo?.waEV ?? null;

      result[e.id] = {
        // PL-MC
        ev:            ikynEV,
        posProbs:      Array.from(posCounts[i], (c) => c / IKYN_SIMS),
        dps:           e.s,
        sportTotal:    sportDPSTotal,
        fieldSize:     n,
        isPlaceholder: e.isPlaceholder ?? false,
        // Geometric (per-sport calibrated)
        winProb:       e.winProb,
        winProbNorm:   e.winProb != null ? mktNorm : null,
        dpsShare,
        pBlend,
        sportSumP:     sumP,
        sportAlpha,
        waEV,
        waPosProbs:    geo?.waPosProbs ?? null,
        // wizardEV: PL-MC for fixed-field sports, WA_EV for variable-field sports
        wizardEV:      useIkyn ? ikynEV : waEV,
        wizardModel:   useIkyn ? 'ikyn' : 'wa',
      };
    }
  }
  return result;
}
