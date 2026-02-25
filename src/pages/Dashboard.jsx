import { useState, useMemo } from 'react';
import ADPTable from '../components/board/ADPTable';
import PlayerCard from '../components/cards/PlayerCard';
import SportFilter from '../components/filters/SportFilter';
import SearchBar from '../components/filters/SearchBar';
import ScoringToggle from '../components/filters/ScoringToggle';

export default function Dashboard({ boardEntries, loading, lastUpdated, onToggleDraft, onRefresh }) {
  const [sportFilter, setSportFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [showDrafted, setShowDrafted] = useState(true);

  const filtered = useMemo(() => {
    let items = boardEntries;
    if (sportFilter) items = items.filter((e) => e.sport === sportFilter);
    if (!showDrafted) items = items.filter((e) => !e.drafted);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((e) => e.name.toLowerCase().includes(q));
    }
    return items;
  }, [boardEntries, sportFilter, search, showDrafted]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ADP Board</h1>
          <p className="text-xs text-gray-500">
            {boardEntries.length} entries across 20 sports
            {lastUpdated && ` \u00B7 Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchBar value={search} onChange={setSearch} />
        <ScoringToggle showDrafted={showDrafted} onToggle={setShowDrafted} />
      </div>

      <SportFilter selected={sportFilter} onChange={setSportFilter} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <ADPTable entries={filtered} onToggleDraft={onToggleDraft} />
          </div>
          {/* Mobile cards */}
          <div className="md:hidden grid gap-3 grid-cols-1 sm:grid-cols-2">
            {filtered.map((entry) => (
              <PlayerCard key={entry.id} entry={entry} onToggleDraft={onToggleDraft} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
