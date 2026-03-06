import BaseApiClient, { normalizeName } from './BaseApiClient.js';

const BASE_URL = 'https://gamma-api.polymarket.com';

/**
 * Polymarket prediction market API client.
 * No API key required — public, read-only access.
 * Markets are binary (Yes/No) with outcomePrices representing implied probabilities.
 *
 * Championship markets: each team/player gets a sub-market where
 * outcomePrices[0] = P(win), outcomePrices[1] = P(not win).
 */

// Map our sport IDs to Polymarket event slugs.
// These need to be updated each season as Polymarket creates new markets.
const SPORT_SLUGS = {
  nfl: 'super-bowl-champion-2027',
  nba: '2026-nba-champion',
  mlb: '2026-mlb-world-series-winner',
  nhl: '2026-nhl-stanley-cup-champion',
  ncaab: '2026-ncaa-tournament-winner',
  ncaaf: '2026-college-football-playoff-winner',
  ucl: 'uefa-champions-league-winner',
  fifa: '2026-fifa-world-cup-winner',
  f1: '2026-formula-1-world-champion',
  // Sports below may not have Polymarket markets — slugs are best guesses
  // and will gracefully return [] if not found.
  wnba: '2026-wnba-champion',
  pga: '2026-masters-winner',
  tennis_m: '2026-wimbledon-mens-winner',
  tennis_w: '2026-wimbledon-womens-winner',
  csgo: '2026-cs2-major-winner',
};

// Convert Polymarket probability (0-1) to American odds
function probToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

export default class Polymarket extends BaseApiClient {
  constructor() {
    super('polymarket', {
      baseURL: BASE_URL,
      rateLimit: { maxPerHour: 200 }, // generous — Polymarket allows 1000/hr
    });
  }

  async fetchSport(sportId, sportMapping) {
    // Use explicit slug from mapping, or fall back to our defaults
    const slug = sportMapping?.slug || SPORT_SLUGS[sportId];
    if (!slug) return [];

    // Try exact slug first, then search by title
    let data = await this.request('/events', { slug, active: true, closed: false });

    // API returns an array — find our event
    const events = Array.isArray(data) ? data : [];
    if (events.length === 0) {
      // Try searching by slug as a contains match
      data = await this.request('/events', { slug, limit: 1 });
      if (!data || (Array.isArray(data) && data.length === 0)) return [];
    }

    const event = Array.isArray(data) ? data[0] : data;
    if (!event || !event.markets || event.markets.length === 0) return [];

    const entries = [];
    for (const market of event.markets) {
      // Skip inactive/closed/resolved markets
      if (market.closed || market.archived) continue;

      // Get the team/player name
      const name = market.groupItemTitle || market.question;
      if (!name) continue;

      // Parse outcomePrices — they're stored as JSON strings
      let prices;
      try {
        prices = typeof market.outcomePrices === 'string'
          ? JSON.parse(market.outcomePrices)
          : market.outcomePrices;
      } catch {
        continue;
      }

      if (!prices || prices.length === 0) continue;

      // First price is P(Yes) = P(this team wins)
      const prob = parseFloat(prices[0]);
      if (isNaN(prob) || prob <= 0.001) continue; // Skip near-zero markets

      const american = probToAmerican(prob);
      if (american == null) continue;

      entries.push({
        name,
        nameNormalized: normalizeName(name),
        odds: american > 0 ? `+${american}` : `${american}`,
        bookmaker: 'Polymarket',
        market: 'outrights',
        impliedProb: prob,
      });
    }

    // Sort by implied probability descending
    entries.sort((a, b) => (b.impliedProb || 0) - (a.impliedProb || 0));
    return entries;
  }
}
