import { Link } from 'react-router-dom';
import ScraperControlBar from './ScraperControlBar';

export default function Header() {
  return (
    <header className="bg-brand-800 text-white shadow-md">
      <ScraperControlBar />
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-brand-100">
          Brackt ADP
        </Link>
        <nav className="flex gap-4 text-sm font-medium">
          <Link to="/" className="hover:text-brand-100">Board</Link>
          <Link to="/settings" className="hover:text-brand-100">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
