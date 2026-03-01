import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyPositionalScarcity, calculateSeasonTotalEV } from './src/services/evCalculator.js';
import SPORTS from './src/data/sports.js';
import ROSTERS from './src/data/rosters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const liveDir = path.join(__dirname, 'public', 'data', 'live');
const liveFiles = fs.readdirSync(liveDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');

// 1. Build all possible entries
const rawBySport = {};
for (const file of liveFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(liveDir, file), 'utf8'));
    rawBySport[data.sport] = data.entries.map(e => ({ name: e.name, odds: e.consensusOdds || e.bestOdds }));
}

const replacementLevels = {};
SPORTS.forEach(sport => {
    const items = rawBySport[sport.id] || [];
    const rosterNames = ROSTERS[sport.id] || [];
    const allNames = [...new Set([...rosterNames, ...items.map(i => i.name)])];
    
    const evs = allNames.map(name => {
        const item = items.find(i => normalize(i.name) === normalize(name));
        const odds = item?.odds || '+50000'; // Default bottom-tier odds
        return calculateSeasonTotalEV(odds, sport.category, sport.eventsPerSeason).seasonTotal;
    }).sort((a, b) => b - a);

    // Replacement level = 10th best (typical draft depth per sport)
    replacementLevels[sport.id] = evs[Math.min(evs.length - 1, 9)] || 0;
});

console.log("const SPORT_REPLACEMENT_LEVELS = {");
Object.entries(replacementLevels).forEach(([id, ev]) => {
    console.log(`  ${id}: ${ev.toFixed(2)},`);
});
console.log("};");
