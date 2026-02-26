import SPORTS, { SPORT_COLORS } from '../../data/sports';

export default function SportFilter({ selected = [], onChange }) {
  const activeSports = SPORTS.filter((s) => s.active);

  const toggleSport = (sportId) => {
    if (selected.includes(sportId)) {
      onChange(selected.filter(id => id !== sportId));
    } else {
      onChange([...selected, sportId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => onChange([])}
        className={`px-5 py-2.5 border-2 transition-all font-retro text-[8px] tracking-widest active:translate-y-0.5 ${
          selected.length === 0
            ? 'bg-retro-cyan text-black border-black shadow-[0_4px_0_0_#00A3A8,inset_2px_2px_0_rgba(255,255,255,0.5)]'
            : 'bg-retro-panel text-retro-light/60 border-black/40 hover:border-retro-cyan/50 shadow-[0_2px_0_0_#000]'
        }`}
      >
        [ MASTER_LIST ]
      </button>
      {activeSports.map((sport) => {
        const isActive = selected.includes(sport.id);
        const sportColor = SPORT_COLORS[sport.id] || '#888';
        return (
          <button
            key={sport.id}
            onClick={() => toggleSport(sport.id)}
            className={`px-5 py-2.5 border-2 transition-all font-retro text-[8px] tracking-tight active:translate-y-0.5 ${
              isActive
                ? 'text-white border-black shadow-[0_4px_0_0_#000,inset_2px_2px_0_rgba(255,255,255,0.3)]'
                : 'bg-retro-panel text-retro-light/60 border-black/40 hover:border-white/20 shadow-[0_2px_0_0_#000]'
            }`}
            style={isActive ? { backgroundColor: sportColor } : undefined}
          >
            <span className="flex items-center gap-2">
              <span className="opacity-80">{sport.icon}</span>
              {sport.name.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
