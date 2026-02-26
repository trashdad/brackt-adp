import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ADPTable from '../components/board/ADPTable';
import PlayerCard from '../components/cards/PlayerCard';
import SportFilter from '../components/filters/SportFilter';
import SearchBar from '../components/filters/SearchBar';
import ScoringToggle from '../components/filters/ScoringToggle';

export default function Dashboard({ boardEntries, loading, lastUpdated, onToggleDraft, onRefresh }) {
  const [sportFilter, setSportFilter] = useState([]);
  const [search, setSearch] = useState('');
  const [showDrafted, setShowDrafted] = useState(true);

  const filtered = useMemo(() => {
    let items = boardEntries;
    if (sportFilter.length > 0) items = items.filter((e) => sportFilter.includes(e.sport));
    if (!showDrafted) items = items.filter((e) => !e.drafted);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((e) => e.name.toLowerCase().includes(q));
    }
    return items;
  }, [boardEntries, sportFilter, search, showDrafted]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 snes-panel bg-snes-lavender/10 border-black">
        <div>
          <h1 className="text-xl font-retro text-snes-blue drop-shadow-[1px_1px_0_#fff]">ADP_BOARD</h1>
          <p className="font-retro text-[8px] text-gray-500 mt-2">
            {boardEntries.length} ENTRIES_IN_DATABASE
            {lastUpdated && ` \u00B7 LAST_SYNC: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/parse"
            className="font-retro text-[9px] px-3 py-2 bg-white text-snes-blue border-4 border-black shadow-[inset_-2px_-2px_0_0_#ccc] hover:bg-gray-100 transition-all active:translate-y-0.5"
          >
            PARSE_DATA
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="font-retro text-[9px] px-3 py-2 bg-snes-purple text-white border-4 border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4)] hover:bg-snes-lavender transition-all active:translate-y-0.5 disabled:opacity-50"
          >
            {loading ? 'BUSY...' : 'SYNC'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-black/5 p-3 border-2 border-black/10">
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
