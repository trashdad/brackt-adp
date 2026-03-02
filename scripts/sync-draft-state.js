/**
 * Syncs all completed RAW_PICKS from DraftPage into /api/draft-state.
 * Run after the server is up:  node scripts/sync-draft-state.js
 *
 * Existing draft-state entries are preserved; picks are merged on top.
 */

const API_BASE = 'http://localhost:3001';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Teams (column index → owner username) ───────────────────────────────────
const TEAMS = [
  'code.monkey',      // 0
  '.herbal',          // 1
  'mart121',          // 2
  'apatel78',         // 3
  'pandabair',        // 4
  'christhrowsrocks', // 5
  'snarkymcgee',      // 6
  'Madmike',          // 7
  'brando1609',       // 8
  'tanay002',         // 9
  'ikyn',             // 10
  'peteg__',          // 11
  'smelscifi',        // 12
  'bakrondo',         // 13
];

// ─── Sport name (brackt.com label) → internal sport ID ───────────────────────
const BRACKT_SPORT_TO_ID = {
  'PGA Golf':                      'pga',
  "Tennis - Men's":                'tennis_m',
  "Tennis - Women's":              'tennis_w',
  'Formula 1':                     'f1',
  'PDC Darts':                     'darts',
  'Indycar Series':                'indycar',
  'MLB':                           'mlb',
  "NCAA Basketball - Women's":     'ncaaw',
  "NCAA Basketball - Men's":       'ncaab',
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

// ─── Name corrections (brackt.com label → exact roster name) ─────────────────
const NAME_FIX = {
  'andrea kimi antonelli':         'Kimi Antonelli',
  'connecticut (uconn)':           'UConn Huskies',
  'connecticut':                   'UConn Huskies',
  'michigan':                      'Michigan Wolverines',
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
  'team vitality':                 'Vitality',
  'team falcons':                  'Falcons',
  'florida':                       'Florida Gators',
  'iowa st.':                      'Iowa State Cyclones',
  'kansas':                        'Kansas Jayhawks',
  'georgia':                       'Georgia Bulldogs',
  'oregon':                        'Oregon Ducks',
  'lsu':                           'LSU Tigers',
  'vanderbilt':                    'Vanderbilt Commodores',
  'illinois':                      'Illinois Fighting Illini',
  'asia-pacific and middle east':  'Asia-Pacific',
  'us - west':                     'USA West',
  'us - southeast':                'USA Southeast',
  'us - southwest':                'USA Southwest',
};

// ─── All completed picks from DraftPage RAW_PICKS ────────────────────────────
// r=round (1-based), ti=team index (0–13), selection=name, sport=brackt label
const RAW_PICKS = [
  // Round 1
  { r:1,  ti:0,  selection:'Scottie Scheffler',          sport:'PGA Golf'                      },
  { r:1,  ti:1,  selection:'Carlos Alcaraz',              sport:"Tennis - Men's"                },
  { r:1,  ti:2,  selection:'George Russell',              sport:'Formula 1'                     },
  { r:1,  ti:3,  selection:'Luke Littler',                sport:'PDC Darts'                     },
  { r:1,  ti:4,  selection:'Aryna Sabalenka',             sport:"Tennis - Women's"              },
  { r:1,  ti:5,  selection:'Alex Palou',                  sport:'Indycar Series'                },
  { r:1,  ti:6,  selection:'Los Angeles Dodgers',         sport:'MLB'                           },
  { r:1,  ti:7,  selection:'Connecticut (UConn)',         sport:"NCAA Basketball - Women's"     },
  { r:1,  ti:8,  selection:'Team Vitality',               sport:'Counter Strike'                },
  { r:1,  ti:9,  selection:'Jannik Sinner',               sport:"Tennis - Men's"                },
  { r:1,  ti:10, selection:'Iga Swiatek',                 sport:"Tennis - Women's"              },
  { r:1,  ti:11, selection:'Arsenal',                     sport:'UEFA Champions League'         },
  { r:1,  ti:12, selection:'Oklahoma City Thunder',       sport:'NBA'                           },
  { r:1,  ti:13, selection:'Max Verstappen',              sport:'Formula 1'                     },
  // Round 2
  { r:2,  ti:13, selection:'Brisbane Lions',              sport:'Aussie Rules Football'         },
  { r:2,  ti:12, selection:'Judd Trump',                  sport:'Snooker'                       },
  { r:2,  ti:11, selection:'Asia-Pacific and Middle East',sport:'Little League World Series'    },
  { r:2,  ti:10, selection:'Las Vegas Aces',              sport:'WNBA'                          },
  { r:2,  ti:9,  selection:'Colorado Avalanche',          sport:'NHL'                           },
  { r:2,  ti:8,  selection:'Lando Norris',                sport:'Formula 1'                     },
  { r:2,  ti:7,  selection:'Minnesota Lynx',              sport:'WNBA'                          },
  { r:2,  ti:6,  selection:'Bayern Munich',               sport:'UEFA Champions League'         },
  { r:2,  ti:5,  selection:'Michigan',                    sport:"NCAA Basketball - Men's"       },
  { r:2,  ti:4,  selection:'Spain',                       sport:"FIFA Men's World Cup"          },
  { r:2,  ti:3,  selection:'Coco Gauff',                  sport:"Tennis - Women's"              },
  { r:2,  ti:2,  selection:'Indiana Fever',               sport:'WNBA'                          },
  { r:2,  ti:1,  selection:'Charles Leclerc',             sport:'Formula 1'                     },
  { r:2,  ti:0,  selection:'Argentina',                   sport:"FIFA Men's World Cup"          },
  // Round 3
  { r:3,  ti:0,  selection:'Zhao Xintong',                sport:'Snooker'                       },
  { r:3,  ti:1,  selection:'Josef Newgarden',             sport:'Indycar Series'                },
  { r:3,  ti:2,  selection:'Denver Nuggets',              sport:'NBA'                           },
  { r:3,  ti:3,  selection:'Rory McIlroy',                sport:'PGA Golf'                      },
  { r:3,  ti:4,  selection:'Duke',                        sport:"NCAA Basketball - Men's"       },
  { r:3,  ti:5,  selection:'New York Liberty',            sport:'WNBA'                          },
  { r:3,  ti:6,  selection:'Brazil',                      sport:"FIFA Men's World Cup"          },
  { r:3,  ti:7,  selection:'Tampa Bay Lightning',         sport:'NHL'                           },
  { r:3,  ti:8,  selection:'Luke Humphries',              sport:'PDC Darts'                     },
  { r:3,  ti:9,  selection:'South Carolina',              sport:"NCAA Basketball - Women's"     },
  { r:3,  ti:10, selection:'UCLA',                        sport:"NCAA Basketball - Women's"     },
  { r:3,  ti:11, selection:'England',                     sport:"FIFA Men's World Cup"          },
  { r:3,  ti:12, selection:'Tommy Fleetwood',             sport:'PGA Golf'                      },
  { r:3,  ti:13, selection:"Pato O'Ward",                 sport:'Indycar Series'                },
  // Round 4
  { r:4,  ti:13, selection:'Arizona',                     sport:"NCAA Basketball - Men's"       },
  { r:4,  ti:12, selection:'France',                      sport:"FIFA Men's World Cup"          },
  { r:4,  ti:11, selection:'Mark Selby',                  sport:'Snooker'                       },
  { r:4,  ti:10, selection:'Carolina Hurricanes',         sport:'NHL'                           },
  { r:4,  ti:9,  selection:'Japan',                       sport:'Little League World Series'    },
  { r:4,  ti:8,  selection:'Elena Rybakina',              sport:"Tennis - Women's"              },
  { r:4,  ti:7,  selection:'Lewis Hamilton',              sport:'Formula 1'                     },
  { r:4,  ti:6,  selection:'Novak Djokovic',              sport:"Tennis - Men's"                },
  { r:4,  ti:5,  selection:'Kyle Kirkwood',               sport:'Indycar Series'                },
  { r:4,  ti:4,  selection:'Paris Saint-Germain',         sport:'UEFA Champions League'         },
  { r:4,  ti:3,  selection:'Houston',                     sport:"NCAA Basketball - Men's"       },
  { r:4,  ti:2,  selection:'Manchester City',             sport:'UEFA Champions League'         },
  { r:4,  ti:1,  selection:'Seattle Seahawks',            sport:'NFL'                           },
  { r:4,  ti:0,  selection:'Gian van Veen',               sport:'PDC Darts'                     },
  // Round 5
  { r:5,  ti:0,  selection:'Andrea Kimi Antonelli',       sport:'Formula 1'                     },
  { r:5,  ti:1,  selection:'Kyren Wilson',                sport:'Snooker'                       },
  { r:5,  ti:2,  selection:'Team Falcons',                sport:'Counter Strike'                },
  { r:5,  ti:3,  selection:'Wu Yize',                     sport:'Snooker'                       },
  { r:5,  ti:4,  selection:'Neil Robertson',              sport:'Snooker'                       },
  { r:5,  ti:5,  selection:'Scott McLaughlin',            sport:'Indycar Series'                },
  { r:5,  ti:6,  selection:'San Antonio Spurs',           sport:'NBA'                           },
  { r:5,  ti:7,  selection:'Ohio State',                  sport:'NCAA Football'                 },
  { r:5,  ti:8,  selection:'Xander Schauffele',           sport:'PGA Golf'                      },
  { r:5,  ti:9,  selection:'Oscar Piastri',               sport:'Formula 1'                     },
  { r:5,  ti:10, selection:'Scott Dixon',                 sport:'Indycar Series'                },
  { r:5,  ti:11, selection:'FURIA',                       sport:'Counter Strike'                },
  { r:5,  ti:12, selection:'Texas',                       sport:"NCAA Basketball - Women's"     },
  { r:5,  ti:13, selection:'Notre Dame',                  sport:'NCAA Football'                 },
  // Round 6
  { r:6,  ti:13, selection:'Barcelona',                   sport:'UEFA Champions League'         },
  { r:6,  ti:12, selection:'Liverpool',                   sport:'UEFA Champions League'         },
  { r:6,  ti:11, selection:'Gold Coast Suns',             sport:'Aussie Rules Football'         },
  { r:6,  ti:10, selection:'Michael van Gerwen',          sport:'PDC Darts'                     },
  { r:6,  ti:9,  selection:'Indiana',                     sport:'NCAA Football'                 },
  { r:6,  ti:8,  selection:'Alexander Zverev',            sport:"Tennis - Men's"                },
  { r:6,  ti:7,  selection:'Phoenix Mercury',             sport:'WNBA'                          },
  { r:6,  ti:6,  selection:'Illinois',                    sport:"NCAA Basketball - Men's"       },
  { r:6,  ti:5,  selection:'Geelong Cats',                sport:'Aussie Rules Football'         },
  { r:6,  ti:4,  selection:'Texas',                       sport:'NCAA Football'                 },
  { r:6,  ti:3,  selection:'Team Spirit',                 sport:'Counter Strike'                },
  { r:6,  ti:2,  selection:'New York Yankees',            sport:'MLB'                           },
  { r:6,  ti:1,  selection:'Adelaide Crows',              sport:'Aussie Rules Football'         },
  { r:6,  ti:0,  selection:'Atlético Madrid',             sport:'UEFA Champions League'         },
  // Round 7
  { r:7,  ti:0,  selection:'PARIVISION',                  sport:'Counter Strike'                },
  { r:7,  ti:1,  selection:'Los Angeles Rams',            sport:'NFL'                           },
  { r:7,  ti:2,  selection:'US - West',                   sport:'Little League World Series'    },
  { r:7,  ti:3,  selection:'Detroit Pistons',             sport:'NBA'                           },
  { r:7,  ti:4,  selection:'MOUZ',                        sport:'Counter Strike'                },
  { r:7,  ti:5,  selection:'Hawthorn Hawks',              sport:'Aussie Rules Football'         },
  { r:7,  ti:6,  selection:'Vanderbilt',                  sport:"NCAA Basketball - Women's"     },
  { r:7,  ti:7,  selection:'Portugal',                    sport:"FIFA Men's World Cup"          },
  { r:7,  ti:8,  selection:'Connecticut',                 sport:"NCAA Basketball - Men's"       },
  { r:7,  ti:9,  selection:'Boston Celtics',              sport:'NBA'                           },
  { r:7,  ti:10, selection:'Latin America',               sport:'Little League World Series'    },
  { r:7,  ti:11, selection:'Amanda Anisimova',            sport:"Tennis - Women's"              },
  { r:7,  ti:12, selection:'Dallas Stars',                sport:'NHL'                           },
  { r:7,  ti:13, selection:'Minnesota Wild',              sport:'NHL'                           },
  // Round 8
  { r:8,  ti:13, selection:'Cleveland Cavaliers',         sport:'NBA'                           },
  { r:8,  ti:12, selection:'Seattle Mariners',            sport:'MLB'                           },
  { r:8,  ti:11, selection:'Bryson DeChambeau',           sport:'PGA Golf'                      },
  { r:8,  ti:10, selection:'Vegas Golden Knights',        sport:'NHL'                           },
  { r:8,  ti:9,  selection:'Sydney Swans',                sport:'Aussie Rules Football'         },
  { r:8,  ti:8,  selection:'Madison Keys',                sport:"Tennis - Women's"              },
  { r:8,  ti:7,  selection:'New York Knicks',             sport:'NBA'                           },
  { r:8,  ti:6,  selection:'Will Power',                  sport:'Indycar Series'                },
  { r:8,  ti:5,  selection:'Western Bulldogs',            sport:'Aussie Rules Football'         },
  { r:8,  ti:4,  selection:'LSU',                         sport:"NCAA Basketball - Women's"     },
  { r:8,  ti:3,  selection:'Michigan',                    sport:"NCAA Basketball - Women's"     },
  { r:8,  ti:2,  selection:'Kansas',                      sport:"NCAA Basketball - Men's"       },
  { r:8,  ti:1,  selection:'Oregon',                      sport:'NCAA Football'                 },
  { r:8,  ti:0,  selection:'Seattle Storm',               sport:'WNBA'                          },
  // Round 9
  { r:9,  ti:0,  selection:'Iowa St.',                    sport:"NCAA Basketball - Men's"       },
  { r:9,  ti:1,  selection:'Florida',                     sport:"NCAA Basketball - Men's"       },
  { r:9,  ti:2,  selection:'Edmonton Oilers',             sport:'NHL'                           },
  { r:9,  ti:3,  selection:'Atlanta Dream',               sport:'WNBA'                          },
  { r:9,  ti:4,  selection:'Golden State Valkyries',      sport:'WNBA'                          },
  { r:9,  ti:5,  selection:'Jessica Pegula',              sport:"Tennis - Women's"              },
  { r:9,  ti:6,  selection:'Florida Panthers',            sport:'NHL'                           },
  { r:9,  ti:7,  selection:'GWS Giants',                  sport:'Aussie Rules Football'         },
  { r:9,  ti:8,  selection:'Minnesota Timberwolves',      sport:'NBA'                           },
  { r:9,  ti:9,  selection:"Ronnie O'Sullivan",           sport:'Snooker'                       },
  { r:9,  ti:10, selection:'Caribbean',                   sport:'Little League World Series'    },
  { r:9,  ti:11, selection:'Philadelphia Phillies',       sport:'MLB'                           },
  { r:9,  ti:12, selection:'Georgia',                     sport:'NCAA Football'                 },
  { r:9,  ti:13, selection:'Toronto Blue Jays',           sport:'MLB'                           },
  // Round 10
  { r:10, ti:13, selection:'Mirra Andreeva',              sport:"Tennis - Women's"              },
  { r:10, ti:12, selection:'US - Southeast',              sport:'Little League World Series'    },
  { r:10, ti:11, selection:'Chelsea',                     sport:'UEFA Champions League'         },
  { r:10, ti:10, selection:'Houston Rockets',             sport:'NBA'                           },
  { r:10, ti:9,  selection:'Germany',                     sport:"FIFA Men's World Cup"          },
  { r:10, ti:8,  selection:'Detroit Red Wings',           sport:'NHL'                           },
  { r:10, ti:7,  selection:'Christian Lundgaard',         sport:'Indycar Series'                },
  { r:10, ti:6,  selection:'US - Southwest',              sport:'Little League World Series'    },
  { r:10, ti:5,  selection:'Atlanta Braves',              sport:'MLB'                           },
  { r:10, ti:4,  selection:'New York Mets',               sport:'MLB'                           },
  { r:10, ti:3,  selection:'Detroit Tigers',              sport:'MLB'                           },
  { r:10, ti:2,  selection:'Green Bay Packers',           sport:'NFL'                           },
  { r:10, ti:1,  selection:'Boston Red Sox',              sport:'MLB'                           },
  { r:10, ti:0,  selection:'Baltimore Ravens',            sport:'NFL'                           },
  // Round 11 (picks 1–8; brando1609 R11.09 still pending)
  { r:11, ti:0,  selection:'Buffalo Bills',               sport:'NFL'                           },
  { r:11, ti:1,  selection:'Real Madrid',                 sport:'UEFA Champions League'         },
  { r:11, ti:2,  selection:'Norway',                      sport:"FIFA Men's World Cup"          },
  { r:11, ti:3,  selection:'Lorenzo Musetti',             sport:"Tennis - Men's"                },
  { r:11, ti:4,  selection:'Ben Shelton',                 sport:"Tennis - Men's"                },
  { r:11, ti:5,  selection:'John Higgins',                sport:'Snooker'                       },
  { r:11, ti:6,  selection:'Fernando Alonso',             sport:'Formula 1'                     },
  { r:11, ti:7,  selection:'Jon Rahm',                    sport:'PGA Golf'                      },
];

// ─── Build draft-state from picks ────────────────────────────────────────────
function buildDraftState(picks) {
  const state = {};
  let skipped = 0;
  for (const pick of picks) {
    const sportId = BRACKT_SPORT_TO_ID[pick.sport];
    if (!sportId) {
      console.warn(`Unknown sport: "${pick.sport}" — skipping`);
      skipped++;
      continue;
    }
    const corrected = NAME_FIX[pick.selection.toLowerCase()] ?? pick.selection;
    const entryId = `${sportId}-${slugify(corrected)}`;
    const owner = TEAMS[pick.ti];
    state[entryId] = { drafted: true, draftedBy: owner };
  }
  if (skipped > 0) console.warn(`Skipped ${skipped} picks with unknown sports.`);
  return state;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Fetch current state
  const getResp = await fetch(`${API_BASE}/api/draft-state`).catch(() => null);
  if (!getResp?.ok) {
    console.error('Cannot reach server. Is it running? (npm run server)');
    process.exit(1);
  }
  const current = await getResp.json();

  const newState = buildDraftState(RAW_PICKS);

  // Merge: new picks win over old state (picks are source of truth)
  const merged = { ...current, ...newState };

  const postResp = await fetch(`${API_BASE}/api/draft-state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merged),
  });

  if (!postResp.ok) {
    console.error('Failed to save draft state:', await postResp.text());
    process.exit(1);
  }

  const prevCount = Object.keys(current).length;
  const newCount  = Object.keys(newState).length;
  const total     = Object.keys(merged).length;

  console.log(`Done. ${newCount} picks synced from draft board.`);
  console.log(`Previously: ${prevCount} drafted | Now: ${total} drafted`);
  console.log('');
  console.log('Entry IDs written (sample):');
  Object.entries(newState).slice(0, 5).forEach(([id, v]) =>
    console.log(`  ${id.padEnd(45)} → ${v.draftedBy}`)
  );
  console.log(`  ... and ${newCount - 5} more`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
