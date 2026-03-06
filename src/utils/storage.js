/**
 * storage.js — All persistent data lives on the server (Netlify Blobs).
 * Nothing is written to localStorage, sessionStorage, or any browser cache.
 */

const APP_CONFIG_ENDPOINT = '/api/app-settings';

const CONFIG_DEFAULTS = {
  apiKey: '',
  oddsApiIoKey: '',
  apiSportsKey: '',
  refreshInterval: 24,
  scarcityModifier: 0.5,
  leagueSize: 12,
  theme: 'snes',
};

// ── Server-side app config (settings + scarcity + theme) ────────────────────

/**
 * Fetch the full app config from the server.
 * Returns merged result of server data + defaults for any missing keys.
 */
export async function fetchAppConfig() {
  try {
    const res = await fetch(APP_CONFIG_ENDPOINT);
    if (!res.ok) return { ...CONFIG_DEFAULTS };
    const data = await res.json();
    return { ...CONFIG_DEFAULTS, ...data };
  } catch {
    return { ...CONFIG_DEFAULTS };
  }
}

/**
 * Merge a partial config update into the server-stored config.
 * Uses server-side merge so partial calls don't overwrite unrelated keys.
 */
export async function saveAppConfig(partialConfig) {
  try {
    await fetch(APP_CONFIG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialConfig),
    });
  } catch (err) {
    console.error('[BRACKT] Failed to save app config to server:', err.message);
  }
}

// ── Removed: all localStorage functions ─────────────────────────────────────
// loadSettings / saveSettings             → fetchAppConfig / saveAppConfig
// loadScarcityModifier / saveScarcityModifier → fetchAppConfig / saveAppConfig
// loadSocialScoresCache / saveSocialScoresCache → always fetch /api/social-scores
// loadLocalDraftState / saveLocalDraftState → /api/draft-state (Netlify Blobs)
// loadLocalManualOdds / saveLocalManualOdds → /api/manual-odds (Netlify Blobs)
