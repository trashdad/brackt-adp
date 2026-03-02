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

// 1. Load Data Sources
const liveDir = path.join(__dirname, 'public', 'data', 'live');
const liveFiles = fs.readdirSync(liveDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');

let socialData = {};
try { socialData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'social-scores.json'), 'utf8')); } catch (e) {}

let manualOdds = {};
try { manualOdds = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'manual-odds.json'), 'utf8')); } catch (e) {}

let draftState = {};
try { draftState = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'draft-state.json'), 'utf8')); } catch (e) {}

// 2. Build Full Entries (merging logic from useOddsData.js)
const rawBySport = {};

// Load Pipeline Live
for (const file of liveFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(liveDir, file), 'utf8'));
    rawBySport[data.sport] = data.entries.map(e => ({
        name: e.name,
        odds: e.consensusOdds || e.bestOdds,
        bestOdds: e.bestOdds
    }));
}

// Merge Manual Odds
for (const [id, manual] of Object.entries(manualOdds)) {
    const { sport, name, oddsBySource } = manual;
    if (!sport) continue;
    if (!rawBySport[sport]) rawBySport[sport] = [];
    
    const key = normalize(name);
    const existing = rawBySport[sport].find(item => normalize(item.name) === key);
    
    if (existing) {
        if (oddsBySource) existing.odds = Object.values(oddsBySource)[0]; // Simplified
    } else {
        rawBySport[sport].push({
            name,
            odds: oddsBySource ? Object.values(oddsBySource)[0] : null
        });
    }
}

let allEntries = [];

for (const sport of SPORTS) {
    if (!sport.active) continue;
    const items = rawBySport[sport.id] || [];
    const rosterNames = ROSTERS[sport.id] || [];
    const sportEntries = [];

    const itemLookup = new Map();
    items.forEach(i => itemLookup.set(normalize(i.name), i));

    const allNames = [...new Set([...rosterNames, ...items.map(i => i.name)])];

    for (const name of allNames) {
        const key = normalize(name);
        const item = itemLookup.get(key);
        const entryId = `${sport.id}-${slugify(name)}`;
        
        // Filter Drafted
        if (draftState[entryId]?.drafted) continue;

        const social = socialData[entryId] || { socialQuotient: 1.0 };
        const odds = item?.odds || null;
        if (!odds) continue;

        const ev = calculateSeasonTotalEV(odds, sport.category, sport.eventsPerSeason, sport.id);
        
        sportEntries.push({
            id: entryId,
            name,
            sport: sport.id,
            odds: odds,
            ev: ev,
            adjSq: social.adjSq || social.socialQuotient || 1.0,
            drafted: false,
            notes: social.sources?.expert?.notes || ''
        });
    }

    if (sportEntries.length > 0) {
        applyPositionalScarcity(sportEntries);
        allEntries = allEntries.concat(sportEntries);
    }
}

allEntries.sort((a, b) => (b.adpScore || 0) - (a.adpScore || 0));

// Add rank and flatten for full analysis
const analysisOutput = allEntries.map((e, i) => ({
    rank: i + 1,
    name: e.name,
    sport: e.sport,
    dps: e.adpScore,
    odds: e.odds,
    ev: e.ev.seasonTotal,
    math: e.math,
    adjSq: e.adjSq
}));

fs.writeFileSync(path.join(__dirname, 'full_undrafted_analysis.json'), Buffer.from('\uFEFF' + JSON.stringify(analysisOutput, null, 2), 'utf16le'));

console.log("--- DEFINITIVE TOP 30 UNDRAFTED SELECTIONS (UPDATED DPS) ---");
console.table(analysisOutput.slice(0, 30).map((e, i) => ({
    Rank: e.rank,
    Name: e.name.substring(0, 22),
    Sport: e.sport.toUpperCase(),
    Odds: e.odds,
    DPS: e.dps.toFixed(2),
    EV: e.ev.toFixed(2),
    SQ: e.adjSq.toFixed(2)
})));
