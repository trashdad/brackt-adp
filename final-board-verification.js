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

function getCanonicalOdds(item, sportId) {
    if (item.oddsByTournament && Object.keys(item.oddsByTournament).length > 0) {
        const tIds = Object.keys(item.oddsByTournament);
        const firstT = item.oddsByTournament[tIds[0]];
        return Object.values(firstT)[0];
    }
    return item.odds;
}

const liveDir = path.join(__dirname, 'public', 'data', 'live');
const liveFiles = fs.readdirSync(liveDir).filter(f => f.endsWith('.json') && f !== 'manifest.json');

let socialData = {};
try { socialData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'data', 'social-scores.json'), 'utf8')); } catch (e) {}

let manualOdds = {};
try { manualOdds = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'manual-odds.json'), 'utf8')); } catch (e) {}

let draftState = {};
try { draftState = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'draft-state.json'), 'utf8')); } catch (e) {}

const rawBySport = {};

for (const file of liveFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(liveDir, file), 'utf8'));
    rawBySport[data.sport] = data.entries.map(e => ({
        name: e.name,
        odds: e.consensusOdds || e.bestOdds,
        bestOdds: e.bestOdds
    }));
}

for (const [id, manual] of Object.entries(manualOdds)) {
    const { sport, name } = manual;
    if (!sport) continue;
    if (!rawBySport[sport]) rawBySport[sport] = [];
    const key = normalize(name);
    const existing = rawBySport[sport].find(item => normalize(item.name) === key);
    const odds = getCanonicalOdds(manual, sport);
    if (existing) { if (odds) existing.odds = odds; } 
    else { rawBySport[sport].push({ name, odds }); }
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
        if (draftState[entryId]?.drafted) continue;
        const social = socialData[entryId] || { socialQuotient: 1.0 };
        const odds = item?.odds || null;
        if (!odds) continue;
        const ev = calculateSeasonTotalEV(odds, sport.category, sport.eventsPerSeason);
        sportEntries.push({
            id: entryId,
            name,
            sport: sport.id,
            bestOdds: odds,
            ev,
            adjSq: social.socialQuotient || 1.0,
            drafted: false,
            nameNormalized: key,
            notes: social.sources?.expert?.notes || ''
        });
    }
    if (sportEntries.length > 0) {
        applyPositionalScarcity(sportEntries);
        allEntries = allEntries.concat(sportEntries);
    }
}

allEntries.sort((a, b) => (b.adpScore || 0) - (a.adpScore || 0));

console.log("--- REVERTED BOARD STATE TOP 30 ---");
console.table(allEntries.slice(0, 30).map((e, i) => ({
    Rank: i + 1,
    Name: e.name.substring(0, 22),
    Sport: e.sport.toUpperCase(),
    Odds: e.bestOdds,
    DPS: e.adpScore.toFixed(2),
    EV: e.ev.seasonTotal.toFixed(2),
    SQ: e.adjSq.toFixed(2)
})));
