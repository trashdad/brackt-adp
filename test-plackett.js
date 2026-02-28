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

// NEW METHOD: Field Approximation (Plackett-Luce inspired)
function plackettLuceApprox(winProb, fieldSize = 30) {
    const probs = new Array(16).fill(0);
    probs[0] = winProb;
    
    // Average probability of any OTHER single team
    const q = (1 - winProb) / (fieldSize - 1);
    
    let probAccumulated = probs[0];
    
    for (let k = 1; k < 16; k++) {
        const pNotSelectedYet = 1 - probAccumulated;
        
        // At rank k, k-1 OTHER teams have been removed.
        // We cap the removed probability to avoid negative denominators.
        const removedFieldProb = Math.min(0.99 - winProb, k * q); 
        
        // The relative probability of our team winning the CURRENT spot
        const relativeProb = winProb / (1 - removedFieldProb);
        
        const pThisRank = pNotSelectedYet * relativeProb;
        
        probs[k] = pThisRank;
        probAccumulated += pThisRank;
    }
    
    return probs;
}

function calcEV(probs) {
    return probs.reduce((sum, p, i) => sum + p * STANDARD_SCORING[i], 0);
}

const testOdds = ['-150', '+120', '+400', '+800', '+2000', '+10000'];

console.log("ODDS | WIN% | OLD P(2nd) | OLD P(3rd) | OLD EV || PL P(2nd) | PL P(3rd) | PL EV");
console.log("---------------------------------------------------------------------------------");
testOdds.forEach(odds => {
    const p = americanToImpliedProbability(odds);
    const oldP = oldBuildProbs(p);
    const plP = plackettLuceApprox(p);
    
    console.log(`${odds.padEnd(5)} | ${(p*100).toFixed(1).padStart(4)}% | ${(oldP[1]*100).toFixed(1).padStart(8)}% | ${(oldP[2]*100).toFixed(1).padStart(8)}% | ${calcEV(oldP).toFixed(1).padStart(6)} || ${(plP[1]*100).toFixed(1).padStart(7)}% | ${(plP[2]*100).toFixed(1).padStart(7)}% | ${calcEV(plP).toFixed(1).padStart(6)}`);
});
