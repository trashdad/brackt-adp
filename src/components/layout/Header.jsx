import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';

export default function Header() {
  return (
    <header className="bg-snes-dark border-b-4 border-black shadow-[inset_0_4px_0_0_#A18FD1]">
      <ScraperControlBar />
      <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="font-retro text-lg tracking-widest text-white drop-shadow-[2px_2px_0_#000]">
          BRACKT_ADP
        </Link>
        <nav className="flex gap-6 font-retro text-[10px] text-snes-lavender">
          <Link to="/" className="hover:text-white hover:underline transition">BOARD</Link>
          <Link to="/settings" className="hover:text-white hover:underline transition">CONFIG</Link>
        </nav>
      </div>
    </header>
  );
}
