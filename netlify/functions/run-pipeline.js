import { writePipelineFile } from './_store.js';

/**
 * Netlify Function that runs the Node API-based pipeline sources directly.
 * Python/Selenium sources (DraftKings, FanDuel, etc.) are local-only.
 *
 * Returns { ok, completed, sources, message } so the frontend can skip polling.
 *
 * Required env vars (set in Netlify dashboard):
 *   THE_ODDS_API_KEY, ODDS_API_IO_KEY, API_SPORTS_KEY
 */

// ── Sport key mappings (shared by the-odds-api and odds-api-io) ──────────────
const SPORT_KEYS = {
  // American sports
  nfl:        "americanfootball_nfl",
  nba:        "basketball_nba",
  mlb:        "baseball_mlb",
  nhl:        "icehockey_nhl",
  ncaaf:      "americanfootball_ncaaf",
  ncaab:      "basketball_ncaab",
  ncaaw:      "basketball_wncaab",
  wnba:       "basketball_wnba",
  // Motorsport
  f1:         "motorsport_formula1",
  indycar:    "motorsport_indycar",
  // Soccer
  ucl:        "soccer_uefa_champs_league",
  fifa:       "soccer_fifa_world_cup",
  // Other
  afl:        "aussierules_afl",
  darts:      "darts_pdc_world_championship",
  snooker:    "snooker_world_championship",
  pga:        "golf_pga",
  tennis_m:   "tennis_atp",
  tennis_w:   "tennis_wta",
  csgo:       "esports_csgo",
};

// ── Polymarket event slugs — NO API key needed (public prediction markets) ──
// String = single slug. Array = multiple tournaments merged by player name.
// Gracefully returns [] if slug not found.
const POLYMARKET_SLUGS = {
  // North American championships
  nfl:        "super-bowl-champion-2027",
  nba:        "2026-nba-champion",
  mlb:        "2026-mlb-world-series-winner",
  nhl:        "2026-nhl-stanley-cup-champion",
  ncaab:      "2026-ncaa-tournament-winner",
  ncaaw:      "2026-ncaa-womens-tournament-winner",
  ncaaf:      "2026-college-football-playoff-winner",
  wnba:       "2026-wnba-champion",
  // Motorsport
  f1:         "2026-formula-1-world-champion",
  // Soccer
  ucl:        "uefa-champions-league-winner",
  fifa:       "2026-fifa-world-cup-winner",
  // PGA — all 4 majors merged by player
  pga: [
    "2026-masters-winner",
    "2026-pga-championship-winner",
    "2026-us-open-golf-winner",
    "2026-the-open-championship-winner",
  ],
  // Women's Tennis — remaining 2026 Grand Slams
  tennis_w: [
    "2026-french-open-womens-winner",
    "2026-wimbledon-womens-winner",
    "2026-us-open-womens-winner",
  ],
  // Men's Tennis — remaining 2026 Grand Slams
  tennis_m: [
    "2026-french-open-mens-winner",
    "2026-wimbledon-mens-winner",
    "2026-us-open-mens-winner",
  ],
  // Other sports (slugs are best-guess — gracefully return [] if not found)
  afl:     "2026-afl-premiership-winner",
  indycar: "2026-indycar-series-champion",
  darts:   "2026-pdc-world-darts-championship-winner",
  snooker: "2026-world-snooker-championship-winner",
  csgo:    "2026-cs2-major-winner",
};

const PYTHON_SOURCES = [
  "draftkings", "fanduel", "covers", "vegasinsider", "oddsportal", "betonline-llws",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikeOdds(name) {
  return /^[+-]?[\d,]+$/.test(name.replace(/\s/g, ""));
}

function impliedProbability(oddsStr) {
  const odds = parseFloat(oddsStr);
  if (isNaN(odds)) return 0;
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

function calculateConsensusOdds(oddsBySource) {
  const values = Object.values(oddsBySource).map(parseFloat).filter((n) => !isNaN(n));
  if (values.length === 0) return null;
  const avgProb =
    values.reduce((sum, odds) => {
      if (odds < 0) return sum + Math.abs(odds) / (Math.abs(odds) + 100);
      return sum + 100 / (odds + 100);
    }, 0) / values.length;
  if (avgProb <= 0 || avgProb >= 1) return null;
  if (avgProb > 0.5) {
    return `${Math.round((-avgProb * 100) / (1 - avgProb))}`;
  }
  return `+${Math.round((100 * (1 - avgProb)) / avgProb)}`;
}

// ── Tournament name → internal ID mapping ────────────────────────────────────
const TOURNAMENT_SLUG_MAP = [
  ["the masters",             "masters"],
  ["masters tournament",      "masters"],
  ["pga championship",        "pga-champ"],
  ["the open championship",   "open-champ"],
  ["british open",            "open-champ"],
  ["u.s. open golf",          "us-open"],
  ["us open golf",            "us-open"],
  ["the players championship","the-players"],
  ["the players",             "the-players"],
  ["arnold palmer",           "arnold-palmer"],
  ["genesis invitational",    "genesis"],
  ["genesis open",            "genesis"],
  ["dell match play",         "wgc-match-play"],
  ["match play championship", "wgc-match-play"],
  ["bmw championship",        "bmw-championship"],
  ["australian open",         "aus-open"],
  ["french open",             "french-open"],
  ["roland garros",           "french-open"],
  ["wimbledon",               "wimbledon"],
  ["us open",                 "us-open"],
  ["indian wells",            "indian-wells"],
  ["bnp paribas open",        "indian-wells"],
  ["miami open",              "miami-open"],
  ["madrid open",             "madrid-open"],
  ["mutua madrid",            "madrid-open"],
  ["internazionali",          "rome"],
  ["italian open",            "rome"],
  ["canada open",             "canada-open"],
  ["canadian open",           "canada-open"],
  ["national bank open",      "canada-open"],
  ["western & southern",      "cincinnati"],
  ["cincinnati open",         "cincinnati"],
  ["monte-carlo masters",     "monte-carlo"],
  ["monte carlo",             "monte-carlo"],
];

function getTournamentId(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [pattern, id] of TOURNAMENT_SLUG_MAP) {
    if (lower.includes(pattern)) return id;
  }
  return null;
}

// ── SportsbookReview — public odds aggregator (keyless) ──────────────────────
const SBR_FUTURES_PAGES = {
  pga:      "https://www.sportsbookreview.com/betting-odds/golf/futures/",
  tennis_m: "https://www.sportsbookreview.com/betting-odds/tennis/atp/futures/",
  tennis_w: "https://www.sportsbookreview.com/betting-odds/tennis/wta/futures/",
  nfl:      "https://www.sportsbookreview.com/betting-odds/football/nfl/futures/",
  nba:      "https://www.sportsbookreview.com/betting-odds/basketball/nba/futures/",
  mlb:      "https://www.sportsbookreview.com/betting-odds/baseball/mlb/futures/",
  nhl:      "https://www.sportsbookreview.com/betting-odds/hockey/nhl/futures/",
  ncaab:    "https://www.sportsbookreview.com/betting-odds/basketball/ncaa/futures/",
  ncaaf:    "https://www.sportsbookreview.com/betting-odds/football/ncaa/futures/",
  ucl:      "https://www.sportsbookreview.com/betting-odds/soccer/champions-league/futures/",
  fifa:     "https://www.sportsbookreview.com/betting-odds/soccer/world-cup/futures/",
  wnba:     "https://www.sportsbookreview.com/betting-odds/basketball/wnba/futures/",
  f1:       "https://www.sportsbookreview.com/betting-odds/auto-racing/formula-1/futures/",
  indycar:  "https://www.sportsbookreview.com/betting-odds/auto-racing/indycar/futures/",
  ncaaw:    "https://www.sportsbookreview.com/betting-odds/basketball/ncaa-womens/futures/",
};

async function fetchSbr() {
  const results = {};
  const fetches = Object.entries(SBR_FUTURES_PAGES).map(async ([sportId, pageUrl]) => {
    try {
      const resp = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      if (!resp.ok) return;
      const html = await resp.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (!match) return;
      const nextData = JSON.parse(match[1]);
      const pageProps = nextData?.props?.pageProps;
      const oddsData = pageProps?.oddsData || pageProps?.initialOddsData || pageProps?.data;
      if (!oddsData) return;

      const entries = [];
      const participants = oddsData?.participants || oddsData?.teams || oddsData?.events || [];
      for (const participant of Array.isArray(participants) ? participants : []) {
        const name = participant.name || participant.fullName || participant.displayName;
        if (!name || looksLikeOdds(name)) continue;
        let bestPrice = null;
        const books = participant.odds || participant.lines || participant.sportsbooks || {};
        const bookValues = Array.isArray(books) ? books : Object.values(books);
        for (const book of bookValues) {
          const price = book.moneyLine || book.american || book.price || book.odds;
          if (price == null || price === 0) continue;
          if (bestPrice === null || price > bestPrice) bestPrice = price;
        }
        if (bestPrice == null) continue;
        entries.push({
          name,
          nameNormalized: normalizeName(name),
          odds: bestPrice > 0 ? `+${bestPrice}` : `${bestPrice}`,
          bookmaker: "SBR",
          market: "outrights",
        });
      }
      if (entries.length > 0) results[sportId] = entries;
    } catch { /* SBR page structure may vary */ }
  });
  await Promise.all(fetches);
  return results;
}

// ── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchTheOddsApi(apiKey) {
  const results = {};
  const fetches = Object.entries(SPORT_KEYS).map(async ([sportId, key]) => {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${key}/odds?apiKey=${apiKey}&regions=us&markets=outrights&oddsFormat=american`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();

      const oddsMap = {};
      const tourOddsMap = {};

      for (const event of Array.isArray(data) ? data : []) {
        const tournamentId = getTournamentId(
          event.home_team || event.description || event.sport_title || event.id || ""
        );
        for (const bookmaker of event.bookmakers || []) {
          for (const market of bookmaker.markets || []) {
            if (market.key !== "outrights") continue;
            for (const outcome of market.outcomes || []) {
              const existing = oddsMap[outcome.name];
              if (!existing || outcome.price > existing.price) {
                oddsMap[outcome.name] = { price: outcome.price, bookmaker: bookmaker.title || bookmaker.key };
              }
              if (tournamentId) {
                if (!tourOddsMap[outcome.name]) tourOddsMap[outcome.name] = {};
                const existingT = tourOddsMap[outcome.name][tournamentId];
                if (!existingT || outcome.price > existingT) tourOddsMap[outcome.name][tournamentId] = outcome.price;
              }
            }
          }
        }
      }

      const entries = Object.entries(oddsMap).map(([name, { price, bookmaker }]) => {
        const entry = {
          name,
          nameNormalized: normalizeName(name),
          odds: price > 0 ? `+${price}` : `${price}`,
          bookmaker,
          market: "outrights",
        };
        const tOdds = tourOddsMap[name];
        if (tOdds && Object.keys(tOdds).length > 0) {
          entry.oddsByTournament = {};
          for (const [tid, tp] of Object.entries(tOdds)) {
            entry.oddsByTournament[tid] = tp > 0 ? `+${tp}` : `${tp}`;
          }
        }
        return entry;
      });

      if (entries.length > 0) results[sportId] = entries;
    } catch {
      // Skip failed sport
    }
  });
  await Promise.all(fetches);
  return results;
}

async function fetchOddsApiIo(apiKey) {
  const results = {};
  const fetches = Object.entries(SPORT_KEYS).map(async ([sportId, key]) => {
    try {
      const url = `https://api.odds-api.io/v1/odds?apiKey=${apiKey}&sport=${key}&region=us&market=outrights&oddsFormat=american`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();

      const events = Array.isArray(data) ? data : data?.data || [];
      const oddsMap = {};
      const tourOddsMap = {};
      for (const event of events) {
        const tournamentId = getTournamentId(
          event.home_team || event.description || event.name || event.title || ""
        );
        const bookmakers = event.bookmakers || event.sportsbooks || [];
        for (const bookmaker of bookmakers) {
          for (const market of bookmaker.markets || []) {
            if (market.key !== "outrights" && market.key !== "futures") continue;
            const outcomes = market.outcomes || market.selections || [];
            for (const outcome of outcomes) {
              const name = outcome.name || outcome.label;
              const price = outcome.price || outcome.odds;
              if (!name || price == null) continue;
              const existing = oddsMap[name];
              if (!existing || price > existing.price) {
                oddsMap[name] = { price, bookmaker: bookmaker.title || bookmaker.key || bookmaker.name };
              }
              if (tournamentId) {
                if (!tourOddsMap[name]) tourOddsMap[name] = {};
                const existingT = tourOddsMap[name][tournamentId];
                if (!existingT || price > existingT) tourOddsMap[name][tournamentId] = price;
              }
            }
          }
        }
      }

      const entries = Object.entries(oddsMap).map(([name, { price, bookmaker }]) => {
        const entry = {
          name,
          nameNormalized: normalizeName(name),
          odds: price > 0 ? `+${price}` : `${price}`,
          bookmaker,
          market: "outrights",
        };
        const tOdds = tourOddsMap[name];
        if (tOdds && Object.keys(tOdds).length > 0) {
          entry.oddsByTournament = {};
          for (const [tid, tp] of Object.entries(tOdds)) {
            entry.oddsByTournament[tid] = tp > 0 ? `+${tp}` : `${tp}`;
          }
        }
        return entry;
      });

      if (entries.length > 0) results[sportId] = entries;
    } catch {
      // Skip failed sport
    }
  });
  await Promise.all(fetches);
  return results;
}

async function fetchApiSports(apiKey) {
  const results = {};
  try {
    const season = new Date().getFullYear();
    const resp = await fetch(
      `https://v1.formula-1.api-sports.io/rankings/drivers?season=${season}`,
      { headers: { "x-apisports-key": apiKey } }
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data?.response) {
        results["f1"] = data.response.map((item) => {
          const driver = item.driver || {};
          const name =
            driver.name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim();
          return {
            name,
            nameNormalized: normalizeName(name),
            odds: null,
            bookmaker: "API-Sports",
            market: "standings",
            position: item.position,
            points: item.points,
          };
        });
      }
    }
  } catch {
    // Skip
  }
  return results;
}

// ── Polymarket (no API key — public prediction market) ───────────────────────

function polymarketProbToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

async function fetchOnePolymarketSlug(slug) {
  const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  const events = Array.isArray(data) ? data : [];
  if (!events.length || !events[0]?.markets?.length) return [];

  const entries = [];
  for (const market of events[0].markets) {
    if (market.closed || market.archived) continue;
    const name = market.groupItemTitle || market.question;
    if (!name) continue;
    let prices;
    try {
      prices = typeof market.outcomePrices === "string"
        ? JSON.parse(market.outcomePrices) : market.outcomePrices;
    } catch { continue; }
    if (!prices?.length) continue;
    const prob = parseFloat(prices[0]);
    if (isNaN(prob) || prob <= 0.001) continue;
    const american = polymarketProbToAmerican(prob);
    if (american == null) continue;
    entries.push({
      name,
      nameNormalized: normalizeName(name),
      odds: american > 0 ? `+${american}` : `${american}`,
      bookmaker: "Polymarket",
      market: "outrights",
    });
  }
  return entries;
}

async function fetchPolymarket() {
  const results = {};
  const fetches = Object.entries(POLYMARKET_SLUGS).map(async ([sportId, slugOrSlugs]) => {
    try {
      const slugs = Array.isArray(slugOrSlugs) ? slugOrSlugs : [slugOrSlugs];
      // Fetch all slugs for this sport and merge by player name (keep best odds)
      const allEntries = (await Promise.all(slugs.map(s => fetchOnePolymarketSlug(s).catch(() => [])))).flat();
      const entryMap = new Map();
      for (const entry of allEntries) {
        const existing = entryMap.get(entry.nameNormalized);
        if (!existing) {
          entryMap.set(entry.nameNormalized, entry);
        } else {
          const cur = parseFloat(entry.odds), prev = parseFloat(existing.odds);
          if (cur > prev) entryMap.set(entry.nameNormalized, entry);
        }
      }
      const merged = [...entryMap.values()];
      if (merged.length > 0) results[sportId] = merged;
    } catch {
      // Skip failed sport
    }
  });
  await Promise.all(fetches);
  return results;
}

// ── Merge ────────────────────────────────────────────────────────────────────

function mergeAllSources(allRawData) {
  // Collect all sport IDs across all sources
  const sportIds = new Set();
  for (const sourceData of Object.values(allRawData)) {
    for (const sportId of Object.keys(sourceData)) {
      sportIds.add(sportId);
    }
  }

  const mergedBySport = {};

  for (const sportId of sportIds) {
    const entryMap = new Map();
    const sourceIds = new Set();

    for (const [sourceId, sourceData] of Object.entries(allRawData)) {
      const entries = sourceData[sportId];
      if (!entries || entries.length === 0) continue;
      sourceIds.add(sourceId);

      for (const entry of entries) {
        if (looksLikeOdds(entry.name)) continue;
        const key = entry.nameNormalized || normalizeName(entry.name);

        if (!entryMap.has(key)) {
          entryMap.set(key, {
            name: entry.name,
            nameNormalized: key,
            oddsBySource: {},
            oddsByTournament: {},
            bestOdds: null,
            bestOddsSource: null,
            market: entry.market || "outrights",
          });
        }

        const merged = entryMap.get(key);
        if (entry.odds) {
          merged.oddsBySource[sourceId] = entry.odds;
          const oddsNum = parseFloat(entry.odds);
          const bestNum = merged.bestOdds ? parseFloat(merged.bestOdds) : -Infinity;
          if (oddsNum > bestNum) {
            merged.bestOdds = entry.odds;
            merged.bestOddsSource = sourceId;
          }
        }
        // Merge per-tournament odds
        if (entry.oddsByTournament) {
          for (const [tid, todds] of Object.entries(entry.oddsByTournament)) {
            if (!merged.oddsByTournament[tid]) merged.oddsByTournament[tid] = {};
            merged.oddsByTournament[tid][sourceId] = todds;
          }
        }
      }
    }

    const entries = [];
    for (const merged of entryMap.values()) {
      const e = {
        name: merged.name,
        nameNormalized: merged.nameNormalized,
        bestOdds: merged.bestOdds,
        bestOddsSource: merged.bestOddsSource,
        consensusOdds: calculateConsensusOdds(merged.oddsBySource),
        oddsBySource: merged.oddsBySource,
        impliedProbability: merged.bestOdds
          ? parseFloat(impliedProbability(merged.bestOdds).toFixed(4))
          : 0,
        market: merged.market,
      };
      if (Object.keys(merged.oddsByTournament).length > 0) {
        e.oddsByTournament = {};
        for (const [tid, srcMap] of Object.entries(merged.oddsByTournament)) {
          e.oddsByTournament[tid] = {
            oddsBySource: srcMap,
            consensus: calculateConsensusOdds(srcMap),
            bestOdds: Object.values(srcMap).reduce((best, o) => {
              const n = parseFloat(o); return (best === null || n > parseFloat(best)) ? o : best;
            }, null),
          };
        }
      }
      entries.push(e);
    }

    entries.sort((a, b) => b.impliedProbability - a.impliedProbability);

    mergedBySport[sportId] = {
      sport: sportId,
      lastUpdated: new Date().toISOString(),
      sources: [...sourceIds],
      entries,
    };
  }

  return mergedBySport;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sourceResults = {};

  // Define sources with their env var keys
  const apiSources = [
    { id: "the-odds-api", key: process.env.THE_ODDS_API_KEY, fetcher: fetchTheOddsApi },
    { id: "odds-api-io", key: process.env.ODDS_API_IO_KEY, fetcher: fetchOddsApiIo },
    { id: "api-sports", key: process.env.API_SPORTS_KEY, fetcher: fetchApiSports },
  ];

  // Keyless sources — always run, no env var needed
  const keylessSources = [
    { id: "polymarket", fetcher: fetchPolymarket },
    { id: "sbr",        fetcher: fetchSbr },
  ];

  // Fetch all API sources in parallel
  const allRawData = {};
  await Promise.all([
    ...apiSources.map(async ({ id, key, fetcher }) => {
      if (!key) {
        sourceResults[id] = "error";
        return;
      }
      try {
        allRawData[id] = await fetcher(key);
        sourceResults[id] = Object.keys(allRawData[id]).length > 0 ? "success" : "error";
      } catch {
        sourceResults[id] = "error";
      }
    }),
    ...keylessSources.map(async ({ id, fetcher }) => {
      try {
        allRawData[id] = await fetcher();
        sourceResults[id] = Object.keys(allRawData[id]).length > 0 ? "success" : "error";
      } catch {
        sourceResults[id] = "error";
      }
    }),
  ]);

  // Mark Python sources as skipped (they require local server + Selenium)
  for (const id of PYTHON_SOURCES) {
    sourceResults[id] = "skipped";
  }

  // Merge all fetched data
  const mergedBySport = mergeAllSources(allRawData);

  // Write merged data to /tmp/brackt-data/pipeline/ for pipeline-data.js to serve
  const manifest = {
    lastUpdated: new Date().toISOString(),
    sports: {},
  };

  for (const [sportId, merged] of Object.entries(mergedBySport)) {
    try { await writePipelineFile(`live/${sportId}.json`, merged); } catch { /* non-fatal */ }
    manifest.sports[sportId] = {
      entryCount: merged.entries.length,
      sources: merged.sources,
      lastUpdated: merged.lastUpdated,
    };
  }
  try { await writePipelineFile('live/manifest.json', manifest); } catch { /* non-fatal */ }

  const totalEntries = Object.values(mergedBySport).reduce(
    (sum, s) => sum + s.entries.length,
    0
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      completed: true,
      sources: sourceResults,
      message: `Fetched ${totalEntries} entries across ${Object.keys(mergedBySport).length} sports`,
    }),
  };
};
