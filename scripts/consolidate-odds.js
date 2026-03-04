/**
 * Consolidate odds from pipeline/output/live/*.json into server/data/manual-odds.json.
 * This makes manual-odds.json the single source of truth for all odds data.
 *
 * Usage: node scripts/consolidate-odds.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANUAL_ODDS_PATH = join(__dirname, '..', 'server', 'data', 'manual-odds.json');
const PIPELINE_LIVE_DIR = join(__dirname, '..', 'pipeline', 'output', 'live');

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Name alias map: pipeline short names → roster canonical names
// Pipeline data often uses abbreviated city/team names
const ALIASES = {
  // NFL
  'larams': 'losangelesrams', 'laramsrams': 'losangelesrams',
  'seahawks': 'seattleseahawks', 'seattle': 'seattleseahawks',
  'greenbay': 'greenbaypackers', 'packers': 'greenbaypackers',
  'kansascity': 'kansascitychiefs', 'chiefs': 'kansascitychiefs',
  'buffalo': 'buffalobills', 'bills': 'buffalobills',
  'baltimore': 'baltimoreravens', 'ravens': 'baltimoreravens',
  'philadelphia': 'philadelphiaeagles', 'eagles': 'philadelphiaeagles',
  'detroit': 'detroitlions', 'lions': 'detroitlions',
  'sanfrancisco': 'sanfrancisco49ers', '49ers': 'sanfrancisco49ers',
  'houston': 'houstontexans', 'texans': 'houstontexans',
  'denver': 'denverbroncos', 'broncos': 'denverbroncos',
  'losangeleschargers': 'losangeleschargers', 'lachargers': 'losangeleschargers', 'chargers': 'losangeleschargers',
  'minnesota': 'minnesotavikings', 'vikings': 'minnesotavikings',
  'cincinnati': 'cincinnatibengals', 'bengals': 'cincinnatibengals',
  'pittsburgh': 'pittsburghsteelers', 'steelers': 'pittsburghsteelers',
  'dallas': 'dallascowboys', 'cowboys': 'dallascowboys',
  'tampa': 'tampabaybuccaneers', 'tampabay': 'tampabaybuccaneers', 'buccaneers': 'tampabaybuccaneers', 'bucs': 'tampabaybuccaneers',
  'washington': 'washingtoncommanders', 'commanders': 'washingtoncommanders',
  'jacksonville': 'jacksonvillejaguars', 'jaguars': 'jacksonvillejaguars',
  'chicago': 'chicagobears', 'bears': 'chicagobears',
  'newengland': 'newenglandpatriots', 'patriots': 'newenglandpatriots',
  'indianapolis': 'indianapoliscolts', 'colts': 'indianapoliscolts',
  'newyorkgiants': 'newyorkgiants', 'giants': 'newyorkgiants', 'nygiants': 'newyorkgiants',
  'newyorkjets': 'newyorkjets', 'jets': 'newyorkjets', 'nyjets': 'newyorkjets',
  'neworleans': 'neworleanssaints', 'saints': 'neworleanssaints',
  'atlanta': 'atlantafalcons', 'falcons': 'atlantafalcons',
  'tennessee': 'tennesseetitans', 'titans': 'tennesseetitans',
  'carolina': 'carolinapanthers', 'panthers': 'carolinapanthers',
  'cleveland': 'clevelandbrowns', 'browns': 'clevelandbrowns',
  'arizona': 'arizonacardinals', 'cardinals': 'arizonacardinals',
  'lasvegas': 'lasvegasraiders', 'raiders': 'lasvegasraiders',
  'miami': 'miamidolphins', 'dolphins': 'miamidolphins',
  // NBA
  'oklahomacity': 'oklahomacitythunder', 'thunder': 'oklahomacitythunder',
  'boston': 'bostonceltics', 'celtics': 'bostonceltics',
  'cleveland': 'clevelandcavaliers', 'cavaliers': 'clevelandcavaliers', 'cavs': 'clevelandcavaliers',
  'newyork': 'newyorkknicks', 'knicks': 'newyorkknicks',
  'milwaukee': 'milwaukeebucks', 'bucks': 'milwaukeebucks',
  'goldenstate': 'goldenstatewarriors', 'warriors': 'goldenstatewarriors',
  'lalakers': 'lalakers', 'lakers': 'lalakers',
  'laclippers': 'laclippers', 'clippers': 'laclippers',
  'phoenix': 'phoenixsuns', 'suns': 'phoenixsuns',
  'memphis': 'memphisgrizzlies', 'grizzlies': 'memphisgrizzlies',
  'sacramento': 'sacramentokings', 'kings': 'sacramentokings',
  'orlando': 'orlandomagic', 'magic': 'orlandomagic',
  'portland': 'portlandtrailblazers', 'blazers': 'portlandtrailblazers', 'trailblazers': 'portlandtrailblazers',
  'brooklyn': 'brooklynnets', 'nets': 'brooklynnets',
  'charlotte': 'charlottehornets', 'hornets': 'charlottehornets',
  'toronto': 'torontoraptors', 'raptors': 'torontoraptors',
  'sanantonio': 'sanantoniospurs', 'spurs': 'sanantoniospurs',
  'indiana': 'indianapacers', 'pacers': 'indianapacers',
  'utah': 'utahjazz', 'jazz': 'utahjazz',
  // MLB
  'losangelesdodgers': 'losangelesdodgers', 'ladodgers': 'losangelesdodgers', 'dodgers': 'losangelesdodgers',
  'newyorkyankees': 'newyorkyankees', 'yankees': 'newyorkyankees',
  'newyorkmets': 'newyorkmets', 'mets': 'newyorkmets',
  'houstonastros': 'houstonastros', 'astros': 'houstonastros',
  'baltimoreorioles': 'baltimoreorioles', 'orioles': 'baltimoreorioles',
  'phillies': 'philadelphiaphillies', 'philadelphia': 'philadelphiaphillies',
  'atlantabraves': 'atlantabraves', 'braves': 'atlantabraves',
  'seattlemariners': 'seattlemariners', 'mariners': 'seattlemariners',
  'milwaukeebrewers': 'milwaukeebrewers', 'brewers': 'milwaukeebrewers',
  'sandiego': 'sandiegopadres', 'padres': 'sandiegopadres',
  'chicagocubs': 'chicagocubs', 'cubs': 'chicagocubs',
  'detroittigers': 'detroittigers', 'tigers': 'detroittigers',
  'texasrangers': 'texasrangers', 'rangers': 'texasrangers',
  'kansascityroyals': 'kansascityroyals', 'royals': 'kansascityroyals',
  'bostonredsox': 'bostonredsox', 'redsox': 'bostonredsox',
  'torontobluejays': 'torontobluejays', 'bluejays': 'torontobluejays',
  'cincinnatiredss': 'cincinnatireds', 'reds': 'cincinnatireds',
  'clevelandguardians': 'clevelandguardians', 'guardians': 'clevelandguardians',
  'arizonadiamondbacks': 'arizonadiamondbacks', 'diamondbacks': 'arizonadiamondbacks', 'dbacks': 'arizonadiamondbacks',
  'minnesotatwins': 'minnesotatwins', 'twins': 'minnesotatwins',
  'sanfranciscogiants': 'sanfranciscogiants',
  'tampabay': 'tampabayrays', 'rays': 'tampabayrays',
  'stlouis': 'stlouiscardinals', 'stlcardinals': 'stlouiscardinals',
  'losangelesangels': 'losangelesangels', 'laangels': 'losangelesangels', 'angels': 'losangelesangels',
  'chicagowhitesox': 'chicagowhitesox', 'whitesox': 'chicagowhitesox',
  'coloradorockies': 'coloradorockies', 'rockies': 'coloradorockies',
  'pittsburgh': 'pittsburghpirates', 'pirates': 'pittsburghpirates',
  'washingtonnationals': 'washingtonnationals', 'nationals': 'washingtonnationals',
  'oakland': 'oaklandathletics', 'athletics': 'oaklandathletics', 'as': 'oaklandathletics',
  'miamimarlins': 'miamimarlins', 'marlins': 'miamimarlins',
  // NHL
  'coloradoavalanche': 'coloradoavalanche', 'avalanche': 'coloradoavalanche', 'avs': 'coloradoavalanche',
  'carolinahurricanes': 'carolinahurricanes', 'hurricanes': 'carolinahurricanes', 'canes': 'carolinahurricanes',
  'edmontonoilers': 'edmontonoilers', 'oilers': 'edmontonoilers',
  'dallasstars': 'dallasstars', 'stars': 'dallasstars',
  'floridapanthers': 'floridapanthers',
  'tampabaylightning': 'tampabaylightning', 'lightning': 'tampabaylightning',
  'vegasgoldenknights': 'vegasgoldenknights', 'goldenknights': 'vegasgoldenknights', 'vegas': 'vegasgoldenknights',
  'winnipeg': 'winnipegjets',
  'torontomapleleafs': 'torontomapleleafs', 'mapleleafs': 'torontomapleleafs', 'leafs': 'torontomapleleafs',
  'newjersey': 'newjerseydevils', 'devils': 'newjerseydevils',
  'newyorkrangers': 'newyorkrangers',
  'newyorkislanders': 'newyorkislanders', 'islanders': 'newyorkislanders',
  'losangeleskings': 'losangeleskings', 'lakings': 'losangeleskings',
  'minnesotawild': 'minnesotawild', 'wild': 'minnesotawild',
  'vancouvercanucks': 'vancouvercanucks', 'canucks': 'vancouvercanucks',
  'montealcanadiens': 'montrealcanadiens', 'canadiens': 'montrealcanadiens', 'habs': 'montrealcanadiens',
  'nashville': 'nashvillepredators', 'predators': 'nashvillepredators', 'preds': 'nashvillepredators',
  'ottawa': 'ottawasenators', 'senators': 'ottawasenators', 'sens': 'ottawasenators',
  'stlouisblues': 'stlouisblues', 'blues': 'stlouisblues',
  'seattlekraken': 'seattlekraken', 'kraken': 'seattlekraken',
  'calgary': 'calgaryflames', 'flames': 'calgaryflames',
  'detroitredwings': 'detroitredwings', 'redwings': 'detroitredwings',
  'philadelphiaflyers': 'philadelphiaflyers', 'flyers': 'philadelphiaflyers',
  'buffalosabres': 'buffalosabres', 'sabres': 'buffalosabres',
  'anaheim': 'anaheimducks', 'ducks': 'anaheimducks',
  'columbus': 'columbusblueackets', 'bluejackets': 'columbusbluejackets',
  'sanjose': 'sanjosesharks', 'sharks': 'sanjosesharks',
  'utahhockeyclub': 'utahhockeyclub',
  // LLWS
  'taipei': 'asiapacific', 'chinesetaipei': 'asiapacific',
  // UCL
  'tottenham': 'tottenhamhotspur', 'newcastle': 'newcastleunited',
};

function main() {
  const manual = JSON.parse(readFileSync(MANUAL_ODDS_PATH, 'utf8'));

  // Build a normalized lookup from manual-odds entries
  const manualByNorm = {};
  for (const [entryId, entry] of Object.entries(manual)) {
    const key = normalize(entry.name);
    manualByNorm[key] = entryId;
  }

  const PIPELINE_SPORTS = [
    'nfl', 'nba', 'mlb', 'nhl', 'afl', 'f1', 'csgo', 'ncaab', 'ncaaf', 'ncaaw',
    'wnba', 'ucl', 'fifa', 'darts', 'snooker', 'indycar', 'pga', 'tennis_m', 'tennis_w', 'llws'
  ];
  let totalMerged = 0;

  for (const sportId of PIPELINE_SPORTS) {
    const pipelinePath = join(PIPELINE_LIVE_DIR, `${sportId}.json`);
    const serverLivePath = join(__dirname, '..', 'server', 'data', 'live', `${sportId}.json`);

    let pipelineData;
    if (existsSync(pipelinePath)) {
      pipelineData = JSON.parse(readFileSync(pipelinePath, 'utf8'));
    } else if (existsSync(serverLivePath)) {
      // Fallback to server/data/live if pipeline/output/live is empty (local dev)
      pipelineData = JSON.parse(readFileSync(serverLivePath, 'utf8'));
    } else {
      console.log(`${sportId}: no data file found, skipping`);
      continue;
    }

    if (!pipelineData.entries || pipelineData.entries.length === 0) {
      console.log(`${sportId}: no entries in data`);
      continue;
    }

    let sportMerged = 0;

    for (const pEntry of pipelineData.entries) {
      const pNorm = normalize(pEntry.name);

      // Try direct match, then alias match
      let manualEntryId = manualByNorm[pNorm];
      if (!manualEntryId && ALIASES[pNorm]) {
        manualEntryId = manualByNorm[ALIASES[pNorm]];
      }

      if (!manualEntryId) continue; // no match found

      const manualEntry = manual[manualEntryId];
      if (!manualEntry.oddsBySource) manualEntry.oddsBySource = {};

      // Merge each source (OVERWRITE existing to refresh odds)
      for (const [source, odds] of Object.entries(pEntry.oddsBySource || {})) {
        manualEntry.oddsBySource[source] = odds;
        sportMerged++;
      }

      manualEntry.timestamp = Date.now();
    }

    console.log(`${sportId}: refreshed ${sportMerged} source odds`);
    totalMerged += sportMerged;
  }

  writeFileSync(MANUAL_ODDS_PATH, JSON.stringify(manual, null, 2));
  console.log(`\nTotal: ${totalMerged} pipeline source odds merged into manual-odds.json`);
}

main();
