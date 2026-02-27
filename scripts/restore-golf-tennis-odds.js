/**
 * Restore PGA golf and men's tennis odds with averaged values from multiple sportsbooks.
 * Sources: FanDuel, Yahoo Sports, EasyOfficePools, BetUS, bet365, OddsChecker,
 *          Bleacher Nation, SBR, Golf Channel (all Feb 2026)
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve('server/data/manual-odds.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function set(sport, name, tournamentId, avgOdds) {
  const id = `${sport}-${slugify(name)}`;
  if (!data[id]) {
    data[id] = { sport, name, oddsBySource: {}, oddsByTournament: {}, timestamp: Date.now() };
  }
  if (!data[id].oddsByTournament) data[id].oddsByTournament = {};
  data[id].oddsByTournament[tournamentId] = { avg: avgOdds };
  data[id].timestamp = Date.now();
}

// Wipe existing pga and tennis_m entries before rebuilding
Object.keys(data).forEach(id => {
  if (data[id].sport === 'pga' || data[id].sport === 'tennis_m') delete data[id];
});
console.log('Cleared existing pga and tennis_m entries.\n');

// ── THE MASTERS (April 9-12, Augusta National) ────────────────────────────
// FanDuel | Yahoo Sports | EasyOfficePools (Feb 17) | Bleacher Nation | SBR
[
  ['Scottie Scheffler', '+295'],  // FD+280, Yahoo+300, EOP 3/1 → avg 293
  ['Rory McIlroy',      '+650'],  // FD+700, Yahoo+650, EOP 6/1 → avg 650
  ['Bryson DeChambeau', '+1300'], // FD+1400, Yahoo+1400, EOP 10/1 → avg 1267
  ['Jon Rahm',          '+1300'], // FD+1700, Yahoo+1600, EOP 10/1, DK+1000 → avg 1325
  ['Xander Schauffele', '+1600'], // Yahoo+1600, EOP 18/1, SBR+1100/+1900 → avg 1600
  ['Tommy Fleetwood',   '+1750'], // FD+1800, Yahoo+1800, EOP 16/1 → avg 1733
  ['Ludvig Aberg',      '+1800'], // FD+1400, Yahoo+1400, EOP 26/1 → avg 1800
  ['Collin Morikawa',   '+2300'], // Yahoo+2200, EOP 25/1 → avg 2350
  ['Justin Thomas',     '+2500'], // Yahoo+2500
  ['Justin Rose',       '+2900'], // Yahoo+2800, EOP 30/1 → avg 2900
  ['Viktor Hovland',    '+3000'], // Yahoo+3000
  ['Hideki Matsuyama',  '+3000'], // Yahoo+3000
  ['Jordan Spieth',     '+4000'], // EOP 40/1
  ['Brooks Koepka',     '+4000'], // EOP 40/1
  ['Cameron Young',     '+4000'], // EOP 40/1
].forEach(([n, o]) => set('pga', n, 'masters', o));
console.log('Masters: 15 players');

// ── PGA CHAMPIONSHIP (May 14-17, Aronimink GC) ────────────────────────────
// Caesars | SBR | Golf Channel
[
  ['Scottie Scheffler', '+425'],  // Caesars+550, SBR+300 → avg 425
  ['Rory McIlroy',      '+650'],  // SBR+650
  ['Bryson DeChambeau', '+1000'], // SBR+1000
  ['Jon Rahm',          '+1200'], // SBR+1200
  ['Xander Schauffele', '+1400'], // SBR+1400
  ['Ludvig Aberg',      '+1800'], // SBR+1800
  ['Justin Thomas',     '+2000'], // SBR+2000
  ['Collin Morikawa',   '+2200'], // SBR+2200
  ['Viktor Hovland',    '+3000'], // SBR+3000
  ['Joaquin Niemann',   '+3500'], // SBR+3500
  ['Tyrrell Hatton',    '+3500'], // SBR+3500
  ['Jordan Spieth',     '+4000'], // SBR+4000
  ['Brooks Koepka',     '+4000'], // SBR+4000
  ['Patrick Cantlay',   '+4500'], // SBR+4500
  ['Hideki Matsuyama',  '+5000'], // SBR+5000
  ['Tommy Fleetwood',   '+5000'], // SBR+5000
].forEach(([n, o]) => set('pga', n, 'pga-champ', o));
console.log('PGA Championship: 16 players');

// ── US OPEN GOLF (June 18-21, Shinnecock Hills) ────────────────────────────
// SBR | Yahoo | VegasInsider
[
  ['Scottie Scheffler', '+385'],  // +400, +390, +360 → avg 383
  ['Rory McIlroy',      '+900'],  // +900, +825, +950 → avg 892
  ['Bryson DeChambeau', '+900'],  // +900, +850, +950 → avg 900
  ['Jon Rahm',          '+1300'], // +1300
].forEach(([n, o]) => set('pga', n, 'us-open', o));
console.log('US Open Golf: 4 players');

// ── THE OPEN CHAMPIONSHIP (Royal Birkdale) ────────────────────────────────
// SBR | Golf Channel | OddsChecker
[
  ['Scottie Scheffler', '+300'],  // SBR+300
  ['Rory McIlroy',      '+500'],  // SBR+500
  ['Xander Schauffele', '+1100'], // SBR+1100
  ['Bryson DeChambeau', '+1200'], // SBR+1200
  ['Jon Rahm',          '+1400'], // SBR+1400
  ['Tommy Fleetwood',   '+1600'], // SBR+1600
].forEach(([n, o]) => set('pga', n, 'open-champ', o));
console.log('Open Championship: 6 players');

// ── WIMBLEDON MEN (July) ─────────────────────────────────────────────────
// bet365 | BetUS | OddsChecker | VegasInsider
[
  ['Carlos Alcaraz',    '+135'],  // bet365 6/5=+120, BetUS+150 → avg 135
  ['Jannik Sinner',     '+150'],  // OC+145, BetUS+150 → avg 148
  ['Novak Djokovic',    '+800'],  // bet365 8/1, BetUS+800
  ['Alexander Zverev',  '+1600'], // bet365 16/1=+1600
  ['Jack Draper',       '+1500'], // bet365 16/1=+1600, BetUS+1600, OC+1200 → avg 1467
  ['Taylor Fritz',      '+2200'], // bet365 22/1=+2200
  ['Ben Shelton',       '+3300'], // bet365 33/1=+3300
  ['Jakub Mensik',      '+3300'], // bet365 33/1=+3300
  ['Joao Fonseca',      '+3300'], // bet365 33/1=+3300
  ['Daniil Medvedev',   '+4000'], // bet365 40/1=+4000
  ['Jiri Lehecka',      '+4000'], // bet365 40/1=+4000
  ['Matteo Berrettini', '+4000'], // bet365 40/1=+4000
  ['Alexander Bublik',  '+4000'], // bet365 40/1=+4000
].forEach(([n, o]) => set('tennis_m', n, 'wimbledon', o));
console.log('Wimbledon Men: 13 players');

// ── FRENCH OPEN MEN (May 24 - Jun 7) ────────────────────────────────────
// FanDuel | SBR | OddsChecker
[
  ['Carlos Alcaraz',   '+130'],  // FD+100, SBR+110, OC 6/4=+150 → avg 120
  ['Jannik Sinner',    '+150'],  // FD+145, SBR+150, OC 13/8=+162 → avg 152
  ['Alexander Zverev', '+1500'], // FD+1400, OC 16/1=+1600 → avg 1500
  ['Novak Djokovic',   '+1450'], // FD+1100, OC 18/1=+1800 → avg 1450
  ['Jack Draper',      '+2700'], // FD+2700
  ['Joao Fonseca',     '+2700'], // FD+2700
  ['Lorenzo Musetti',  '+2700'], // FD+2700
].forEach(([n, o]) => set('tennis_m', n, 'french-open', o));
console.log('French Open Men: 7 players');

// ── US OPEN TENNIS MEN (Aug-Sep) ─────────────────────────────────────────
// BetUS | bet365 | VegasInsider
[
  ['Jannik Sinner',    '+105'],  // BetUS+100, bet365 evens=+100, various+110 → avg 103
  ['Carlos Alcaraz',   '+250'],  // BetUS+200, bet365 3/1=+300 → avg 250
  ['Novak Djokovic',   '+1000'], // +1000
  ['Alexander Zverev', '+1400'], // +1400
  ['Jack Draper',      '+1400'], // +1400
].forEach(([n, o]) => set('tennis_m', n, 'us-open', o));
console.log('US Open Men Tennis: 5 players');

const pgaCount = Object.values(data).filter(e => e.sport === 'pga').length;
const tennisCount = Object.values(data).filter(e => e.sport === 'tennis_m').length;
console.log(`\nFinal totals  →  PGA: ${pgaCount} entries  |  tennis_m: ${tennisCount} entries`);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Saved!');
