import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SPORTS from '../src/data/sports.js';
import ROSTERS from '../src/data/rosters.js';
import { calculateSeasonTotalEV } from '../src/services/evCalculator.js';
import { americanToImpliedProbability, removeVig, probabilityToAmerican } from '../src/services/oddsConverter.js';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const manualOdds = JSON.parse(fs.readFileSync('./server/data/manual-odds.json', 'utf8'));
const socialScores = JSON.parse(fs.readFileSync('./public/data/social-scores.json', 'utf8'));

const rawBySport = { indycar: [] };
const sport = SPORTS.find(s => s.id === 'indycar');

for (const [entryId, manual] of Object.entries(manualOdds)) {
  if (manual.sport === 'indycar') {
    const newItem = { 
      name: manual.name, 
      odds: null, 
      oddsBySource: manual.oddsBySource || {},
      oddsByTournament: manual.oddsByTournament || {}
    };
    rawBySport.indycar.push(newItem);
  }
}

console.log(`Initial rawBySport['indycar'] count: ${rawBySport.indycar.length}`);

// Step 4 Simulation
for (const item of rawBySport.indycar) {
  if (item.oddsByTournament && Object.keys(item.oddsByTournament).length > 0) {
    let sumProb = 0;
    let count = 0;
    for (const [tId, tSources] of Object.entries(item.oddsByTournament)) {
      const { consensus } = removeVig(tSources);
      if (consensus) {
        sumProb += americanToImpliedProbability(consensus);
        count++;
      }
    }
    if (count > 0) {
      const avgProb = sumProb / count;
      const avgOddsNum = probabilityToAmerican(avgProb);
      if (avgOddsNum != null) {
        item.odds = (avgOddsNum > 0 ? '+' : '') + avgOddsNum;
      }
    }
  }
}

console.log(`Processed Alex Palou odds: ${rawBySport.indycar.find(i => i.name === 'Alex Palou')?.odds}`);

// buildEntries Simulation
const apiItems = rawBySport.indycar;
const rosterNames = ROSTERS.indycar;
const apiLookup = new Map();
for (const item of apiItems) {
  apiLookup.set(normalize(item.name), item);
}

const entries = [];
for (const name of rosterNames) {
  const key = normalize(name);
  const apiItem = apiLookup.get(key);
  const entryId = `indycar-${slugify(name)}`;
  const social = socialScores[entryId] || { socialScore: 0, socialQuotient: 1.0 };

  if (apiItem) {
    const ev = calculateSeasonTotalEV(apiItem.odds, sport.category, sport.eventsPerSeason);
    entries.push({ id: entryId, name, ev, socialQuotient: social.socialQuotient });
  } else {
    entries.push({ id: entryId, name, ev: null, isPlaceholder: true });
  }
}

console.log(`Final built entries for IndyCar: ${entries.length}`);
console.log(`Sample entry (Palou):`, entries.find(e => e.name === 'Alex Palou'));
