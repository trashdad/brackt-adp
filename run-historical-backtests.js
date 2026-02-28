import fs from 'fs';
import path from 'path';

// --- HELPERS ---
function americanToImpliedProbability(americanOdds) {
    let odds = typeof americanOdds === 'string' ? parseInt(americanOdds.replace('+', '').replace('$', '')) : americanOdds;
    if (!odds || isNaN(odds)) return 0.01; // default low
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
}

const STANDARD_SCORING_POINTS = [100, 70, 50, 40, 25, 25, 15, 15]; // Ranks 1-8ish

function calculateEV(americanOdds) {
    const winProb = americanToImpliedProbability(americanOdds);
    const probs = new Array(8).fill(0);
    probs[0] = winProb;
    const remaining = 1 - winProb;
    const tailSum = 20 + 15 + 10 + 8 + 5 + 5 + 3; // Simplified for 8 slots
    const weights = [15, 10, 8, 5, 5, 3, 2];
    for (let k = 1; k < 8; k++) {
        probs[k] = remaining * (weights[k-1] / tailSum);
    }
    let ev = 0;
    for (let i = 0; i < 8; i++) {
        ev += probs[i] * (STANDARD_SCORING_POINTS[i] || 0);
    }
    return parseFloat(ev.toFixed(2));
}

// --- DATA EXTRACTION ---
const socialData = JSON.parse(fs.readFileSync('public/data/social-scores.json', 'utf8'));

const historicalSamples = [];
Object.entries(socialData).forEach(([id, entry]) => {
    const notes = entry.sources?.expert?.notes || "";
    const sport = id.split('-')[0];
    
    let oddsMatch = notes.match(/(\+[0-9]{3,4}|\-[0-9]{3,4})/);
    let fractionMatch = notes.match(/([0-9]{1,3})\/([0-9]{1,3})/);
    
    let odds = null;
    if (oddsMatch) odds = oddsMatch[1];
    else if (fractionMatch) {
        const num = parseInt(fractionMatch[1]);
        const den = parseInt(fractionMatch[2]);
        const prob = den / (num + den);
        odds = prob < 0.5 ? Math.round((1 - prob) / prob * 100) : Math.round(-100 * prob / (1 - prob));
    }

    // Infer performance from notes (2024 results usually mentioned)
    let actualPts = 0;
    if (notes.includes('champs') || notes.includes('Champion') || notes.includes('winner') || notes.includes('winner')) actualPts = 100;
    else if (notes.includes('runners-up') || notes.includes('finalist')) actualPts = 70;
    else if (notes.includes('Final Four') || notes.includes('semifinalist')) actualPts = 50;
    else if (notes.includes('playoff') || notes.includes('postseason')) actualPts = 25;

    if (odds && actualPts > 0) {
        historicalSamples.push({
            id,
            sport,
            odds,
            sq: entry.socialQuotient || 1.0,
            actualPts,
            notes
        });
    }
});

// --- ALGORITHMS ---

const ALGORITHMS = {
    'Stability': (e) => calculateEV(e.odds) * Math.pow(e.sq, 0.5),
    'AntiHype': (e) => calculateEV(e.odds) * (1 / Math.log2(e.sq + 1)),
    'SharpConsensus': (e) => (calculateEV(e.odds) * 0.4 + (e.sq * 40) * 0.6), // Proxy expert rank with SQ
    'InfoEdge': (e) => calculateEV(e.odds) * e.sq * 1.25
};

// --- RUN BACKTESTS PER SPORT ---

const sports = [...new Set(historicalSamples.map(s => s.sport))];
const report = {};

sports.forEach(sport => {
    const samples = historicalSamples.filter(s => s.sport === sport);
    if (samples.length < 2) return;

    const results = {};
    Object.keys(ALGORITHMS).forEach(algoName => {
        const algo = ALGORITHMS[algoName];
        const ranked = samples.map(s => ({ ...s, score: algo(s) })).sort((a,b) => b.score - a.score);
        
        // Efficiency metric: Correlation of top 3 picks to actual pts
        const top3Pts = ranked.slice(0, 3).reduce((a,b) => a + b.actualPts, 0) / Math.min(ranked.length, 3);
        results[algoName] = top3Pts;
    });

    // Pick Winner
    const winner = Object.entries(results).sort((a,b) => b[1] - a[1])[0];
    report[sport] = {
        chosenAlgorithm: winner[0],
        avgPoints: winner[1].toFixed(2),
        sampleCount: samples.length,
        competitors: results
    };
});

console.log(JSON.stringify(report, null, 2));
