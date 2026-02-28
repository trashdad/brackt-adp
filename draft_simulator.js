import fs from 'fs';
import { americanToImpliedProbability } from './src/services/oddsConverter.js';

// --- SIMULATION ENGINE ---

const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];
const POINT_VALUES = [100, 70, 50, 40, 25, 25, 15, 15, 0, 0, 0, 0, 0, 0, 0, 0]; // Points for ranks 1-16

function getSimulatedFinish(winProb) {
    const probs = new Array(16).fill(0);
    probs[0] = winProb;
    const remaining = 1 - winProb;
    const tailSum = RANK_WEIGHTS.slice(1).reduce((a, b) => a + b, 0);
    for (let k = 1; k < 16; k++) {
        probs[k] = remaining * (RANK_WEIGHTS[k] / tailSum);
    }

    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < 16; i++) {
        cumulative += probs[i];
        if (rand < cumulative) return i + 1;
    }
    return 16;
}

// --- DATA LOADING ---
const rawData = fs.readFileSync('full_undrafted_analysis.json', 'utf16le');
const cleanData = rawData.replace(/^\uFEFF/, '');
const allEntries = JSON.parse(cleanData);

// Strategy A: Top DPS (Our Model)
const strategicLineup = allEntries.slice(0, 15);

// Strategy B: Top EV (Market Consensus / Chalk)
const chalkLineup = [...allEntries].sort((a, b) => b.ev - a.ev).slice(0, 15);

function runMonteCarlo(lineup, iterations = 10000) {
    const results = [];
    for (let i = 0; i < iterations; i++) {
        let totalPts = 0;
        lineup.forEach(player => {
            // Get win prob from odds
            const winProb = americanToImpliedProbability(player.odds);
            const finish = getSimulatedFinish(winProb);
            totalPts += POINT_VALUES[finish - 1];
        });
        results.push(totalPts);
    }
    
    results.sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / iterations;
    const median = results[Math.floor(iterations / 2)];
    const p10 = results[Math.floor(iterations * 0.1)];
    const p90 = results[Math.floor(iterations * 0.9)];
    const stdDev = Math.sqrt(results.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / iterations);

    return { mean, median, p10, p90, stdDev };
}

console.log("==================================================");
console.log("   BRACKT-ADP MONTE CARLO DRAFT SIMULATION        ");
console.log("   (15-Player Lineup | 10,000 Iterations)         ");
console.log("==================================================\n");

const strategicStats = runMonteCarlo(strategicLineup);
const chalkStats = runMonteCarlo(chalkLineup);

console.log("--- STRATEGY 1: TOP DPS (STRATEGIC ALPHA) ---");
console.log(`Lineup Examples: ${strategicLineup.slice(0, 3).map(e => e.name).join(', ')}`);
console.log(`Expected Points (Mean):   ${strategicStats.mean.toFixed(2)}`);
console.log(`Floor (10th Percentile):  ${strategicStats.p10.toFixed(2)}`);
console.log(`Ceiling (90th Percentile): ${strategicStats.p90.toFixed(2)}`);
console.log(`Volatility (StdDev):      ${strategicStats.stdDev.toFixed(2)}\n`);

console.log("--- STRATEGY 2: TOP EV (MARKET CHALK) ---");
console.log(`Lineup Examples: ${chalkLineup.slice(0, 3).map(e => e.name).join(', ')}`);
console.log(`Expected Points (Mean):   ${chalkStats.mean.toFixed(2)}`);
console.log(`Floor (10th Percentile):  ${chalkStats.p10.toFixed(2)}`);
console.log(`Ceiling (90th Percentile): ${chalkStats.p90.toFixed(2)}`);
console.log(`Volatility (StdDev):      ${chalkStats.stdDev.toFixed(2)}\n`);

const alpha = ((strategicStats.mean - chalkStats.mean) / chalkStats.mean) * 100;
const riskReduction = ((chalkStats.stdDev - strategicStats.stdDev) / chalkStats.stdDev) * 100;

console.log("--- COMPARATIVE ANALYSIS ---");
console.log(`Calculated Alpha: ${alpha.toFixed(2)}%`);
console.log(`Risk Reduction:   ${riskReduction.toFixed(2)}%`);

if (alpha > 0) {
    console.log("\nCONCLUSION: The DPS model is successfully surfacing 'Alpha'. It provides a higher point ceiling by sacrificing less efficiency than the market.");
} else {
    console.log("\nCONCLUSION: The model is currently trailing the market. Adjust sport coefficients to find better inefficiencies.");
}
