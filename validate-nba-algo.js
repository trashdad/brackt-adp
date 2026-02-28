import { applyPositionalScarcity } from './src/services/evCalculator.js';

const mockNbaEntries = [
  { 
    id: 'nba-okc', 
    name: 'Oklahoma City Thunder', 
    nameNormalized: 'oklahomacitythunder', 
    sport: 'nba', 
    ev: { seasonTotal: 45 }, 
    adjSq: 1.15, 
    notes: 'Young core. New additions.' 
  },
  { 
    id: 'nba-clippers', 
    name: 'LA Clippers', 
    nameNormalized: 'laclippers', 
    sport: 'nba', 
    ev: { seasonTotal: 45 }, 
    adjSq: 1.15, 
    notes: 'Veteran squad.' 
  },
  { 
    id: 'nba-lakers', 
    name: 'LA Lakers', 
    nameNormalized: 'lalakers', 
    sport: 'nba', 
    ev: { seasonTotal: 40 }, 
    adjSq: 1.20, 
    notes: 'LeBron/AD.' 
  }
];

console.log("--- NBA ALGO VALIDATION ---");
applyPositionalScarcity(mockNbaEntries);

mockNbaEntries.forEach(e => {
    console.log(`${e.name}: DPS=${e.adpScore} (EV=${e.ev.seasonTotal}, SQ=${e.adjSq})`);
});
