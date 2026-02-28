import fs from 'fs';

const candidates = [
  { name: 'Boston Celtics', sport: 'NBA', odds: +350, exp: 2, mkt: 12, pos: 2, neg: 7, adjSq: 0.82 },
  { name: 'US - Southwest', sport: 'LLWS', odds: +750, exp: 4, mkt: 2, pos: 6, neg: 0, adjSq: 1.15 },
  { name: 'Fernando Alonso', sport: 'F1', odds: +750, exp: 5, mkt: 4, pos: 8, neg: 1, adjSq: 1.12 },
  { name: 'Green Bay Packers', sport: 'NFL', odds: +750, exp: 7, mkt: 3, pos: 7, neg: 1, adjSq: 1.14 },
  { name: 'Oregon', sport: 'NCAAF', odds: +800, exp: 4, mkt: 4, pos: 5, neg: 0, adjSq: 1.08 },
  { name: 'Buffalo Bills', sport: 'NFL', odds: +950, exp: 3, mkt: 5, pos: 6, neg: 2, adjSq: 1.05 },
  { name: 'Dallas Stars', sport: 'NHL', odds: +1000, exp: 3, mkt: 3, pos: 5, neg: 1, adjSq: 1.05 },
  { name: 'Caribbean', sport: 'LLWS', odds: +1000, exp: 5, mkt: 5, pos: 4, neg: 0, adjSq: 1.05 },
  { name: 'Houston Rockets', sport: 'NBA', odds: +1100, exp: 14, mkt: 4, pos: 5, neg: 0, adjSq: 1.18 },
  { name: 'Philadelphia Phillies', sport: 'MLB', odds: +1200, exp: 3, mkt: 6, pos: 6, neg: 1, adjSq: 1.02 },
  { name: 'Edmonton Oilers', sport: 'NHL', odds: +1200, exp: 1, mkt: 7, pos: 8, neg: 2, adjSq: 0.95 },
  { name: 'Mexico', sport: 'LLWS', odds: +1500, exp: 7, mkt: 7, pos: 3, neg: 0, adjSq: 1.04 },
  { name: 'Seattle Mariners', sport: 'MLB', odds: +1200, exp: 13, mkt: 5, pos: 4, neg: 1, adjSq: 1.12 },
  { name: 'Cleveland Cavaliers', sport: 'NBA', odds: +500, exp: 3, mkt: 2, pos: 7, neg: 1, adjSq: 1.10 },
  { name: 'Georgia', sport: 'NCAAF', odds: +400, exp: 2, mkt: 6, pos: 3, neg: 8, adjSq: 0.88 },
  { name: 'Detroit Lions', sport: 'NFL', odds: +600, exp: 2, mkt: 17, pos: 4, neg: 5, adjSq: 0.85 }
];

function impliedProb(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3]; // 1st to 8th
const PTS = [100, 70, 50, 40, 25]; // 1st to 5th

const results = candidates.map(c => {
  const winProb = impliedProb(c.odds);
  const remaining = 1 - winProb;
  const tailSum = RANK_WEIGHTS.slice(1).reduce((a, b) => a + b, 0);
  
  const p1 = winProb;
  const p2 = remaining * (RANK_WEIGHTS[1] / tailSum);
  const p3 = remaining * (RANK_WEIGHTS[2] / tailSum);
  const p4 = remaining * (RANK_WEIGHTS[3] / tailSum);
  const p5 = remaining * (RANK_WEIGHTS[4] / tailSum);

  const baseEV = (p1 * PTS[0]) + (p2 * PTS[1]) + (p3 * PTS[2]) + (p4 * PTS[3]) + (p5 * PTS[4]);
  const draftScore = baseEV * c.adjSq;
  const mktVsExp = c.exp - c.mkt; // Positive means market ranks higher (closer to 1) than expert

  return {
    ...c,
    p1: (p1 * 100).toFixed(1) + '%',
    p2: (p2 * 100).toFixed(1) + '%',
    p3: (p3 * 100).toFixed(1) + '%',
    p4: (p4 * 100).toFixed(1) + '%',
    p5: (p5 * 100).toFixed(1) + '%',
    baseEV: baseEV.toFixed(2),
    draftScore: draftScore.toFixed(2),
    mktVsExp
  };
});

results.sort((a, b) => b.draftScore - a.draftScore);

console.log(JSON.stringify(results.slice(0, 15), null, 2));
