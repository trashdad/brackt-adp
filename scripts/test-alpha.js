/**
 * Alpha sweep: find optimal WA_BLEND_ALPHA for total WA_EV ≤ 6800
 * Replicates the full data pipeline: manual-odds → EV → scarcity → sweepWaEV
 */

import { readFileSync } from 'fs';
import SPORTS from '../src/data/sports.js';
import ROSTERS from '../src/data/rosters.js';
import {
  calculateSeasonTotalEV,
  applyPositionalScarcity,
} from '../src/services/evCalculator.js';
import { sweepWaEV } from '../src/utils/ikynEV.js';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Load manual odds (same data as server API)
const manualOdds = JSON.parse(readFileSync('server/data/manual-odds.json', 'utf8'));

// Convert manual-odds to rawBySport: { sportId: [{ name, odds }] }
function buildRawBySport() {
  const rawBySport = {};
  for (const [id, item] of Object.entries(manualOdds)) {
    if (!item.sport) continue;
    // Resolve best odds: season source first, then oddsBySource, then any tournament
    let bestOdds = null;
    if (item.oddsByTournament?.season) {
      for (const src of Object.values(item.oddsByTournament.season)) { bestOdds = src; break; }
    }
    if (!bestOdds && item.oddsBySource) {
      for (const src of Object.values(item.oddsBySource)) { bestOdds = src; break; }
    }
    if (!bestOdds && item.oddsByTournament) {
      for (const [, sources] of Object.entries(item.oddsByTournament)) {
        for (const src of Object.values(sources)) { bestOdds = src; break; }
        if (bestOdds) break;
      }
    }
    if (!bestOdds) continue;
    (rawBySport[item.sport] ??= []).push({ name: item.name, odds: bestOdds });
  }
  return rawBySport;
}

// Build entries exactly like useOddsData.js buildEntries
function buildEntries(rawBySport, scarcityModifier) {
  const entries = [];

  for (const sport of SPORTS) {
    if (!sport.active) continue;
    const apiItems = rawBySport[sport.id] || [];
    const rosterNames = ROSTERS[sport.id] || [];

    const apiLookup = new Map();
    for (const item of apiItems) apiLookup.set(normalize(item.name), item);

    const matchedApiKeys = new Set();
    const processedRosterKeys = new Set();

    for (const name of rosterNames) {
      const key = normalize(name);
      if (processedRosterKeys.has(key)) continue;
      processedRosterKeys.add(key);
      const apiItem = apiLookup.get(key);
      const entryId = `${sport.id}-${slugify(name)}`;

      if (apiItem) {
        matchedApiKeys.add(key);
        let ev = calculateSeasonTotalEV(apiItem.odds, sport.category, sport.eventsPerSeason, sport.id);
        if (sport.evMultiplier != null && ev) {
          ev = { ...ev, singleEvent: ev.singleEvent * sport.evMultiplier, seasonTotal: ev.seasonTotal * sport.evMultiplier };
        }
        entries.push({
          id: entryId, name, sport: sport.id, sportName: sport.name,
          odds: apiItem.odds, ev,
          adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL',
          adpScore: 0, scarcityBonus: 0, evGap: 0,
          isPlaceholder: false, drafted: false, draftedBy: null,
        });
      } else {
        entries.push({
          id: entryId, name, sport: sport.id, sportName: sport.name,
          odds: null, ev: null,
          adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL',
          adpScore: -1, scarcityBonus: 0, evGap: 0,
          isPlaceholder: true, drafted: false, draftedBy: null,
        });
      }
    }

    // Unmatched API items
    for (const item of apiItems) {
      const key = normalize(item.name);
      if (!matchedApiKeys.has(key)) {
        matchedApiKeys.add(key);
        const entryId = `${sport.id}-${slugify(item.name)}`;
        let ev = calculateSeasonTotalEV(item.odds, sport.category, sport.eventsPerSeason, sport.id);
        if (sport.evMultiplier != null && ev) {
          ev = { ...ev, singleEvent: ev.singleEvent * sport.evMultiplier, seasonTotal: ev.seasonTotal * sport.evMultiplier };
        }
        entries.push({
          id: entryId, name: item.name, sport: sport.id, sportName: sport.name,
          odds: item.odds, ev,
          adjSq: 1.0, socialPos: 0, socialNeg: 0, notes: '', trapSignal: 'NEUTRAL',
          adpScore: 0, scarcityBonus: 0, evGap: 0,
          isPlaceholder: false, drafted: false, draftedBy: null,
        });
      }
    }
  }

  // Apply scarcity (populates adpScore)
  const bySport = {};
  for (const e of entries) {
    if (e.isPlaceholder) continue;
    (bySport[e.sport] ??= []).push(e);
  }
  for (const sportEntries of Object.values(bySport)) {
    applyPositionalScarcity(sportEntries, scarcityModifier);
  }

  entries.sort((a, b) => {
    if (a.isPlaceholder && !b.isPlaceholder) return 1;
    if (!a.isPlaceholder && b.isPlaceholder) return -1;
    return (b.adpScore || 0) - (a.adpScore || 0);
  });
  entries.forEach((e, i) => { e.adpRank = i + 1; });
  return entries;
}

// ── Run ────────────────────────────────────────────────────────────
const rawBySport = buildRawBySport();
const boardEntries = buildEntries(rawBySport, 0.5);

const realCount = boardEntries.filter(e => !e.isPlaceholder).length;
const phCount = boardEntries.filter(e => e.isPlaceholder).length;
console.log(`Built ${boardEntries.length} entries (${realCount} real, ${phCount} placeholders)\n`);

// Sample adpScore values
const top5 = boardEntries.filter(e => !e.isPlaceholder).slice(0, 5);
for (const e of top5) {
  console.log(`  ${e.name.padEnd(25)} DPS=${e.adpScore.toFixed(1)}  winProb=${(e.ev?.winProbability ?? 0).toFixed(1)}%`);
}

// Coarse scan
console.log('\n=== Coarse scan α=0.00 to 1.00 (step 0.05) ===');
let bestAlpha = null, bestTotal = 0;
for (let a = 0; a <= 1.001; a += 0.05) {
  const { total } = sweepWaEV(boardEntries, a);
  const under = total <= 6800;
  if (under && total > bestTotal) { bestAlpha = a; bestTotal = total; }
  console.log(`α=${a.toFixed(2)} → ${total.toFixed(1)}${under ? '' : ' OVER'}`);
}

// Fine scan
if (bestAlpha != null) {
  const lo = Math.max(0, bestAlpha - 0.05);
  const hi = Math.min(1, bestAlpha + 0.05);
  for (let a = lo; a <= hi + 0.0001; a += 0.001) {
    const { total } = sweepWaEV(boardEntries, a);
    if (total <= 6800 && total > bestTotal) { bestAlpha = a; bestTotal = total; }
  }
}

const { total: finalTotal, sportTotals } = sweepWaEV(boardEntries, bestAlpha);
console.log(`\n=== OPTIMAL RESULT ===`);
console.log(`Alpha (DPS weight): ${bestAlpha.toFixed(4)}`);
console.log(`Total WA_EV: ${finalTotal.toFixed(1)}`);
console.log(`Headroom: ${(6800 - finalTotal).toFixed(1)}`);
console.log(`\nPer-sport breakdown:`);
const sorted = Object.entries(sportTotals).sort((a, b) => b[1] - a[1]);
for (const [sport, val] of sorted) {
  console.log(`  ${sport.padEnd(14)} ${val.toFixed(1).padStart(8)}${val > 340 ? ' ⚠ OVER' : ''}`);
}
