import fs from 'fs';

// --- MOCK SERVICES (CURRENT Model) ---
function americanToImpliedProbability(americanOdds) {
    let odds = typeof americanOdds === 'string' ? parseInt(americanOdds.replace('+', '')) : americanOdds;
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
}

const GLOBAL_CONFIDENCE_INDEX = {
  nba: 1.25, f1: 1.25, llws: 1.25,
  afl: 1.15, ncaab: 1.15, tennis_m: 1.15, tennis_w: 1.15, snooker: 1.15, darts: 1.15,
  nfl: 1.00, ncaaf: 1.00, ucl: 1.00, fifa: 1.00,
  nhl: 0.85, mlb: 0.85, indycar: 0.85, pga: 0.85,
  csgo: 0.75, wnba: 0.75, ncaaw: 0.75
};

const currentCalculators = {
  nba: (ev, s, sq) => (ev + s) * Math.sqrt(sq) * 1.12,
  f1: (ev, s, sq) => (ev * 0.4 + (sq * 40) * 0.6) + s,
  afl: (ev, s, sq) => (ev + s) * Math.sqrt(sq),
  nfl: (ev, s, sq) => (ev + s) * (1.0 / (1.0 + Math.max(0, sq - 1.15))),
  mlb: (ev, s, sq) => (ev + (s * 1.2)) * Math.sqrt(sq)
};

// --- DATA ---
const topCandidates = [
    { name: 'Celtics', sport: 'nba', odds: '+450', sq: 1.15 },
    { name: 'OKC Thunder', sport: 'nba', odds: '+800', sq: 1.20 },
    { name: 'Verstappen', sport: 'f1', odds: '-150', sq: 1.12 },
    { name: 'Lando Norris', sport: 'f1', odds: '+600', sq: 1.25 },
    { name: 'Sydney Swans', sport: 'afl', odds: '+400', sq: 1.18 },
    { name: 'Eagles', sport: 'nfl', odds: '+1200', sq: 1.10 },
    { name: 'Chiefs', sport: 'nfl', odds: '+800', sq: 1.30 },
    { name: 'Braves', sport: 'mlb', odds: '+800', sq: 1.15 },
];

function calculateDPS(entries, calculators, gci) {
    return entries.map(e => {
        const prob = americanToImpliedProbability(e.odds);
        const ev = prob * 100;
        const scarcity = 5; // Fixed for test
        const calc = calculators[e.sport] || ((ev, s, sq) => (ev + s) * sq);
        const gciMult = gci[e.sport] || 1.0;
        return {
            ...e,
            ev: ev.toFixed(1),
            dps: (calc(ev, scarcity, e.sq) * gciMult).toFixed(2)
        };
    }).sort((a,b) => b.dps - a.dps);
}

console.log("--- CURRENT MODEL BOARD ---");
console.table(calculateDPS(topCandidates, currentCalculators, GLOBAL_CONFIDENCE_INDEX));

// --- REFINED Model Proposal ---
const refinedGCI = {
  nba: 1.15, f1: 1.15, llws: 1.15, // Reduced from 1.25
  afl: 1.10, // Reduced from 1.15
  nfl: 1.05, // Increased from 1.00
  mlb: 0.95, // Increased from 0.85
  nhl: 0.95
};

const refinedCalculators = {
  nba: (ev, s, sq) => (ev + s) * (1 + (sq - 1) * 0.5) * 1.05, // Linear SQ, 1.05 youth
  f1: (ev, s, sq) => (ev * 0.6 + (sq * 20) * 0.4) + s, // Reduced pundit weight
  afl: (ev, s, sq) => (ev + s) * (1 + (sq - 1) * 0.5),
  nfl: currentCalculators.nfl, // Keep complex NFL logic
  mlb: currentCalculators.mlb
};

console.log("\n--- REFINED MODEL BOARD ---");
console.table(calculateDPS(topCandidates, refinedCalculators, refinedGCI));
