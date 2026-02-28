import fs from 'fs';

// --- DATA LOADING ---
const rawData = fs.readFileSync('full_undrafted_analysis.json', 'utf16le');
const cleanData = rawData.replace(/^\uFEFF/, '');
const allEntries = JSON.parse(cleanData);

// --- 1. DEFINE REPLACEMENT LEVELS PER SPORT ---
// We'll find the EV of the 8th-ranked entry in each sport (or the last one if < 8)
const sports = [...new Set(allEntries.map(e => e.sport))];
const replacementLevels = {};

sports.forEach(s => {
    const sportEntries = allEntries.filter(e => e.sport === s).sort((a,b) => b.ev - a.ev);
    // Replacement level is the 8th best, or the 50th percentile if < 8
    const index = Math.min(sportEntries.length - 1, 7);
    replacementLevels[s] = sportEntries[index]?.ev || 0;
});

// --- 2. DEFINE SPORT-SPECIFIC VOLATILITY (Standard Deviation) ---
const volatility = {
    nba: 15, f1: 12, llws: 18,
    afl: 20, ncaab: 25, tennis_m: 22, tennis_w: 22, snooker: 20, darts: 20,
    nfl: 35, ncaaf: 35, ucl: 30, fifa: 30,
    nhl: 40, mlb: 40, indycar: 45, pga: 50,
    csgo: 25, wnba: 25, ncaaw: 25
};

// --- 3. CALCULATE VOR-SHARPE SCORE ---
const vorEntries = allEntries.map(e => {
    const replacementEV = replacementLevels[e.sport] || 0;
    const vor = Math.max(0.1, e.ev - replacementEV);
    const sigma = volatility[e.sport] || 30;
    
    // Sharpe-style efficiency: (Surplus Value / Risk)
    // We add a constant to prevent division by extreme low sigma
    const efficiency = vor / Math.sqrt(sigma); 
    
    // Re-apply Confidence Index (GCI from our model)
    const gci = {
        nba: 1.08, f1: 1.08, llws: 1.08,
        afl: 1.05, ncaab: 1.05, tennis_m: 1.05, tennis_w: 1.05, snooker: 1.05, darts: 1.05,
        nfl: 1.00, ncaaf: 1.00, ucl: 1.00, fifa: 1.00,
        nhl: 0.98, mlb: 0.98, indycar: 0.98, pga: 0.98,
        csgo: 0.96, wnba: 0.96, ncaaw: 0.96
    }[e.sport] || 1.0;

    return {
        ...e,
        vor: vor.toFixed(2),
        efficiency: (efficiency * gci).toFixed(4),
        newDPS: (efficiency * gci * 50).toFixed(2) // Scale back to 0-100 range for display
    };
});

vorEntries.sort((a,b) => b.newDPS - a.newDPS);

console.log("--- VOR-SHARPE EFFICIENCY BOARD (TOP 20) ---");
console.table(vorEntries.slice(0, 20).map(e => ({
    Name: e.name,
    Sport: e.sport.toUpperCase(),
    EV: e.ev,
    VOR: e.vor,
    DPS: e.newDPS
})));

// --- SIMULATION PRE-CHECK ---
const top15New = vorEntries.slice(0, 15);
const avgEVNew = top15New.reduce((a,b) => a + b.ev, 0) / 15;
console.log(`
Strategy Mean EV: ${avgEVNew.toFixed(2)}`);
