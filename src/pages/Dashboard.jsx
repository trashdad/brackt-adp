import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ADPTable from '../components/board/ADPTable';
import PlayerCard from '../components/cards/PlayerCard';
import SportFilter from '../components/filters/SportFilter';
import SearchBar from '../components/filters/SearchBar';
import ScoringToggle from '../components/filters/ScoringToggle';

export default function Dashboard({ boardEntries, loading, lastUpdated, onToggleDraft, onRefresh, scarcityModifier, onScarcityChange }) {
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-4 snes-panel bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black/40 shadow-xl">
        <div>
          <h1 className="font-retro text-[18px] text-retro-cyan drop-shadow-md tracking-widest">_ADP_DATABASE</h1>
          <p className="font-mono text-[11px] text-retro-light/40 mt-2 tracking-widest uppercase">
            {boardEntries.length} RECORDS_LINKED // STATUS: {lastUpdated ? 'ONLINE' : 'OFFLINE'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <Link
            to="/parse"
            className="font-retro text-[11px] px-4 py-2 bg-white/5 text-retro-cyan border border-retro-cyan/30 hover:bg-white/10 transition-all active:translate-y-0.5 uppercase tracking-wider"
          >
            PARSE
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="font-retro text-[11px] px-5 py-2 bg-gradient-to-br from-retro-purple to-retro-magenta text-white border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 transition-all active:translate-y-0.5 disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? 'BUSY...' : 'SYNC'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center bg-black/20 px-3 py-2 border border-white/5">
        <SearchBar value={search} onChange={setSearch} />
        <div className="h-6 w-px bg-white/5 hidden lg:block" />
        <ScoringToggle showDrafted={showDrafted} onToggle={setShowDrafted} />
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <SportFilter selected={sportFilter} onChange={setSportFilter} />
      </div>

      {/* EV Scarcity Modifier */}
      <div className="flex items-center gap-4 px-4 py-3 bg-black/20 border border-white/5">
        <label className="font-retro text-[11px] text-retro-light/60 uppercase tracking-widest whitespace-nowrap">
          EV Scarcity Modifier
        </label>
        <input
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={scarcityModifier}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) onScarcityChange(val);
          }}
          className="w-24 px-3 py-1.5 bg-black/40 border border-white/10 font-mono text-[13px] text-retro-cyan text-center tabular-nums focus:outline-none focus:border-retro-cyan/50"
        />
        <span className="font-mono text-[10px] text-retro-light/30 tracking-wider">
          Controls Draft Priority Score scarcity bonus
        </span>
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
