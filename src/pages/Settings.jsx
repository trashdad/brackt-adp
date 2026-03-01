import { useState, useEffect } from 'react';
import { fetchAppConfig, saveAppConfig } from '../utils/storage';
import { useScraper } from '../context/ScraperContext';

export default function Settings({ onClearAll }) {
  const [settings, setSettings] = useState({
    apiKey: '', oddsApiIoKey: '', apiSportsKey: '', refreshInterval: 24,
  });
  const [saved, setSaved] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wiped, setWiped] = useState(false);
  const { validateKeys } = useScraper();

  useEffect(() => {
    fetchAppConfig().then((cfg) => setSettings((s) => ({ ...s, ...cfg })));
  }, []);

  const handleWipe = async () => {
    if (!confirm('CONFIRM: Erase all draft state and manual odds? This cannot be undone.')) return;
    setWiping(true);
    await onClearAll();
    setWiping(false);
    setWiped(true);
    setTimeout(() => setWiped(false), 3000);
  };

  const handleSave = async () => {
    await saveAppConfig(settings);
    setSaved(true);
    validateKeys();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <h1 className="text-2xl font-retro text-retro-cyan drop-shadow-[2px_2px_0_#000] tracking-[0.2em]">TERMINAL_CONFIG</h1>

      <div className="snes-panel p-10 space-y-8 bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black/60 shadow-2xl">
        <section className="space-y-6">
          <p className="font-mono text-[9px] text-retro-gold/60 tracking-wider leading-relaxed border border-retro-gold/20 bg-retro-gold/5 px-4 py-3">
            API_KEYS_STORED_SERVER_SIDE_VIA_NETLIFY_BLOBS. SHARED_ACROSS_ALL_SESSIONS.
          </p>
          <div>
            <label className="block font-retro text-[11px] text-retro-purple mb-3 uppercase tracking-widest">
              THE_ODDS_API_KEY
            </label>
            <input
              type="text"
              value={settings.apiKey}
              onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder="ENTER_KEY..."
              className="w-full px-5 py-3 bg-black/40 border-2 border-black font-mono text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-retro-purple/30 shadow-inner uppercase"
            />
            <p className="font-mono text-[10px] text-white/30 mt-3 tracking-wider italic">
              REGISTER_AT: <span className="text-retro-purple underline not-italic font-bold">THE-ODDS-API.COM</span>
            </p>
          </div>

          <div>
            <label className="block font-retro text-[11px] text-retro-purple mb-3 uppercase tracking-widest">
              ODDS_API_IO_KEY
            </label>
            <input
              type="text"
              value={settings.oddsApiIoKey || ''}
              onChange={(e) => setSettings((s) => ({ ...s, oddsApiIoKey: e.target.value }))}
              placeholder="ENTER_KEY..."
              className="w-full px-5 py-3 bg-black/40 border-2 border-black font-mono text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-retro-purple/30 shadow-inner uppercase"
            />
            <p className="font-mono text-[10px] text-white/30 mt-3 tracking-wider italic">
              REGISTER_AT: <span className="text-retro-purple underline not-italic font-bold">ODDS-API.IO</span>
            </p>
          </div>

          <div>
            <label className="block font-retro text-[11px] text-retro-purple mb-3 uppercase tracking-widest">
              API_SPORTS_KEY
            </label>
            <input
              type="text"
              value={settings.apiSportsKey || ''}
              onChange={(e) => setSettings((s) => ({ ...s, apiSportsKey: e.target.value }))}
              placeholder="ENTER_KEY..."
              className="w-full px-5 py-3 bg-black/40 border-2 border-black font-mono text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-retro-purple/30 shadow-inner uppercase"
            />
            <p className="font-mono text-[10px] text-white/30 mt-3 tracking-wider italic">
              REGISTER_AT: <span className="text-retro-purple underline not-italic font-bold">DASHBOARD.API-SPORTS.IO</span>
            </p>
          </div>
        </section>

        <div className="pt-4 border-t border-white/5">
          <label className="block font-retro text-[11px] text-retro-light/60 mb-3 uppercase tracking-widest">
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
            className="w-32 px-5 py-3 bg-black/40 border-2 border-black font-mono text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-retro-cyan/30 shadow-inner"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full font-retro text-[13px] px-8 py-4 bg-gradient-to-br from-retro-purple to-retro-magenta text-white border-2 border-black shadow-[0_6px_0_0_#000,inset_2px_2px_0_rgba(255,255,255,0.2)] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none uppercase tracking-[0.2em]"
        >
          {saved ? 'UPDATE_SUCCESSFUL' : 'SAVE_PARAMETERS'}
        </button>
      </div>

      <div className="bg-retro-red/10 border-2 border-retro-red/40 p-10 shadow-2xl space-y-6">
        <h2 className="font-retro text-[14px] text-retro-red tracking-[0.2em] uppercase underline decoration-retro-red decoration-4 underline-offset-8">Danger Zone</h2>
        <p className="font-mono text-[11px] text-retro-red/60 leading-relaxed uppercase tracking-widest font-bold">
          ERASE_ALL_SHARED_DATA: DRAFT_STATE + MANUAL_ODDS + LOCAL_CACHE. IRREVERSIBLE.
        </p>
        <button
          onClick={handleWipe}
          disabled={wiping}
          className="font-retro text-[11px] px-6 py-3 bg-retro-red text-white border-2 border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4),0_4px_0_0_#000] hover:brightness-110 transition-all active:translate-y-0.5 active:shadow-none uppercase tracking-widest disabled:opacity-50"
        >
          {wiping ? 'WIPING...' : wiped ? 'WIPE_COMPLETE' : 'EXECUTE_WIPE'}
        </button>
      </div>
    </div>
  );
}
