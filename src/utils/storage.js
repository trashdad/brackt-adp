const SETTINGS_KEY = 'brackt_settings';

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
  } catch {
    // storage full
  }
}
