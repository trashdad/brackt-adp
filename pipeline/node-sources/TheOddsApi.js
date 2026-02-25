import BaseApiClient, { normalizeName } from './BaseApiClient.js';

const BASE_URL = 'https://api.the-odds-api.com/v4';

export default class TheOddsApi extends BaseApiClient {
  constructor() {
    super('the-odds-api', {
      baseURL: BASE_URL,
      rateLimit: { maxPerDay: 20 },
    });
    this.apiKey = process.env.THE_ODDS_API_KEY;
  }

  async fetchSport(sportId, sportMapping) {
    if (!this.apiKey) {
      return [];
    }

    const apiKey = sportMapping.key;
    if (!apiKey) return [];

    const data = await this.request(`/sports/${apiKey}/odds`, {
      apiKey: this.apiKey,
      regions: 'us',
      markets: 'outrights',
      oddsFormat: 'american',
    });

    if (!data) return [];

    // Extract best odds for each outcome across all bookmakers
    const oddsMap = {};
    for (const event of Array.isArray(data) ? data : []) {
      for (const bookmaker of event.bookmakers || []) {
        for (const market of bookmaker.markets || []) {
          if (market.key !== 'outrights') continue;
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

    return Object.entries(oddsMap).map(([name, { price, bookmaker }]) => ({
      name,
      nameNormalized: normalizeName(name),
      odds: price > 0 ? `+${price}` : `${price}`,
      bookmaker,
      market: 'outrights',
    }));
  }
}
