import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../scheduler/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'output', '.raw');

export default class BaseApiClient {
  constructor(sourceId, { baseURL, rateLimit = {}, headers = {} } = {}) {
    this.sourceId = sourceId;
    this.rateLimit = rateLimit;
    this.requestCount = 0;
    this.windowStart = Date.now();

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    });
  }

  /**
   * Check if we've exceeded the rate limit for the current window.
   */
  canMakeRequest() {
    const now = Date.now();
    const { maxPerHour, maxPerDay } = this.rateLimit;

    if (maxPerHour) {
      if (now - this.windowStart > 3600000) {
        this.requestCount = 0;
        this.windowStart = now;
      }
      return this.requestCount < maxPerHour;
    }

    if (maxPerDay) {
      if (now - this.windowStart > 86400000) {
        this.requestCount = 0;
        this.windowStart = now;
      }
      return this.requestCount < maxPerDay;
    }

    return true;
  }

  /**
   * Make an API request with retry + exponential backoff.
   */
  async request(endpoint, params = {}, retries = 3) {
    if (!this.canMakeRequest()) {
      logger.warn('Rate limit reached, skipping request', {
        source: this.sourceId,
        endpoint,
      });
      return null;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.client.get(endpoint, { params });
        this.requestCount++;
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        logger.warn(`Request failed (attempt ${attempt}/${retries})`, {
          source: this.sourceId,
          endpoint,
          status,
          message: error.message,
        });

        if (status === 401 || status === 403) {
          logger.error('Authentication failed — check API key', { source: this.sourceId });
          return null;
        }

        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    return null;
  }

  /**
   * Write raw output JSON for a given sport to .raw/{source}/{sport}.json
   */
  async writeRawOutput(sport, entries, type = 'live') {
    const outputDir = path.join(RAW_DIR, this.sourceId);
    await fs.mkdir(outputDir, { recursive: true });

    const data = {
      source: this.sourceId,
      sport,
      fetchedAt: new Date().toISOString(),
      type,
      entries,
    };

    const filePath = path.join(outputDir, `${sport}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    logger.info(`Wrote ${entries.length} entries`, { source: this.sourceId, sport });
    return filePath;
  }

  /**
   * Subclasses must implement: fetch odds for a single sport.
   * Should return an array of { name, nameNormalized, odds, bookmaker, market } entries.
   */
  async fetchSport(sportId, sportMapping) {
    throw new Error(`fetchSport() not implemented for ${this.sourceId}`);
  }

  /**
   * Fetch all configured sports and write raw output.
   */
  async fetchAll(sportsMapping) {
    const results = {};
    for (const [sportId, mapping] of Object.entries(sportsMapping)) {
      try {
        const entries = await this.fetchSport(sportId, mapping);
        if (entries && entries.length > 0) {
          await this.writeRawOutput(sportId, entries);
          results[sportId] = entries.length;
        }
      } catch (error) {
        logger.error(`Failed to fetch ${sportId}`, {
          source: this.sourceId,
          error: error.message,
        });
      }
    }
    return results;
  }
}

/**
 * Normalize a name to lowercase alphanumeric for matching.
 */
export function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
