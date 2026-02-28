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

// --- PLACKETT-LUCE SIMULATOR ---
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

// RE-CALCULATE EV WITH MULTIPLIERS (Tennis=4, Golf=4, Indy=18)
allEntries.forEach(e => {
    const sportId = e.sport;
    let mult = 1;
    if (['tennis_m', 'tennis_w', 'pga'].includes(sportId)) mult = 4;
    if (sportId === 'indycar') mult = 18;
    if (sportId === 'llws') mult = 0.75; // structural penalty
    
    // We assume the stored 'ev' in the JSON was for a single event
    e.correctSeasonEV = e.ev * mult;
});

// Calculate Replacement Levels for the corrected EV
const sports = [...new Set(allEntries.map(e => e.sport))];
const replacementLevels = {};
sports.forEach(s => {
    const sportEntries = allEntries.filter(e => e.sport === s).sort((a,b) => b.correctSeasonEV - a.correctSeasonEV);
    const index = Math.min(sportEntries.length - 1, 7);
    replacementLevels[s] = sportEntries[index]?.correctSeasonEV || 0;
});

// Strategy A: Hybrid VOR-EV (Corrected)
allEntries.forEach(e => {
    const vor = Math.max(0, e.correctSeasonEV - replacementLevels[e.sport]);
    // The "Sweet Spot": 50% Scarcity (VOR), 50% Volume (EV)
    e.hybridScore = (vor * 0.5) + (e.correctSeasonEV * 0.5);
});

const poolSortedByHybrid = [...allEntries].sort((a,b) => b.hybridScore - a.hybridScore);
const strategicLineup = buildLegalLineup(poolSortedByHybrid);

// Strategy B: Market Chalk (Top EV)
const poolSortedByEV = [...allEntries].sort((a,b) => b.correctSeasonEV - a.correctSeasonEV);
const chalkLineup = buildLegalLineup(poolSortedByEV);

function runMonteCarlo(lineup, iterations = 30000) {
    const results = [];
    for (let i = 0; i < iterations; i++) {
        let totalPts = 0;
        lineup.forEach(player => {
            const winProb = americanToImpliedProbability(player.odds);
            const sportId = player.sport;
            
            let events = 1;
            if (['tennis_m', 'tennis_w', 'pga'].includes(sportId)) events = 4;
            if (sportId === 'indycar') events = 18;
            
            for(let e = 0; e < events; e++) {
                const finish = getSimulatedFinish(winProb);
                let pts = POINT_VALUES[finish - 1];
                if (sportId === 'llws') pts *= 0.75;
                totalPts += pts;
            }
        });
        results.push(totalPts);
    }
    results.sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / iterations;
    const stdDev = Math.sqrt(results.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / iterations);
    return { mean, stdDev };
}

console.log("==================================================");
console.log("   BRACKT-ADP CORRECTED EV MONTE CARLO SIM        ");
console.log("==================================================\n");

const strategicStats = runMonteCarlo(strategicLineup, 30000);
const chalkStats = runMonteCarlo(chalkLineup, 30000);

console.log(`STRATEGY 1 (HYBRID VOR-EV): ${strategicStats.mean.toFixed(2)} pts`);
console.log(`STRATEGY 2 (CHALK EV):      ${chalkStats.mean.toFixed(2)} pts`);
console.log(`ALPHA:                      ${(((strategicStats.mean - chalkStats.mean)/chalkStats.mean)*100).toFixed(2)}%`);
