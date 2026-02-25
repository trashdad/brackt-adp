import { useParams, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { getSportById, SPORT_COLORS } from '../data/sports';
import ADPTable from '../components/board/ADPTable';
import SearchBar from '../components/filters/SearchBar';

export default function SportView({ boardEntries, onToggleDraft }) {
  const { id } = useParams();
  const sport = getSportById(id);
  const [search, setSearch] = useState('');

  const entries = useMemo(() => {
    let items = boardEntries.filter((e) => e.sport === id);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((e) => e.name.toLowerCase().includes(q));
    }
    return items;
  }, [boardEntries, id, search]);

  if (!sport) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Sport not found.</p>
        <Link to="/" className="text-brand-600 text-sm hover:underline">Back to board</Link>
      </div>
    );
  }

  const color = SPORT_COLORS[sport.id] || '#888';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Board</Link>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-white px-3 py-1 rounded text-sm font-medium"
          style={{ backgroundColor: color }}
        >
          {sport.icon} {sport.name}
        </span>
        <span className="text-xs text-gray-500 uppercase">{sport.category} scoring</span>
        {sport.eventsPerSeason > 1 && (
          <span className="text-xs text-gray-400">{sport.eventsPerSeason} events/season</span>
        )}
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Top 10 by Season EV</h3>
        <div className="space-y-1">
          {entries.slice(0, 10).map((e, i) => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {i + 1}. <Link to={`/player/${e.id}`} className="text-gray-800 hover:text-brand-600">{e.name}</Link>
              </span>
              <span className="font-mono font-semibold">{e.ev.seasonTotal.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      <ADPTable entries={entries} onToggleDraft={onToggleDraft} />
    </div>
  );
}
