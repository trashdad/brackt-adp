import { NavLink } from 'react-router-dom';
import SPORTS, { SPORT_COLORS } from '../../data/sports';

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
      <div className="px-3 py-4">
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
    </aside>
  );
}
