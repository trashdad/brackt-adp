/**
 * oddsApi.js — Fetches futures odds from The Odds API.
 * Cache is in-memory (per session) — nothing written to the browser.
 */

const BASE_URL = 'https://api.the-odds-api.com/v4';

// In-memory cache: sportApiKey → { data, timestamp }
const _cache = new Map();
let _apiRemaining = null;

function getCacheTTL(refreshInterval) {
  return (refreshInterval || 24) * 60 * 60 * 1000;
}

function getFromCache(sport, refreshInterval) {
  const entry = _cache.get(sport);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > getCacheTTL(refreshInterval)) {
    _cache.delete(sport);
    return null;
  }
  return entry.data;
}

function setCache(sport, data) {
  _cache.set(sport, { data, timestamp: Date.now() });
}

/**
 * Fetch futures odds for a sport from The Odds API.
 * Returns an array of { name, odds } entries, or null on failure.
 */
export async function fetchOddsForSport(sportApiKey, apiKey, refreshInterval) {
  if (!sportApiKey || !apiKey) return null;

  const cached = getFromCache(sportApiKey, refreshInterval);
  if (cached) return cached;

  const url = `${BASE_URL}/sports/${sportApiKey}/odds?apiKey=${encodeURIComponent(apiKey)}&regions=us&markets=outrights&oddsFormat=american`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Odds API error for ${sportApiKey}: ${res.status}`);
    return null;
  }

  const remaining = res.headers.get('x-requests-remaining');
  if (remaining) _apiRemaining = remaining;

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
 * Returns the API remaining requests count (from last successful API call this session).
 */
export function getRemainingRequests() {
  return _apiRemaining || 'Unknown';
}
