import { NavLink } from 'react-router-dom';
import SPORTS, { SPORT_COLORS } from '../../data/sports';
import { useScraper } from '../../context/ScraperContext';

export default function Sidebar() {
  const { logs } = useScraper();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Sports
        </h3>
        <nav className="space-y-0.5">
          {SPORTS.filter((s) => s.active).map((sport) => (
            <NavLink
              key={sport.id}
              to={`/sport/${sport.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: SPORT_COLORS[sport.id] || '#888' }}
              />
              {sport.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Scraper Log Pane */}
      <div className="border-t border-gray-200 bg-gray-50 flex flex-col h-64">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-100 flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
            Scraper Logs
          </h3>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-400 italic text-center py-4">No active logs</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="leading-tight border-b border-gray-100 pb-1 last:border-0">
                <span className="text-gray-400 mr-1">[{log.timestamp}]</span>
                <span className={
                  log.type === 'error' ? 'text-red-600 font-bold' :
                  log.type === 'warn' ? 'text-amber-600' :
                  log.type === 'success' ? 'text-green-600' :
                  'text-gray-700'
                }>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
