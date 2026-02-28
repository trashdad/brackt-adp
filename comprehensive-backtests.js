import fs from 'fs';
import path from 'path';

// --- MOCK SERVICES ---
function americanToImpliedProbability(americanOdds) {
    let odds = typeof americanOdds === 'string' ? parseInt(americanOdds.replace('+', '')) : americanOdds;
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
}

const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];
const STANDARD_SCORING_POINTS = [100, 70, 50, 40, 25, 15, 10, 8, 5, 4, 3, 2, 1, 1, 1, 1];

function calculateEV(americanOdds) {
    const winProb = americanToImpliedProbability(americanOdds);
    const probs = new Array(16).fill(0);
    probs[0] = winProb;
    const remaining = 1 - winProb;
    const tailWeights = RANK_WEIGHTS.slice(1);
    const tailSum = tailWeights.reduce((a, b) => a + b, 0);
    for (let k = 1; k < 16; k++) {
        probs[k] = remaining * (tailWeights[k - 1] / tailSum);
    }
    
    let ev = 0;
    for (let i = 0; i < 16; i++) {
        ev += probs[i] * STANDARD_SCORING_POINTS[i];
    }
    return parseFloat(ev.toFixed(2));
}

function applyDPS(entries) {
    entries.forEach(e => {
        e.ev = calculateEV(e.openingOdds);
    });
    entries.sort((a, b) => b.ev - a.ev);
    for (let i = 0; i < entries.length; i++) {
        const current = entries[i];
        const nextUndrafted = entries.slice(i + 1).find(e => !e.drafted);
        const gapToNext = nextUndrafted ? current.ev - nextUndrafted.ev : 0;
        const remainingUndrafted = entries.filter((e, idx) => idx >= i && !e.drafted).length;
        const scarcityBonus = remainingUndrafted > 0 ? (gapToNext * 2) / remainingUndrafted : 0;
        const basePriority = current.ev + scarcityBonus;
        current.dps = parseFloat((basePriority * (current.sq || 1.0)).toFixed(2));
        current.scarcityBonus = scarcityBonus;
    }
    return entries;
}

// --- DATASETS ---
const marketData = [
    { name: 'Seattle Seahawks', openingOdds: '+6000', liveOdds: '+800', sq: 1.25, sport: 'nfl' },
    { name: 'LA Rams', openingOdds: '+1200', liveOdds: '+850', sq: 1.15, sport: 'nfl' },
    { name: 'KC Chiefs', openingOdds: '+800', liveOdds: '+5500', sq: 0.90, sport: 'nfl' },
    { name: 'Detroit Pistons', openingOdds: '+15000', liveOdds: '+8000', sq: 1.10, sport: 'nba' },
    { name: 'Boston Celtics', openingOdds: '+450', liveOdds: '+300', sq: 1.05, sport: 'nba' },
    { name: 'Sydney Swans', openingOdds: '+1000', liveOdds: '+400', sq: 1.18, sport: 'afl' },
    { name: 'Vegas Golden Knights', openingOdds: '+1400', liveOdds: '+900', sq: 1.12, sport: 'nhl' },
    { name: 'Cleveland Cavs', openingOdds: '+2500', liveOdds: '+1200', sq: 1.20, sport: 'nba' },
    { name: 'Atlanta Braves', openingOdds: '+800', liveOdds: '+2500', sq: 0.85, sport: 'mlb' },
    { name: 'NY Mets', openingOdds: '+1800', liveOdds: '+1100', sq: 1.15, sport: 'mlb' }
];

const performanceData = [
    { name: 'Elite Value', openingOdds: '+600', sq: 1.15, actualPts: 100, drafted: false },
    { name: 'Fair Value', openingOdds: '+800', sq: 1.00, actualPts: 70, drafted: false },
    { name: 'Trap Value', openingOdds: '+500', sq: 0.80, actualPts: 25, drafted: false },
    { name: 'Longshot Winner', openingOdds: '+5000', sq: 1.20, actualPts: 100, drafted: false },
    { name: 'Longshot Loser', openingOdds: '+5000', sq: 1.00, actualPts: 5, drafted: false }
];

// --- EXECUTION ---
console.log("==================================================");
console.log("   BRACKT-ADP COMPREHENSIVE DPS BACKTEST REPORT   ");
console.log("==================================================\n");

// TEST 1
console.log("TEST 1: CLV Correlation (DPS vs Odds Appreciation)");
const test1Results = applyDPS(marketData.map(d => ({ ...d, drafted: false })));
test1Results.forEach(r => {
    const startProb = americanToImpliedProbability(r.openingOdds);
    const endProb = americanToImpliedProbability(r.liveOdds);
    r.appreciation = ((endProb - startProb) / startProb) * 100;
});
test1Results.sort((a, b) => b.dps - a.dps);
console.table(test1Results.map(r => ({
    Team: r.name,
    DPS: r.dps,
    "Appreciation %": r.appreciation.toFixed(1) + "%",
    SQ: r.sq
})));
const topHalfApp = test1Results.slice(0, 5).reduce((a,b)=>a+b.appreciation,0)/5;
const bottomHalfApp = test1Results.slice(5).reduce((a,b)=>a+b.appreciation,0)/5;
console.log(`Avg Appreciation (Top 5 DPS): ${topHalfApp.toFixed(2)}%`);
console.log(`Avg Appreciation (Bottom 5 DPS): ${bottomHalfApp.toFixed(2)}%\n`);

// TEST 2
console.log("TEST 2: Scarcity Impact Analysis");
const scarcitySet = [
    { name: 'High Scarcity (Gap 15)', ev: 40, nextEV: 25, sq: 1.0, count: 2, actualPts: 60 },
    { name: 'Low Scarcity (Gap 2)', ev: 40, nextEV: 38, sq: 1.0, count: 10, actualPts: 45 }
];
scarcitySet.forEach(s => {
    const bonus = ((s.ev - s.nextEV) * 2) / s.count;
    s.dps = s.ev + bonus;
    s.roi = s.actualPts / s.dps;
});
console.table(scarcitySet.map(s => ({
    Type: s.name,
    EV: s.ev,
    Bonus: (s.dps - s.ev).toFixed(2),
    DPS: s.dps.toFixed(2),
    "Actual Pts": s.actualPts,
    "Pts/DPS (ROI)": s.roi.toFixed(2)
})));

// TEST 3
console.log("\nTEST 3: Social Quotient (SQ) as Leading Indicator");
const sqTest = applyDPS(performanceData.map(d => ({ ...d, drafted: false })));
const highSQ = sqTest.filter(r => r.sq > 1.05);
const lowSQ = sqTest.filter(r => r.sq < 0.95);
const highSQPts = highSQ.reduce((a,b)=>a+b.actualPts,0)/highSQ.length;
const lowSQPts = lowSQ.reduce((a,b)=>a+b.actualPts,0)/lowSQ.length;
console.log(`Avg Pts (SQ > 1.05): ${highSQPts.toFixed(2)}`);
console.log(`Avg Pts (SQ < 0.95): ${lowSQPts.toFixed(2)}`);
console.log(`Alpha: ${(((highSQPts - lowSQPts)/lowSQPts)*100).toFixed(2)}%\n`);

// TEST 4
console.log("TEST 4: Sport-Specific Variance");
const sportVariance = {
    'nfl': { samples: [100, 15, 25, 100], ev: 35 },
    'mlb': { samples: [70, 50, 40, 60], ev: 55 },
    'indycar': { samples: [100, 0, 0, 0], ev: 25 }
};
Object.keys(sportVariance).forEach(s => {
    const v = sportVariance[s];
    const avg = v.samples.reduce((a,b)=>a+b,0)/v.samples.length;
    const diffs = v.samples.map(x => Math.pow(x - v.ev, 2));
    const stdDev = Math.sqrt(diffs.reduce((a,b)=>a+b,0)/diffs.length);
    console.log(`${s.toUpperCase()}: StdDev=${stdDev.toFixed(2)}, Avg Error=${(avg - v.ev).toFixed(2)}`);
});

// TEST 5
console.log("\nTEST 5: The Expert Trap (Social vs Odds)");
const traps = [
    { name: 'Public Darling', ev: 30, sq: 1.3, actualPts: 25 },
    { name: 'Market Stealth', ev: 45, sq: 0.8, actualPts: 50 }
];
console.table(traps.map(t => ({
    Name: t.name,
    EV: t.ev,
    SQ: t.sq,
    DPS: (t.ev * t.sq).toFixed(2),
    "Actual Pts": t.actualPts,
    "Efficiency": (t.actualPts / (t.ev * t.sq)).toFixed(2)
})));
