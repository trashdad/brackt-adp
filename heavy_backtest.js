import fs from 'fs';
import { americanToImpliedProbability } from './src/services/oddsConverter.js';

// Load data
const rawData = fs.readFileSync('full_undrafted_analysis.json', 'utf16le');
const cleanData = rawData.replace(/^\uFEFF/, '');
const allEntries = JSON.parse(cleanData);

const ITERS = 300000;

// Optimized Plackett-Luce for speed
function getSimulatedFinish(winProb, rand) {
    const q = (1 - winProb) / 29;
    let probAccumulated = winProb;
    let pThisRank = winProb;
    let cumulative = winProb;
    
    if (rand < cumulative) return 1;
    
    for (let k = 1; k < 16; k++) {
        const pNotSelectedYet = 1 - probAccumulated;
        const removedFieldProb = Math.min(0.99 - winProb, k * q); 
        const relativeProb = winProb / (1 - removedFieldProb);
        pThisRank = pNotSelectedYet * relativeProb;
        probAccumulated += pThisRank;
        cumulative += pThisRank;
        if (rand < cumulative) return k + 1;
    }
    return 16;
}

const POINT_VALUES = [100, 70, 50, 40, 25, 25, 15, 15, 0, 0, 0, 0, 0, 0, 0, 0];

const entries = allEntries.map(e => ({
    name: e.name,
    sport: e.sport,
    dps: e.dps,
    ev: e.ev,
    winProb: Math.min(0.99, Math.max(0.001, americanToImpliedProbability(e.odds))),
    bayesProb: (americanToImpliedProbability(e.odds) * 0.7) + (0.033 * 0.3) // 30% regression to mean
}));

console.log(`Running ${ITERS} simulations for each of the ${entries.length} entries...`);

let results = [];

for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    
    let t1_pts = 0;
    let t2_pts = 0;
    let t3_pts = 0;
    let t4_pts = 0;
    
    let ptsArray = new Float32Array(ITERS);
    
    for (let iter = 0; iter < ITERS; iter++) {
        const r1 = Math.random();
        
        // T1: Standard Monte Carlo EV
        const f1 = getSimulatedFinish(e.winProb, r1);
        const p1 = POINT_VALUES[f1 - 1] || 0;
        t1_pts += p1;
        ptsArray[iter] = p1;
        
        // T2: Negative Binomial Shock (10% DNF risk - injury/crash)
        if (Math.random() >= 0.10) {
            const f2 = getSimulatedFinish(Math.min(0.99, e.winProb / 0.9), r1);
            t2_pts += POINT_VALUES[f2 - 1] || 0;
        }
        
        // T3: Bayesian Smoothing (Regression to mean over a long season)
        const f3 = getSimulatedFinish(e.bayesProb, r1);
        t3_pts += POINT_VALUES[f3 - 1] || 0;
        
        // T4: Favorite Bias (Favorites outperform implied odds in playoffs)
        const biasedProb = e.winProb > 0.10 ? Math.min(0.99, e.winProb * 1.05) : e.winProb * 0.98;
        const f4 = getSimulatedFinish(biasedProb, r1);
        t4_pts += POINT_VALUES[f4 - 1] || 0;
    }
    
    const t1_ev = t1_pts / ITERS;
    
    let sumSq = 0;
    for (let iter = 0; iter < ITERS; iter++) {
        sumSq += (ptsArray[iter] - t1_ev) * (ptsArray[iter] - t1_ev);
    }
    const stdDev = Math.sqrt(sumSq / ITERS);
    
    results.push({
        name: e.name,
        sport: e.sport,
        dps: e.dps,
        marketEV: e.ev,
        t1_ev: parseFloat(t1_ev.toFixed(2)),
        t2_shock: parseFloat((t2_pts / ITERS).toFixed(2)),
        t3_bayes: parseFloat((t3_pts / ITERS).toFixed(2)),
        t4_bias: parseFloat((t4_pts / ITERS).toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        sharpe: parseFloat((t1_ev / (stdDev || 1)).toFixed(3))
    });
}

fs.writeFileSync('heavy_backtest_results.json', JSON.stringify(results, null, 2));
console.log("Simulations complete.");

// Quick Summary
const topDps = [...results].sort((a,b) => b.dps - a.dps).slice(0, 10);
const topSharpe = [...results].sort((a,b) => b.sharpe - a.sharpe).slice(0, 10);
const topShock = [...results].sort((a,b) => b.t2_shock - a.t2_shock).slice(0, 10);

console.log("\n--- TOP 5 BY DPS ---");
console.table(topDps.slice(0, 5).map(r => ({ Name: r.name, DPS: r.dps, Sharpe: r.sharpe, ShockEV: r.t2_shock })));

console.log("\n--- TOP 5 BY SHARPE RATIO (Efficiency) ---");
console.table(topSharpe.slice(0, 5).map(r => ({ Name: r.name, DPS: r.dps, Sharpe: r.sharpe, ShockEV: r.t2_shock })));
