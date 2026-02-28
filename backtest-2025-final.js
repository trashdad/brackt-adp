import fs from 'fs';

const teams2025 = [
  { name: 'KC Chiefs (NFL)', odds: '+800', expRank: 1, mktRank: 1, actualPts: 15 },
  { name: 'Baltimore Ravens (NFL)', odds: '+700', expRank: 2, mktRank: 2, actualPts: 15 },
  { name: 'Seattle Seahawks (NFL)', odds: '+6000', expRank: 19, mktRank: 15, actualPts: 100 },
  { name: 'Denver Broncos (NFL)', odds: '+2500', expRank: 14, mktRank: 10, actualPts: 70 },
  { name: 'Boston Celtics (NBA)', odds: '+450', expRank: 1, mktRank: 1, actualPts: 100 },
  { name: 'OKC Thunder (NBA)', odds: '+600', expRank: 2, mktRank: 2, actualPts: 70 },
  { name: 'Detroit Pistons (NBA)', odds: '+10000', expRank: 15, mktRank: 12, actualPts: 100 },
  { name: 'Atlanta Braves (MLB)', odds: '+800', expRank: 2, mktRank: 3, actualPts: 25 }
];

function calculateFinal(team) {
    const mktVsExp = team.expRank - team.mktRank;
    let adjSq = 1.0;
    if (mktVsExp >= 3) adjSq = 1.15;
    if (mktVsExp <= -3) adjSq = 0.90;
    
    const baseEV = (100 / (parseInt(team.odds.replace('+','')) + 100)) * 100 + 20;
    const dps = baseEV * adjSq;
    
    return { ...team, dps, mktVsExp };
}

const results = teams2025.map(calculateFinal);

console.log("--- 2025 DPS vs EXPERT RANK ---");
const byExp = [...results].sort((a,b) => a.expRank - b.expRank);
const byDPS = [...results].sort((a,b) => b.dps - a.dps);

console.log("\nTop 3 by EXPERT RANK (The 'Sheep' Strategy):");
console.table(byExp.slice(0,3).map(r => ({ Name: r.name, Pts: r.actualPts })));

console.log("\nTop 3 by DPS (Our 'Backtested' Strategy):");
console.table(byDPS.slice(0,3).map(r => ({ Name: r.name, Pts: r.actualPts })));

const sheepPts = byExp.slice(0,3).reduce((a,b)=>a+b.actualPts,0);
const dpsPts = byDPS.slice(0,3).reduce((a,b)=>a+b.actualPts,0);

console.log(`\nSheep Strategy Total Pts: ${sheepPts}`);
console.log(`DPS Strategy Total Pts: ${dpsPts}`);
console.log(`Alpha: ${(((dpsPts - sheepPts)/sheepPts)*100).toFixed(2)}%`);
