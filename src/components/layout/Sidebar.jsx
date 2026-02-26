import { NavLink } from 'react-router-dom';
import SPORTS, { SPORT_COLORS } from '../../data/sports';
import { useScraper } from '../../context/ScraperContext';

export default function Sidebar() {
  const { logs } = useScraper();

  return (
    <aside className="w-56 shrink-0 bg-snes-light border-r-4 border-black flex flex-col hidden lg:flex shadow-[inset_4px_4px_0_0_#f0f0f0,inset_-4px_-4px_0_0_#808080]">
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <h3 className="px-1 text-[10px] font-retro text-snes-blue uppercase tracking-tight mb-4 border-b-2 border-black/10 pb-1">
          _MENU_
        </h3>
        <nav className="space-y-2">
          {SPORTS.filter((s) => s.active).map((sport) => (
            <NavLink
              key={sport.id}
              to={`/sport/${sport.id}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 border-2 border-transparent transition-all font-retro text-[8px] tracking-tighter ${
                  isActive
                    ? 'bg-snes-purple text-white border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.3)]'
                    : 'text-gray-700 hover:bg-black/5 hover:border-black/10'
                }`
              }
            >
              <span
                className="w-3 h-3 border border-black shrink-0"
                style={{ backgroundColor: SPORT_COLORS[sport.id] || '#888' }}
              />
              {sport.name.toUpperCase()}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Scraper Log Pane */}
      <div className="border-t-4 border-black bg-black flex flex-col h-72">
        <div className="px-3 py-2 border-b border-white/10 bg-[#1a1a1a] flex items-center justify-between">
          <h3 className="text-[9px] font-retro text-snes-lavender uppercase tracking-widest">
            LOGS_CMD
          </h3>
          <div className="w-2 h-2 bg-red-600 animate-pulse border border-white/20" />
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-pixel text-[10px] space-y-2">
          {logs.length === 0 ? (
            <div className="text-gray-600 italic text-center py-6 font-retro text-[8px]">IDLE_PROCESS...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="leading-tight border-b border-white/5 pb-2 last:border-0 opacity-90">
                <span className="text-gray-500 mr-2 text-[8px]">[{log.timestamp}]</span>
                <span className={
                  log.type === 'error' ? 'text-red-500 font-bold uppercase' :
                  log.type === 'warn' ? 'text-yellow-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-blue-300'
                }>
                  {log.message.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
