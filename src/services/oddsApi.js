const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(sport) {
  return `brackt_odds_${sport}`;
}

function getFromCache(sport) {
  try {
    const raw = localStorage.getItem(getCacheKey(sport));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(getCacheKey(sport));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(sport, data) {
  try {
    localStorage.setItem(
      getCacheKey(sport),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full — ignore
  }
}

/**
 * Fetch futures odds for a sport from The Odds API.
 * Returns an array of { name, odds } entries.
 */
export async function fetchOddsForSport(sportApiKey, apiKey) {
  if (!sportApiKey || !apiKey) return null;

  const cached = getFromCache(sportApiKey);
  if (cached) return cached;

  const url = `${BASE_URL}/sports/${sportApiKey}/odds?apiKey=${encodeURIComponent(apiKey)}&regions=us&markets=outrights&oddsFormat=american`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Odds API error for ${sportApiKey}: ${res.status}`);
    return null;
  }

  const json = await res.json();

  // Extract best odds for each team/player across bookmakers
  const oddsMap = {};
  for (const event of json) {
    for (const bookmaker of event.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        if (market.key !== 'outrights') continue;
        for (const outcome of market.outcomes || []) {
          const existing = oddsMap[outcome.name];
          if (!existing || outcome.price > existing) {
            oddsMap[outcome.name] = outcome.price;
          }
        }
      }
    }
  }

  const entries = Object.entries(oddsMap).map(([name, price]) => ({
    name,
    odds: price > 0 ? `+${price}` : `${price}`,
  }));

  setCache(sportApiKey, entries);
  return entries;
}

/**
 * Get the remaining requests count from localStorage (set after API calls).
 */
export function getRemainingRequests() {
  return localStorage.getItem('brackt_api_remaining') || 'Unknown';
}
