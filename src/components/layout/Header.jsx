import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';
import { useTheme } from '../../context/ThemeContext';
import { useLock } from '../../context/LockContext';
import { useDungeonGate } from '../../context/DungeonGateContext';

// Pixel-art robot head — toggles the dev panel (scraper bar + kernel log)
function RobotIcon({ active }) {
  return (
    <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active && (
        <style>{`
          @keyframes robot-eye-pulse {
            0%,100%  { opacity:1; }
            45%,55%  { opacity:0; }
          }
          @keyframes robot-mouth-cycle {
            0%    { fill:#FF2D55; }
            20%   { fill:#FF9F0A; }
            40%   { fill:#39FF14; }
            60%   { fill:#00C7FF; }
            80%   { fill:#BF5AF2; }
            95%   { fill:#FF2D55; }
            100%  { opacity:0; }
          }
          @keyframes robot-mouth-off {
            0%,80% { opacity:1; }
            85%,100% { opacity:0; }
          }
          .rb-eye  { animation: robot-eye-pulse 1.8s ease-in-out infinite; }
          .rb-m1   { animation: robot-mouth-cycle 1.8s linear infinite, robot-mouth-off 1.8s ease-in-out infinite; }
          .rb-m2   { animation: robot-mouth-cycle 1.8s linear -0.2s infinite, robot-mouth-off 1.8s ease-in-out -0.2s infinite; }
          .rb-m3   { animation: robot-mouth-cycle 1.8s linear -0.4s infinite, robot-mouth-off 1.8s ease-in-out -0.4s infinite; }
        `}</style>
      )}
      {/* Antenna */}
      <rect x="7" y="0" width="2" height="2" fill="currentColor"/>
      <rect x="6" y="2" width="4" height="1" fill="currentColor"/>
      {/* Head */}
      <rect x="1" y="3" width="14" height="11" fill="currentColor"/>
      {/* Eye sockets */}
      <rect x="3" y="5" width="4" height="3" fill="#0a0a14"/>
      <rect x="9" y="5" width="4" height="3" fill="#0a0a14"/>
      {/* Pupils — red + pulsing when active */}
      <rect x="4" y="6" width="2" height="1"
        fill={active ? '#FF3030' : '#444'}
        className={active ? 'rb-eye' : ''}
        style={active ? { filter:'drop-shadow(0 0 2px #FF3030)' } : {}}
      />
      <rect x="10" y="6" width="2" height="1"
        fill={active ? '#FF3030' : '#444'}
        className={active ? 'rb-eye' : ''}
        style={active ? { filter:'drop-shadow(0 0 2px #FF3030)' } : {}}
      />
      {/* Mouth dots — static when inactive, color-cycling when active */}
      <rect x="3"  y="11" width="2" height="1"
        fill={active ? '#FF2D55' : '#0a0a14'}
        className={active ? 'rb-m1' : ''}
      />
      <rect x="7"  y="11" width="2" height="1"
        fill={active ? '#39FF14' : '#0a0a14'}
        className={active ? 'rb-m2' : ''}
      />
      <rect x="11" y="11" width="2" height="1"
        fill={active ? '#00C7FF' : '#0a0a14'}
        className={active ? 'rb-m3' : ''}
      />
      {/* Ear bolts */}
      <rect x="0" y="6" width="1" height="4" fill="currentColor"/>
      <rect x="15" y="6" width="1" height="4" fill="currentColor"/>
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

export default function Header({ onExport, onImportClick, importStatus }) {
  const { theme, setTheme } = useTheme();
  const { isUnlocked, showDevPanel, toggleDevPanel, handleWizardClick, wizardClicks } = useLock();
  const { userName, reopenGate } = useDungeonGate();

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
