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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange([])}
        className={`px-4 py-2 border-2 transition-all font-retro text-[9px] tracking-tight active:translate-y-0.5 ${
          selected.length === 0
            ? 'bg-snes-blue text-white border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4)]'
            : 'bg-snes-light text-gray-700 border-black/20 hover:border-black shadow-[inset_2px_2px_0_0_#f0f0f0,inset_-2px_-2px_0_0_#808080]'
        }`}
      >
        [ALL]
      </button>
      {activeSports.map((sport) => {
        const isActive = selected.includes(sport.id);
        return (
          <button
            key={sport.id}
            onClick={() => toggleSport(sport.id)}
            className={`px-4 py-2 border-2 transition-all font-retro text-[9px] tracking-tighter active:translate-y-0.5 ${
              isActive
                ? 'text-white border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4)]'
                : 'bg-snes-light text-gray-700 border-black/20 hover:border-black shadow-[inset_2px_2px_0_0_#f0f0f0,inset_-2px_-2px_0_0_#808080]'
            }`}
            style={isActive ? { backgroundColor: SPORT_COLORS[sport.id] || '#888' } : undefined}
          >
            {sport.icon} {sport.name.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
