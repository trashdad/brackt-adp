import fs from 'fs';

// --- 2025 Simulation Input (Reconstructed from Search Data) ---
const teams2025 = [
  // Team, Opening Odds, Expert Rank, Market Rank, NegSentiment (0-1), Actual Performance (Pts)
  { name: 'KC Chiefs (NFL)', odds: '+800', exp: 1, mkt: 1, neg: 0.1, actualPts: 15, sport: 'nfl' },
  { name: 'Baltimore Ravens (NFL)', odds: '+700', exp: 2, mkt: 2, neg: 0.1, actualPts: 15, sport: 'nfl' },
  { name: 'Seattle Seahawks (NFL)', odds: '+6000', exp: 19, mkt: 15, neg: 0.0, actualPts: 100, sport: 'nfl' },
  { name: 'Denver Broncos (NFL)', odds: '+2500', exp: 14, mkt: 10, neg: 0.0, actualPts: 70, sport: 'nfl' },
  { name: 'Boston Celtics (NBA)', odds: '+450', exp: 1, mkt: 1, neg: 0.05, actualPts: 100, sport: 'nba' },
  { name: 'OKC Thunder (NBA)', odds: '+600', exp: 2, mkt: 2, neg: 0.05, actualPts: 70, sport: 'nba' },
  { name: 'Detroit Pistons (NBA)', odds: '+10000', exp: 15, mkt: 12, neg: 0.0, actualPts: 100, sport: 'nba' },
  { name: 'LA Dodgers (MLB)', odds: '+300', exp: 1, mkt: 1, neg: 0.05, actualPts: 100, sport: 'mlb' },
  { name: 'Atlanta Braves (MLB)', odds: '+800', exp: 2, mkt: 3, neg: 0.2, actualPts: 25, sport: 'mlb' }
];

function impliedProb(americanOdds) {
  let odds = parseInt(americanOdds.replace('+', ''));
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

// Formula: (EV + Scarcity) * Adj.SQ
function calculate2025DraftScore(team) {
  const winProb = impliedProb(team.odds);
  const baseEV = winProb * 100 + (1-winProb) * 20; // simplified tail
  
  // Market Alpha Logic (+ means market is 'smarter')
  const mktVsExp = team.exp - team.mkt; 
  
  let adjSq = 1.0;
  if (team.neg >= 0.4) adjSq *= 0.85; // Volatility Penalty
  if (mktVsExp >= 3) adjSq *= 1.15; // Market Alpha Boost
  if (mktVsExp <= -3) adjSq *= 0.90; // Expert Trap Penalty
  
  return {
    ...team,
    baseEV: parseFloat(baseEV.toFixed(2)),
    mktVsExp,
    adjSq: parseFloat(adjSq.toFixed(2)),
    draftScore: parseFloat((baseEV * adjSq).toFixed(2))
  };
}

const results = teams2025.map(calculate2025DraftScore);

console.log("--- 2025 BACKTEST: NEW FORMULA PERFORMANCE ---");
console.table(results.sort((a,b) => b.draftScore - a.draftScore).map(r => ({
    Team: r.name,
    "Market Rank": r.mkt,
    "Mkt vs Exp": r.mktVsExp,
    "Adj SQ": r.adjSq,
    "Draft Score": r.draftScore,
    "ACTUAL Result (Pts)": r.actualPts
})));

// Calculate ROI of selecting top 3 vs bottom 3
const top3 = results.sort((a,b) => b.draftScore - a.draftScore).slice(0, 3);
const bottom3 = results.sort((a,b) => b.draftScore - a.draftScore).slice(-3);

const avgTop = top3.reduce((a,b) => a + b.actualPts, 0) / 3;
const avgBottom = bottom3.reduce((a,b) => a + b.actualPts, 0) / 3;

console.log(`
Avg Points (Top 3 Recommendations): ${avgTop.toFixed(2)}`);
console.log(`Avg Points (Bottom 3 / Traps): ${avgBottom.toFixed(2)}`);
console.log(`Alpha (Edge vs Baseline): ${((avgTop - avgBottom)/avgBottom*100).toFixed(2)}%`);
