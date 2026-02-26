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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 snes-panel bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <div>
          <h1 className="text-2xl font-retro text-retro-cyan drop-shadow-[2px_2px_0_#000] tracking-widest">_ADP_DATABASE</h1>
          <p className="font-retro text-[7px] text-retro-light/40 mt-3 tracking-widest leading-relaxed">
            {boardEntries.length} RECORDS_FOUND // LAST_LINK: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'OFFLINE'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/parse"
            className="font-retro text-[8px] px-5 py-3 bg-white/10 text-retro-cyan border-2 border-retro-cyan/30 shadow-[0_0_10px_rgba(0,245,255,0.2)] hover:bg-white/20 transition-all active:translate-y-0.5"
          >
            [ PARSE_IMG ]
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="font-retro text-[8px] px-5 py-3 bg-gradient-to-br from-retro-purple to-retro-magenta text-white border-2 border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.2),0_4px_0_0_#000] hover:brightness-110 transition-all active:translate-y-1 disabled:opacity-50"
          >
            {loading ? 'SYNCING...' : 'SYNC_NODE'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center bg-black/20 p-4 border border-white/5 shadow-inner">
        <SearchBar value={search} onChange={setSearch} />
        <div className="h-8 w-px bg-white/5 hidden lg:block mx-2" />
        <ScoringToggle showDrafted={showDrafted} onToggle={setShowDrafted} />
      </div>

      <div className="py-2 overflow-x-auto no-scrollbar">
        <SportFilter selected={sportFilter} onChange={setSportFilter} />
      </div>

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
