import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import ADPTable from '../components/board/ADPTable';
import PlayerCard from '../components/cards/PlayerCard';
import SportFilter from '../components/filters/SportFilter';
import SearchBar from '../components/filters/SearchBar';
import ScoringToggle from '../components/filters/ScoringToggle';
import { exportBoard, importBoard } from '../utils/csvManager';

export default function Dashboard({ boardEntries, loading, lastUpdated, onToggleDraft, onRefresh }) {
  const [sportFilter, setSportFilter] = useState([]);
  const [search, setSearch] = useState('');
  const [showDrafted, setShowDrafted] = useState(true);
  const [importStatus, setImportStatus] = useState(null); // null | 'loading' | 'ok' | 'error'
  const fileInputRef = useRef(null);

  const handleExport = () => exportBoard(boardEntries);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportStatus('loading');
    try {
      const { manualCount, draftedCount } = await importBoard(file);
      setImportStatus(`ok:${manualCount}:${draftedCount}`);
      onRefresh();
      setTimeout(() => setImportStatus(null), 4000);
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

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
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Import status feedback */}
          {importStatus && (
            <span className={`font-retro text-[7px] tracking-widest px-3 py-2 border ${
              importStatus === 'loading' ? 'text-retro-gold border-retro-gold/40' :
              importStatus === 'error' ? 'text-retro-red border-retro-red/40' :
              'text-retro-lime border-retro-lime/40'
            }`}>
              {importStatus === 'loading' ? 'LOADING...' :
               importStatus === 'error' ? 'IMPORT_ERR' :
               (() => { const [,m,d] = importStatus.split(':'); return `RESTORED: ${m}_ODDS / ${d}_DRAFTED`; })()}
            </span>
          )}

          {/* Hidden file input for CSV import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />

          <button
            onClick={handleExport}
            className="font-retro text-[8px] px-4 py-3 bg-white/10 text-retro-lime border border-retro-lime/30 shadow-[0_0_8px_rgba(0,255,100,0.15)] hover:bg-white/20 transition-all active:translate-y-0.5"
          >
            [ CSV_OUT ]
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus === 'loading'}
            className="font-retro text-[8px] px-4 py-3 bg-white/10 text-retro-gold border border-retro-gold/30 shadow-[0_0_8px_rgba(255,200,0,0.15)] hover:bg-white/20 transition-all active:translate-y-0.5 disabled:opacity-50"
          >
            [ CSV_IN ]
          </button>
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
