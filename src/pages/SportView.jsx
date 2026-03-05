import { useParams, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { getSportById, SPORT_COLORS } from '../data/sports';
import ADPTable from '../components/board/ADPTable';
import SearchBar from '../components/filters/SearchBar';
import ExpertRankings from '../components/board/ExpertRankings';

export default function SportView({ boardEntries, ikynEVMap = {}, onToggleDraft }) {
  const { id } = useParams();
  const sport = getSportById(id);
  const [search, setSearch] = useState('');

  // Entries are pre-enriched with ikynEV/waEV/wizardEV/confidence in App.jsx
  const allSportEntries = useMemo(() =>
    boardEntries.filter((e) => e.sport === id),
    [boardEntries, id]
  );

  const sportIkynEV = useMemo(() =>
    allSportEntries.reduce((s, e) => s + (e.ikynEV ?? 0), 0),
    [allSportEntries]
  );

  const sportWaEV = useMemo(() =>
    allSportEntries.reduce((s, e) => s + (e.waEV ?? 0), 0),
    [allSportEntries]
  );

  const sportWizardEV = useMemo(() =>
    allSportEntries.reduce((s, e) => s + (e.wizardEV ?? 0), 0),
    [allSportEntries]
  );

  // wizardModel is the same for all entries in a sport — read from first entry with detail
  const wizardModel = useMemo(() =>
    allSportEntries.find(e => e.ikynDetail?.wizardModel)?.ikynDetail?.wizardModel ?? null,
    [allSportEntries]
  );

  const entries = useMemo(() => {
    if (!search) return allSportEntries;
    const q = search.toLowerCase();
    return allSportEntries.filter((e) => e.name.toLowerCase().includes(q));
  }, [allSportEntries, search]);

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
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="ml-auto flex gap-3">
          <div className="flex flex-col justify-center px-3 py-1 border border-retro-lime/20 bg-black/20">
            <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase leading-none mb-0.5">
              IKYN_EV
            </span>
            <span className="font-mono text-[15px] font-bold text-retro-lime tabular-nums leading-none">
              {sportIkynEV > 0 ? sportIkynEV.toFixed(1) : '—'}
            </span>
            <span className="font-mono text-[8px] text-retro-light/20 leading-none mt-0.5">
              / 340 max
            </span>
          </div>
          <div className="flex flex-col justify-center px-3 py-1 border border-retro-cyan/20 bg-black/20">
            <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase leading-none mb-0.5">
              WA_EV
            </span>
            <span className="font-mono text-[15px] font-bold text-retro-cyan tabular-nums leading-none">
              {sportWaEV > 0 ? sportWaEV.toFixed(1) : '—'}
            </span>
            <span className="font-mono text-[8px] text-retro-light/20 leading-none mt-0.5">
              / 340 · α calibrated
            </span>
          </div>
          <div className="flex flex-col justify-center px-3 py-1 border border-retro-purple/30 bg-black/20">
            <span className="font-mono text-[8px] text-retro-light/30 tracking-widest uppercase leading-none mb-0.5">
              WIZARD_EV
            </span>
            <span className="font-mono text-[15px] font-bold text-retro-purple tabular-nums leading-none">
              {sportWizardEV > 0 ? sportWizardEV.toFixed(1) : '—'}
            </span>
            <span className="font-mono text-[8px] text-retro-light/20 leading-none mt-0.5">
              {wizardModel === 'ikyn' ? 'PL-MC (fixed field)' : wizardModel === 'wa' ? 'WA (variable field)' : '—'}
            </span>
          </div>
        </div>
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
              <span className="font-mono font-semibold">{(e.ev?.seasonTotal ?? 0).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      <ADPTable entries={entries} onToggleDraft={onToggleDraft} />

      <ExpertRankings entries={entries} sportId={id} />
    </div>
  );
}
