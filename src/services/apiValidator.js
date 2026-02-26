import { loadSettings } from '../utils/storage';

/**
 * Validate The Odds API Key
 */
async function validateTheOddsApi(key) {
  if (!key) return false;
  try {
    const res = await fetch(`https://api.the-odds-api.com/v4/sports?apiKey=${key}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Validate Odds API IO Key
 */
async function validateOddsApiIo(key) {
  if (!key) return false;
  try {
    const res = await fetch(`https://api.odds-api.io/v1/sports?apiKey=${key}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Validate API-Sports Key
 */
async function validateApiSports(key) {
  if (!key) return false;
  try {
    const res = await fetch('https://v3.football.api-sports.io/status', {
      headers: { 'x-apisports-key': key }
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkAllApiKeys() {
  const { apiKey, oddsApiIoKey, apiSportsKey } = loadSettings();
  
  const results = await Promise.all([
    validateTheOddsApi(apiKey),
    validateOddsApiIo(oddsApiIoKey),
    validateApiSports(apiSportsKey)
  ]);

  return {
    'the-odds-api': results[0] ? 'valid' : 'invalid',
    'odds-api-io': results[1] ? 'valid' : 'invalid',
    'api-sports': results[2] ? 'valid' : 'invalid',
  };
}
