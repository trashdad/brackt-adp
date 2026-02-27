/**
 * Fill in missing odds across all sports.
 * Directly updates server/data/manual-odds.json.
 *
 * Usage: node scripts/fill-odds-gaps.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANUAL_ODDS_PATH = join(__dirname, '..', 'server', 'data', 'manual-odds.json');

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Tournament sports: per-tournament odds ──────────────────────────
// Structure: { name: { tournamentId: { source: odds } } }

const TOURNAMENT_ODDS = {
  tennis_w: {
    'Madison Keys': { 'aus-open': { research: '+800' }, 'french-open': { research: '+2500' }, 'wimbledon': { research: '+2000' }, 'us-open': { research: '+1600' } },
    'Jasmine Paolini': { 'aus-open': { research: '+4000' }, 'french-open': { research: '+1700' }, 'wimbledon': { research: '+2000' }, 'us-open': { research: '+3500' } },
    'Mirra Andreeva': { 'aus-open': { research: '+1400' }, 'french-open': { research: '+550' }, 'wimbledon': { research: '+2000' }, 'us-open': { research: '+1600' } },
    'Qinwen Zheng': { 'aus-open': { research: '+1400' }, 'french-open': { research: '+1900' }, 'wimbledon': { research: '+3000' }, 'us-open': { research: '+2000' } },
    'Paula Badosa': { 'aus-open': { research: '+3000' }, 'french-open': { research: '+4000' }, 'wimbledon': { research: '+4000' }, 'us-open': { research: '+3500' } },
    'Karolina Muchova': { 'aus-open': { research: '+2500' }, 'french-open': { research: '+2000' }, 'wimbledon': { research: '+2500' }, 'us-open': { research: '+2500' } },
    'Emma Navarro': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+4000' }, 'us-open': { research: '+4000' } },
    'Diana Shnaider': { 'aus-open': { research: '+7000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+6000' }, 'us-open': { research: '+6000' } },
    'Barbora Krejcikova': { 'aus-open': { research: '+6000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+4000' }, 'us-open': { research: '+6000' } },
    'Naomi Osaka': { 'aus-open': { research: '+1800' }, 'french-open': { research: '+3000' }, 'wimbledon': { research: '+2500' }, 'us-open': { research: '+2000' } },
    'Linda Noskova': { 'aus-open': { research: '+4000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+4000' } },
    'Jelena Ostapenko': { 'aus-open': { research: '+6000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+6000' } },
    'Marketa Vondrousova': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+8000' } },
    'Elina Svitolina': { 'aus-open': { research: '+3000' }, 'french-open': { research: '+3000' }, 'wimbledon': { research: '+2500' }, 'us-open': { research: '+2800' } },
    'Leylah Fernandez': { 'aus-open': { research: '+7000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+8000' }, 'us-open': { research: '+6000' } },
    'Amanda Anisimova': { 'aus-open': { research: '+1200' }, 'french-open': { research: '+1400' }, 'wimbledon': { research: '+1200' }, 'us-open': { research: '+1400' } },
    'Emma Raducanu': { 'aus-open': { research: '+5500' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+4000' } },
    'Belinda Bencic': { 'aus-open': { research: '+3500' }, 'french-open': { research: '+4000' }, 'wimbledon': { research: '+3000' }, 'us-open': { research: '+3500' } },
    'Elise Mertens': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+6000' }, 'wimbledon': { research: '+8000' }, 'us-open': { research: '+8000' } },
    'Clara Tauson': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+4000' }, 'us-open': { research: '+5000' } },
    'Marta Kostyuk': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+8000' }, 'us-open': { research: '+8000' } },
    'Ekaterina Alexandrova': { 'aus-open': { research: '+4000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+6000' }, 'us-open': { research: '+4000' } },
    'Liudmila Samsonova': { 'aus-open': { research: '+6000' }, 'french-open': { research: '+6000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+6000' } },
    'Veronika Kudermetova': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Anastasia Potapova': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Maya Joint': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+12000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Victoria Mboko': { 'aus-open': { research: '+3500' }, 'french-open': { research: '+4000' }, 'wimbledon': { research: '+3500' }, 'us-open': { research: '+3000' } },
    'Iva Jovic': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+5000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+4500' } },
    'Sonay Kartal': { 'aus-open': { research: '+15000' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+15000' } },
    'Tereza Valentova': { 'aus-open': { research: '+15000' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+15000' }, 'us-open': { research: '+15000' } },
  },

  tennis_m: {
    'Felix Auger-Aliassime': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+6600' }, 'us-open': { research: '+8000' } },
    'Alex de Minaur': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+6600' } },
    'Casper Ruud': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+3300' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+6600' } },
    'Holger Rune': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+3000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+5000' } },
    'Andrey Rublev': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+6600' }, 'wimbledon': { research: '+6600' }, 'us-open': { research: '+5000' } },
    'Tommy Paul': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+4000' }, 'wimbledon': { research: '+6600' }, 'us-open': { research: '+8000' } },
    'Stefanos Tsitsipas': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+4000' }, 'wimbledon': { research: '+6600' }, 'us-open': { research: '+5000' } },
    'Frances Tiafoe': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+7000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+8000' } },
    'Ugo Humbert': { 'aus-open': { research: '+15000' }, 'french-open': { research: '+6600' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Arthur Fils': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+3000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+5000' } },
    'Grigor Dimitrov': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+6600' }, 'us-open': { research: '+8000' } },
    'Hubert Hurkacz': { 'aus-open': { research: '+6600' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+6600' } },
    'Francisco Cerundolo': { 'aus-open': { research: '+25000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+15000' }, 'us-open': { research: '+15000' } },
    'Flavio Cobolli': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+6600' }, 'wimbledon': { research: '+5000' }, 'us-open': { research: '+8000' } },
    'Denis Shapovalov': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+8000' }, 'us-open': { research: '+10000' } },
    'Karen Khachanov': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Alejandro Davidovich Fokina': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Giovanni Mpetshi Perricard': { 'aus-open': { research: '+5000' }, 'french-open': { research: '+6600' }, 'wimbledon': { research: '+4000' }, 'us-open': { research: '+5000' } },
    'Sebastian Korda': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+8000' }, 'us-open': { research: '+10000' } },
    'Learner Tien': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+8000' } },
    'Gabriel Diallo': { 'aus-open': { research: '+25000' }, 'french-open': { research: '+25000' }, 'wimbledon': { research: '+25000' }, 'us-open': { research: '+25000' } },
    'Alex Michelsen': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+8000' } },
    'Nicolas Jarry': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+8000' }, 'wimbledon': { research: '+15000' }, 'us-open': { research: '+10000' } },
    'Lorenzo Sonego': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+15000' }, 'us-open': { research: '+12500' } },
    'Jan-Lennard Struff': { 'aus-open': { research: '+15000' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+15000' }, 'us-open': { research: '+15000' } },
    'Cameron Norrie': { 'aus-open': { research: '+12500' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+12500' }, 'us-open': { research: '+15000' } },
    'Reilly Opelka': { 'aus-open': { research: '+15000' }, 'french-open': { research: '+25000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+12500' } },
    'Tomas Machac': { 'aus-open': { research: '+10000' }, 'french-open': { research: '+10000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+10000' } },
    'Nick Kyrgios': { 'aus-open': { research: '+8000' }, 'french-open': { research: '+30000' }, 'wimbledon': { research: '+10000' }, 'us-open': { research: '+15000' } },
    'Tallon Griekspoor': { 'aus-open': { research: '+15000' }, 'french-open': { research: '+15000' }, 'wimbledon': { research: '+15000' }, 'us-open': { research: '+15000' } },
  },

  pga: {
    'Sam Burns': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+10000' } },
    'Shane Lowry': { 'masters': { research: '+5000' }, 'pga-champ': { research: '+5000' }, 'us-open': { research: '+5000' }, 'open-champ': { research: '+3500' } },
    'Matt Fitzpatrick': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+8000' } },
    'Russell Henley': { 'masters': { research: '+7000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+10000' } },
    'Sungjae Im': { 'masters': { research: '+6500' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+8000' } },
    'Wyndham Clark': { 'masters': { research: '+8000' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+5000' }, 'open-champ': { research: '+8000' } },
    'Robert MacIntyre': { 'masters': { research: '+6500' }, 'pga-champ': { research: '+5000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+5000' } },
    'Sepp Straka': { 'masters': { research: '+8000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+8000' } },
    'Harris English': { 'masters': { research: '+15000' }, 'pga-champ': { research: '+12500' }, 'us-open': { research: '+12500' }, 'open-champ': { research: '+15000' } },
    'Keegan Bradley': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+10000' } },
    'Brian Harman': { 'masters': { research: '+15000' }, 'pga-champ': { research: '+12500' }, 'us-open': { research: '+12500' }, 'open-champ': { research: '+10000' } },
    'Tony Finau': { 'masters': { research: '+7500' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+8000' } },
    'Maverick McNealy': { 'masters': { research: '+12500' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+12500' } },
    'Tom Kim': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+10000' } },
    'Akshay Bhatia': { 'masters': { research: '+7000' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+8000' } },
    'Min Woo Lee': { 'masters': { research: '+5000' }, 'pga-champ': { research: '+5000' }, 'us-open': { research: '+5000' }, 'open-champ': { research: '+5000' } },
    'Aaron Rai': { 'masters': { research: '+12500' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+12500' } },
    'Cameron Smith': { 'masters': { research: '+6500' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+5000' } },
    'Corey Conners': { 'masters': { research: '+6500' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+8000' } },
    'Max Greyserman': { 'masters': { research: '+15000' }, 'pga-champ': { research: '+12500' }, 'us-open': { research: '+12500' }, 'open-champ': { research: '+15000' } },
    'Jason Day': { 'masters': { research: '+5000' }, 'pga-champ': { research: '+5000' }, 'us-open': { research: '+5000' }, 'open-champ': { research: '+6000' } },
    'Kurt Kitayama': { 'masters': { research: '+15000' }, 'pga-champ': { research: '+12500' }, 'us-open': { research: '+12500' }, 'open-champ': { research: '+15000' } },
    'Ryan Fox': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+8000' } },
    'J.J. Spaun': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+10000' } },
    'Si Woo Kim': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+8000' }, 'us-open': { research: '+8000' }, 'open-champ': { research: '+10000' } },
    'Tom Hoge': { 'masters': { research: '+20000' }, 'pga-champ': { research: '+15000' }, 'us-open': { research: '+15000' }, 'open-champ': { research: '+20000' } },
    'Daniel Berger': { 'masters': { research: '+12500' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+12500' } },
    'Rasmus Hojgaard': { 'masters': { research: '+15000' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+12500' } },
    'Dustin Johnson': { 'masters': { research: '+10000' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+10000' } },
    'Davis Thompson': { 'masters': { research: '+12500' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+12500' } },
    'Ben Griffin': { 'masters': { research: '+20000' }, 'pga-champ': { research: '+15000' }, 'us-open': { research: '+15000' }, 'open-champ': { research: '+20000' } },
    'Patrick Reed': { 'masters': { research: '+5000' }, 'pga-champ': { research: '+10000' }, 'us-open': { research: '+10000' }, 'open-champ': { research: '+10000' } },
    'Chris Gotterup': { 'masters': { research: '+8000' }, 'pga-champ': { research: '+6000' }, 'us-open': { research: '+6000' }, 'open-champ': { research: '+8000' } },
  },

  f1: {
    'Gabriel Bortoleto': { 'draftkings': { avg: '+15000' }, 'fanduel': { avg: '+20000' }, 'betmgm': { avg: '+15000' } },
  },
};

// ── Non-tournament sports: outright odds ────────────────────────────
const OUTRIGHT_ODDS = {
  ucl: {
    'Inter Milan': '+2500',
    'Borussia Dortmund': '+5000',
    'Juventus': '+4000',
    'Napoli': '+2500',
    'AC Milan': '+8000',
    'Benfica': '+15000',
    'Monaco': '+10000',
    'PSV Eindhoven': '+15000',
    'Eintracht Frankfurt': '+10000',
    'Marseille': '+10000',
    'Ajax': '+20000',
    'Athletic Bilbao': '+8000',
    'Villarreal': '+10000',
    'Club Brugge': '+25000',
    'Olympiacos': '+30000',
    'Slavia Prague': '+50000',
    'Copenhagen': '+50000',
  },

  csgo: {
    'Aurora': '+1200',
    'Team Liquid': '+3500',
    'Astralis': '+3500',
    'GamerLegion': '+5000',
    'paiN Gaming': '+5000',
    '3DMAX': '+5000',
    'Heroic': '+6500',
    'FlyQuest': '+8000',
    'MIBR': '+8000',
    'Fnatic': '+10000',
    'Ninjas in Pyjamas': '+10000',
  },

  indycar: {
    'Christian Lundgaard': '+5000',
    'Felix Rosenqvist': '+5000',
    'Santino Ferrucci': '+10000',
    'Marcus Armstrong': '+20000',
    'Christian Rasmussen': '+50000',
    'Rinus VeeKay': '+50000',
    'Nolan Siegel': '+50000',
    'Kyffin Simpson': '+50000',
    'Sting Ray Robb': '+50000',
    'Conor Daly': '+50000',
    'Robert Shwartzman': '+50000',
    'Callum Ilott': '+50000',
    'Louis Foster': '+50000',
    'Devlin DeFrancesco': '+50000',
    'Jacob Abel': '+50000',
  },

  fifa: {
    'South Korea': '+15000',
    'Australia': '+45000',
    'Ghana': '+15000',
    'Algeria': '+20000',
    'Saudi Arabia': '+100000',
    'Iran': '+50000',
    'South Africa': '+50000',
    'Qatar': '+100000',
    'New Zealand': '+100000',
  },

  ncaaf: {
    'Colorado Buffaloes': '+15000',
    'Kansas State Wildcats': '+10000',
    'Iowa State Cyclones': '+8000',
    'Nebraska Cornhuskers': '+17000',
    'Arizona Wildcats': '+20000',
    'Boise State Broncos': '+15000',
    'Tulane Green Wave': '+70000',
    'Memphis Tigers': '+50000',
    'UNLV Rebels': '+30000',
  },

  nhl: {
    'Utah Hockey Club': '+8000',
  },

  nba: {
    'Indiana Pacers': '+10000',
  },

  darts: {
    'Luke Woodhouse': '+15000',
    'Dave Chisnall': '+5000',
    'Daryl Gurney': '+10000',
    'Mike De Decker': '+8000',
  },

  snooker: {
    'Ali Carter': '+10000',
  },

  llws: {
    'USA West': '+1200',
    'USA Metro': '+1400',
    'Asia-Pacific': '+800',
  },
};

// ── MAIN ───────────────────────────────────────────────────────────

const manual = JSON.parse(readFileSync(MANUAL_ODDS_PATH, 'utf8'));
let totalAdded = 0;

// Process tournament odds
for (const [sportId, players] of Object.entries(TOURNAMENT_ODDS)) {
  let sportAdded = 0;

  for (const [name, tournaments] of Object.entries(players)) {
    const entryId = `${sportId}-${slugify(name)}`;

    if (!manual[entryId]) {
      manual[entryId] = {
        sport: sportId,
        name,
        oddsBySource: {},
        oddsByTournament: {},
        timestamp: Date.now(),
      };
    }

    if (!manual[entryId].oddsByTournament) manual[entryId].oddsByTournament = {};

    for (const [tournamentId, sources] of Object.entries(tournaments)) {
      if (!manual[entryId].oddsByTournament[tournamentId]) {
        manual[entryId].oddsByTournament[tournamentId] = {};
      }
      for (const [source, odds] of Object.entries(sources)) {
        if (!manual[entryId].oddsByTournament[tournamentId][source]) {
          manual[entryId].oddsByTournament[tournamentId][source] = odds;
          sportAdded++;
        }
      }
    }

    manual[entryId].timestamp = Date.now();
  }

  console.log(`${sportId}: added ${sportAdded} tournament odds entries`);
  totalAdded += sportAdded;
}

// Process outright odds
for (const [sportId, entries] of Object.entries(OUTRIGHT_ODDS)) {
  let sportAdded = 0;

  for (const [name, odds] of Object.entries(entries)) {
    const entryId = `${sportId}-${slugify(name)}`;

    if (!manual[entryId]) {
      manual[entryId] = {
        sport: sportId,
        name,
        oddsBySource: {},
        oddsByTournament: {},
        timestamp: Date.now(),
      };
    }

    if (!manual[entryId].oddsBySource) manual[entryId].oddsBySource = {};

    // Add as 'consensus' source if no existing sources
    if (Object.keys(manual[entryId].oddsBySource).length === 0) {
      manual[entryId].oddsBySource.consensus = odds;
      sportAdded++;
    }

    manual[entryId].timestamp = Date.now();
  }

  console.log(`${sportId}: added ${sportAdded} outright odds entries`);
  totalAdded += sportAdded;
}

writeFileSync(MANUAL_ODDS_PATH, JSON.stringify(manual, null, 2));
console.log(`\nTotal: ${totalAdded} odds entries added`);
console.log(`Written to ${MANUAL_ODDS_PATH}`);
