import ColumnHeader from './ColumnHeader';
import ADPRow from './ADPRow';
import useSorting from '../../hooks/useSorting';

const COLUMNS = [
  { label: 'Draft Priority Score', key: 'adpScore' },
  { label: 'ikyn_EV', key: 'ikynEV' },
  { label: 'WA_EV', key: 'waEV' },
  { label: 'Wizard_EV', key: 'wizardEV' },
  { label: 'Rank', key: 'adpRank' },
  { label: 'Name', key: 'name' },
  { label: 'Sport', key: 'sportName' },
  { label: 'Win %', key: 'ev.winProbability' },
  { label: 'Odds', key: 'odds' },
  { label: 'Season EV', key: 'ev.seasonTotal' },
  { label: 'Dropoff Velocity', key: 'dropoffVelocity' },
  { label: 'Social', key: 'socialPos' },
  { label: 'Mkt vs Exp', key: 'mktVsExp' },
  { label: 'Adj. SQ', key: 'adjSq' },
  { label: 'Status', key: 'drafted' },
];

export default function ADPTable({ entries, onToggleDraft }) {
  const { sorted, sortKey, sortDir, toggleSort } = useSorting(entries, 'adpScore', 'desc');

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">No entries to display.</p>
    );
  }

  return (
    <div className="overflow-x-auto snes-panel border-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <table className="min-w-full border-collapse">
        <thead className="bg-gradient-to-r from-[#2D2D44] to-[#1A1A2E] text-retro-cyan sticky top-0 border-b-2 border-black z-10">
          <tr>
            {COLUMNS.map((col) => (
              <ColumnHeader
                key={col.key}
                label={col.label.toUpperCase()}
                sortKey={col.key}
                currentSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody className="bg-[#2D2D44]/40 divide-y border-t border-black/20">
          {sorted.map((entry) => (
            <ADPRow key={entry.id} entry={entry} onToggleDraft={onToggleDraft} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
