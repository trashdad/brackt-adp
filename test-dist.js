import { americanToImpliedProbability } from './src/services/oddsConverter.js';

const STANDARD_SCORING = [100, 70, 50, 40, 25, 25, 15, 15, 0, 0, 0, 0, 0, 0, 0, 0];

// OLD METHOD
const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];
function oldBuildProbs(winProb) {
    const probs = new Array(16).fill(0);
    probs[0] = winProb;
    const remaining = 1 - winProb;
    const tailSum = RANK_WEIGHTS.slice(1).reduce((a, b) => a + b, 0);
    for (let k = 1; k < 16; k++) {
        probs[k] = remaining * (RANK_WEIGHTS[k] / tailSum);
    }
    return probs;
}

// NEW METHOD: Geometric / Power Decay based on winProb
function newBuildProbs(winProb) {
    const probs = new Array(16).fill(0);
    probs[0] = winProb;
    
    // The "decay rate" depends on how strong the team is.
    // A heavy favorite decays slowly (high chance of 2nd/3rd).
    // A longshot decays rapidly (or stays flat).
    
    // Using a modified Plackett-Luce approximation
    // Let's assign a "power score" S where winProb = S / (Sum of all S).
    // Let's assume an average field of 30 teams, so avg winProb is ~0.033.
    // If winProb = p, we can approximate the chance of finishing 2nd.
    
    let remainingProb = 1 - winProb;
    
    // Base strength relative to the field
    const strength = winProb / (1 - winProb); 
    
    for (let k = 1; k < 16; k++) {
        // As you move down the ranks, the effective field gets weaker, 
        // so the team's relative probability of taking the *next* spot increases.
        // We cap the probability so it doesn't exceed 1.0.
        let probOfThisRank = strength / (strength + ((16 - k) * 0.05)); // heuristic denominator
        
        // Dampen the curve slightly so it doesn't artificially lock favorites into 2nd place 100% of the time.
        // In sports (like NFL playoffs), a favorite can lose early.
        // Let's use a geometric decay parameter that is inversely proportional to winProb.
        const decay = Math.min(0.85, 1 - Math.pow(winProb, 0.75));
        
        let p = remainingProb * (1 - decay);
        probs[k] = p;
        remainingProb -= p;
    }
    
    // Normalize any remaining tail (due to 16 rank cutoff)
    if (remainingProb > 0) {
       probs[15] += remainingProb; 
    }
    
    return probs;
}

function calcEV(probs) {
    return probs.reduce((sum, p, i) => sum + p * STANDARD_SCORING[i], 0);
}

const testOdds = ['-150', '+120', '+400', '+800', '+2000', '+10000'];

console.log("ODDS | WIN% | OLD P(2nd) | OLD P(3rd) | OLD EV || NEW P(2nd) | NEW P(3rd) | NEW EV");
console.log("---------------------------------------------------------------------------------");
testOdds.forEach(odds => {
    const p = americanToImpliedProbability(odds);
    const oldP = oldBuildProbs(p);
    const newP = newBuildProbs(p);
    
    console.log(`${odds.padEnd(5)} | ${(p*100).toFixed(1).padStart(4)}% | ${(oldP[1]*100).toFixed(1).padStart(8)}% | ${(oldP[2]*100).toFixed(1).padStart(8)}% | ${calcEV(oldP).toFixed(1).padStart(6)} || ${(newP[1]*100).toFixed(1).padStart(8)}% | ${(newP[2]*100).toFixed(1).padStart(8)}% | ${calcEV(newP).toFixed(1).padStart(6)}`);
});
