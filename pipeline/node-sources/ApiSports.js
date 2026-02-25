import BaseApiClient, { normalizeName } from './BaseApiClient.js';

const BASE_URL = 'https://v1.formula-1.api-sports.io';

/**
 * API-Sports client for F1 standings/results (validation data, not odds).
 * Free tier: 100 req/day.
 */
export default class ApiSports extends BaseApiClient {
  constructor() {
    super('api-sports', {
      baseURL: BASE_URL,
      rateLimit: { maxPerDay: 100 },
      headers: {
        'x-apisports-key': process.env.API_SPORTS_KEY || '',
      },
    });
  }

  async fetchSport(sportId, sportMapping) {
    if (!process.env.API_SPORTS_KEY) {
      return [];
    }

    // Only F1 is supported
    if (sportId !== 'f1') return [];

    const season = sportMapping.season || new Date().getFullYear();

    // Fetch driver standings for the current season
    const data = await this.request('/rankings/drivers', { season });

    if (!data || !data.response) return [];

    return data.response.map((item) => {
      const driver = item.driver || {};
      const name = driver.name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
      const position = item.position;

      return {
        name,
        nameNormalized: normalizeName(name),
        odds: null, // API-Sports provides standings, not odds
        bookmaker: 'API-Sports',
        market: 'standings',
        position,
        points: item.points,
        team: item.team?.name || null,
      };
    });
  }
}
