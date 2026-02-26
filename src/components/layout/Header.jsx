import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';

export default function Header() {
  return (
    <header className="bg-gradient-to-b from-retro-magenta to-retro-purple border-b-2 border-black shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)]">
      <ScraperControlBar />
      <div className="max-w-screen-2xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="font-retro text-xl tracking-wider text-white drop-shadow-[2px_2px_0_#000] hover:text-retro-cyan transition-colors">
          BRACKT_ADP_16BIT
        </Link>
        <nav className="flex gap-8 font-retro text-[9px] tracking-tight">
          <Link to="/" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-4 decoration-2 decoration-retro-cyan transition-all">SYSTEM_BOARD</Link>
          <Link to="/settings" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-4 decoration-2 decoration-retro-cyan transition-all">TERMINAL_CFG</Link>
        </nav>
      </div>
    </header>
  );
}
