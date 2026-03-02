/**
 * Find roster entries that have no odds data.
 * Checks both server/data/live/*.json (pipeline) and server/data/manual-odds.json.
 *
 * Usage:
 *   node scripts/find-missing-odds.js
 *   node scripts/find-missing-odds.js --sport indycar
 *   node scripts/find-missing-odds.js --sport tennis_m
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ROSTERS from '../src/data/rosters.js';
import SPORTS from '../src/data/sports.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DATA = join(__dirname, '..', 'server', 'data');

const sportFilter = (() => {
  const idx = process.argv.indexOf('--sport');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Build coverage map: sport -> Set of normalized names with odds
// Source 1: server/data/live/*.json (standard pipeline sports)
// Source 2: server/data/manual-odds.json (QP sports + manual overrides)
const oddsNames = {};

// Source 1: live pipeline files
const liveDir = join(SERVER_DATA, 'live');
if (existsSync(liveDir)) {
  for (const file of readdirSync(liveDir)) {
    if (!file.endsWith('.json') || file === 'manifest.json') continue;
    const sportId = file.replace('.json', '');
    try {
      const data = JSON.parse(readFileSync(join(liveDir, file), 'utf8'));
      if (data.entries) {
        const s = (oddsNames[sportId] ??= new Set());
        for (const e of data.entries) {
          if (e.name) s.add(normalize(e.name));
        }
      }
    } catch { /* skip malformed */ }
  }
}

// Source 2: manual-odds.json
const manualPath = join(SERVER_DATA, 'manual-odds.json');
if (existsSync(manualPath)) {
  try {
    const manual = JSON.parse(readFileSync(manualPath, 'utf8'));
    for (const item of Object.values(manual)) {
      if (!item.sport || !item.name) continue;
      (oddsNames[item.sport] ??= new Set()).add(normalize(item.name));
    }
  } catch { /* skip */ }
}

let totalMissing = 0, totalRoster = 0;

console.log('='.repeat(70));
console.log('  MISSING ODDS REPORT  (pipeline live/ + manual-odds.json)');
console.log('='.repeat(70));
console.log();

for (const sport of SPORTS) {
  if (!sport.active) continue;
  if (sportFilter && sport.id !== sportFilter) continue;

  const names = ROSTERS[sport.id] || [];
  const withOdds = oddsNames[sport.id] || new Set();
  const missing = names.filter(n => !withOdds.has(normalize(n)));
  const covered = names.length - missing.length;

  totalRoster += names.length;
  totalMissing += missing.length;

  const pct = names.length > 0 ? Math.round(covered / names.length * 100) : 0;
  const filled = Math.round(pct / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

  console.log(`${sport.name.padEnd(28)} ${bar} ${covered}/${names.length} (${pct}% covered)`);

  if (missing.length > 0) {
    for (let i = 0; i < missing.length; i += 3) {
      const row = missing.slice(i, i + 3).map(n => ('  • ' + n).padEnd(30)).join('');
      console.log(row);
    }
    console.log();
  } else {
    console.log('  ✓ All covered\n');
  }
}

if (!sportFilter) {
  console.log('='.repeat(70));
  const totalCovered = totalRoster - totalMissing;
  const overallPct = Math.round(totalCovered / totalRoster * 100);
  console.log(`  OVERALL: ${totalCovered}/${totalRoster} entries have odds (${overallPct}% covered)`);
  console.log(`  MISSING: ${totalMissing} entries need odds`);
  console.log();

  console.log('  PRIORITY (most missing first):');
  const priorityList = [];
  for (const sport of SPORTS) {
    if (!sport.active) continue;
    const names = ROSTERS[sport.id] || [];
    const withOdds = oddsNames[sport.id] || new Set();
    const missing = names.filter(n => !withOdds.has(normalize(n)));
    if (missing.length > 0) priorityList.push({ sport: sport.name, id: sport.id, missing: missing.length, total: names.length });
  }
  priorityList.sort((a, b) => b.missing - a.missing);
  for (const p of priorityList) {
    console.log(`  ${p.missing.toString().padStart(4)} missing  ${p.sport} (${p.id})`);
  }
  console.log();
}
