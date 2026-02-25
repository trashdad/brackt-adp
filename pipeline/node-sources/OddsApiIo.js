import BaseApiClient, { normalizeName } from './BaseApiClient.js';

const BASE_URL = 'https://api.odds-api.io/v1';

export default class OddsApiIo extends BaseApiClient {
  constructor() {
    super('odds-api-io', {
      baseURL: BASE_URL,
      rateLimit: { maxPerHour: 100 },
    });
    this.apiKey = process.env.ODDS_API_IO_KEY;
  }

  async fetchSport(sportId, sportMapping) {
    if (!this.apiKey) {
      return [];
    }

    const sportKey = sportMapping.key;
    if (!sportKey) return [];

    const data = await this.request(`/odds`, {
      apiKey: this.apiKey,
      sport: sportKey,
      region: 'us',
      market: 'outrights',
      oddsFormat: 'american',
    });

    if (!data) return [];

    const events = Array.isArray(data) ? data : data.data || [];
    const oddsMap = {};

    for (const event of events) {
      const bookmakers = event.bookmakers || event.sportsbooks || [];
      for (const bookmaker of bookmakers) {
        const markets = bookmaker.markets || [];
        for (const market of markets) {
          if (market.key !== 'outrights' && market.key !== 'futures') continue;
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

    return Object.entries(oddsMap).map(([name, { price, bookmaker }]) => ({
      name,
      nameNormalized: normalizeName(name),
      odds: price > 0 ? `+${price}` : `${price}`,
      bookmaker,
      market: 'outrights',
    }));
  }
}
