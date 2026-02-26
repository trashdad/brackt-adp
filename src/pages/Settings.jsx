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
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xl font-retro text-snes-blue drop-shadow-[1px_1px_0_#fff]">SYSTEM_CONFIG</h1>

      <div className="snes-panel p-8 space-y-6">
        <div>
          <label className="block font-retro text-[9px] text-gray-700 mb-2 uppercase">
            API_ACCESS_KEY
          </label>
          <input
            type="text"
            value={settings.apiKey}
            onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
            placeholder="ENTER_KEY..."
            className="w-full px-4 py-3 bg-white border-4 border-black font-retro text-[8px] focus:outline-none focus:ring-4 focus:ring-snes-purple/30 shadow-[inset_2px_2px_0_0_#eee]"
          />
          <p className="font-retro text-[7px] text-gray-400 mt-3 tracking-tighter">
            REGISTER_AT: <span className="text-snes-purple underline">THE-ODDS-API.COM</span>
          </p>
        </div>

        <div>
          <label className="block font-retro text-[9px] text-gray-700 mb-2 uppercase">
            CACHE_TTL (HOURS)
          </label>
          <input
            type="number"
            min="1"
            max="168"
            value={settings.refreshInterval}
            onChange={(e) =>
              setSettings((s) => ({ ...s, refreshInterval: parseInt(e.target.value, 10) || 24 }))
            }
            className="w-24 px-4 py-3 bg-white border-4 border-black font-retro text-[8px] focus:outline-none focus:ring-4 focus:ring-snes-purple/30 shadow-[inset_2px_2px_0_0_#eee]"
          />
        </div>

        <button
          onClick={handleSave}
          className="font-retro text-[10px] px-6 py-4 bg-snes-purple text-white border-4 border-black shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.4),4px_4px_0_0_#000] hover:bg-snes-lavender transition-all active:translate-y-1"
        >
          {saved ? 'SUCCESS!' : 'SAVE_CONFIG'}
        </button>
      </div>

      <div className="bg-red-900 border-4 border-black p-8 shadow-[8px_8px_0_0_#000] space-y-4">
        <h2 className="font-retro text-[10px] text-white tracking-widest uppercase underline decoration-red-500 underline-offset-4">Danger Zone</h2>
        <p className="font-retro text-[7px] text-red-200 leading-relaxed uppercase opacity-80">
          ERASE_ALL_DRAFT_DATA. THIS_PROCESS_IS_IRREVERSIBLE.
        </p>
        <button
          onClick={onResetDraft}
          className="font-retro text-[9px] px-4 py-3 bg-red-600 text-white border-4 border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4)] hover:bg-red-500 transition-all active:translate-y-0.5"
        >
          RESET_DRAFT_MEMORY
        </button>
      </div>
    </div>
  );
}
