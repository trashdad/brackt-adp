import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';

export default function Header({ onExport, onImportClick, importStatus }) {
  return (
    <header className="bg-gradient-to-b from-retro-magenta to-retro-purple border-b-2 border-black shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)] relative z-20">
      <ScraperControlBar />
      <div className="max-w-screen-2xl mx-auto px-8 py-5 flex items-center justify-between">
        <Link to="/" className="font-retro text-[22px] tracking-[0.15em] text-white drop-shadow-[3px_3px_0_#000] hover:text-retro-cyan transition-all uppercase">
          BRACKT_ADP_16BIT
        </Link>
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
