import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../data/sports';

// ─── Teams (column order = left-to-right as shown on brackt.com) ─────────────
const TEAMS = [
  "code.monkey",      // 0
  ".herbal",          // 1
  "mart121",          // 2
  "apatel78",         // 3
  "pandabair",        // 4
  "christhrowsrocks", // 5
  "snarkymcgee",      // 6
  "Madmike",          // 7
  "brando1609",       // 8
  "tanay002",         // 9
  "ikyn",             // 10
  "peteg__",          // 11
  "smelscifi",        // 12
  "bakrondo",         // 13
];

const TOTAL_ROUNDS = 25;

// ─── Sport mapping: brackt.com label → our internal sport ID ─────────────────
const BRACKT_SPORT_TO_ID = {
  'PGA Golf':                      'pga',
  "Tennis - Men's":                'tennis_m',  // fallback picks
  "Tennis - Men":                  'tennis_m',  // live API
  "Tennis - Women's":              'tennis_w',  // fallback picks
  "Tennis - Women":                'tennis_w',  // live API
  'Formula 1':                     'f1',
  'PDC Darts':                     'darts',
  'Indycar Series':                'indycar',
  'MLB':                           'mlb',
  "NCAA Basketball - Women's":     'ncaaw',     // fallback picks
  "NCAAW Basketball":              'ncaaw',     // live API
  "NCAA Basketball - Men's":       'ncaab',     // fallback picks
  "NCAAM Basketball":              'ncaab',     // live API
  'Counter Strike':                'csgo',
  'NHL':                           'nhl',
  'UEFA Champions League':         'ucl',
  'NBA':                           'nba',
  'Aussie Rules Football':         'afl',
  'Little League World Series':    'llws',
  'WNBA':                          'wnba',
  "FIFA Men's World Cup":          'fifa',
  'Snooker':                       'snooker',
  'NCAA Football':                 'ncaaf',
  'NFL':                           'nfl',
};

// ─── Short labels for the sport badge in each cell ───────────────────────────
const SPORT_ABBR = {
  'PGA Golf':                      'PGA',
  "Tennis - Men's":                'ATP',
  "Tennis - Men":                  'ATP',
  "Tennis - Women's":              'WTA',
  "Tennis - Women":                'WTA',
  'Formula 1':                     'F1',
  'PDC Darts':                     'DARTS',
  'Indycar Series':                'INDY',
  'MLB':                           'MLB',
  "NCAA Basketball - Women's":     'NCAAW',
  "NCAAW Basketball":              'NCAAW',
  "NCAA Basketball - Men's":       'NCAAB',
  "NCAAM Basketball":              'NCAAB',
  'Counter Strike':                'CS2',
  'NHL':                           'NHL',
  'UEFA Champions League':         'UCL',
  'NBA':                           'NBA',
  'Aussie Rules Football':         'AFL',
  'Little League World Series':    'LLWS',
  'WNBA':                          'WNBA',
  "FIFA Men's World Cup":          'FIFA',
  'Snooker':                       'SNK',
  'NCAA Football':                 'NCAAF',
  'NFL':                           'NFL',
};

// ─── Name corrections: brackt.com label (lowercased) → exact roster name ─────
// Derived directly from rosters.js — no guessing.
const NAME_FIX = {
  'andrea kimi antonelli':         'Kimi Antonelli',          // f1 roster: 'Kimi Antonelli'
  'connecticut (uconn)':           'UConn Huskies',           // ncaaw: 'UConn Huskies'
  'connecticut':                   'UConn Huskies',           // ncaab: 'UConn Huskies'
  'michigan':                      'Michigan Wolverines',     // ncaab + ncaaw
  'duke':                          'Duke Blue Devils',
  'south carolina':                'South Carolina Gamecocks',
  'ucla':                          'UCLA Bruins',
  'arizona':                       'Arizona Wildcats',
  'houston':                       'Houston Cougars',
  'ohio state':                    'Ohio State Buckeyes',
  'notre dame':                    'Notre Dame Fighting Irish',
  'indiana':                       'Indiana Hoosiers',
  'texas':                         'Texas Longhorns',
  'paris saint-germain':           'PSG',
  'atlético madrid':               'Atletico Madrid',
  'gws giants':                    'Greater Western Sydney Giants',
  'team vitality':                 'Vitality',    // roster: 'Vitality'
  'team falcons':                  'Falcons',     // roster: 'Falcons'
  'florida':                       'Florida Gators',
  'iowa st.':                      'Iowa State Cyclones',
  'kansas':                        'Kansas Jayhawks',
  'georgia':                       'Georgia Bulldogs',
  'oregon':                        'Oregon Ducks',
  'lsu':                           'LSU Tigers',
  'asia-pacific and middle east':  'Asia-Pacific',
  'us - west':                     'USA West',
  'us - southeast':                'USA Southeast',
  'us - southwest':                'USA Southwest',
  'vanderbilt':                    'Vanderbilt Commodores',
  'illinois':                      'Illinois Fighting Illini',
  'florida (ncaab)':               'Florida Gators',
  // ── NCAAB ─────────────────────────────────────────────────────────
  'michigan st.':                  'Michigan State Spartans',
  'gonzaga':                       'Gonzaga Bulldogs',
  "st. john's":                    "St. John's Red Storm",
  'purdue':                        'Purdue Boilermakers',
  'texas tech':                    'Texas Tech Red Raiders',
  'alabama':                       'Alabama Crimson Tide',
  'texas a&m':                     'Texas A&M Aggies',
  'miami (fl)':                    'Miami Hurricanes',
  'byu':                           'BYU Cougars',
  'oklahoma':                      'Oklahoma Sooners',
  'iowa':                          'Iowa Hawkeyes',
  // ── UCL ────────────────────────────────────────────────────────────
  'tottenham hotspur':             'Tottenham',
  'newcastle united':              'Newcastle',
  'bodø/glimt':                   'Bodo Glimt',
  // ── LLWS ───────────────────────────────────────────────────────────
  'us - mountain':                 'USA Mountain',
  // ── NCAAF ──────────────────────────────────────────────────────────
  'indiana':                       'Indiana Hoosiers',
};

// ─── Entry lookup: map brackt.com pick → boardEntry ──────────────────────────
function findEntry(selection, bracktSport, boardEntries) {
  if (!selection || !boardEntries?.length) return null;
  const sportId = BRACKT_SPORT_TO_ID[bracktSport];
  if (!sportId) return null;
  const corrected = NAME_FIX[selection.toLowerCase()] ?? selection;
  return (
    boardEntries.find(
      (e) => e.sport === sportId && e.name.toLowerCase() === corrected.toLowerCase()
    ) ?? null
  );
}

// ─── Draft_EV: average of ikynEV and wizardEV ────────────────────────────────
// For fixed-field sports wizardEV = ikynEV so result = ikynEV unchanged.
// For variable-field sports (PGA, tennis, IndyCar…) they differ → blended.
function draftEV(ikynData) {
  if (!ikynData) return null;
  const ikyn = ikynData.ev   ?? null;
  const wiz  = ikynData.wizardEV ?? null;
  if (ikyn != null && wiz != null) return (ikyn + wiz) / 2;
  return ikyn ?? wiz ?? null;
}

// ─── Hardcoded fallback picks (used until API loads or on error) ──────────────
// r  = round (1-based)
// ti = team index (0–13, column order)
// Serpentine: odd rounds L→R (ti = pickPos-1), even rounds R→L (ti = 14-pickPos)
// bv = brackt.com value shown in the cell; null when "N/A" or draft not yet reached
const FALLBACK_PICKS = [
  // ── Round 1 (L→R) ─────────────────────────────────────────────────────────
  { r:1,  ti:0,  selection:'Scottie Scheffler',          sport:'PGA Golf',                      bv:35.44 },
  { r:1,  ti:1,  selection:'Carlos Alcaraz',              sport:"Tennis - Men's",                bv:59.17 },
  { r:1,  ti:2,  selection:'George Russell',              sport:'Formula 1',                     bv:62.91 },
  { r:1,  ti:3,  selection:'Luke Littler',                sport:'PDC Darts',                     bv:70.67 },
  { r:1,  ti:4,  selection:'Aryna Sabalenka',             sport:"Tennis - Women's",              bv:40.50 },
  { r:1,  ti:5,  selection:'Alex Palou',                  sport:'Indycar Series',                bv:73.82 },
  { r:1,  ti:6,  selection:'Los Angeles Dodgers',         sport:'MLB',                           bv:56.58 },
  { r:1,  ti:7,  selection:'Connecticut (UConn)',         sport:"NCAA Basketball - Women's",     bv:83.15 },
  { r:1,  ti:8,  selection:'Team Vitality',               sport:'Counter Strike',                bv:30.16 },
  { r:1,  ti:9,  selection:'Jannik Sinner',               sport:"Tennis - Men's",                bv:58.52 },
  { r:1,  ti:10, selection:'Iga Swiatek',                 sport:"Tennis - Women's",              bv:39.24 },
  { r:1,  ti:11, selection:'Arsenal',                     sport:'UEFA Champions League',         bv:56.54 },
  { r:1,  ti:12, selection:'Oklahoma City Thunder',       sport:'NBA',                           bv:71.67 },
  { r:1,  ti:13, selection:'Max Verstappen',              sport:'Formula 1',                     bv:55.87 },
  // ── Round 2 (R→L) ─────────────────────────────────────────────────────────
  { r:2,  ti:13, selection:'Brisbane Lions',              sport:'Aussie Rules Football',         bv:46.16 },
  { r:2,  ti:12, selection:'Judd Trump',                  sport:'Snooker',                       bv:29.59 },
  { r:2,  ti:11, selection:'Asia-Pacific and Middle East',sport:'Little League World Series',    bv:43.51 },
  { r:2,  ti:10, selection:'Las Vegas Aces',              sport:'WNBA',                          bv:51.89 },
  { r:2,  ti:9,  selection:'Colorado Avalanche',          sport:'NHL',                           bv:58.71 },
  { r:2,  ti:8,  selection:'Lando Norris',                sport:'Formula 1',                     bv:33.37 },
  { r:2,  ti:7,  selection:'Minnesota Lynx',              sport:'WNBA',                          bv:51.82 },
  { r:2,  ti:6,  selection:'Bayern Munich',               sport:'UEFA Champions League',         bv:52.43 },
  { r:2,  ti:5,  selection:'Michigan',                    sport:"NCAA Basketball - Men's",       bv:48.20 },
  { r:2,  ti:4,  selection:'Spain',                       sport:"FIFA Men's World Cup",          bv:40.21 },
  { r:2,  ti:3,  selection:'Coco Gauff',                  sport:"Tennis - Women's",              bv:22.39 },
  { r:2,  ti:2,  selection:'Indiana Fever',               sport:'WNBA',                          bv:49.74 },
  { r:2,  ti:1,  selection:'Charles Leclerc',             sport:'Formula 1',                     bv:37.45 },
  { r:2,  ti:0,  selection:'Argentina',                   sport:"FIFA Men's World Cup",          bv:28.48 },
  // ── Round 3 (L→R) ─────────────────────────────────────────────────────────
  { r:3,  ti:0,  selection:'Zhao Xintong',                sport:'Snooker',                       bv:26.83 },
  { r:3,  ti:1,  selection:'Josef Newgarden',             sport:'Indycar Series',                bv:32.90 },
  { r:3,  ti:2,  selection:'Denver Nuggets',              sport:'NBA',                           bv:45.83 },
  { r:3,  ti:3,  selection:'Rory McIlroy',                sport:'PGA Golf',                      bv:24.66 },
  { r:3,  ti:4,  selection:'Duke',                        sport:"NCAA Basketball - Men's",       bv:33.90 },
  { r:3,  ti:5,  selection:'New York Liberty',            sport:'WNBA',                          bv:45.92 },
  { r:3,  ti:6,  selection:'Brazil',                      sport:"FIFA Men's World Cup",          bv:28.49 },
  { r:3,  ti:7,  selection:'Tampa Bay Lightning',         sport:'NHL',                           bv:42.57 },
  { r:3,  ti:8,  selection:'Luke Humphries',              sport:'PDC Darts',                     bv:34.09 },
  { r:3,  ti:9,  selection:'South Carolina',              sport:"NCAA Basketball - Women's",     bv:39.56 },
  { r:3,  ti:10, selection:'UCLA',                        sport:"NCAA Basketball - Women's",     bv:44.21 },
  { r:3,  ti:11, selection:'England',                     sport:"FIFA Men's World Cup",          bv:34.00 },
  { r:3,  ti:12, selection:'Tommy Fleetwood',             sport:'PGA Golf',                      bv:7.40  },
  { r:3,  ti:13, selection:"Pato O'Ward",                 sport:'Indycar Series',                bv:35.87 },
  // ── Round 4 (R→L) ─────────────────────────────────────────────────────────
  { r:4,  ti:13, selection:'Arizona',                     sport:"NCAA Basketball - Men's",       bv:35.66 },
  { r:4,  ti:12, selection:'France',                      sport:"FIFA Men's World Cup",          bv:31.17 },
  { r:4,  ti:11, selection:'Mark Selby',                  sport:'Snooker',                       bv:22.51 },
  { r:4,  ti:10, selection:'Carolina Hurricanes',         sport:'NHL',                           bv:34.21 },
  { r:4,  ti:9,  selection:'Japan',                       sport:'Little League World Series',    bv:32.63 },
  { r:4,  ti:8,  selection:'Elena Rybakina',              sport:"Tennis - Women's",              bv:32.21 },
  { r:4,  ti:7,  selection:'Lewis Hamilton',              sport:'Formula 1',                     bv:33.33 },
  { r:4,  ti:6,  selection:'Novak Djokovic',              sport:"Tennis - Men's",                bv:30.79 },
  { r:4,  ti:5,  selection:'Kyle Kirkwood',               sport:'Indycar Series',                bv:36.03 },
  { r:4,  ti:4,  selection:'Paris Saint-Germain',         sport:'UEFA Champions League',         bv:45.30 },
  { r:4,  ti:3,  selection:'Houston',                     sport:"NCAA Basketball - Men's",       bv:29.84 },
  { r:4,  ti:2,  selection:'Manchester City',             sport:'UEFA Champions League',         bv:42.68 },
  { r:4,  ti:1,  selection:'Seattle Seahawks',            sport:'NFL',                           bv:28.48 },
  { r:4,  ti:0,  selection:'Gian van Veen',               sport:'PDC Darts',                     bv:29.01 },
  // ── Round 5 (L→R) ─────────────────────────────────────────────────────────
  { r:5,  ti:0,  selection:'Andrea Kimi Antonelli',       sport:'Formula 1',                     bv:37.32 },
  { r:5,  ti:1,  selection:'Kyren Wilson',                sport:'Snooker',                       bv:18.50 },
  { r:5,  ti:2,  selection:'Team Falcons',                sport:'Counter Strike',                bv:21.61 },
  { r:5,  ti:3,  selection:'Wu Yize',                     sport:'Snooker',                       bv:13.00 },
  { r:5,  ti:4,  selection:'Neil Robertson',              sport:'Snooker',                       bv:11.07 },
  { r:5,  ti:5,  selection:'Scott McLaughlin',            sport:'Indycar Series',                bv:30.56 },
  { r:5,  ti:6,  selection:'San Antonio Spurs',           sport:'NBA',                           bv:30.56 },
  { r:5,  ti:7,  selection:'Ohio State',                  sport:'NCAA Football',                 bv:32.57 },
  { r:5,  ti:8,  selection:'Xander Schauffele',           sport:'PGA Golf',                      bv:11.86 },
  { r:5,  ti:9,  selection:'Oscar Piastri',               sport:'Formula 1',                     bv:33.25 },
  { r:5,  ti:10, selection:'Scott Dixon',                 sport:'Indycar Series',                bv:26.68 },
  { r:5,  ti:11, selection:'FURIA',                       sport:'Counter Strike',                bv:24.48 },
  { r:5,  ti:12, selection:'Texas',                       sport:"NCAA Basketball - Women's",     bv:25.46 },
  { r:5,  ti:13, selection:'Notre Dame',                  sport:'NCAA Football',                 bv:32.47 },
  // ── Round 6 (R→L) ─────────────────────────────────────────────────────────
  { r:6,  ti:13, selection:'Barcelona',                   sport:'UEFA Champions League',         bv:42.62 },
  { r:6,  ti:12, selection:'Liverpool',                   sport:'UEFA Champions League',         bv:0.00  },
  { r:6,  ti:11, selection:'Gold Coast Suns',             sport:'Aussie Rules Football',         bv:32.89 },
  { r:6,  ti:10, selection:'Michael van Gerwen',          sport:'PDC Darts',                     bv:18.32 },
  { r:6,  ti:9,  selection:'Indiana',                     sport:'NCAA Football',                 bv:29.95 },
  { r:6,  ti:8,  selection:'Alexander Zverev',            sport:"Tennis - Men's",                bv:13.48 },
  { r:6,  ti:7,  selection:'Phoenix Mercury',             sport:'WNBA',                          bv:34.64 },
  { r:6,  ti:6,  selection:'Illinois',                    sport:"NCAA Basketball - Men's",       bv:21.24 },
  { r:6,  ti:5,  selection:'Geelong Cats',                sport:'Aussie Rules Football',         bv:30.00 },
  { r:6,  ti:4,  selection:'Texas',                       sport:'NCAA Football',                 bv:32.47 },
  { r:6,  ti:3,  selection:'Team Spirit',                 sport:'Counter Strike',                bv:17.14 },
  { r:6,  ti:2,  selection:'New York Yankees',            sport:'MLB',                           bv:26.04 },
  { r:6,  ti:1,  selection:'Adelaide Crows',              sport:'Aussie Rules Football',         bv:24.67 },
  { r:6,  ti:0,  selection:'Atlético Madrid',             sport:'UEFA Champions League',         bv:17.07 },
  // ── Round 7 (L→R) ─────────────────────────────────────────────────────────
  { r:7,  ti:0,  selection:'PARIVISION',                  sport:'Counter Strike',                bv:19.06 },
  { r:7,  ti:1,  selection:'Los Angeles Rams',            sport:'NFL',                           bv:26.16 },
  { r:7,  ti:2,  selection:'US - West',                   sport:'Little League World Series',    bv:37.47 },
  { r:7,  ti:3,  selection:'Detroit Pistons',             sport:'NBA',                           bv:27.76 },
  { r:7,  ti:4,  selection:'MOUZ',                        sport:'Counter Strike',                bv:20.18 },
  { r:7,  ti:5,  selection:'Hawthorn Hawks',              sport:'Aussie Rules Football',         bv:31.31 },
  { r:7,  ti:6,  selection:'Vanderbilt',                  sport:"NCAA Basketball - Women's",     bv:13.93 },
  { r:7,  ti:7,  selection:'Portugal',                    sport:"FIFA Men's World Cup",          bv:22.79 },
  { r:7,  ti:8,  selection:'Connecticut',                 sport:"NCAA Basketball - Men's",       bv:13.85 },
  { r:7,  ti:9,  selection:'Boston Celtics',              sport:'NBA',                           bv:29.08 },
  { r:7,  ti:10, selection:'Latin America',               sport:'Little League World Series',    bv:24.58 },
  { r:7,  ti:11, selection:'Amanda Anisimova',            sport:"Tennis - Women's",              bv:20.34 },
  { r:7,  ti:12, selection:'Dallas Stars',                sport:'NHL',                           bv:16.81 },
  { r:7,  ti:13, selection:'Minnesota Wild',              sport:'NHL',                           bv:17.54 },
  // ── Round 8 (R→L) ─────────────────────────────────────────────────────────
  { r:8,  ti:13, selection:'Cleveland Cavaliers',         sport:'NBA',                           bv:29.11 },
  { r:8,  ti:12, selection:'Seattle Mariners',            sport:'MLB',                           bv:21.37 },
  { r:8,  ti:11, selection:'Bryson DeChambeau',           sport:'PGA Golf',                      bv:20.54 },
  { r:8,  ti:10, selection:'Vegas Golden Knights',        sport:'NHL',                           bv:30.51 },
  { r:8,  ti:9,  selection:'Sydney Swans',                sport:'Aussie Rules Football',         bv:29.89 },
  { r:8,  ti:8,  selection:'Madison Keys',                sport:"Tennis - Women's",              bv:11.11 },
  { r:8,  ti:7,  selection:'New York Knicks',             sport:'NBA',                           bv:26.48 },
  { r:8,  ti:6,  selection:'Will Power',                  sport:'Indycar Series',                bv:20.89 },
  { r:8,  ti:5,  selection:'Western Bulldogs',            sport:'Aussie Rules Football',         bv:21.56 },
  { r:8,  ti:4,  selection:'LSU',                         sport:"NCAA Basketball - Women's",     bv:25.60 },
  { r:8,  ti:3,  selection:'Michigan',                    sport:"NCAA Basketball - Women's",     bv:8.91  },
  { r:8,  ti:2,  selection:'Kansas',                      sport:"NCAA Basketball - Men's",       bv:13.75 },
  { r:8,  ti:1,  selection:'Oregon',                      sport:'NCAA Football',                 bv:28.58 },
  { r:8,  ti:0,  selection:'Seattle Storm',               sport:'WNBA',                          bv:22.59 },
  // ── Round 9 (L→R) ─────────────────────────────────────────────────────────
  { r:9,  ti:0,  selection:'Iowa St.',                    sport:"NCAA Basketball - Men's",       bv:0.00  },
  { r:9,  ti:1,  selection:'Florida',                     sport:"NCAA Basketball - Men's",       bv:21.18 },
  { r:9,  ti:2,  selection:'Edmonton Oilers',             sport:'NHL',                           bv:26.94 },
  { r:9,  ti:3,  selection:'Atlanta Dream',               sport:'WNBA',                          bv:23.49 },
  { r:9,  ti:4,  selection:'Golden State Valkyries',      sport:'WNBA',                          bv:16.86 },
  { r:9,  ti:5,  selection:'Jessica Pegula',              sport:"Tennis - Women's",              bv:6.46  },
  { r:9,  ti:6,  selection:'Florida Panthers',            sport:'NHL',                           bv:12.73 },
  { r:9,  ti:7,  selection:'Greater Western Sydney Giants', sport:'Aussie Rules Football',         bv:16.41 },
  { r:9,  ti:8,  selection:'Minnesota Timberwolves',      sport:'NBA',                           bv:14.23 },
  { r:9,  ti:9,  selection:"Ronnie O'Sullivan",           sport:'Snooker',                       bv:18.47 },
  { r:9,  ti:10, selection:'Caribbean',                   sport:'Little League World Series',    bv:28.97 },
  { r:9,  ti:11, selection:'Philadelphia Phillies',       sport:'MLB',                           bv:18.15 },
  { r:9,  ti:12, selection:'Georgia',                     sport:'NCAA Football',                 bv:25.36 },
  { r:9,  ti:13, selection:'Toronto Blue Jays',           sport:'MLB',                           bv:19.34 },
  // ── Round 10 (R→L) ───────────────────────────────────────────────────────
  { r:10, ti:13, selection:'Mirra Andreeva',              sport:"Tennis - Women's",              bv:13.61 },
  { r:10, ti:12, selection:'US - Southeast',              sport:'Little League World Series',    bv:27.14 },
  { r:10, ti:11, selection:'Jack Draper',                 sport:"Tennis - Men's",                bv:14.58 },
  { r:10, ti:10, selection:'Houston Rockets',             sport:'NBA',                           bv:18.13 },
  { r:10, ti:9,  selection:'Germany',                     sport:"FIFA Men's World Cup",          bv:18.78 },
  { r:10, ti:8,  selection:'Detroit Red Wings',           sport:'NHL',                           bv:6.99  },
  { r:10, ti:7,  selection:'Christian Lundgaard',         sport:'Indycar Series',                bv:15.90 },
  { r:10, ti:6,  selection:'US - Southwest',              sport:'Little League World Series',    bv:22.22 },
  { r:10, ti:5,  selection:'Atlanta Braves',              sport:'MLB',                           bv:17.21 },
  { r:10, ti:4,  selection:'New York Mets',               sport:'MLB',                           bv:20.21 },
  { r:10, ti:3,  selection:'Detroit Tigers',              sport:'MLB',                           bv:14.04 },
  { r:10, ti:2,  selection:'Green Bay Packers',           sport:'NFL',                           bv:18.65 },
  { r:10, ti:1,  selection:'Boston Red Sox',              sport:'MLB',                           bv:18.39 },
  { r:10, ti:0,  selection:'Baltimore Ravens',            sport:'NFL',                           bv:21.21 },
  // ── Round 11 (L→R) ────────────────────────────────────────────────────────
  { r:11, ti:0,  selection:'Buffalo Bills',               sport:'NFL',                           bv:21.21 },
  { r:11, ti:1,  selection:'Real Madrid',                 sport:'UEFA Champions League',         bv:0.00  },
  { r:11, ti:2,  selection:'Norway',                      sport:"FIFA Men's World Cup",          bv:11.55 },
  { r:11, ti:3,  selection:'Lorenzo Musetti',             sport:"Tennis - Men's",                bv:5.01  },
  { r:11, ti:4,  selection:'Ben Shelton',                 sport:"Tennis - Men's",                bv:9.45  },
  { r:11, ti:5,  selection:'John Higgins',                sport:'Snooker',                       bv:9.81  },
  { r:11, ti:6,  selection:'Fernando Alonso',             sport:'Formula 1',                     bv:16.96 },
  { r:11, ti:7,  selection:'Jon Rahm',                    sport:'PGA Golf',                      bv:14.60 },
  { r:11, ti:8,  selection:'Natus Vincere',               sport:'Counter Strike',                bv:14.63 },
  { r:11, ti:9,  selection:'David Malukas',               sport:'Indycar Series',                bv:15.80 },
  { r:11, ti:10, selection:'Collingwood Magpies',         sport:'Aussie Rules Football',         bv:18.96 },
  { r:11, ti:11, selection:'Josh Rock',                   sport:'PDC Darts',                     bv:11.73 },
  { r:11, ti:12, selection:'Chelsea',                     sport:'UEFA Champions League',         bv:27.40 },
  { r:11, ti:13, selection:'The MongolZ',                 sport:'Counter Strike',                bv:11.68 },
  // ── Round 12 (R→L) ────────────────────────────────────────────────────────
  { r:12, ti:13, selection:'Fremantle Dockers',           sport:'Aussie Rules Football',         bv:21.51 },
  { r:12, ti:12, selection:'Gerwyn Price',                sport:'PDC Darts',                     bv:12.57 },
  { r:12, ti:11, selection:'Philadelphia Eagles',         sport:'NFL',                           bv:17.62 },
  { r:12, ti:10, selection:'Denver Broncos',              sport:'NFL',                           bv:13.90 },
  { r:12, ti:9,  selection:'San Francisco 49ers',         sport:'NFL',                           bv:14.57 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DraftPage({ boardEntries = [], ikynEVMap = {} }) {
  // ── Live picks state — starts from fallback, updated via brackt.com API ────
  const [picks, setPicks] = useState(FALLBACK_PICKS);
  const [syncStatus, setSyncStatus] = useState('init');   // 'init'|'loading'|'ok'|'error'|'stale'
  const [lastSynced, setLastSynced] = useState(null);
  const [currentPickNum, setCurrentPickNum] = useState(null);

  const syncDraft = useCallback(async () => {
    setSyncStatus('loading');
    try {
      const resp = await fetch('/api/brackt-draft');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data.stale) {
        setSyncStatus('stale');
      } else {
        setSyncStatus('ok');
        setLastSynced(Date.now());
      }

      if (data.picks?.length > 0) {
        // Convert API picks → same shape as FALLBACK_PICKS
        setPicks(data.picks.map(p => ({
          r:         p.round,
          ti:        p.teamIndex,
          selection: p.selection,
          sport:     p.sport,
          bv:        p.bracktValue,
        })));
      }

      if (data.currentPickNumber != null) setCurrentPickNum(data.currentPickNumber);
    } catch (err) {
      console.warn('[BRACKT] draft sync failed:', err.message);
      setSyncStatus('error');
    }
  }, []);

  // Sync on mount; then every 60 s
  useEffect(() => {
    syncDraft();
    const id = setInterval(syncDraft, 60_000);
    return () => clearInterval(id);
  }, [syncDraft]);

  // Build matrix[roundIdx][teamIdx] = { selection, sport, bracktValue, entry }
  const matrix = useMemo(() => {
    const m = Array.from({ length: TOTAL_ROUNDS }, () =>
      Array(TEAMS.length).fill(null)
    );
    for (const p of picks) {
      if (p.r < 1 || p.r > TOTAL_ROUNDS) continue;
      if (p.ti < 0 || p.ti >= TEAMS.length) continue;
      m[p.r - 1][p.ti] = {
        selection:   p.selection,
        sport:       p.sport,
        bracktValue: p.bv,
        entry: findEntry(p.selection, p.sport, boardEntries),
      };
    }
    return m;
  }, [picks, boardEntries]);

  // Team EV = sum of (ikynEV + wizardEV)/2 across all matched picks in the column
  const teamEVs = useMemo(() => {
    return TEAMS.map((_, ti) => {
      let sum = 0, n = 0;
      for (let r = 0; r < TOTAL_ROUNDS; r++) {
        const entry = matrix[r][ti]?.entry;
        if (!entry) continue;
        const dev = draftEV(ikynEVMap[entry.id]);
        if (dev != null && !isNaN(dev)) { sum += dev; n++; }
      }
      return n > 0 ? sum : null;
    });
  }, [matrix, ikynEVMap]);

  // Ranked report data (sorted by Draft_EV desc)
  const reportData = useMemo(() => {
    return TEAMS.map((name, ti) => {
      let numDrafted = 0;
      for (let r = 0; r < TOTAL_ROUNDS; r++) {
        if (matrix[r][ti]) numDrafted++;
      }
      return { name, ev: teamEVs[ti], numDrafted };
    }).sort((a, b) => (b.ev ?? -Infinity) - (a.ev ?? -Infinity));
  }, [teamEVs, matrix]);

  // Board-wide totals
  const boardStats = useMemo(() => {
    let totalEV = 0, totalPicks = 0;
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      for (let ti = 0; ti < TEAMS.length; ti++) {
        const entry = matrix[r][ti]?.entry;
        if (!entry) continue;
        totalPicks++;
        const dev = draftEV(ikynEVMap[entry.id]);
        if (dev != null && !isNaN(dev)) totalEV += dev;
      }
    }
    return {
      totalEV,
      avgEV: totalPicks > 0 ? totalEV / totalPicks : null,
      totalPicks,
    };
  }, [matrix, ikynEVMap]);

  // ── Diagnostics: exactly which picks match / fail and why ──────────────────
  const diagnostics = useMemo(() => {
    const issues = [];
    const matched = [];
    for (const p of picks) {
      const sportId = BRACKT_SPORT_TO_ID[p.sport];
      if (!sportId) {
        issues.push({ r: p.r, ti: p.ti, sel: p.selection, sport: p.sport,
          reason: `UNKNOWN SPORT: "${p.sport}"` });
        continue;
      }
      const raw = p.selection ?? '';
      const corrected = NAME_FIX[raw.toLowerCase()] ?? raw;
      const entry = boardEntries.find(
        (e) => e.sport === sportId && e.name.toLowerCase() === corrected.toLowerCase()
      );
      if (!entry) {
        const avail = boardEntries
          .filter((e) => e.sport === sportId)
          .map((e) => e.name)
          .slice(0, 4)
          .join(', ');
        issues.push({ r: p.r, ti: p.ti, sel: p.selection, sport: p.sport,
          reason: `NO ROSTER MATCH: "${corrected}" in ${sportId}. Have: [${avail || 'none'}...]` });
        continue;
      }
      const ikynData = ikynEVMap[entry.id];
      if (!ikynData) {
        issues.push({ r: p.r, ti: p.ti, sel: p.selection, sport: p.sport,
          reason: `NO EV: entry found (id=${entry.id}) but missing from ikynEVMap` });
        continue;
      }
      matched.push({ r: p.r, ti: p.ti, sel: p.selection });
    }
    return { issues, matched, total: picks.length };
  }, [picks, boardEntries, ikynEVMap]);

  const [reportCopied, setReportCopied] = useState(false);

  const handleReport = useCallback(() => {
    const medals = ['🥇', '🥈', '🥉'];
    const totalPicks = reportData.reduce((s, r) => s + r.numDrafted, 0);
    const totalRounds = reportData.reduce((s, r) => s + TOTAL_ROUNDS, 0);

    const dataRows = reportData.map((row, i) => ({
      rank:  medals[i] ?? String(i + 1),
      name:  row.name,
      ev:    row.ev != null ? row.ev.toFixed(1) : '—',
      picks: `${row.numDrafted}/${TOTAL_ROUNDS}`,
    }));

    const rpad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
    const lpad = (s, n) => ' '.repeat(Math.max(0, n - s.length)) + s;

    const wRank  = Math.max(2,  ...dataRows.map(r => r.rank.length));
    const wName  = Math.max(4,  ...dataRows.map(r => r.name.length));
    const wEV    = Math.max(8,  ...dataRows.map(r => r.ev.length));
    const wPicks = Math.max(5,  ...dataRows.map(r => r.picks.length));

    const sep    = `+-${'-'.repeat(wRank)}-+-${'-'.repeat(wName)}-+-${'-'.repeat(wEV)}-+-${'-'.repeat(wPicks)}-+`;
    const header = `| ${rpad('#', wRank)} | ${rpad('TEAM', wName)} | ${lpad('DRAFT_EV', wEV)} | ${rpad('PICKS', wPicks)} |`;
    const lines  = dataRows.map(r =>
      `| ${rpad(r.rank, wRank)} | ${rpad(r.name, wName)} | ${lpad(r.ev, wEV)} | ${rpad(r.picks, wPicks)} |`
    );

    const table = [
      `🕹️  BRACKT · RUMBLE LEAGUE 2026 · DRAFT_EV STANDINGS`,
      `     Blended EV · (PL-MC + WizardEV) / 2 · ${totalPicks}/${totalRounds} picks complete`,
      ``,
      '```',
      sep,
      header,
      sep,
      ...lines,
      sep,
      '```',
      `_Higher DRAFT\\_EV = better expected draft outcome based on ADP scores_`,
    ].join('\n');

    navigator.clipboard.writeText(table).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 4000);
    });
  }, [reportData]);

  // ── Sync status chip label + colour ────────────────────────────────────────
  const syncChip = useMemo(() => {
    if (syncStatus === 'loading' || syncStatus === 'init') {
      return { label: '⟳ SYNCING', cls: 'text-retro-cyan/60 border-retro-cyan/20 bg-white/5 animate-pulse' };
    }
    if (syncStatus === 'ok') {
      const ago = lastSynced ? Math.round((Date.now() - lastSynced) / 1000) : 0;
      return { label: `✓ LIVE ${ago < 5 ? 'NOW' : `${ago}s ago`}`, cls: 'text-retro-lime/70 border-retro-lime/20 bg-retro-lime/5' };
    }
    if (syncStatus === 'stale') {
      return { label: '⚠ STALE', cls: 'text-retro-gold/70 border-retro-gold/20 bg-retro-gold/5' };
    }
    return { label: '✗ OFFLINE', cls: 'text-retro-red/60 border-retro-red/20 bg-retro-red/5' };
  }, [syncStatus, lastSynced]);

  return (
    <div style={{ minWidth: `${38 + TEAMS.length * 155}px` }}>

      {/* ── Sticky page header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4
                      h-12 flex-shrink-0
                      bg-gradient-to-r from-[#2D2D44] to-[#1A1A2E]
                      border-b border-retro-cyan/20 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="font-retro text-retro-cyan text-[14px] tracking-widest whitespace-nowrap">
            DRAFT_BOARD
          </h1>
          <span className="font-mono text-[9px] text-retro-light/30 tracking-widest hidden sm:block whitespace-nowrap">
            RUMBLE LEAGUE 2026 · 14 TEAMS · 25 ROUNDS · SERPENTINE
          </span>
          {currentPickNum != null && (
            <span className="font-mono text-[9px] text-retro-gold/50 tracking-widest hidden md:block whitespace-nowrap">
              PICK {currentPickNum} ON THE CLOCK
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Live sync status */}
          <button
            onClick={syncDraft}
            title="Click to force-refresh from brackt.com"
            className={`font-retro text-[10px] px-2 py-1 border transition-all active:translate-y-px whitespace-nowrap ${syncChip.cls}`}
          >
            {syncChip.label}
          </button>

          {/* REPORT button */}
          <button
            onClick={handleReport}
            disabled={reportCopied}
            className={`font-retro text-[11px] px-3 py-1 border transition-all active:translate-y-px whitespace-nowrap
              ${reportCopied
                ? 'bg-green-500/20 text-green-400 border-green-500/60 shadow-[0_0_8px_rgba(74,222,128,0.4)]'
                : 'bg-white/5 text-retro-lime/80 border-retro-lime/30 hover:bg-retro-lime/10 hover:border-retro-lime/60 hover:text-retro-lime'
              }`}
          >
            {reportCopied ? '✓ COPIED!' : 'REPORT'}
          </button>
          <Link
            to="/"
            className="font-retro text-[11px] px-3 py-1 bg-white/5 text-retro-light/50
                       border border-white/10 hover:text-retro-light/80 hover:border-white/20
                       transition-all active:translate-y-px whitespace-nowrap"
          >
            ← BACK
          </Link>
        </div>
      </div>

      {/* ── Clipboard toast ───────────────────────────────────────────────── */}
      {reportCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        flex items-center gap-2 px-4 py-2
                        bg-[#0d1a0d] border border-green-500/60
                        shadow-[0_0_20px_rgba(74,222,128,0.3)]
                        animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          <span className="font-retro text-[11px] text-green-400 tracking-widest">
            REPORT COPIED TO CLIPBOARD
          </span>
        </div>
      )}

      {/* ── Board stat blocks ─────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-px px-4 py-3 border-b border-white/[0.06] bg-[#1e1e32]">
        {/* TOTAL_DRAFT_EV */}
        <div className="flex flex-col justify-center px-4 py-2 border border-retro-cyan/20 bg-white/[0.02] min-w-[140px]">
          <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase mb-0.5">
            Total Draft_EV
          </span>
          <span className="font-mono text-[22px] font-bold text-retro-cyan leading-none">
            {boardStats.totalEV > 0 ? boardStats.totalEV.toFixed(1) : '—'}
          </span>
        </div>
        {/* AVERAGE_TEAM_EV */}
        <div className="flex flex-col justify-center px-4 py-2 border border-white/10 bg-white/[0.02] min-w-[140px]">
          <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase mb-0.5">
            Avg per Pick
          </span>
          <span className="font-mono text-[22px] font-bold text-retro-light/70 leading-none">
            {boardStats.avgEV != null ? boardStats.avgEV.toFixed(2) : '—'}
          </span>
        </div>
        {/* EV formula note */}
        <div className="flex flex-col justify-center px-4 py-2 border border-white/5 bg-white/[0.01] min-w-[180px]">
          <span className="font-mono text-[8px] text-retro-light/20 tracking-widest uppercase mb-0.5">
            Formula
          </span>
          <span className="font-mono text-[9px] text-retro-purple/60 leading-none">
            (ikynEV + wizardEV) / 2
          </span>
        </div>
      </div>

      {/* ── Match diagnostics panel ───────────────────────────────────────── */}
      <details className="border-b border-white/[0.06] bg-[#111128]">
        <summary
          className="flex items-center gap-3 px-4 py-2 cursor-pointer select-none
                     font-retro text-[10px] tracking-widest list-none"
        >
          <span
            className={diagnostics.issues.length === 0
              ? 'text-retro-lime/80'
              : 'text-retro-gold/80'}
          >
            {diagnostics.issues.length === 0 ? '✓' : '⚠'} DIAGNOSTICS
          </span>
          <span className="text-retro-lime/60">
            {diagnostics.matched.length}/{diagnostics.total} PICKS MATCHED
          </span>
          {diagnostics.issues.length > 0 && (
            <span className="text-retro-gold/70">
              · {diagnostics.issues.length} UNMATCHED — EXPAND TO SEE
            </span>
          )}
          <span className="ml-auto text-retro-light/20 text-[9px]">▼</span>
        </summary>
        <div className="px-4 py-2 font-mono text-[9px] space-y-0.5 max-h-64 overflow-y-auto">
          {diagnostics.issues.length === 0 ? (
            <div className="text-retro-lime/50">All picks matched — dEV should show for all.</div>
          ) : (
            diagnostics.issues.map((issue, i) => (
              <div key={i} className="flex gap-2 text-retro-gold/70">
                <span className="text-retro-light/30 shrink-0">
                  R{issue.r} {TEAMS[issue.ti]}
                </span>
                <span className="text-retro-light/50 shrink-0">"{issue.sel}"</span>
                <span className="text-retro-gold/50">{issue.reason}</span>
              </div>
            ))
          )}
        </div>
      </details>

      {/* ── Draft matrix table ────────────────────────────────────────────── */}
      <table
        className="border-collapse"
        style={{ tableLayout: 'fixed', minWidth: `${38 + TEAMS.length * 155}px` }}
      >
        <colgroup>
          <col style={{ width: '38px' }} />
          {TEAMS.map((_, i) => <col key={i} style={{ width: '155px' }} />)}
        </colgroup>

        {/* Sticky thead — sits just below the sticky page header (top-12 = 48px) */}
        <thead className="sticky z-20" style={{ top: '48px' }}>
          {/* Row A: Team EV */}
          <tr>
            <th className="sticky left-0 z-30 bg-[#0f0f22] border-r border-retro-cyan/15 p-0" />
            {TEAMS.map((team, ti) => (
              <th
                key={team}
                className="bg-[#0f0f22] border-r border-retro-cyan/15 px-2 pt-1.5 pb-0.5 text-center"
              >
                <div className="font-mono text-[8px] text-retro-light/40 tracking-widest uppercase mb-0.5">TEAM EV</div>
                <div className="font-mono text-[15px] font-bold text-retro-cyan leading-none tabular-nums">
                  {teamEVs[ti] != null ? teamEVs[ti].toFixed(1) : '—'}
                </div>
              </th>
            ))}
          </tr>
          {/* Row B: Team names */}
          <tr>
            <th
              className="sticky left-0 z-30 bg-[#1a1a38] border-r border-b-2 border-retro-cyan/25 p-0 w-[38px]"
              style={{ borderBottom: '2px solid rgba(0,245,255,0.25)' }}
            />
            {TEAMS.map((team, ti) => (
              <th
                key={team}
                className="bg-[#1a1a38] border-r border-retro-cyan/15 px-2 py-1.5 text-center"
                style={{ borderBottom: '2px solid rgba(0,245,255,0.25)' }}
              >
                <span className="font-retro text-[11px] text-retro-cyan leading-tight block">
                  {team}
                </span>
                <span className="font-mono text-[8px] text-retro-light/20">#{ti + 1}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: TOTAL_ROUNDS }, (_, roundIdx) => {
            const round = roundIdx + 1;
            const rowBg = roundIdx % 2 === 0 ? 'bg-[#14142a]' : 'bg-[#181830]';
            return (
              <tr key={round} className={rowBg}>
                {/* Round label — sticky left */}
                <td
                  className="sticky left-0 z-10 bg-[#0f0f22] border-r border-retro-cyan/15
                             text-center py-1.5 px-0 align-top"
                >
                  <span className="font-retro text-[11px] text-retro-light/40 block leading-none">
                    {round}
                  </span>
                  <span className="font-mono text-[8px] text-retro-light/15 block mt-0.5">
                    {round % 2 === 0 ? '←' : '→'}
                  </span>
                </td>

                {TEAMS.map((_, ti) => {
                  const cell = matrix[roundIdx][ti];

                  if (!cell) {
                    return (
                      <td
                        key={ti}
                        className="border-r border-b border-white/[0.04] p-0"
                        style={{ minHeight: '54px', height: '54px' }}
                      />
                    );
                  }

                  const sportId    = BRACKT_SPORT_TO_ID[cell.sport];
                  const sportColor = sportId ? (SPORT_COLORS[sportId] ?? '#888') : '#888';
                  const sportAbbr  = SPORT_ABBR[cell.sport] ?? cell.sport;
                  const ev         = cell.entry?.ev?.seasonTotal;
                  const ikynData   = cell.entry ? ikynEVMap[cell.entry.id] : null;
                  const devVal     = draftEV(ikynData);

                  return (
                    <td
                      key={ti}
                      className="border-r border-b border-white/[0.04] align-top p-0"
                    >
                      <div className="flex h-full">
                        {/* ── Left: name / sport / scores ─────────────────── */}
                        <div className="flex-1 min-w-0 p-1.5">
                          {/* Player / team name */}
                          <div className="font-mono text-[11px] font-medium text-retro-light/85
                                          leading-tight break-words hyphens-auto">
                            {cell.selection}
                          </div>

                          {/* Sport badge */}
                          <div
                            className="font-retro text-[9px] font-semibold mt-0.5 tracking-wider"
                            style={{ color: sportColor }}
                          >
                            {sportAbbr}
                          </div>

                          {/* bv + EV */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {cell.bracktValue != null && (
                              <span className="font-mono text-[9px] text-retro-light/30 tabular-nums">
                                {cell.bracktValue.toFixed(2)}
                              </span>
                            )}
                            {ev != null ? (
                              <span
                                className="font-mono text-[9px] font-bold tabular-nums"
                                style={{ color: sportColor }}
                              >
                                EV {ev.toFixed(1)}
                              </span>
                            ) : cell.entry ? (
                              <span className="font-mono text-[9px] text-retro-light/20">EV —</span>
                            ) : null}
                          </div>
                        </div>

                        {/* ── Right: Draft_EV ──────────────────────────────── */}
                        <div
                          className="w-10 flex-shrink-0 border-l border-white/[0.06]
                                     flex flex-col items-center justify-center gap-0.5 py-1"
                          title={ikynData
                            ? `ikynEV=${ikynData.ev?.toFixed(1)} wizardEV=${ikynData.wizardEV?.toFixed(1)} → dEV=${devVal?.toFixed(1)}`
                            : 'No match found'}
                        >
                          <span className="font-retro text-[7px] text-retro-light/25 tracking-widest leading-none uppercase">
                            dEV
                          </span>
                          {devVal != null ? (
                            <span
                              className="font-mono text-[13px] font-black tabular-nums leading-none"
                              style={{ color: '#39FF14' }}
                            >
                              {devVal.toFixed(1)}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-retro-light/15 leading-none">—</span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2
                      bg-[#0f0f22] border-t border-white/[0.04]
                      font-mono text-[9px] text-retro-light/25">
        <span className="text-retro-light/40">LEGEND</span>
        <span><span className="text-retro-light/40">##.##</span> = BRACKT.COM SCORE</span>
        <span><span className="text-retro-cyan/50">EV ##.#</span> = OUR EV (MATCHED FROM BOARD)</span>
        <span><span className="text-retro-cyan/35">TEAM EV</span> = SUM OF MATCHED dEVs</span>
        <span><span style={{ color: '#39FF14' }}>dEV</span> = DRAFT_EV · (PL-MC ikynEV + WizardEV) / 2</span>
        <span className="ml-auto">SOURCE: BRACKT.COM · RUMBLE LEAGUE 2026 · AUTO-SYNC 60s</span>
      </div>
    </div>
  );
}
