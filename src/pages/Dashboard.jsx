import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ADPTable from '../components/board/ADPTable';
import PlayerCard from '../components/cards/PlayerCard';
import SportFilter from '../components/filters/SportFilter';
import SearchBar from '../components/filters/SearchBar';
import ScoringToggle from '../components/filters/ScoringToggle';
import useSorting from '../hooks/useSorting';

const MOBILE_SORT_OPTIONS = [
  { label: 'DPS', key: 'adpScore', defaultDir: 'desc' },
  { label: 'RANK', key: 'adpRank', defaultDir: 'asc' },
  { label: 'NAME', key: 'name', defaultDir: 'asc' },
  { label: 'WIN %', key: 'ev.winProbability', defaultDir: 'desc' },
  { label: 'ODDS', key: 'odds', defaultDir: 'desc' },
  { label: 'SEASON EV', key: 'ev.seasonTotal', defaultDir: 'desc' },
  { label: 'SPORT', key: 'sportName', defaultDir: 'asc' },
];

export default function Dashboard({ boardEntries, ikynEVMap = {}, loading, lastUpdated, onToggleDraft, onRefresh, scarcityModifier, onScarcityChange }) {
  const [sportFilter, setSportFilter] = useState([]);
  const [search, setSearch] = useState('');
  const [showDrafted, setShowDrafted] = useState(false);

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

  const totalIkynEV = useMemo(
    () => Object.values(ikynEVMap).reduce((s, v) => s + (v?.ev ?? 0), 0),
    [ikynEVMap]
  );

  const totalWaEV = useMemo(
    () => Object.values(ikynEVMap).reduce((s, v) => s + (v?.waEV ?? 0), 0),
    [ikynEVMap]
  );

  const totalWizardEV = useMemo(
    () => Object.values(ikynEVMap).reduce((s, v) => s + (v?.wizardEV ?? 0), 0),
    [ikynEVMap]
  );

  // Enrich filtered entries with ikynEV + waEV + wizardEV + pos breakdown before passing down
  const enrichedFiltered = useMemo(
    () => filtered.map(e => {
      const d = ikynEVMap[e.id];
      return { ...e, ikynEV: d?.ev ?? null, waEV: d?.waEV ?? null, wizardEV: d?.wizardEV ?? null, ikynDetail: d ?? null };
    }),
    [filtered, ikynEVMap]
  );

  const { sorted: mobileSorted, sortKey: mobileSortKey, sortDir: mobileSortDir, toggleSort: mobileToggleSort } = useSorting(filtered, 'adpScore', 'desc');

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
          <Link
            to="/draft"
            className="font-retro text-[11px] px-4 py-2 bg-white/5 text-retro-gold border border-retro-gold/30 hover:bg-white/10 transition-all active:translate-y-0.5 uppercase tracking-wider"
          >
            DRAFT
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
        <div className="h-6 w-px bg-white/5 hidden lg:block" />
        <div className="flex items-center gap-3">
          <label className="font-retro text-[11px] text-retro-light/50 uppercase tracking-widest whitespace-nowrap">
            SCARCITY_MOD
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
            className="w-20 px-2 py-1 bg-black/40 border border-white/10 font-mono text-[13px] text-retro-cyan text-center tabular-nums focus:outline-none focus:border-retro-cyan/50"
          />
        </div>
        <div className="h-6 w-px bg-white/5 hidden lg:block" />
        <div className="flex flex-col justify-center px-3 py-1 border border-retro-lime/20 bg-black/20 min-w-[140px]">
          <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase leading-none mb-0.5">
            TOTAL_IKYN_EV
          </span>
          <span className="font-mono text-[15px] font-bold text-retro-lime tabular-nums leading-none">
            {totalIkynEV > 0 ? totalIkynEV.toFixed(1) : '—'}
          </span>
          <span className="font-mono text-[8px] text-retro-light/20 leading-none mt-0.5">
            / 6800 max
          </span>
        </div>
        <div className="flex flex-col justify-center px-3 py-1 border border-retro-cyan/20 bg-black/20 min-w-[140px]">
          <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase leading-none mb-0.5">
            TOTAL_WA_EV
          </span>
          <span className="font-mono text-[15px] font-bold text-retro-cyan tabular-nums leading-none">
            {totalWaEV > 0 ? totalWaEV.toFixed(1) : '—'}
          </span>
          <span className="font-mono text-[8px] text-retro-light/20 leading-none mt-0.5">
            / 6800 · α calibrated
          </span>
        </div>
        <div className="flex flex-col justify-center px-3 py-1 border border-retro-purple/30 bg-black/20 min-w-[140px]">
          <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase leading-none mb-0.5">
            TOTAL_WIZARD_EV
          </span>
          <span className="font-mono text-[15px] font-bold text-retro-purple tabular-nums leading-none">
            {totalWizardEV > 0 ? totalWizardEV.toFixed(1) : '—'}
          </span>
          <span className="font-mono text-[8px] text-retro-light/20 leading-none mt-0.5">
            ikyn∣wa per sport
          </span>
        </div>
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
            <ADPTable entries={enrichedFiltered} onToggleDraft={onToggleDraft} />
          </div>
          {/* Mobile sort + cards */}
          <div className="md:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {MOBILE_SORT_OPTIONS.map((opt) => {
                const isActive = mobileSortKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => mobileToggleSort(opt.key)}
                    className={`shrink-0 font-retro text-[9px] px-3 py-1.5 border uppercase tracking-wider transition-all active:translate-y-0.5 ${
                      isActive
                        ? 'bg-retro-cyan/20 text-retro-cyan border-retro-cyan/40'
                        : 'bg-white/5 text-retro-light/50 border-white/10'
                    }`}
                  >
                    {opt.label}{isActive ? (mobileSortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {mobileSorted.map((entry) => (
                <PlayerCard key={entry.id} entry={entry} onToggleDraft={onToggleDraft} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
