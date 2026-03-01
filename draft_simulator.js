import fs from 'fs';
import { americanToImpliedProbability } from './src/services/oddsConverter.js';

// --- ROSTER CONSTRAINTS ---
const MAJOR_BASED_SPORTS = ['pga', 'tennis_m', 'tennis_w', 'csgo', 'indycar'];

function buildLegalLineup(sortedPool, limit = 15) {
    const lineup = [];
    const sportCounts = {};
    
    for (const player of sortedPool) {
        if (lineup.length >= limit) break;
        
        const sport = player.sport;
        const max = MAJOR_BASED_SPORTS.includes(sport) ? 2 : 1;
        
        if ((sportCounts[sport] || 0) < max) {
            lineup.push(player);
            sportCounts[sport] = (sportCounts[sport] || 0) + 1;
        }
    }
    return lineup;
}

// --- SIMULATION ENGINE ---
const POINT_VALUES = [100, 70, 50, 40, 25, 25, 15, 15, 0, 0, 0, 0, 0, 0, 0, 0];

function getSimulatedFinish(winProb) {
    const probs = new Array(16).fill(0);
    probs[0] = winProb;
    const fieldSize = 30;
    const q = (1 - winProb) / (fieldSize - 1);
    let probAccumulated = probs[0];
    for (let k = 1; k < 16; k++) {
        const pNotSelectedYet = 1 - probAccumulated;
        const removedFieldProb = Math.min(0.99 - winProb, k * q); 
        const relativeProb = winProb / (1 - removedFieldProb);
        const pThisRank = pNotSelectedYet * relativeProb;
        probs[k] = pThisRank;
        probAccumulated += pThisRank;
    }
    if (probAccumulated < 1) probs[15] += (1 - probAccumulated);
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

// Strategy A: Top DPS pool (respecting constraints)
const poolSortedByDPS = [...allEntries].sort((a,b) => b.dps - a.dps);
const strategicLineup = buildLegalLineup(poolSortedByDPS);

// Strategy B: Top EV pool (respecting constraints)
const poolSortedByEV = [...allEntries].sort((a,b) => b.ev - a.ev);
const chalkLineup = buildLegalLineup(poolSortedByEV);

function runMonteCarlo(lineup, iterations = 30000) {
    const results = [];
    for (let i = 0; i < iterations; i++) {
        let totalPts = 0;
        lineup.forEach(player => {
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
console.log("   BRACKT-ADP ROSTER-LEGAL MONTE CARLO SIM        ");
console.log("   (15-Player Lineup | 30,000 Iterations)         ");
console.log("==================================================\n");

const strategicStats = runMonteCarlo(strategicLineup, 30000);
const chalkStats = runMonteCarlo(chalkLineup, 30000);

console.log("--- STRATEGY 1: TOP DPS (STRATEGIC ALPHA) ---");
console.log(`Lineup Examples: ${strategicLineup.slice(0, 5).map(e => e.name).join(', ')}`);
console.log(`Expected Points (Mean):   ${strategicStats.mean.toFixed(2)}`);
console.log(`Floor (10th Percentile):  ${strategicStats.p10.toFixed(2)}`);
console.log(`Ceiling (90th Percentile): ${strategicStats.p90.toFixed(2)}`);
console.log(`Volatility (StdDev):      ${strategicStats.stdDev.toFixed(2)}\n`);

console.log("--- STRATEGY 2: TOP EV (MARKET CHALK) ---");
console.log(`Lineup Examples: ${chalkLineup.slice(0, 5).map(e => e.name).join(', ')}`);
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
    console.log("\nCONCLUSION: The DPS model is successfully surfacing 'Alpha' within roster constraints.");
} else {
    console.log("\nCONCLUSION: The model is currently trailing the market. Adjust sport coefficients.");
}
