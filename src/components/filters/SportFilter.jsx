import SPORTS, { SPORT_COLORS } from '../../data/sports';

export default function SportFilter({ selected, onChange }) {
  const activeSports = SPORTS.filter((s) => s.active);

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
          !selected
            ? 'bg-brand-600 text-white border-brand-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
        }`}
      >
        All
      </button>
      {activeSports.map((sport) => {
        const isActive = selected === sport.id;
        return (
          <button
            key={sport.id}
            onClick={() => onChange(isActive ? null : sport.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              isActive
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
            style={isActive ? { backgroundColor: SPORT_COLORS[sport.id] || '#888' } : undefined}
          >
            {sport.icon} {sport.name}
          </button>
        );
      })}
    </div>
  );
}
