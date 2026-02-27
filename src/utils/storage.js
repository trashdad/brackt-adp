const SETTINGS_KEY = 'brackt_settings';
const DRAFT_KEY = 'brackt_draft_state_local';
const MANUAL_ODDS_KEY = 'brackt_manual_odds_local';

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
