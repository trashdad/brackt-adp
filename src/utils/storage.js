const DRAFT_KEY = 'brackt_draft_state';
const SETTINGS_KEY = 'brackt_settings';
const MANUAL_ODDS_KEY = 'brackt_manual_odds';

export function loadDraftState() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDraftState(state) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // storage full
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { apiKey: '', refreshInterval: 24 };
  } catch {
    return { apiKey: '', refreshInterval: 24 };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage full
  }
}

export function loadManualOdds() {
  try {
    const raw = localStorage.getItem(MANUAL_ODDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualOdds(odds) {
  try {
    localStorage.setItem(MANUAL_ODDS_KEY, JSON.stringify(odds));
  } catch {
    // storage full
  }
}
