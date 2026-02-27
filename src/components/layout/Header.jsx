import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ onExport, onImportClick, importStatus }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-gradient-to-b from-retro-magenta to-retro-purple border-b-2 border-black shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)] relative z-20">
      <ScraperControlBar />
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
              disabled={importStatus === 'loading'}
              className="font-retro text-[11px] px-4 py-2 bg-white/10 text-retro-gold border border-retro-gold/30 hover:bg-white/20 transition-all active:translate-y-0.5 disabled:opacity-50 uppercase tracking-wider"
            >
              IMPORT
            </button>
          </div>
          <nav className="flex gap-10 font-retro text-[12px] tracking-widest uppercase">
            <Link to="/" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-8 decoration-2 transition-all">SYSTEM_BOARD</Link>
            <Link to="/settings" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-8 decoration-2 transition-all">TERMINAL_CFG</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
