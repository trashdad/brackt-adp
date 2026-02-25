import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../utils/storage';

export default function Settings({ onResetDraft }) {
  const [settings, setSettings] = useState(() => loadSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            The Odds API Key
          </label>
          <input
            type="text"
            value={settings.apiKey}
            onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
            placeholder="Enter your API key..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Get a free key at{' '}
            <span className="text-brand-600">the-odds-api.com</span>.
            Without a key, mock data will be used.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cache Duration (hours)
          </label>
          <input
            type="number"
            min="1"
            max="168"
            value={settings.refreshInterval}
            onChange={(e) =>
              setSettings((s) => ({ ...s, refreshInterval: parseInt(e.target.value, 10) || 24 }))
            }
            className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 transition"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        <p className="text-xs text-gray-500">
          Reset all draft selections. This cannot be undone.
        </p>
        <button
          onClick={onResetDraft}
          className="px-4 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition"
        >
          Reset Draft
        </button>
      </div>
    </div>
  );
}
