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
const WA_TARGET = 340; // per-sport WA_EV target (same as PL-MC guarantee)

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
// The market odds already flatten in uncertain years, so dampening prevents the gamma
// from over-concentrating on top of already-flat odds (avoiding double-counting).
//
// Calibrated against F1 2022 (ground-effect regs): market was +150/+175 (flat vs typical
// -175/-250), winner was rank 2. A dampening of 0.30 → gamma 1.35, which matches NBA-level
// uncertainty ("strong favorites exist but 2nd/3rd pick wins 30-40%").
const REG_CHANGE_DAMPENING = {
  // F1 2026: 50% electric power, active aero, tighter cost cap — largest overhaul since 2014.
  // Historical pattern: 1 disruption year then new dominant force within 1-2 seasons.
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
 * Apply concentration exponent to an array of pBlend values.
 * Raises each to gamma, then rescales so the sum is preserved.
 * This widens gaps between favorites and longshots.
 */
function concentratePBlends(pBlends, gamma) {
  if (gamma === 1) return pBlends;
  const origSum = pBlends.reduce((s, p) => s + p, 0);
  if (origSum <= 0) return pBlends;
  const powered = pBlends.map(p => p > 0 ? Math.pow(p, gamma) : 0);
  const powSum = powered.reduce((s, p) => s + p, 0);
  if (powSum <= 0) return pBlends;
  const scale = origSum / powSum;
  return powered.map(p => p * scale);
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
    if (e.adpScore != null && e.adpScore > 0) {
      (realBySport[e.sport] ??= []).push({
        id: e.id, s: e.adpScore,
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
    const rawT          = sportWaTotal(allEntries, sportDPSTotal, sumP, alpha);
    const t             = WA_TARGET; // normalized to target
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
  // Second pass: for sports where ALL real entries have adpScore=0 (single-entry early-return),
  // add them with floor DPS so they appear in ikynEVMap and produce non-null draftEV.
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

    // ── WA_EV: per-sport calibrated α + concentration + normalization ──
    const sportDPSTotal = allEntries.reduce((s, e) => s + e.s, 0);
    const sumP          = allEntries.reduce((s, e) => s + (e.winProb ?? 0), 0);
    const marketScale   = sumP > 1 ? 1 / sumP : 1;

    const { alpha: sportAlpha } = calibrateAlpha(allEntries, sportDPSTotal, sumP);
    const useIkyn = WIZARD_IKYN_SPORTS.has(sport);

    // Step 1: compute raw pBlend values for all entries
    const rawPBlends = allEntries.map(e => {
      const dpsShare = sportDPSTotal > 0 ? e.s / sportDPSTotal : 0;
      const mktNorm  = e.winProb != null ? e.winProb * marketScale : 0;
      return e.winProb != null
        ? sportAlpha * dpsShare + (1 - sportAlpha) * mktNorm
        : dpsShare;
    });

    // Step 2: apply sport-specific concentration exponent (with reg-change dampening)
    const sportGamma = getEffectiveGamma(sport);
    const concPBlends = concentratePBlends(rawPBlends, sportGamma);

    // Step 3: compute geometric WA_EV with concentrated probabilities
    const sportEntryData = [];
    for (let i = 0; i < n; i++) {
      const e        = allEntries[i];
      const pBlend   = concPBlends[i];
      const geo      = geometricEV(pBlend);
      const ikynEV   = totals[i] / IKYN_SIMS;
      const dpsShare = sportDPSTotal > 0 ? e.s / sportDPSTotal : 0;
      const mktNorm  = e.winProb != null ? e.winProb * marketScale : 0;
      sportEntryData.push({ e, pBlend, rawPBlend: rawPBlends[i], geo, ikynEV, dpsShare, mktNorm });
    }

    // Step 4: normalize WA_EV so REAL (non-placeholder) entries sum to WA_TARGET (340)
    // Placeholders keep their raw share but don't eat into the 340 budget
    const realWaTotal = sportEntryData
      .filter(d => !d.e.isPlaceholder)
      .reduce((s, d) => s + (d.geo?.waEV ?? 0), 0);
    const waScale = realWaTotal > 0 ? WA_TARGET / realWaTotal : 1;

    // Step 5: cap individual waEV at IKYN_SCORE_TABLE[0] (100) — no single entry
    // can score more than 1st place in the contest. Redistribute excess proportionally
    // to uncapped real entries, preserving the 340 total.
    const MAX_ENTRY_EV = IKYN_SCORE_TABLE[0]; // 100
    const scaledWaEVs = sportEntryData.map(d => d.geo ? d.geo.waEV * waScale : null);

    // Iterative cap-and-redistribute: handles cascading overflow
    const capped = new Set();
    for (let iter = 0; iter < 12; iter++) {
      let excess = 0;
      for (let i = 0; i < scaledWaEVs.length; i++) {
        if (scaledWaEVs[i] != null && !sportEntryData[i].e.isPlaceholder && !capped.has(i) && scaledWaEVs[i] > MAX_ENTRY_EV) {
          excess += scaledWaEVs[i] - MAX_ENTRY_EV;
          scaledWaEVs[i] = MAX_ENTRY_EV;
          capped.add(i);
        }
      }
      if (excess <= 0) break;
      const uncappedReal = sportEntryData
        .map((d, i) => ({ i, ev: scaledWaEVs[i] }))
        .filter(({ i, ev }) => ev != null && !sportEntryData[i].e.isPlaceholder && !capped.has(i));
      const uncappedSum = uncappedReal.reduce((s, { ev }) => s + ev, 0);
      if (uncappedSum <= 0) break;
      for (const { i, ev } of uncappedReal) {
        scaledWaEVs[i] += excess * (ev / uncappedSum);
      }
    }

    for (const [idx, d] of sportEntryData.entries()) {
      const waEV = scaledWaEVs[idx];

      result[d.e.id] = {
        // PL-MC
        ev:            d.ikynEV,
        posProbs:      Array.from(posCounts[allEntries.indexOf(d.e)], (c) => c / IKYN_SIMS),
        dps:           d.e.s,
        sportTotal:    sportDPSTotal,
        fieldSize:     n,
        isPlaceholder: d.e.isPlaceholder ?? false,
        // Geometric (per-sport calibrated + concentrated + normalized)
        winProb:       d.e.winProb,
        winProbNorm:   d.e.winProb != null ? d.mktNorm : null,
        dpsShare:      d.dpsShare,
        pBlend:        d.pBlend,
        sportSumP:     sumP,
        sportAlpha,
        waEV,
        waPosProbs:    d.geo?.waPosProbs ?? null,
        // wizardEV: PL-MC for fixed-field sports, normalized WA_EV for variable-field
        // Capped at MAX_ENTRY_EV (100) — no single entry can outscore 1st place
        wizardEV:      Math.min(useIkyn ? d.ikynEV : (waEV ?? 0), MAX_ENTRY_EV),
        wizardModel:   useIkyn ? 'ikyn' : 'wa',
      };
    }
  }
  return result;
}
