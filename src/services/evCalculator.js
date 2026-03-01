import { STANDARD_SCORING, QP_SCORING, QP_SPORT_IDS } from '../data/scoring.js';
import { americanToImpliedProbability, probabilityToAmerican } from './oddsConverter.js';
import SPORTS from '../data/sports.js';

/**
 * --- MATHEMATICAL DISTRIBUTION MODEL ---
 * Uses a Plackett-Luce inspired Field Approximation to determine the probability
 * of finishing in each rank (1st-16th) based on win probability.
 */
function buildRankProbabilities(winProb, numPositions = 16, fieldSize = 30) {
  const probs = new Array(numPositions).fill(0);
  probs[0] = winProb;
  const q = (1 - winProb) / (fieldSize - 1);
  let probAccumulated = probs[0];
  for (let k = 1; k < numPositions; k++) {
      const pNotSelectedYet = 1 - probAccumulated;
      // Phase 1: Numerical guard for extreme favorites (winProb > 0.5)
      const removedFieldProb = Math.min(Math.min(0.99 - winProb, k * q), 0.90);
      const denominator = Math.max(1 - removedFieldProb, 0.01);
      const relativeProb = winProb / denominator;
      const pThisRank = Math.min(pNotSelectedYet * relativeProb, pNotSelectedYet);
      probs[k] = pThisRank;
      probAccumulated += pThisRank;
  }
  // Normalization pass — ensure probabilities sum to 1.0
  const total = probs.reduce((a, b) => a + b, 0);
  if (total > 0 && (total < 0.99 || total > 1.01)) {
    for (let i = 0; i < numPositions; i++) probs[i] /= total;
  } else if (probAccumulated < 1) {
    probs[numPositions - 1] += (1 - probAccumulated);
  }
  return probs;
}

export function runFinishSimulation(winProb, fieldSize = 30) {
  const distribution = {};
  const probs = buildRankProbabilities(winProb, 16, fieldSize);
  for (let i = 0; i < 16; i++) {
    distribution[i + 1] = probs[i];
  }
  return distribution;
}

function calculateEVFromDist(dist, scoringTable) {
  let ev = 0;
  const perFinish = {};
  const tieAdjusted = withTieAdjustment(scoringTable);
  for (const tier of tieAdjusted) {
    const [start, end] = tier.range;
    let tierEV = 0;
    for (let pos = start; pos <= end; pos++) {
      tierEV += (dist[pos] || 0) * tier.points;
    }
    ev += tierEV;
    perFinish[tier.finish] = parseFloat(tierEV.toFixed(2));
  }
  return { ev, perFinish };
}

const TIE_PROB = 0.05;
function withTieAdjustment(scoringTable) {
  return scoringTable.map((tier, i) => {
    const next = scoringTable[i + 1];
    if (!next) return tier;
    const effectivePts = (1 - TIE_PROB) * tier.points + TIE_PROB * (tier.points + next.points) / 2;
    return { ...tier, points: effectivePts };
  });
}

export function calculateSingleEventEV(americanOdds, sportId) {
  const winProb = americanToImpliedProbability(americanOdds);
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const fieldSize = sportConfig?.fieldSize || 30;
  const dist = runFinishSimulation(winProb, fieldSize);
  const { ev, perFinish } = calculateEVFromDist(dist, STANDARD_SCORING);
  return {
    singleEvent: parseFloat(Math.min(ev, 100).toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
    dist,
  };
}

function calculateQPSeasonEV(americanOdds, sportId, eventsPerSeason) {
  const winProb = americanToImpliedProbability(americanOdds);
  const sportConfig = SPORTS.find(s => s.id === sportId);
  const fieldSize = sportConfig?.fieldSize || 30;
  const events = eventsPerSeason || sportConfig?.eventsPerSeason || 4;
  const dist = runFinishSimulation(winProb, fieldSize);
  const { ev: qpPerEvent, perFinish } = calculateEVFromDist(dist, QP_SCORING);
  const totalExpectedQP = qpPerEvent * events;
  const maxQP = 20 * events;
  const scaledPlacement = (totalExpectedQP / maxQP) * 100;
  return {
    singleEvent: parseFloat(Math.min(qpPerEvent, 20).toFixed(2)),
    winProbability: parseFloat((winProb * 100).toFixed(1)),
    perFinish,
    dist,
    seasonTotal: parseFloat(Math.min(scaledPlacement, 100).toFixed(2)),
    eventsPerSeason: events,
    scoringModel: 'qp',
    totalExpectedQP: parseFloat(totalExpectedQP.toFixed(2)),
  };
}

export function calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, sportId) {
  if (sportId && QP_SPORT_IDS.includes(sportId)) {
    return calculateQPSeasonEV(americanOdds, sportId, eventsPerSeason);
  }
  const res = calculateSingleEventEV(americanOdds, sportId);
  return {
    ...res,
    seasonTotal: res.singleEvent,
    eventsPerSeason: eventsPerSeason || 1,
  };
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const STABILITY_SAMPLES = {
  mlb: 162, nba: 82, nhl: 82, f1: 24, afl: 23, indycar: 18, nfl: 17,
  ucl: 13, llws: 6, tennis_m: 4, tennis_w: 4, pga: 4,
  csgo: 4, ncaaf: 12, ncaab: 31, fifa: 7,
  darts: 1, snooker: 1, wnba: 1, ncaaw: 1
};

// Phase 4: Continuous age curves (research-backed)
// NFL QB peak 29 (PFF WAR), NBA 24-27 (Harvard), Tennis M 25 / W 23-24 (Berkeley),
// F1 29-32 (ResearchGate), PGA 30-35 (Golf Analytics), MLB 28 (FanGraphs), NHL 27
const clampAge = (v) => Math.max(0.75, Math.min(1.25, v));
const AGE_CURVES = {
  nfl:      (age) => clampAge(1.0 + 0.03 * Math.max(0, 29 - age) - 0.05 * Math.max(0, age - 30)),
  nba:      (age) => clampAge(1.0 + 0.02 * Math.max(0, 26 - age) - 0.03 * Math.max(0, age - 28)),
  tennis_m: (age) => clampAge(1.0 + 0.04 * Math.max(0, 25 - age) - 0.06 * Math.max(0, age - 27)),
  tennis_w: (age) => clampAge(1.0 + 0.04 * Math.max(0, 23 - age) - 0.06 * Math.max(0, age - 25)),
  f1:       (age) => clampAge(1.0 + 0.02 * Math.max(0, 29 - age) - 0.04 * Math.max(0, age - 32)),
  pga:      (age) => clampAge(1.0 + 0.02 * Math.max(0, 32 - age) - 0.04 * Math.max(0, age - 36)),
  mlb:      (age) => clampAge(1.0 + 0.015 * Math.max(0, 28 - age) - 0.03 * Math.max(0, age - 30)),
  nhl:      (age) => clampAge(1.0 + 0.015 * Math.max(0, 27 - age) - 0.025 * Math.max(0, age - 29)),
  afl:      (age) => clampAge(1.0 + 0.02 * Math.max(0, 26 - age) - 0.03 * Math.max(0, age - 28)),
  snooker:  (age) => clampAge(1.0 + 0.01 * Math.max(0, 30 - age) - 0.02 * Math.max(0, age - 35)),
  darts:    (age) => clampAge(1.0 + 0.01 * Math.max(0, 32 - age) - 0.02 * Math.max(0, age - 38)),
};

// Individual sport player ages (top ~20 per sport)
const PLAYER_AGES = {
  // F1 (2026 ages)
  'maxverstappen': 28, 'lewishamilton': 41, 'charlesleclerc': 28, 'landonorris': 26,
  'oscarpiastri': 25, 'georgerussell': 28, 'fernandoalonso': 44, 'carlossainz': 31,
  'kimiantonelli': 19, 'liamlawson': 24, 'pierregasly': 30, 'estebanocon': 29,
  'alexanderalbon': 30, 'nicohulkenberg': 38, 'yukitsunoda': 26, 'oliverbearman': 21,
  'gabrielbortoleto': 22, 'jackdoohan': 23, 'isamwilliams': 26, 'valteribottas': 36,
  // Tennis Men (2026 ages)
  'novakdjokovic': 38, 'carlosalcaraz': 22, 'janniksinner': 24, 'alexanderzverev': 28,
  'daniilmedvedev': 30, 'casperruud': 27, 'stefanostsitsipas': 27, 'holgerrune': 22,
  'andreirublev': 28, 'taylorfritz': 28, 'francestiafoe': 28, 'benshelton': 23,
  'alexdeminaur': 27, 'felixaugeraliassime': 25, 'huberthurkacz': 29, 'tommypaul': 28,
  'lorenzmusetti': 24, 'grigorydimitrov': 34, 'jackdraper': 24, 'arthurfils': 21,
  'alexanderbublik': 28, 'karenkhachanov': 29, 'jirilehecka': 23, 'jakubmensik': 20,
  'franciscocerundolo': 27, 'flaviocobolli': 24, 'denisshapovalov': 26, 'joaofonseca': 19,
  'ugohumbert': 27, 'matteoberrettini': 29, 'alejandrodavidovichfokina': 26,
  'giovannimpetshiperricard': 23, 'sebastiankorda': 25, 'learnertien': 22,
  'gabrieldiallo': 24, 'alexmichelsen': 22, 'nicolasjarry': 30, 'lorenzosonego': 30,
  'janlennardstruff': 35, 'cameronnorrie': 30, 'reillyopelka': 28, 'tomasmachac': 25,
  'nickkyrgios': 30, 'tallongriekspoor': 28,
  // ATP 45–70 expansion
  'alexeipopyrin': 25, 'miomirkecmanovic': 26, 'nunoborges': 28, 'alejandrotabilo': 28,
  'marianonavone': 25, 'boticvandezandschulp': 29, 'danielaltmaier': 26, 'romansafiullin': 27,
  'mattiabellucci': 24, 'brandonnakashima': 24, 'hamadmedjedovic': 22, 'lucavanassche': 22,
  // Tennis Women (2026 ages)
  'arynasabalenka': 27, 'igaswiatek': 24, 'cocogauff': 21, 'jasmineparolini': 28,
  'qinwenzheng': 23, 'elenarybakina': 26, 'jessicapegula': 32, 'madisonkeys': 31,
  'emmanavarro': 24, 'dianashnaider': 22, 'mirraandreeva': 18, 'karolinamuchova': 28,
  'amandaanisimova': 24, 'belindabencic': 28, 'claratauson': 23, 'lindanoskova': 21,
  'elinasvitolina': 30, 'naomiosaka': 28, 'elisemertens': 30, 'leylahhfernandez': 23,
  'jelenaostapenko': 28, 'emmaraducanu': 22, 'ekaterianalexandrova': 31,
  'liudmilasamsonova': 28, 'victoriamboko': 20, 'marketavondrousova': 26,
  'ivajovic': 22, 'barbarakrejcikova': 29, 'mayajoint': 21, 'paulabadosa': 28,
  'anastasiapotapova': 25, 'sonaykartal': 24, 'martakostyuk': 23, 'terezavalentova': 20,
  'veronikakudermetova': 28,
  // WTA 16–50 expansion
  'dariakasatkina': 28, 'carolinegarcia': 31, 'donnavekic': 29, 'mariasakkari': 30,
  'beatrizhaddadmaia': 29, 'dayanayastremska': 25, 'daniellecollins': 32,
  'magdalenafrech': 27, 'soranacirstea': 35, 'sofiakenin': 27, 'anhelinakalinina': 28,
  'dianeparry': 23,
  // PGA
  'scottiescheffler': 29, 'xanderschauffele': 32, 'rorymcilroy': 36, 'collinmorikawa': 29,
  'ludvigaberg': 24, 'wiltzalatoris': 29, 'tommyfleetwood': 35, 'brookskoepka': 35,
  'viktorhovland': 28, 'sahiththeegala': 27, 'justinthomas': 32, 'jordanspieth': 32,
  'cameronyoung': 27, 'mattfitzpatrick': 31, 'patrickcantlay': 34, 'jonrahm': 31,
  'maxhoma': 35, 'keeganbradley': 39, 'sundaejungim': 25, 'robertmacintyre': 28,
  // Snooker (top 20)
  'juddtrump': 36, 'ronnieosullivan': 50, 'markselby': 42, 'markallen': 38,
  'kyrenewilson': 32, 'lucarbrecel': 29, 'neilrobertson': 44, 'johnnyhiggins': 49,
  'dingiunhui': 39, 'shaunmurphy': 43, 'zhaoxintong': 29, 'jacklisowski': 32,
  'barryhawkins': 46, 'roberthamiltons': 38, 'stuartbingham': 49, 'sitelangehij': 25,
  'chriswakelins': 38, 'garywilson': 40, 'davidgilbert': 43, 'alibonyancarter': 34,
  // Darts (top 20)
  'lukelittler': 19, 'lukehumphries': 30, 'michaelvangerwen': 36, 'garryanderson': 55,
  'peterwright': 55, 'michaelsmith': 33, 'robcross': 33, 'gervywprice': 39,
  'jonnydelayton': 32, 'dannynoppert': 33, 'davechissnal': 45, 'josharock': 25,
  'rosssmith': 36, 'stephenbuntingt': 40, 'nathanaspinall': 32, 'andrewgilding': 43,
  'ryanmsearle': 37, 'chrisdobey': 38, 'damevendenberh': 30, 'gianvanveen': 25,
};

// NBA team ages (minutes-weighted)
const NBA_MINUTES_WEIGHTED_AGE = {
  'oklahomacitythunder': 25.6, 'orlandomagic': 24.9, 'houstonrockets': 26.1, 'brooklynnets': 23.8,
  'charlottehornets': 24.0, 'atlantahawks': 25.3, 'detroitpistons': 25.8, 'sanantoniospurs': 26.2,
  'memphisgrizzlies': 26.5, 'utahjazz': 26.4, 'portlandtrailblazers': 26.2, 'indianapacers': 27.1,
  'neworleanspelicans': 27.4, 'torontoraptors': 27.2, 'washingtonwizards': 26.8, 'sacramentokings': 27.8,
  'minnesotatimberwolves': 27.9, 'clevelandcavaliers': 27.6, 'dallasmavericks': 28.1, 'philadelphia76ers': 28.4,
  'bostonceltics': 28.2, 'miamiheat': 28.9, 'newyorkknicks': 28.7, 'denvernuggets': 28.2,
  'milwaukeebucks': 29.1, 'phoenixsuns': 29.2, 'lalakers': 28.5, 'goldenstatewarriors': 29.4,
  'laclippers': 31.1, 'chicagobulls': 28.2, 'losangeleslakers': 28.5
};

// NFL team ages (snap-weighted) — expanded to all 32 teams
const NFL_SNAP_WEIGHTED_AGE = {
  'greenbaypackers': 24.8, 'newyorkjets': 25.1, 'seattleseahawks': 25.3, 'philadelphiaeagles': 25.4,
  'dallascowboys': 25.5, 'washingtoncommanders': 28.1, 'pittsburghsteelers': 27.9, 'clevelandbrowns': 27.8,
  'denverbroncos': 27.7, 'minnesotavikings': 27.6,
  'losangelesrams': 25.8, 'buffalobills': 26.0, 'detroitlions': 26.2, 'chicagobears': 25.0,
  'jacksonvillejaguars': 26.4, 'houstontexans': 25.9, 'newenglandpatriots': 26.1, 'neworleanssaints': 28.3,
  'arizonacardinals': 26.7, 'sanfrancisco49ers': 27.0, 'kansascitychiefs': 27.2, 'atlantafalcons': 27.3,
  'tampabaybuccaneers': 27.4, 'baltimoreravens': 26.5, 'cincinnatibengals': 26.8, 'indianapoliscolts': 26.6,
  'carolinapanthers': 25.7, 'tennesseetitans': 26.3, 'lasvegasraiders': 27.0, 'miamidolphins': 27.5,
  'losangeleschargers': 26.9, 'newyorkgiants': 26.4
};

// AFL List Profile
const AFL_LIST_PROFILE = {
  'collingwoodmagpies': { age: 26.3, window: true },
  'brisbanelions': { age: 25.3, window: true },
  'westernbulldogs': { age: 25.1, window: true },
  'geelongcats': { age: 25.0, window: true },
  'melbournedemons': { age: 24.9, window: true },
  'sydneyswans': { age: 24.9, window: true },
  'richmondtigers': { rebuild: true }, 'westcoasteagles': { rebuild: true }, 'northmelbournekangaroos': { rebuild: true }
};

// NFL specific data
const NFL_ELITE_OL_CONTINUITY = ['philadelphiaeagles', 'denverbroncos', 'detroitlions', 'tampabaybuccaneers', 'buffalobills', 'chicagobears'];
const NFL_2026_DRAFT_CAPITAL = {
  'newyorkjets': 1.25, 'clevelandbrowns': 1.18, 'lasvegasraiders': 1.15, 'pittsburghsteelers': 1.12,
  'tennesseetitans': 1.10, 'dallascowboys': 1.10, 'losangelesrams': 1.10
};
const NFL_COACHING_ALPHA = {
  'chicagobears': 1.15, 'arizonacardinals': 1.12, 'buffalobills': 1.08, 'atlantafalcons': 1.05, 'lasvegasraiders': 1.10
};

// Phase 7B: NBA coaching tier
const NBA_COACHING_TIER = {
  'oklahomacitythunder': 1.08, 'bostonceltics': 1.06, 'denvernuggets': 1.06,
  'clevelandcavaliers': 1.05, 'miamiheat': 1.05, 'newyorkknicks': 1.04,
};

// Phase 8: NHL goalie quality (GSAx-based tiers)
const NHL_GOALIE_QUALITY = {
  'winnipegj ets': 1.20, 'dallasstars': 1.15, 'floridapanthers': 1.15,
  'newyorkrangers': 1.10, 'carolinahurricanes': 1.10, 'edmontonoilers': 1.10,
  'vegasgoldenknights': 1.08, 'tampabayl ightning': 1.08,
  'ottawasenators': 0.92, 'sanjoesharkss': 0.88, 'chicagoblackhawks': 0.90,
  'columbusbluejackets': 0.90, 'anaheimduceks': 0.90,
};

// FIFA data
const FIFA_2026_HOSTS = ['unitedstates', 'mexico', 'canada'];
const FIFA_2026_CONTINENT = ['colombia', 'brazil', 'argentina', 'uruguay'];

// Phase 5: Tennis surface specialization
// Research: Nadal 92% clay / 77% other. Sinner dominant on hard. Swiatek 1.30x clay.
const SURFACE_RATINGS = {
  // Men — multiplier relative to baseline for each surface
  'carlosalcaraz':    { clay: 1.20, grass: 1.15, hard: 1.05 },
  'novakdjokovic':    { clay: 1.10, grass: 1.15, hard: 1.15 },
  'janniksinner':     { clay: 1.00, grass: 1.00, hard: 1.20 },
  'alexanderzverev':  { clay: 1.10, grass: 0.90, hard: 1.05 },
  'daniilmedvedev':   { clay: 0.85, grass: 0.95, hard: 1.20 },
  'casperruud':       { clay: 1.25, grass: 0.80, hard: 0.90 },
  'stefanostsitsipas': { clay: 1.15, grass: 0.90, hard: 1.00 },
  'holgerrune':       { clay: 1.05, grass: 1.00, hard: 1.00 },
  'andreirublev':     { clay: 1.00, grass: 0.85, hard: 1.10 },
  'taylorfritz':      { clay: 0.85, grass: 1.05, hard: 1.10 },
  'francestiafoe':    { clay: 0.90, grass: 1.05, hard: 1.05 },
  'jackdraper':       { clay: 0.90, grass: 1.10, hard: 1.05 },
  'lorenzmusetti':    { clay: 1.15, grass: 1.00, hard: 0.90 },
  'felixaugeraliassime': { clay: 0.90, grass: 1.00, hard: 1.10 },
  // Men — existing roster additions
  'alexdeminaur':     { clay: 0.90, grass: 0.95, hard: 1.15 },
  'benshelton':       { clay: 0.85, grass: 1.00, hard: 1.15 },
  'alexanderbublik':  { clay: 0.85, grass: 1.10, hard: 1.05 },
  'tommypaul':        { clay: 0.85, grass: 1.00, hard: 1.10 },
  'karenkhachanov':   { clay: 0.90, grass: 0.95, hard: 1.10 },
  'jirilehecka':      { clay: 0.90, grass: 0.95, hard: 1.10 },
  'jakubmensik':      { clay: 0.85, grass: 1.00, hard: 1.10 },
  'franciscocerundolo': { clay: 1.25, grass: 0.80, hard: 0.90 },
  'flaviocobolli':    { clay: 1.15, grass: 0.90, hard: 0.95 },
  'denisshapovalov':  { clay: 1.00, grass: 1.10, hard: 1.00 },
  'joaofonseca':      { clay: 1.15, grass: 0.90, hard: 0.95 },
  'ugohumbert':       { clay: 0.95, grass: 1.05, hard: 1.05 },
  'arthurfils':       { clay: 1.00, grass: 0.95, hard: 1.05 },
  'grigorydimitrov':  { clay: 1.00, grass: 1.05, hard: 1.05 },
  'matteoberrettini': { clay: 1.10, grass: 1.10, hard: 0.95 },
  'alejandrodavidovichfokina': { clay: 1.20, grass: 0.85, hard: 0.90 },
  'huberthurkacz':    { clay: 0.90, grass: 1.10, hard: 1.10 },
  'giovannimpetshiperricard': { clay: 0.75, grass: 1.25, hard: 1.00 },
  'sebastiankorda':   { clay: 0.90, grass: 0.95, hard: 1.10 },
  'learnertien':      { clay: 0.85, grass: 0.95, hard: 1.10 },
  'gabrieldiallo':    { clay: 0.85, grass: 1.05, hard: 1.05 },
  'alexmichelsen':    { clay: 0.85, grass: 1.00, hard: 1.10 },
  'nicolasjarry':     { clay: 1.25, grass: 0.80, hard: 0.90 },
  'lorenzosonego':    { clay: 1.10, grass: 0.95, hard: 0.95 },
  'janlennardstruff': { clay: 0.85, grass: 1.05, hard: 1.05 },
  'cameronnorrie':    { clay: 1.10, grass: 0.95, hard: 1.00 },
  'reillyopelka':     { clay: 0.70, grass: 1.20, hard: 1.05 },
  'tomasmachac':      { clay: 0.95, grass: 1.00, hard: 1.05 },
  'nickkyrgios':      { clay: 0.80, grass: 1.20, hard: 1.05 },
  'tallongriekspoor': { clay: 0.90, grass: 1.00, hard: 1.05 },
  // New ATP additions (surface research-backed)
  'alexeipopyrin':    { clay: 1.00, grass: 0.95, hard: 1.05 },
  'miomirkecmanovic': { clay: 1.10, grass: 0.90, hard: 1.00 },
  'nunoborges':       { clay: 1.20, grass: 0.85, hard: 0.90 },
  'alejandrotabilo':  { clay: 1.15, grass: 0.85, hard: 0.95 },
  'marianonavone':    { clay: 1.30, grass: 0.75, hard: 0.85 },
  'boticvandezandschulp': { clay: 1.00, grass: 0.95, hard: 1.05 },
  'danielaltmaier':   { clay: 1.15, grass: 0.85, hard: 0.95 },
  'romansafiullin':   { clay: 0.90, grass: 0.95, hard: 1.10 },
  'mattiabellucci':   { clay: 1.10, grass: 0.95, hard: 0.95 },
  'brandonnakashima': { clay: 0.85, grass: 1.00, hard: 1.10 },
  'hamadmedjedovic':  { clay: 1.15, grass: 0.90, hard: 0.95 },
  'lucavanassche':    { clay: 1.15, grass: 0.90, hard: 0.95 },
  // Women — existing
  'igaswiatek':       { clay: 1.30, grass: 0.85, hard: 1.05 },
  'arynasabalenka':   { clay: 1.00, grass: 0.95, hard: 1.20 },
  'elenarybakina':    { clay: 0.90, grass: 1.15, hard: 1.05 },
  'cocogauff':        { clay: 1.05, grass: 0.95, hard: 1.10 },
  'jasmineparolini':  { clay: 1.20, grass: 0.90, hard: 0.95 },
  'qinwenzheng':      { clay: 0.95, grass: 0.90, hard: 1.15 },
  'jessicapegula':    { clay: 0.90, grass: 0.95, hard: 1.15 },
  'madisonkeys':      { clay: 0.90, grass: 1.00, hard: 1.10 },
  'mirraandreeva':    { clay: 1.10, grass: 1.00, hard: 1.00 },
  // Women — existing roster additions
  'emmanavarro':      { clay: 1.05, grass: 0.95, hard: 1.00 },
  'naomiosaka':       { clay: 0.90, grass: 0.95, hard: 1.15 },
  'karolinamuchova':  { clay: 0.95, grass: 1.10, hard: 1.05 },
  'dianashnaider':    { clay: 1.05, grass: 0.90, hard: 1.05 },
  'elisemertens':     { clay: 0.95, grass: 1.00, hard: 1.05 },
  'leylahhfernandez': { clay: 1.00, grass: 0.95, hard: 1.05 },
  'jelenaostapenko':  { clay: 0.90, grass: 1.25, hard: 0.95 },
  'emmaraducanu':     { clay: 0.95, grass: 1.05, hard: 1.05 },
  'ekaterianalexandrova': { clay: 0.90, grass: 0.95, hard: 1.10 },
  'liudmilasamsonova': { clay: 0.90, grass: 0.95, hard: 1.10 },
  'victoriamboko':    { clay: 0.90, grass: 0.95, hard: 1.05 },
  'marketavondrousova': { clay: 1.05, grass: 1.20, hard: 0.90 },
  'ivajovic':         { clay: 0.90, grass: 0.95, hard: 1.05 },
  'barbarakrejcikova': { clay: 1.20, grass: 1.00, hard: 0.90 },
  'mayajoint':        { clay: 1.00, grass: 0.95, hard: 1.00 },
  'paulabadosa':      { clay: 1.20, grass: 0.90, hard: 0.95 },
  'anastasiapotapova': { clay: 0.95, grass: 0.90, hard: 1.10 },
  'sonaykartal':      { clay: 0.90, grass: 1.05, hard: 1.05 },
  'martakostyuk':     { clay: 0.95, grass: 0.90, hard: 1.10 },
  'terezavalentova':  { clay: 1.10, grass: 0.90, hard: 0.95 },
  'veronikakudermetova': { clay: 0.90, grass: 0.95, hard: 1.10 },
  'amandaanisimova':  { clay: 0.90, grass: 0.95, hard: 1.10 },
  'belindabencic':    { clay: 1.00, grass: 1.00, hard: 1.05 },
  'claratauson':      { clay: 1.05, grass: 0.95, hard: 1.05 },
  'lindanoskova':     { clay: 0.95, grass: 0.95, hard: 1.05 },
  'elinasvitolina':   { clay: 1.15, grass: 0.95, hard: 1.00 },
  // New WTA additions
  'dariakasatkina':   { clay: 1.20, grass: 0.90, hard: 1.00 },
  'carolinegarcia':   { clay: 0.90, grass: 0.95, hard: 1.15 },
  'donnavekic':       { clay: 0.90, grass: 1.10, hard: 1.05 },
  'mariasakkari':     { clay: 1.05, grass: 0.90, hard: 1.10 },
  'beatrizhaddadmaia': { clay: 1.25, grass: 0.85, hard: 0.90 },
  'dayanayastremska': { clay: 1.05, grass: 0.95, hard: 1.05 },
  'daniellecollins':  { clay: 0.85, grass: 0.95, hard: 1.15 },
  'magdalenafrech':   { clay: 1.15, grass: 0.85, hard: 0.95 },
  'soranacirstea':    { clay: 1.10, grass: 0.90, hard: 1.00 },
  'sofiakenin':       { clay: 0.90, grass: 1.00, hard: 1.10 },
  'anhelinakalinina': { clay: 1.10, grass: 0.90, hard: 1.00 },
  'dianeparry':       { clay: 1.15, grass: 0.90, hard: 0.95 },
};

// Phase 6: Enhanced F1 tech alpha with constructor budget blend
const F1_TECH_ALPHA = {
  // Tier 1: Ground-Effect Aero Leaders
  'maxverstappen': 1.25, 'landonorris': 1.25, 'oscarpiastri': 1.25, 'liamlawson': 1.25,
  // Tier 2: Resource-Rich Chasers
  'lewishamilton': 1.15, 'charlesleclerc': 1.15, 'georgerussell': 1.15, 'kimiantonelli': 1.15,
  // Tier 3: Mid-Field Baseline
  'carlossainz': 1.00, 'fernandoalonso': 1.00, 'pierregasly': 1.00, 'estebanocon': 1.00,
  // Tier 4: Equipment-Limited
  'alexanderalbon': 0.85, 'nicohulkenberg': 0.85, 'yukitsunoda': 0.85, 'oliverbearman': 0.85,
  'gabrielbortoleto': 0.85, 'jackdoohan': 0.82, 'isamwilliams': 0.82, 'valteribottas': 0.80,
};

const F1_CONSTRUCTOR_BUDGET = {
  'redbull': 1.00, 'mclaren': 1.00, 'ferrari': 0.98, 'mercedes': 0.95,
  'astonmartin': 0.90, 'alpine': 0.88, 'williams': 0.85, 'haas': 0.82,
  'racingbulls': 0.85, 'sauber': 0.80,
};
const F1_DRIVER_CONSTRUCTOR = {
  'maxverstappen': 'redbull', 'landonorris': 'mclaren', 'oscarpiastri': 'mclaren',
  'lewishamilton': 'ferrari', 'charlesleclerc': 'ferrari', 'georgerussell': 'mercedes',
  'kimiantonelli': 'mercedes', 'carlossainz': 'williams', 'fernandoalonso': 'astonmartin',
  'pierregasly': 'alpine', 'estebanocon': 'haas', 'alexanderalbon': 'williams',
  'nicohulkenberg': 'sauber', 'yukitsunoda': 'racingbulls', 'liamlawson': 'redbull',
  'oliverbearman': 'haas', 'gabrielbortoleto': 'sauber', 'jackdoohan': 'alpine',
  'isamwilliams': 'williams', 'valteribottas': 'sauber',
};

// Phase 6A: IndyCar tech alpha — Ganassi 1.35 (7/12 titles), Penske 1.25 (5/12)
const INDY_TECH_ALPHA = {
  // Ganassi: 1.35 (was 1.25)
  'alexpalou': 1.35, 'scottdixon': 1.35, 'coltonherta': 1.35, 'kylekirkwood': 1.35, 'marcusericsson': 1.35,
  // Penske: 1.25 (was 1.12)
  'josefnewgarden': 1.25, 'scottmclaughlin': 1.25, 'willpower': 1.25, 'patooward': 1.12, 'davidmalukas': 1.12,
  // McLaren / Satellite
  'christianlundgaard': 1.0, 'felixrosenqvist': 1.0, 'grahamrahal': 1.0, 'santinoferrucci': 0.90,
};

// ============================================================================
// GLOBAL INDICES & MULTIPLIERS
// ============================================================================

// GCI calibrated to backtest predictability (top-3 hit rate, 2021-2025):
// F1: 100% → 1.15 | NFL/MLB/NHL: ~50% → 1.02-1.05 | NBA: 25% → 1.08 (upset-prone)
const GLOBAL_CONFIDENCE_INDEX = {
  nba: 1.08, indycar: 0.95, f1: 1.15, llws: 1.15,  // NBA reduced: 25% top-3 backtest hit rate
  mlb: 1.02, nhl: 0.95, tennis_m: 1.10, tennis_w: 1.10, afl: 1.10,  // MLB raised: 50% top-3 hit rate
  nfl: 1.05, ncaaf: 1.05, ucl: 1.05, fifa: 1.05,
  pga: 0.95, darts: 1.10, snooker: 1.10, csgo: 0.90,
  ncaab: 1.10, wnba: 0.90, ncaaw: 0.90
};

// Phase 2: VOR replacement levels — 75th-percentile EV per sport
const SPORT_REPLACEMENT_LEVELS = {
  afl: 4.50, darts: 2.80, fifa: 3.10, f1: 5.20,
  indycar: 4.80, llws: 3.50, mlb: 14.33, nba: 10.92, ncaab: 2.10,
  ncaaf: 6.80, ncaaw: 3.50, nfl: 16.37, nhl: 9.50,
  snooker: 3.20, ucl: 5.50, wnba: 7.20,
  // QP sports: replacement level is now in standard-point scale (post QP-rank conversion)
  // 75th-percentile player finishes ~7th-8th in QP standings → 15 standard pts
  // Using ~12-15 range based on each sport's field competitiveness
  pga: 14.00,      // 80-player field, 4 majors — 7th-8th QP rank → 15 pts
  tennis_m: 12.00, // 64-player field, 4 slams — 7th-8th QP rank → 15 pts
  tennis_w: 12.00, // same
  csgo: 12.00,     // 24-player field, 2 BLAST QP events (IEM Cologne + PGL Singapore are reference-only) — 6th-7th QP rank → 15 pts
};

const SPORT_VOLATILITY_SCALING = {
  nhl: 1.12, mlb: 1.08, nba: 0.94, f1: 0.85, llws: 1.10
};

const BASE_SIGMA = 35;
function getStabilitySigma(sportId) {
    const samples = STABILITY_SAMPLES[sportId] || 1;
    const scaling = SPORT_VOLATILITY_SCALING[sportId] || 1.0;
    return (BASE_SIGMA * scaling) / Math.sqrt(samples);
}

const MARKET_LIQUIDITY_MODIFIER = {
  nfl: 1.05, ucl: 1.05, nba: 1.03, f1: 1.02, mlb: 1.02,
  nhl: 1.00, pga: 1.00, tennis_m: 1.00, tennis_w: 1.00, fifa: 1.00,
  afl: 0.98, ncaaf: 0.98, ncaab: 0.98,
  csgo: 0.95, darts: 0.95, snooker: 0.95, indycar: 0.95,
  wnba: 0.92, ncaaw: 0.92, llws: 0.90
};

// ============================================================================
// PER-SPORT CALCULATORS
// ============================================================================

const genericCalc = (ev, scarcity, sq, entry) => {
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj;
};

const nflCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const name = entry.nameNormalized || '';
  const age = NFL_SNAP_WEIGHTED_AGE[name] || 26.5;
  const notes = (entry.notes || '').toLowerCase();
  const odds = typeof entry.bestOdds === 'string' ? parseInt(entry.bestOdds.replace('+', '')) : 0;

  // Phase 4: Continuous age curve replaces binary threshold
  multiplier *= (AGE_CURVES.nfl || (() => 1.0))(age);

  if (NFL_ELITE_OL_CONTINUITY.includes(name) || notes.includes('elite ol') || notes.includes('continuity')) multiplier *= 1.12;
  if (NFL_2026_DRAFT_CAPITAL[name]) multiplier *= NFL_2026_DRAFT_CAPITAL[name];
  if (NFL_COACHING_ALPHA[name]) multiplier *= NFL_COACHING_ALPHA[name];
  if (odds >= 4000 && odds <= 8000) multiplier *= 1.16;
  if ((notes.includes('elite defense') && notes.includes('poor offense')) || ['pittsburghsteelers', 'clevelandbrowns'].includes(name)) multiplier *= 0.90;
  if (notes.includes('rookie qb') || notes.includes('new playcaller') || notes.includes('draft capital')) multiplier *= 1.10;

  // Phase 7: Coaching keyword parsing (fall-through for teams not in static map)
  if (!NFL_COACHING_ALPHA[name]) {
    if (notes.includes('new coach') || notes.includes('first year hc')) multiplier *= 1.08;
    if (notes.includes('coordinator promoted') || notes.includes('internal hire')) multiplier *= 1.05;
    if (notes.includes('fired mid-season') || notes.includes('interim')) multiplier *= 0.85;
  }

  // Phase 9: Roster movement
  if (notes.includes('acquired') || notes.includes('blockbuster')) multiplier *= 1.08;
  if (notes.includes('departed') || notes.includes('key loss') || notes.includes('out for season')) multiplier *= 0.92;

  const sqDampened = 1.0 / (1.0 + Math.max(0, sq - 1.15));
  return (ev + scarcity) * sqDampened * multiplier;
};

const nbaCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const age = NBA_MINUTES_WEIGHTED_AGE[name] || 27.0;
  let multiplier = 1.0;
  const notes = (entry.notes || '').toLowerCase();

  // Phase 4: Continuous age curve
  multiplier *= (AGE_CURVES.nba || (() => 1.0))(age);

  if (notes.includes('new') || notes.includes('reset') || notes.includes('rookie') || notes.includes('draft')) multiplier *= 1.05;

  // Phase 7B: Coaching tier
  if (NBA_COACHING_TIER[name]) multiplier *= NBA_COACHING_TIER[name];
  if (notes.includes('new coach') || notes.includes('coaching change')) multiplier *= 1.05;
  if (notes.includes('fired mid-season') || notes.includes('interim')) multiplier *= 0.90;

  // Phase 9: Roster movement
  if (notes.includes('trade acquisition') || notes.includes('acquired') || notes.includes('blockbuster')) multiplier *= 1.08;
  if (notes.includes('aging core') || notes.includes('salary dump') || notes.includes('tanking')) multiplier *= 0.92;

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const mlbCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  const name = entry.nameNormalized || '';

  // Phase 4: Age curve for team age
  // MLB team ages not individually tracked — use notes-based aging
  if (notes.includes('stuff+') || notes.includes('pitching+') || notes.includes('high stuff')) multiplier *= 1.15;
  if (notes.includes('breakout rotation') || notes.includes('young pitching') || notes.includes('velo')) multiplier *= 1.12;
  if (notes.includes('bullpen depth') || notes.includes('deep bullpen')) multiplier *= 1.08;
  if (notes.includes('veteran core') || notes.includes('aging') || notes.includes('aging rotation')) multiplier *= 0.85;

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + (scarcity * 1.2)) * sqAdj * multiplier;
};

const nhlCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  const name = entry.nameNormalized || '';
  let multiplier = 1.0;

  // Phase 8: Goalie quality model (GSAx-based)
  const goalieMult = NHL_GOALIE_QUALITY[name] || 1.0;
  multiplier *= goalieMult;

  if (notes.includes('gsax') || notes.includes('elite goalie') || notes.includes('vezina')) multiplier *= 1.15;
  if (notes.includes('xgf%') || notes.includes('high danger')) multiplier *= 1.12;
  if (notes.includes('goalie crisis') || notes.includes('goalie uncertainty')) multiplier *= 0.88;

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const tennisCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;

  // Phase 5: Surface specialization — blended across 4 Grand Slams
  // (2 hard court Slams, 1 clay, 1 grass)
  const surfaceData = SURFACE_RATINGS[name];
  if (surfaceData) {
    const blended = (surfaceData.hard * 2 + surfaceData.clay + surfaceData.grass) / 4;
    multiplier *= blended;
  } else if (notes.includes('surface specialist') || notes.includes('clay king') || notes.includes('grass master')) {
    multiplier *= 1.15;
  }

  // Reference event form signals (clay swing: Rome/Madrid predict French Open success)
  // These notes flow from non-major reference events ingested via refine-ingest.js
  if (notes.includes('won rome') || notes.includes('won madrid') || notes.includes('won monte carlo')) {
    multiplier *= 1.12; // clay form peak — strong French Open indicator
  }
  if (notes.includes('won indian wells') || notes.includes('won miami') || notes.includes('won cincinnati') || notes.includes('won canada')) {
    multiplier *= 1.08; // hardcourt form — AO/USO indicator
  }
  if (notes.includes('lost early rome') || notes.includes('early exit madrid') || notes.includes('withdrew')) {
    multiplier *= 0.92; // form concerns heading into clay major
  }

  // Phase 4: Age curve
  const age = PLAYER_AGES[name];
  const sport = entry.sport || 'tennis_m';
  if (age && AGE_CURVES[sport]) {
    multiplier *= AGE_CURVES[sport](age);
  }

  if (notes.includes('fatigue') || notes.includes('declining')) multiplier *= 0.90;
  if (notes.includes('hot streak') || notes.includes('peak form')) multiplier *= 1.10;

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const csgoCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('stable roster') || notes.includes('chemistry')) multiplier *= 1.15;
  if (notes.includes('new roster') || notes.includes('roster change')) multiplier *= 0.85;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const aflCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const name = entry.nameNormalized || '';
  const profile = AFL_LIST_PROFILE[name];

  if (profile?.window) multiplier *= 1.12;
  if (profile?.rebuild) multiplier *= 0.88;

  // Phase 4: Age curve
  const age = profile?.age;
  if (age && AGE_CURVES.afl) multiplier *= AGE_CURVES.afl(age);

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const pgaCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  const name = entry.nameNormalized || '';
  let multiplier = 1.0;

  if (notes.includes('sg:ttg') || notes.includes('ball striking') || notes.includes('strokes gained')) multiplier *= 1.15;
  if (notes.includes('course history') || notes.includes('course fit')) multiplier *= 1.08;

  // Reference event form signals — flow in from non-major ingest (The Players, WGC, Genesis etc.)
  if (notes.includes('won the players') || notes.includes('won players championship')) multiplier *= 1.10;
  if (notes.includes('won match play') || notes.includes('wgc match play winner')) multiplier *= 1.08;
  if (notes.includes('won genesis') || notes.includes('won riviera')) multiplier *= 1.06;
  if (notes.includes('won arnold palmer') || notes.includes('won bay hill')) multiplier *= 1.05;
  if (notes.includes('missed cut') || notes.includes('withdrew') || notes.includes('form slump')) multiplier *= 0.90;

  // Phase 4: Age curve — PGA peaks 30-35
  const age = PLAYER_AGES[name];
  if (age && AGE_CURVES.pga) multiplier *= AGE_CURVES.pga(age);

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev * 0.6 + (sqAdj * 20) * 0.4) + scarcity * multiplier;
};

const uclCalc = (ev, scarcity, sq, entry) => {
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  if (notes.includes('clinical') || notes.includes('overperforming xg')) multiplier *= 1.12;
  if (notes.includes('squad depth') || notes.includes('deep squad')) multiplier *= 1.08;
  if (notes.includes('fixture congestion') || notes.includes('multi-competition')) multiplier *= 0.92;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const fifaCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  let multiplier = 1.0;
  if (FIFA_2026_HOSTS.includes(name)) multiplier *= 1.20;
  if (FIFA_2026_CONTINENT.includes(name)) multiplier *= 1.12;
  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

const f1Calc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();

  // Phase 6B: Blend tech alpha with constructor budget
  let techAlpha = F1_TECH_ALPHA[name] || 0.85;
  const constructor = F1_DRIVER_CONSTRUCTOR[name];
  const budgetMult = constructor ? (F1_CONSTRUCTOR_BUDGET[constructor] || 0.85) : 0.85;
  techAlpha = techAlpha * 0.7 + budgetMult * 0.3;

  // Dynamic tech from notes
  if (notes.includes('upgrade') || notes.includes('new floor') || notes.includes('aero package')) techAlpha *= 1.10;
  if (notes.includes('correlation error') || notes.includes('budget cap') || notes.includes('stalled')) techAlpha *= 0.90;
  if (notes.includes('new regulations') || notes.includes('wind tunnel')) techAlpha *= 1.05;

  // Phase 4: Age curve — F1 peaks at 29-32
  const age = PLAYER_AGES[name];
  if (age && AGE_CURVES.f1) techAlpha *= AGE_CURVES.f1(age);

  const expertValue = (sq * 20);
  return (ev * 0.6 + expertValue * 0.4) * techAlpha + scarcity;
};

const indycarCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let techAlpha = INDY_TECH_ALPHA[name] || 0.85;
  let participationMult = 1.0;

  if (notes.includes('hybrid') || notes.includes('dampers') || notes.includes('engineering')) techAlpha *= 1.05;
  if (name === 'takumasato' || notes.includes('500 only')) participationMult = 0.05;
  else if (notes.includes('partial') || notes.includes('road course only')) participationMult = 0.55;
  if (notes.includes('pay driver') || notes.includes('funded') || ['stingrayrobb', 'kyffinsimpson', 'nolansiegel', 'devlindefrancesco'].includes(name)) techAlpha *= 0.80;

  const sqTiebreaker = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.15;
  return (ev + scarcity) * techAlpha * participationMult * sqTiebreaker;
};

const llwsCalc = (ev, scarcity, sq, entry) => {
  let multiplier = 1.0;
  const notes = (entry.notes || '').toLowerCase();
  const region = (entry.region || '').toLowerCase();
  const name = entry.nameNormalized || '';

  // --- TIER 1: Asian programs --- historically dominant (Taiwan 18 titles, Japan 11)
  // Chinese Taipei / Asia-Pacific: +175 in our odds, +200 actual 2025 market → well-calibrated
  const isTaiwanOrAP = ['taiwan', 'south korea', 'chinese taipei'].includes(region) ||
    ['taipei', 'korea', 'taoyuan', 'tainan'].some(r => name.includes(r)) ||
    name === 'asiapacific';
  const isJapan = region === 'japan' || name === 'japan' || name.includes('tokyo');

  if (isTaiwanOrAP) {
    multiplier *= 1.35;
    // Defending champion bonus (Chinese Taipei won 2025)
    if (notes.includes('defending champion') || notes.includes('2025 champion') || notes.includes('champion status')) {
      multiplier *= 1.10;
    }
  } else if (isJapan) {
    // Japan: our odds show +225 but 2025 market derived ~+600 overall.
    // Japan is elite but NOT in the same tier as Taiwan historically post-1996.
    // Reducing their internal multiplier to reflect true market position.
    multiplier *= 1.15; // was implicitly 1.35 via shared condition — corrected down
  }

  // --- TIER 2: Caribbean --- HIGH FLOOR team.
  // Research: Curaçao/Aruba consistently reach international finals (runner-up 2025).
  // Market derived ~+420 overall; our odds have them at +550 (undervalued by ~1.3x).
  // 2026: Curaçao now receives a direct bracket entry slot, giving Caribbean two reps.
  // Raising multiplier from 1.25 → 1.35 to reflect structural floor and dual-entry advantage.
  else if (region === 'caribbean' || name === 'caribbean' ||
    notes.includes('curacao') || notes.includes('curaçao') || notes.includes('aruba') ||
    name.includes('willemstad')) {
    multiplier *= 1.35; // floor bonus: rarely eliminated early, always deep
    // Additional bonus if Curaçao specifically qualifies (historically the strongest Caribbean team)
    if (notes.includes('curacao') || notes.includes('curaçao') || name.includes('willemstad')) {
      multiplier *= 1.08;
    }
  }

  // --- TIER 3: USA West --- strongest US region (won 4 of last 10 US brackets)
  // Market derived ~+540 overall; our odds show +350 (too short — calculator reduces this somewhat)
  else if (['west', 'hawaii', 'california', 'honolulu', 'el segundo'].some(r => name.includes(r) || region.includes(r))) {
    multiplier *= 1.20;
  }

  // --- Pitching-depth bonus: in LLWS, dominant aces (11+ K games) predict outcomes better than any other metric ---
  if (notes.includes('pitching depth') || notes.includes('multiple aces') || notes.includes('3+ arms')) multiplier *= 1.25;
  else if (notes.includes('one-man team') || notes.includes('single ace') || notes.includes('relies on one')) multiplier *= 0.85;

  // --- Run differential / dominance bonus ---
  if (notes.includes('high run differential') || notes.includes('gamechanger') || notes.includes('run rule') || notes.includes('elite ops')) multiplier *= 1.15;

  // --- Physical advantage (non-Asian teams only — Asian teams win via fundamentals/pitching) ---
  if (!isTaiwanOrAP && !isJapan && (notes.includes('size advantage') || notes.includes('power hitting') || notes.includes('thick'))) multiplier *= 1.10;

  const sqAdj = 1.0 + (Math.max(1.0, sq) - 1.0) * 0.5;
  return (ev + scarcity) * sqAdj * multiplier;
};

// Snooker and Darts calculators with age curves
const snookerCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  const age = PLAYER_AGES[name];
  if (age && AGE_CURVES.snooker) multiplier *= AGE_CURVES.snooker(age);
  if (notes.includes('defending champion') || notes.includes('world number 1')) multiplier *= 1.10;
  if (notes.includes('crucible curse') || notes.includes('first round exit')) multiplier *= 0.90;
  return (ev * 0.5 + (sq * 15) * 0.5) + scarcity * multiplier;
};

const dartsCalc = (ev, scarcity, sq, entry) => {
  const name = entry.nameNormalized || '';
  const notes = (entry.notes || '').toLowerCase();
  let multiplier = 1.0;
  const age = PLAYER_AGES[name];
  if (age && AGE_CURVES.darts) multiplier *= AGE_CURVES.darts(age);
  if (notes.includes('world number 1') || notes.includes('dominant form')) multiplier *= 1.10;
  return (ev * 0.5 + (sq * 15) * 0.5) + scarcity * multiplier;
};

const SPORT_CALCULATORS = {
  nfl: nflCalc, nba: nbaCalc, mlb: mlbCalc, nhl: nhlCalc, afl: aflCalc,
  pga: pgaCalc, ucl: uclCalc, fifa: fifaCalc,
  tennis_m: tennisCalc, tennis_w: tennisCalc, csgo: csgoCalc,
  llws: llwsCalc, indycar: indycarCalc, f1: f1Calc,
  snooker: snookerCalc, darts: dartsCalc,
};

// ============================================================================
// MAIN DPS PIPELINE — applyPositionalScarcity
// ============================================================================

export function applyPositionalScarcity(sportEntries, globalModifier) {
  if (!sportEntries || sportEntries.length < 2) return;
  const sportId = sportEntries[0].sport;
  const calc = SPORT_CALCULATORS[sportId] || genericCalc;
  const confidenceMult = GLOBAL_CONFIDENCE_INDEX[sportId] || 1.0;
  const replacementEV = SPORT_REPLACEMENT_LEVELS[sportId] || 0;
  const sigma = getStabilitySigma(sportId);
  const liquidityMult = MARKET_LIQUIDITY_MODIFIER[sportId] || 1.0;

  sportEntries.sort((a, b) => (b.ev?.seasonTotal || 0) - (a.ev?.seasonTotal || 0));

  // ── QP Sports Pre-Pass: Convert expected QP rankings → expected standard points ──
  // Problem: calculateQPSeasonEV returns scaledPlacement = (expectedQP/maxQP)×100,
  // which is a QP-fraction scale (0-100%), NOT actual expected standard points (0-100).
  // Scheffler at scaledPlacement=26.6 would appear equivalent to a Chiefs pick at 26.6
  // standard points, when Scheffler's true expected standard points is ~80.
  // Fix: Use relative QP standing among the full field to compute expected standard pts.
  // Standard scoring: 1st=100, 2nd=70, 3rd=50, 4th=40, 5th-6th=25, 7th-8th=15, 9th+=0
  if (QP_SPORT_IDS.includes(sportId)) {
    const stdPts = [100, 70, 50, 40, 25, 25, 15, 15]; // indexed 0=1st, 1=2nd, ...
    const qpSorted = [...sportEntries].sort((a, b) =>
      (b.ev?.totalExpectedQP || b.ev?.seasonTotal || 0) - (a.ev?.totalExpectedQP || a.ev?.seasonTotal || 0)
    );
    const topQP = Math.max(qpSorted[0]?.ev?.totalExpectedQP || qpSorted[0]?.ev?.seasonTotal || 1, 0.01);

    for (let r = 0; r < qpSorted.length; r++) {
      const entry = qpSorted[r];
      const myQP = entry.ev?.totalExpectedQP || entry.ev?.seasonTotal || 0;
      // QP gap determines how "locked in" this rank is
      const gapAbove = r > 0 ? ((qpSorted[r-1]?.ev?.totalExpectedQP || qpSorted[r-1]?.ev?.seasonTotal || 0) - myQP) : topQP;
      const gapBelow = r < qpSorted.length - 1
        ? myQP - (qpSorted[r+1]?.ev?.totalExpectedQP || qpSorted[r+1]?.ev?.seasonTotal || 0)
        : myQP;
      // Uncertainty: how much this player might slip/rise to adjacent ranks
      // Small gapAbove → at risk of being overtaken; large gapBelow → safe from below
      const totalGap = Math.max(gapAbove + gapBelow, 0.01);
      const upRisk = gapAbove / totalGap;       // prob of finishing one rank higher
      const downRisk = gapBelow / totalGap;     // prob of finishing one rank lower

      const thisPts = stdPts[Math.min(r, stdPts.length - 1)] || 0;
      const abovePts = r > 0 ? (stdPts[Math.min(r - 1, stdPts.length - 1)] || 0) : thisPts;
      const belowPts = stdPts[Math.min(r + 1, stdPts.length - 1)] || 0;

      // Blend: mostly thisPts, with small probability of adjacent ranks
      // Weight is ~80% own rank, 10% each neighbor — scaled by gap confidence
      const blendWeight = 0.80;
      const neighborWeight = 0.10;
      const qpStandardEV = thisPts * blendWeight
        + abovePts * neighborWeight * (1 - upRisk)
        + belowPts * neighborWeight * (1 - downRisk);

      entry._qpStandardEV = parseFloat(Math.max(qpStandardEV, 0).toFixed(2));
    }
  }

  for (let i = 0; i < sportEntries.length; i++) {
    const current = sportEntries[i];
    // For QP sports: use the rank-converted standard points so cross-sport
    // DPS comparison is apples-to-apples with 100/70/50 scale
    const rawEV = (QP_SPORT_IDS.includes(sportId) && current._qpStandardEV != null)
      ? current._qpStandardEV
      : (current.ev?.seasonTotal || 0);
    const winProb = (current.ev?.winProbability || 0) / 100;
    const notes = (current.notes || '').toLowerCase();

    let nextUndraftedIndex = -1;
    for (let j = i + 1; j < sportEntries.length; j++) {
      if (!sportEntries[j].drafted) { nextUndraftedIndex = j; break; }
    }
    let gapToNext = 0;
    if (nextUndraftedIndex !== -1) {
      gapToNext = rawEV - (sportEntries[nextUndraftedIndex].ev?.seasonTotal || 0);
    }
    const remainingUndrafted = sportEntries.filter((e, idx) => idx >= i && !e.drafted).length;
    const sportConfig = SPORTS.find(s => s.id === sportId);
    const sportScarcityWeight = sportConfig?.scarcityWeight ?? 0.5;
    const rawScarcity = remainingUndrafted > 0 ? (gapToNext * 2) / remainingUndrafted : 0;
    const scarcityBonus = rawScarcity * (globalModifier ?? 1.0) * (sportScarcityWeight / 0.5);

    // --- HYBRID VOR-EV MODEL ---
    const marginalValue = Math.max(0.1, rawEV - replacementEV);
    const hybridValue = (marginalValue * 0.5) + (rawEV * 0.5);
    const efficiency = hybridValue / Math.sqrt(sigma);

    // --- FATIGUE & FRAGILITY SHOCK PENALTIES ---
    let shockPenalty = 1.0;
    if (notes.includes('travel fatigue') || notes.includes('tough schedule') || notes.includes('brutal stretch')) {
        shockPenalty *= 0.95;
    }
    if (notes.includes('injury prone') || notes.includes('shallow depth') || notes.includes('thin roster') || notes.includes('injury risk')) {
        shockPenalty *= 0.92;
    }

    let byeAlpha = 1.0;
    if (['nfl', 'nba', 'mlb', 'nhl', 'afl'].includes(sportId) && winProb > 0.10) {
      byeAlpha = 1.08;
    }

    const efficiencyMult = (winProb >= 0.05) ? 1.10 : 1.0;
    const baseAdpScore = calc(efficiency * 10, scarcityBonus, (current.adjSq || 1.0), current);

    // Phase 3C: Trap signal multiplier
    let trapMult = 1.0;
    if (current.trapSignal === 'RED') trapMult = 0.90;
    else if (current.trapSignal === 'GREEN') trapMult = 1.10;

    current.math = {
      rawEV, replacementEV, marginalValue, hybridValue, sigma,
      efficiency, efficiencyMult, confidenceMult, scarcityBonus,
      adjSq: current.adjSq || 1.0, baseAdpScore,
      events: STABILITY_SAMPLES[sportId] || 1,
      modelUsed: byeAlpha > 1.0 ? 'Championship Bye' : (sportId === 'nfl' ? 'Alpha Hunter' : 'Stability Anchor'),
      shockPenalty, liquidityMult, trapMult,
      // QP sport flag — rawEV is in standard-point scale via rank conversion
      qpRankConverted: QP_SPORT_IDS.includes(sportId) && current._qpStandardEV != null,
      qpExpectedQP: current.ev?.totalExpectedQP || null,
    };

    current.evGap = parseFloat(gapToNext.toFixed(2));
    current.remainingUndrafted = remainingUndrafted;
    current.scarcityBonus = parseFloat(scarcityBonus.toFixed(2));

    // Final DPS: Base * GCI * Efficiency * Bye * Liquidity * Shock * Trap
    current.adpScore = parseFloat((baseAdpScore * confidenceMult * efficiencyMult * byeAlpha * liquidityMult * shockPenalty * trapMult).toFixed(2));
  }
  // Velocity pass
  const undraftedOnly = sportEntries.filter(e => !e.drafted);
  for (const current of sportEntries) {
    const uIdx = undraftedOnly.findIndex(e => e.id === current.id);
    let velocity = 1.0;
    if (uIdx !== -1 && undraftedOnly.length > 3) {
      const getScore = (idx) => undraftedOnly[idx]?.adpScore || 0;
      const score = current.adpScore || 0;
      const dropAbove1 = uIdx > 0 ? getScore(uIdx - 1) - score : 0;
      const dropAbove2 = uIdx > 1 ? getScore(uIdx - 2) - getScore(uIdx - 1) : dropAbove1;
      const avgInertia = (dropAbove1 + dropAbove2) / 2;
      const dropBelow1 = uIdx < undraftedOnly.length - 1 ? score - getScore(uIdx + 1) : 0;
      const dropBelow2 = uIdx < undraftedOnly.length - 2 ? getScore(uIdx + 1) - getScore(uIdx + 2) : dropBelow1;
      const avgMomentum = (dropBelow1 + dropBelow2) / 2;
      velocity = avgMomentum / (Math.max(avgInertia, 0.5));
    }
    current.dropoffVelocity = parseFloat(velocity.toFixed(2));
  }
}

// ============================================================================
// HISTORICAL BLENDING
// ============================================================================

const CURRENT_WEIGHT = 0.7;
const HISTORICAL_WEIGHT = 0.3;

export function calculateHistoricallyWeightedEV(americanOdds, category, eventsPerSeason, historicalData, sportId) {
  const currentEV = calculateSeasonTotalEV(americanOdds, category, eventsPerSeason, sportId);
  if (!historicalData || !historicalData.history || historicalData.history.length < 2) return currentEV;
  const historicalOdds = historicalData.history.map((h) => h.odds).filter(Boolean);
  if (historicalOdds.length === 0) return currentEV;
  const avgHistoricalProb = historicalOdds.reduce((sum, odds) => sum + americanToImpliedProbability(odds), 0) / historicalOdds.length;
  const historicalAmericanOdds = probabilityToAmerican(avgHistoricalProb);
  const historicalEV = calculateSeasonTotalEV(historicalAmericanOdds, category, eventsPerSeason, sportId);
  const blendedSeasonTotal = CURRENT_WEIGHT * currentEV.seasonTotal + HISTORICAL_WEIGHT * historicalEV.seasonTotal;
  return { ...currentEV, seasonTotal: parseFloat(blendedSeasonTotal.toFixed(2)), historicalBlend: true };
}
