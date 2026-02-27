const SETTINGS_KEY = 'brackt_settings';
const DRAFT_KEY = 'brackt_draft_state_local';
const MANUAL_ODDS_KEY = 'brackt_manual_odds_local';
const SCARCITY_KEY = 'brackt_scarcity_modifier';
const SOCIAL_CACHE_KEY = 'brackt_social_scores_cache';

// Settings remain local-only (API keys are per-user credentials, not shared)
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      apiKey: '',
      oddsApiIoKey: '',
      apiSportsKey: '',
      refreshInterval: 24,
    };
  } catch {
    return {
      apiKey: '',
      oddsApiIoKey: '',
      apiSportsKey: '',
      refreshInterval: 24,
    };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.error('[BRACKT] localStorage full — settings not saved');
    }
  }
}

// ── Scarcity Modifier ────────────────────────────────────────────────────────

export function loadScarcityModifier() {
  try {
    const val = localStorage.getItem(SCARCITY_KEY);
    return val !== null ? parseFloat(val) : 0.5;
  } catch {
    return 0.5;
  }
}

export function saveScarcityModifier(val) {
  try {
    localStorage.setItem(SCARCITY_KEY, String(val));
  } catch {}
}

// ── Social Scores Cache ─────────────────────────────────────────────────────

export function loadSocialScoresCache() {
  try {
    const raw = localStorage.getItem(SOCIAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSocialScoresCache(scores) {
  try {
    localStorage.setItem(SOCIAL_CACHE_KEY, JSON.stringify(scores));
  } catch {}
}

// ── Local Fallback Storage ───────────────────────────────────────────────────

export function loadLocalDraftState() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalDraftState(state) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.error('[BRACKT] localStorage full — draft state not saved');
    }
  }
}

export function loadLocalManualOdds() {
  try {
    const raw = localStorage.getItem(MANUAL_ODDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalManualOdds(odds) {
  try {
    localStorage.setItem(MANUAL_ODDS_KEY, JSON.stringify(odds));
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.error('[BRACKT] localStorage full — manual odds not saved');
    }
  }
}
