import fs from 'fs';
import path from 'path';

// --- Simulation Settings & Target Candidates ---
const CANDIDATES = [
  { name: 'Vegas Golden Knights', id: 'nhl-vegas-golden-knights', sport: 'nhl' },
  { name: 'Sydney Swans', id: 'afl-sydney-swans', sport: 'afl' },
  { name: 'Caribbean', id: 'llws-caribbean', sport: 'llws' },
  { name: 'Cleveland Cavaliers', id: 'nba-cleveland-cavaliers', sport: 'nba' },
  { name: 'Boston Celtics', id: 'nba-boston-celtics', sport: 'nba' },
  { name: 'Oregon', id: 'ncaaf-oregon-ducks', sport: 'ncaaf' },
  { name: 'US - Southeast', id: 'llws-usa-southeast', sport: 'llws' },
  { name: 'Chelsea', id: 'ucl-chelsea', sport: 'ucl' },
  { name: 'Edmonton Oilers', id: 'nhl-edmonton-oilers', sport: 'nhl' },
  { name: 'New York Knicks', id: 'nba-new-york-knicks', sport: 'nba' },
  { name: 'LSU (W)', id: 'ncaaw-lsu-tigers', sport: 'ncaaw' },
  { name: 'Georgia', id: 'ncaaf-georgia-bulldogs', sport: 'ncaaf' },
  { name: 'Latin America', id: 'llws-latin-america', sport: 'llws' },
  { name: 'US - Southwest', id: 'llws-usa-southwest', sport: 'llws' },
  { name: 'Western Bulldogs', id: 'afl-western-bulldogs', sport: 'afl' },
  { name: 'Fremantle Dockers', id: 'afl-fremantle-dockers', sport: 'afl' },
  { name: 'Seattle Mariners', id: 'mlb-seattle-mariners', sport: 'mlb' },
  { name: 'Baltimore Ravens', id: 'nfl-baltimore-ravens', sport: 'nfl' },
  { name: 'Buffalo Bills', id: 'nfl-buffalo-bills', sport: 'nfl' },
  { name: 'Iowa', id: 'ncaab-iowa-hawkeyes', sport: 'ncaab' },
  { name: 'Florida', id: 'ncaab-florida-gators', sport: 'ncaab' },
  { name: 'Will Power', id: 'indycar-will-power', sport: 'indycar' },
  { name: 'Bryson DeChambeau', id: 'pga-bryson-dechambeau', sport: 'pga' },
  { name: 'Amanda Anisimova', id: 'tennis_w-amanda-anisimova', sport: 'tennis_w' },
  { name: 'New York Mets', id: 'mlb-new-york-mets', sport: 'mlb' },
  { name: 'Mexico', id: 'llws-mexico', sport: 'llws' },
  { name: 'Toronto Blue Jays', id: 'mlb-toronto-blue-jays', sport: 'mlb' },
  { name: 'Collingwood Magpies', id: 'afl-collingwood-magpies', sport: 'afl' },
  { name: 'St Kilda Saints', id: 'afl-st-kilda-saints', sport: 'afl' },
  { name: 'Germany', id: 'fifa-germany', sport: 'fifa' },
  { name: 'Florida', id: 'ncaaf-florida-gators', sport: 'ncaaf' },
  { name: 'Green Bay Packers', id: 'nfl-green-bay-packers', sport: 'nfl' },
  { name: 'Ronnie O’Sullivan', id: 'snooker-ronnie-osullivan', sport: 'snooker' },
  { name: 'Boston Red Sox', id: 'mlb-boston-red-sox', sport: 'mlb' },
  { name: 'Philadelphia Phillies', id: 'mlb-philadelphia-phillies', sport: 'mlb' },
  { name: 'Houston Rockets', id: 'nba-houston-rockets', sport: 'nba' },
  { name: 'Los Angeles Chargers', id: 'nfl-los-angeles-chargers', sport: 'nfl' },
  { name: 'LSU', id: 'ncaaf-lsu-tigers', sport: 'ncaaf' },
  { name: 'Newcastle United', id: 'ucl-newcastle', sport: 'ucl' },
  { name: 'Philadelphia Eagles', id: 'nfl-philadelphia-eagles', sport: 'nfl' },
  { name: 'Minnesota Wild', id: 'nhl-minnesota-wild', sport: 'nhl' },
  { name: 'Atlanta Braves', id: 'mlb-atlanta-braves', sport: 'mlb' },
  { name: 'Fernando Alonso', id: 'f1-fernando-alonso', sport: 'f1' },
  { name: 'Panama', id: 'llws-panama', sport: 'llws' },
  { name: 'Dallas Stars', id: 'nhl-dallas-stars', sport: 'nhl' },
  { name: 'Detroit Lions', id: 'nfl-detroit-lions', sport: 'nfl' }
];

// Manual overrides based on web search (blog posts, injuries, coaching changes)
const MANUAL_OVERRIDES = {
  'nba-boston-celtics': { subjectiveModifier: 0.90, reason: "Tatum Achilles tear return risk; roster depleted for luxury tax." },
  'ncaaf-georgia-bulldogs': { subjectiveModifier: 0.95, reason: "15 portal departures; OL Coach Rauscher leaving for Raiders." },
  'nhl-edmonton-oilers': { subjectiveModifier: 1.05, reason: "Aggressive deadline buyers; McDavid returning with Olympic MVP momentum." },
  'pga-bryson-dechambeau': { subjectiveModifier: 1.05, reason: "LIV golf narrative + distance advantage at Augusta." },
  'indycar-will-power': { subjectiveModifier: 1.02, reason: "Moved to Andretti for 2026." },
  'snooker-ronnie-osullivan': { subjectiveModifier: 0.85, reason: "Pulled out of 2026 Masters, dropped to #11." }
};

// --- Utilities ---
function impliedProb(americanOdds) {
  if (!americanOdds) return 0;
  let odds = americanOdds;
  if (typeof odds === 'string') {
    odds = parseInt(odds.replace('+', ''), 10);
  }
  if (odds > 0) return 100 / (odds + 100);
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 0;
}

const SCORING = [
  { rank: 1, pts: 100 }, { rank: 2, pts: 70 }, { rank: 3, pts: 50 },
  { rank: 4, pts: 40 }, { rank: 5, pts: 25 }, { rank: 6, pts: 25 },
  { rank: 7, pts: 15 }, { rank: 8, pts: 15 }
];

function calcEV(winProb) {
  const RANK_WEIGHTS = [20, 14, 10, 8, 5, 5, 3, 3];
  let ev = 0;
  let remaining = 1 - winProb;
  const tailSum = RANK_WEIGHTS.slice(1).reduce((a, b) => a + b, 0);
  
  SCORING.forEach((tier, idx) => {
    let prob = idx === 0 ? winProb : remaining * (RANK_WEIGHTS[idx] / tailSum);
    ev += prob * tier.pts;
  });
  return Math.min(ev, 100);
}

// --- Main Script ---
function run() {
  const socialScoresPath = path.join(process.cwd(), 'public/data/social-scores.json');
  let socialData = {};
  if (fs.existsSync(socialScoresPath)) {
    socialData = JSON.parse(fs.readFileSync(socialScoresPath, 'utf-8'));
  }

  const results = CANDIDATES.map(candidate => {
    let odds = "+5000"; // default fallback
    let source = "default";
    let sq = 1.0; // default Social Quotient
    let mentions = 0;
    
    // Check live JSON files first
    const liveFile = path.join(process.cwd(), `public/data/live/${candidate.sport}.json`);
    if (fs.existsSync(liveFile)) {
      const liveData = JSON.parse(fs.readFileSync(liveFile, 'utf-8'));
      const normalizedName = candidate.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      const entry = liveData.entries.find(e => e.nameNormalized.includes(normalizedName) || normalizedName.includes(e.nameNormalized));
      if (entry && entry.bestOdds) {
        odds = entry.bestOdds;
        source = "live";
      }
    }
    
    // Check social-scores.json for SQ and fallback odds
    const sData = socialData[candidate.id];
    if (sData) {
      if (sData.socialQuotient) sq = sData.socialQuotient;
      
      const rMentions = sData.sources?.reddit?.mentions || 0;
      const nMentions = sData.sources?.news?.mentions || 0;
      mentions = rMentions + nMentions;

      if (source === "default" && sData.sources?.expert?.notes) {
        const match = sData.sources.expert.notes.match(/(\+[0-9]+|\-[0-9]+|[0-9]+\/[0-9]+)/);
        if (match) {
          if (match[1].includes('/')) {
            const [num, den] = match[1].split('/');
            const prob = parseInt(den) / (parseInt(num) + parseInt(den));
            const amOdds = prob < 0.5 ? Math.round((1 - prob) / prob * 100) : Math.round(-100 * prob / (1 - prob));
            odds = amOdds > 0 ? `+${amOdds}` : `${amOdds}`;
          } else {
            odds = match[1];
          }
          source = "expert_notes";
        }
      }
    }

    // Default LLWS odds based on expert rank approximation if still default
    if (source === "default" && candidate.sport === "llws" && sData?.sources?.expert?.rank) {
       const ranksToOdds = { 1: "+250", 2: "+400", 3: "+500", 4: "+750", 5: "+1000", 6: "+1200", 7: "+1500" };
       odds = ranksToOdds[sData.sources.expert.rank] || "+2500";
    }

    // Apply manual overrides
    let subjectiveMod = sq;
    let overrideReason = "Social Sentiment & News Velocity";
    if (MANUAL_OVERRIDES[candidate.id]) {
      subjectiveMod = MANUAL_OVERRIDES[candidate.id].subjectiveModifier;
      overrideReason = MANUAL_OVERRIDES[candidate.id].reason;
    }

    // Additional Scarcity logic: Give slight bump to entities in low-event sports (e.g., F1, LLWS)
    let scarcityMultiplier = 1.0;
    if (['llws', 'f1', 'indycar', 'snooker'].includes(candidate.sport)) {
      scarcityMultiplier = 1.1; // 10% boost for single-winner dominant sports to reflect positional draft value
    }

    const winProb = impliedProb(odds);
    const baseEV = calcEV(winProb);
    const draftPriorityScore = baseEV * subjectiveMod * scarcityMultiplier;

    return {
      ...candidate,
      odds,
      baseEV: parseFloat(baseEV.toFixed(2)),
      subjectiveMod: parseFloat(subjectiveMod.toFixed(2)),
      scarcityMultiplier,
      draftPriorityScore: parseFloat(draftPriorityScore.toFixed(2)),
      narrative: overrideReason
    };
  });

  results.sort((a, b) => b.draftPriorityScore - a.draftPriorityScore);

  console.table(results.slice(0, 15).map(r => ({
    Rank: results.indexOf(r) + 1,
    Name: r.name,
    Sport: r.sport.toUpperCase(),
    Odds: r.odds,
    "Base EV": r.baseEV,
    "Subj. Coeff": r.subjectiveMod,
    "Draft Score": r.draftPriorityScore,
    Narrative: r.narrative.substring(0, 40)
  })));
}

run();
