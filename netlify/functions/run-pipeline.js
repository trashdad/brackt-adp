import { getStore } from "@netlify/blobs";

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
  nfl: "americanfootball_nfl",
  nba: "basketball_nba",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  ncaaw: "basketball_wncaab",
  wnba: "basketball_wnba",
  afl: "aussierules_afl",
  f1: "motorsport_formula1",
  ucl: "soccer_uefa_champs_league",
  fifa: "soccer_fifa_world_cup",
  darts: "darts_pdc_world_championship",
  snooker: "snooker_world_championship",
  pga: "golf_pga",
  tennis_m: "tennis_atp",
  tennis_w: "tennis_wta",
  csgo: "esports_csgo",
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
      for (const event of Array.isArray(data) ? data : []) {
        for (const bookmaker of event.bookmakers || []) {
          for (const market of bookmaker.markets || []) {
            if (market.key !== "outrights") continue;
            for (const outcome of market.outcomes || []) {
              const existing = oddsMap[outcome.name];
              if (!existing || outcome.price > existing.price) {
                oddsMap[outcome.name] = {
                  price: outcome.price,
                  bookmaker: bookmaker.title || bookmaker.key,
                };
              }
            }
          }
        }
      }

      const entries = Object.entries(oddsMap).map(([name, { price, bookmaker }]) => ({
        name,
        nameNormalized: normalizeName(name),
        odds: price > 0 ? `+${price}` : `${price}`,
        bookmaker,
        market: "outrights",
      }));

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
      for (const event of events) {
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
                oddsMap[name] = {
                  price,
                  bookmaker: bookmaker.title || bookmaker.key || bookmaker.name,
                };
              }
            }
          }
        }
      }

      const entries = Object.entries(oddsMap).map(([name, { price, bookmaker }]) => ({
        name,
        nameNormalized: normalizeName(name),
        odds: price > 0 ? `+${price}` : `${price}`,
        bookmaker,
        market: "outrights",
      }));

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
      }
    }

    const entries = [];
    for (const merged of entryMap.values()) {
      entries.push({
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
      });
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

  const store = getStore("pipeline_data");
  const sourceResults = {};

  // Define sources with their env var keys
  const apiSources = [
    { id: "the-odds-api", key: process.env.THE_ODDS_API_KEY, fetcher: fetchTheOddsApi },
    { id: "odds-api-io", key: process.env.ODDS_API_IO_KEY, fetcher: fetchOddsApiIo },
    { id: "api-sports", key: process.env.API_SPORTS_KEY, fetcher: fetchApiSports },
  ];

  // Write initial status so polling can see "running"
  try {
    await store.setJSON("status", { running: true, sources: {}, lastRun: new Date().toISOString() });
  } catch {
    // Non-fatal
  }

  // Fetch all API sources in parallel
  const allRawData = {};
  await Promise.all(
    apiSources.map(async ({ id, key, fetcher }) => {
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
    })
  );

  // Mark Python sources as skipped (they require local server + Selenium)
  for (const id of PYTHON_SOURCES) {
    sourceResults[id] = "skipped";
  }

  // Merge all fetched data
  const mergedBySport = mergeAllSources(allRawData);

  // Write merged data to Blobs
  const manifest = {
    lastUpdated: new Date().toISOString(),
    sports: {},
  };

  const writePromises = [];
  for (const [sportId, merged] of Object.entries(mergedBySport)) {
    writePromises.push(store.setJSON(`live_${sportId}`, merged));
    manifest.sports[sportId] = {
      entryCount: merged.entries.length,
      sources: merged.sources,
      lastUpdated: merged.lastUpdated,
    };
  }
  writePromises.push(store.setJSON("manifest", manifest));
  writePromises.push(
    store.setJSON("status", {
      running: false,
      sources: sourceResults,
      lastRun: new Date().toISOString(),
    })
  );
  await Promise.all(writePromises);

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
