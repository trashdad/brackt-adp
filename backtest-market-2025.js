import fs from 'fs';

const data2025 = [
  { name: 'LA Dodgers (MLB)', odds: 300, mktRank: 1, expRank: 1, actualPts: 100 },
  { name: 'Boston Celtics (NBA)', odds: 450, mktRank: 1, expRank: 1, actualPts: 100 },
  { name: 'SF 49ers (NFL)', odds: 600, mktRank: 1, expRank: 3, actualPts: 15 },
  { name: 'KC Chiefs (NFL)', odds: 800, mktRank: 2, expRank: 1, actualPts: 15 },
  { name: 'OKC Thunder (NBA)', odds: 600, mktRank: 2, expRank: 2, actualPts: 70 },
  { name: 'Atlanta Braves (MLB)', odds: 800, mktRank: 3, expRank: 2, actualPts: 25 },
  { name: 'Denver Broncos (NFL)', odds: 2500, mktRank: 10, expRank: 14, actualPts: 70 },
  { name: 'Seattle Seahawks (NFL)', odds: 6000, mktRank: 15, expRank: 19, actualPts: 100 },
  { name: 'Detroit Pistons (NBA)', odds: 10000, mktRank: 12, expRank: 15, actualPts: 100 }
];

function calculateDPS(team) {
    const winProb = 100 / (team.odds + 100);
    const baseEV = winProb * 100 + (1 - winProb) * 20;
    const mktVsExp = team.expRank - team.mktRank; 
    let adjSq = 1.0;
    if (mktVsExp >= 3) adjSq = 1.15;
    if (mktVsExp <= -2) adjSq = 0.90;
    const dps = baseEV * adjSq;
    return { ...team, dps, mktVsExp, baseEV, adjSq };
}

const processed = data2025.map(calculateDPS);
const byMarket = [...processed].sort((a,b) => a.mktRank - b.mktRank || a.odds - b.odds);
const byDPS = [...processed].sort((a,b) => b.dps - a.dps);

console.log("--- 2025 BACKTEST: DPS vs. PURE MARKET RANK ---");

console.log("\nTop 4 by PURE MARKET (Drafting the Favorites):");
console.table(byMarket.slice(0, 4).map(r => ({ Name: r.name, Odds: '+' + r.odds, Pts: r.actualPts })));

console.log("\nTop 4 by DPS (Our Optimized Strategy):");
console.table(byDPS.slice(0, 4).map(r => ({ Name: r.name, Odds: '+' + r.odds, Pts: r.actualPts, "Adj.SQ": r.adjSq.toFixed(2) })));

const marketTotal = byMarket.slice(0, 4).reduce((a,b) => a + b.actualPts, 0);
const dpsTotal = byDPS.slice(0, 4).reduce((a,b) => a + b.actualPts, 0);

console.log("\nPure Market Strategy Total Pts: " + marketTotal);
console.log("DPS Strategy Total Pts: " + dpsTotal);
console.log("Efficiency Gain: " + (((dpsTotal - marketTotal) / marketTotal) * 100).toFixed(2) + "%");
