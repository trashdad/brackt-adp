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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 snes-panel bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black/40">
        <div>
          <h1 className="font-retro text-[11px] text-retro-cyan drop-shadow-[1px_1px_0_#000] tracking-widest">_ADP_DATABASE</h1>
          <p className="font-pixel text-[10px] text-retro-light/40 mt-1.5 tracking-[0.1em]">
            {boardEntries.length} RECORDS // {lastUpdated ? lastUpdated.toLocaleTimeString() : 'OFFLINE'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Import status feedback */}
          {importStatus && (
            <span className={`font-pixel text-[9px] tracking-wider px-2 py-1 border ${
              importStatus === 'loading' ? 'text-retro-gold border-retro-gold/40' :
              importStatus === 'error' ? 'text-retro-red border-retro-red/40' :
              'text-retro-lime border-retro-lime/40'
            }`}>
              {importStatus === 'loading' ? 'LOADING...' :
               importStatus === 'error' ? 'IMPORT_ERR' :
               (() => { const [,m,d] = importStatus.split(':'); return `OK: ${m} ODDS / ${d} DRAFTED`; })()}
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
            className="font-pixel text-[10px] px-3 py-1.5 bg-white/10 text-retro-lime border border-retro-lime/30 shadow-[0_0_6px_rgba(0,255,100,0.12)] hover:bg-white/20 transition-all active:translate-y-0.5"
          >
            CSV_OUT
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus === 'loading'}
            className="font-pixel text-[10px] px-3 py-1.5 bg-white/10 text-retro-gold border border-retro-gold/30 shadow-[0_0_6px_rgba(255,200,0,0.12)] hover:bg-white/20 transition-all active:translate-y-0.5 disabled:opacity-50"
          >
            CSV_IN
          </button>
          <Link
            to="/parse"
            className="font-pixel text-[10px] px-3 py-1.5 bg-white/10 text-retro-cyan border border-retro-cyan/30 shadow-[0_0_6px_rgba(0,245,255,0.12)] hover:bg-white/20 transition-all active:translate-y-0.5"
          >
            PARSE_IMG
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="font-pixel text-[10px] px-4 py-1.5 bg-gradient-to-br from-retro-purple to-retro-magenta text-white border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.15)] hover:brightness-110 transition-all active:translate-y-0.5 disabled:opacity-50"
          >
            {loading ? 'SYNCING...' : 'SYNC_NODE'}
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
