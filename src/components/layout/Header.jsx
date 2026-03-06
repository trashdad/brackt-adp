import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';
import { useTheme } from '../../context/ThemeContext';
import { useLock } from '../../context/LockContext';
import { useDungeonGate } from '../../context/DungeonGateContext';

// Theme colors for mouth cycling
const MOUTH_COLORS = ['#FF2D55', '#FF9F0A', '#39FF14', '#00C7FF', '#BF5AF2'];

// Pixel-art robot head — toggles the dev panel (scraper bar + kernel log)
function RobotIcon({ active }) {
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (active) {
      // 6 frames: 5 color frames + 1 "off" frame
      intervalRef.current = setInterval(() => setFrame((f) => (f + 1) % 6), 300);
    } else {
      clearInterval(intervalRef.current);
      setFrame(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const isOff = frame === 5; // brief blackout frame
  const eyeColor = active ? (isOff ? '#220000' : '#FF3030') : '#444';
  const m1 = active ? (isOff ? '#0a0a14' : MOUTH_COLORS[frame % 5]) : '#0a0a14';
  const m2 = active ? (isOff ? '#0a0a14' : MOUTH_COLORS[(frame + 2) % 5]) : '#0a0a14';
  const m3 = active ? (isOff ? '#0a0a14' : MOUTH_COLORS[(frame + 4) % 5]) : '#0a0a14';

  return (
    <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <rect x="7" y="0" width="2" height="2" fill="currentColor"/>
      <rect x="6" y="2" width="4" height="1" fill="currentColor"/>
      {/* Head */}
      <rect x="1" y="3" width="14" height="11" fill="currentColor"/>
      {/* Eye sockets */}
      <rect x="3" y="5" width="4" height="3" fill="#0a0a14"/>
      <rect x="9" y="5" width="4" height="3" fill="#0a0a14"/>
      {/* Pupils */}
      <rect x="4" y="6" width="2" height="1" fill={eyeColor}/>
      <rect x="10" y="6" width="2" height="1" fill={eyeColor}/>
      {/* Mouth dots */}
      <rect x="3"  y="11" width="2" height="1" fill={m1}/>
      <rect x="7"  y="11" width="2" height="1" fill={m2}/>
      <rect x="11" y="11" width="2" height="1" fill={m3}/>
      {/* Ear bolts */}
      <rect x="0" y="6" width="1" height="4" fill="currentColor"/>
      <rect x="15" y="6" width="1" height="4" fill="currentColor"/>
    </svg>
  );
}

// Pixel-art gear icon — opens the settings popover
function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Outer teeth */}
      <rect x="6" y="0" width="4" height="2"/>
      <rect x="6" y="14" width="4" height="2"/>
      <rect x="0" y="6" width="2" height="4"/>
      <rect x="14" y="6" width="2" height="4"/>
      {/* Diagonal teeth */}
      <rect x="2" y="2" width="3" height="2"/>
      <rect x="11" y="2" width="3" height="2"/>
      <rect x="2" y="12" width="3" height="2"/>
      <rect x="11" y="12" width="3" height="2"/>
      {/* Body ring */}
      <rect x="4" y="3" width="8" height="10"/>
      {/* Center hole */}
      <rect x="6" y="5" width="4" height="6" fill="#0a0a14"/>
      <rect x="5" y="6" width="6" height="4" fill="#0a0a14"/>
      {/* Center dot */}
      <rect x="7" y="7" width="2" height="2" fill="currentColor"/>
    </svg>
  );
}

// Wizard icon — embedded GIF
function WizardIcon({ unlocked }) {
  return (
    <img
      src="/wizard.gif"
      alt="wizard"
      className="w-8 h-8 object-contain"
      style={{ imageRendering: 'pixelated', filter: unlocked ? 'drop-shadow(0 0 4px #39FF14)' : 'none' }}
    />
  );
}

export default function Header({ onExport, onImportClick, importStatus, leagueSize, onLeagueSizeChange }) {
  const { theme, setTheme } = useTheme();
  const { isUnlocked, showDevPanel, toggleDevPanel, handleWizardClick, wizardClicks } = useLock();
  const { userName, reopenGate } = useDungeonGate();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  return (
    <header className="bg-gradient-to-b from-retro-magenta to-retro-purple border-b-2 border-black shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)] relative z-20">
      {showDevPanel && <ScraperControlBar />}
      <div className="max-w-screen-2xl mx-auto px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-retro text-[22px] tracking-[0.15em] text-white drop-shadow-[3px_3px_0_#000] hover:text-retro-cyan transition-all uppercase">
            BRACKT_ADP_16BIT
          </Link>

          <div className="flex items-center gap-3 px-4 border-l border-white/10">
            {/* Win95 Logo Button */}
            <button
              onClick={() => setTheme('win95')}
              className={`w-8 h-8 flex items-center justify-center transition-transform active:scale-95 ${theme === 'win95' ? 'ring-2 ring-white/50' : 'opacity-70 hover:opacity-100'}`}
              title="Switch to Windows 95 Theme"
            >
              <svg viewBox="0 0 16 16" className="w-6 h-6">
                <path fill="#f34b1d" d="M0 1v6.5l7-1V0z" />
                <path fill="#7db300" d="M8 0v5.5l7 1V1z" />
                <path fill="#00a1f1" d="M0 8.5V15l7-1.5V7.5z" />
                <path fill="#ffba00" d="M8 7.5v6l7 1.5V8.5z" />
              </svg>
            </button>

            {/* SNES Controller Button */}
            <button
              onClick={() => setTheme('snes')}
              className={`w-8 h-8 flex items-center justify-center transition-transform active:scale-95 ${theme === 'snes' ? 'ring-2 ring-white/50' : 'opacity-70 hover:opacity-100'}`}
              title="Switch to SNES Theme"
            >
              <svg viewBox="0 0 100 40" className="w-10 h-10">
                <rect x="10" y="5" width="80" height="30" rx="15" fill="#808080" />
                <circle cx="25" cy="20" r="8" fill="#505050" />
                <rect x="23" y="15" width="4" height="10" fill="#303030" />
                <rect x="20" y="18" width="10" height="4" fill="#303030" />
                <circle cx="70" cy="15" r="4" fill="#9D50BB" />
                <circle cx="80" cy="20" r="4" fill="#9D50BB" />
                <circle cx="70" cy="25" r="4" fill="#6E48AA" />
                <circle cx="60" cy="20" r="4" fill="#6E48AA" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Import status feedback */}
          {importStatus && (
            <span className={`font-mono text-[10px] tracking-wider px-3 py-1.5 border border-dashed animate-pulse ${
              importStatus === 'loading' ? 'text-retro-gold border-retro-gold/40' :
              importStatus === 'error' ? 'text-retro-red border-retro-red/40' :
              'text-retro-lime border-retro-lime/40'
            }`}>
              {importStatus === 'loading' ? 'LOADING...' :
               importStatus === 'error' ? 'IMPORT_ERR' :
               (() => { const [,m,d] = importStatus.split(':'); return `${m} ODDS / ${d} DRAFTED`; })()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="font-retro text-[11px] px-4 py-2 bg-white/10 text-retro-lime border border-retro-lime/30 hover:bg-white/20 transition-all active:translate-y-0.5 uppercase tracking-wider"
            >
              EXPORT
            </button>
            <button
              onClick={onImportClick}
              disabled={!isUnlocked || importStatus === 'loading'}
              className="font-retro text-[11px] px-4 py-2 bg-white/10 text-retro-gold border border-retro-gold/30 hover:bg-white/20 transition-all active:translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              IMPORT
            </button>
          </div>

          {/* System icon cluster: robot (dev panel) + wizard (lock) */}
          <div className="flex items-center gap-3 px-4 border-l border-white/10">
            {/* Robot head — toggles scraper panel + kernel log */}
            <button
              onClick={toggleDevPanel}
              title={showDevPanel ? 'HIDE_DEV_PANEL' : 'SHOW_DEV_PANEL'}
              className={`w-8 h-8 flex items-center justify-center transition-all active:scale-90 rounded-sm ${
                showDevPanel ? 'text-retro-cyan bg-retro-cyan/10 border border-retro-cyan/30' : 'text-white/40 hover:text-white/80'
              }`}
            >
              <RobotIcon active={showDevPanel} />
            </button>

            {/* Gear — league settings popover */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(s => !s)}
                title="LEAGUE_SETTINGS"
                className={`w-8 h-8 flex items-center justify-center transition-all active:scale-90 rounded-sm ${
                  showSettings ? 'text-retro-gold bg-retro-gold/10 border border-retro-gold/30' : 'text-white/40 hover:text-white/80'
                }`}
              >
                <GearIcon />
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-52 snes-panel bg-retro-panel border-2 border-black shadow-[4px_4px_0_#000] z-50 p-4">
                  <label className="font-retro text-[10px] text-retro-light/60 tracking-[0.2em] uppercase block mb-2">
                    LEAGUE_SIZE
                  </label>
                  <select
                    value={leagueSize || 12}
                    onChange={(e) => onLeagueSizeChange?.(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/40 border-2 border-white/10 font-retro text-[13px] text-retro-cyan appearance-none cursor-pointer hover:border-retro-cyan/40 transition-colors"
                  >
                    {[10, 12, 14, 16].map(n => (
                      <option key={n} value={n} className="bg-retro-panel">{n} TEAMS</option>
                    ))}
                  </select>
                  <div className="mt-3 font-mono text-[9px] text-white/30 tracking-wider">
                    AFFECTS REPLACEMENT LEVEL + VOR
                  </div>
                </div>
              )}
            </div>

            {/* Wizard head — 5 clicks to unlock/lock */}
            <div className="relative">
              <button
                onClick={handleWizardClick}
                className={`w-10 h-10 flex items-center justify-center transition-all active:scale-90 rounded-sm ${
                  isUnlocked
                    ? 'text-retro-lime bg-retro-lime/10 border border-retro-lime/30'
                    : wizardClicks > 0
                      ? 'text-retro-gold animate-pulse'
                      : 'text-white/40 hover:text-white/70'
                }`}
              >
                <WizardIcon unlocked={isUnlocked} />
              </button>
              {/* Click progress pips */}
              {wizardClicks > 0 && !isUnlocked && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {[1,2,3,4].map((n) => (
                    <div key={n} className={`w-1 h-1 border border-black ${n <= wizardClicks ? 'bg-retro-gold' : 'bg-white/10'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <nav className="flex gap-10 font-retro text-[12px] tracking-widest uppercase items-center">
            <Link to="/" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-8 decoration-2 transition-all">SYSTEM_BOARD</Link>
            <Link to="/settings" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-8 decoration-2 transition-all">TERMINAL_CFG</Link>
            <button
              onClick={reopenGate}
              className="px-3 py-1.5 bg-white/10 text-retro-light/70 border border-white/20 hover:bg-white/20 hover:text-white transition-all active:translate-y-0.5"
            >
              {userName ? userName.toUpperCase() : 'LOGIN'}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
