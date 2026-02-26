import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';

export default function Header() {
  return (
    <header className="bg-gradient-to-b from-retro-magenta to-retro-purple border-b-2 border-black shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)] relative z-20">
      <ScraperControlBar />
      <div className="max-w-screen-2xl mx-auto px-8 py-5 flex items-center justify-between">
        <Link to="/" className="font-retro text-[22px] tracking-[0.15em] text-white drop-shadow-[3px_3px_0_#000] hover:text-retro-cyan transition-all uppercase">
          BRACKT_ADP_16BIT
        </Link>
        <nav className="flex gap-10 font-retro text-[12px] tracking-widest uppercase">
          <Link to="/" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-8 decoration-2 transition-all">SYSTEM_BOARD</Link>
          <Link to="/settings" className="text-white/80 hover:text-retro-cyan hover:underline underline-offset-8 decoration-2 transition-all">TERMINAL_CFG</Link>
        </nav>
      </div>
    </header>
  );
}
