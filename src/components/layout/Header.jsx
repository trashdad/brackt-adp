import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';

export default function Header() {
  return (
    <header className="bg-gradient-to-b from-retro-magenta to-retro-purple border-b border-black shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.4)]">
      <ScraperControlBar />
      <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-retro text-[10px] tracking-wider text-white drop-shadow-[1px_1px_0_#000] hover:text-retro-cyan transition-colors">
          BRACKT_ADP
        </Link>
        <nav className="flex gap-6 font-pixel text-[11px] tracking-[0.12em]">
          <Link to="/" className="text-white/70 hover:text-retro-cyan transition-colors">SYSTEM_BOARD</Link>
          <Link to="/settings" className="text-white/70 hover:text-retro-cyan transition-colors">TERMINAL_CFG</Link>
        </nav>
      </div>
    </header>
  );
}
