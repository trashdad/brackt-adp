import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyPositionalScarcity, calculateSeasonTotalEV } from './src/services/evCalculator.js';
import SPORTS from './src/data/sports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const liveDir = path.join(__dirname, 'public', 'data', 'live');
const files = fs.readdirSync(liveDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');

// Load social scores
let socialData = {};
try {
  socialData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'social-scores.json'), 'utf8'));
} catch (err) {
  console.log("Could not load social-scores.json");
}

let allEntries = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(liveDir, file), 'utf8'));
  const sportId = data.sport;
  const sportDef = SPORTS.find(s => s.id === sportId);
  
  if (!sportDef) continue;

  const entries = data.entries.map((e) => {
    let evData = { seasonTotal: 0 };
    if (e.bestOdds) {
      evData = calculateSeasonTotalEV(e.bestOdds, sportDef.category, sportDef.eventsPerSeason);
    }
    
    const socialEntry = socialData[`${sportId}-${e.nameNormalized}`];
    const sq = socialEntry?.socialQuotient || 1.0;
    
    return {
      ...e,
      id: `${sportId}-${e.nameNormalized}`,
      sport: sportId,
      drafted: false,
      ev: evData,
      adjSq: sq,
      notes: socialEntry?.sources?.expert?.notes || ''
    };
  });
  
  applyPositionalScarcity(entries);
  allEntries = allEntries.concat(entries);
}

allEntries.sort((a, b) => (b.adpScore || 0) - (a.adpScore || 0));

console.log("--- TOP 25 CURRENT UNDRAFTED SELECTIONS ---");
console.table(allEntries.slice(0, 25).map(e => ({
  Name: e.name.substring(0, 20),
  Sport: e.sport,
  Odds: e.bestOdds,
  SQ: e.adjSq.toFixed(2),
  "Raw EV": e.ev.seasonTotal.toFixed(2),
  "Scarcity": (e.scarcityBonus || 0).toFixed(2),
  "Final DPS": (e.adpScore || 0).toFixed(2)
})));
