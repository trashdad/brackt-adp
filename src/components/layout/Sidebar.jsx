import { NavLink } from 'react-router-dom';
import SPORTS, { SPORT_COLORS } from '../../data/sports';
import { useScraper } from '../../context/ScraperContext';

export default function Sidebar() {
  const { logs } = useScraper();

  return (
    <aside className="w-60 shrink-0 bg-retro-panel border-r-2 border-black flex flex-col hidden lg:flex shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
      <div className="flex-1 px-5 py-8 overflow-y-auto">
        <h3 className="px-1 text-[9px] font-retro text-retro-cyan uppercase tracking-widest mb-6 border-b border-white/10 pb-2">
          _NAVIGATION_
        </h3>
        <nav className="space-y-3">
          {SPORTS.filter((s) => s.active).map((sport) => (
            <NavLink
              key={sport.id}
              to={`/sport/${sport.id}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 border-2 transition-all font-retro text-[8px] tracking-tighter group ${
                  isActive
                    ? 'bg-gradient-to-r from-retro-purple to-retro-magenta text-white border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.2)]'
                    : 'text-retro-light/60 border-transparent hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span
                className="w-2.5 h-2.5 border border-black shrink-0 group-hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: SPORT_COLORS[sport.id] || '#888',
                  boxShadow: '1px 1px 0 rgba(0,0,0,0.5)'
                }}
              />
              {sport.name.toUpperCase()}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Scraper Log Pane */}
      <div className="border-t-2 border-black bg-[#0a0a14] flex flex-col h-80">
        <div className="px-4 py-3 border-b border-white/5 bg-[#0f0f1b] flex items-center justify-between">
          <h3 className="text-[8px] font-retro text-retro-purple uppercase tracking-widest">
            _KERNEL_OUTPUT
          </h3>
          <div className="w-2 h-2 bg-retro-lime animate-pulse border border-black shadow-[0_0_5px_#39FF14]" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-pixel text-[10px] space-y-2.5">
          {logs.length === 0 ? (
            <div className="text-white/20 italic text-center py-10 font-retro text-[7px] tracking-widest opacity-50">STBY_MODE...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="leading-relaxed border-b border-white/5 pb-2.5 last:border-0">
                <span className="text-white/30 mr-2 text-[8px]">[{log.timestamp}]</span>
                <span className={
                  log.type === 'error' ? 'text-retro-red font-bold' :
                  log.type === 'warn' ? 'text-retro-gold' :
                  log.type === 'success' ? 'text-retro-lime' :
                  'text-retro-cyan'
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
