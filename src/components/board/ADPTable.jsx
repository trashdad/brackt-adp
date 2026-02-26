import ColumnHeader from './ColumnHeader';
import ADPRow from './ADPRow';
import useSorting from '../../hooks/useSorting';

const COLUMNS = [
  { label: 'Rank', key: 'adpRank' },
  { label: 'Name', key: 'name' },
  { label: 'Sport', key: 'sportName' },
  { label: 'Win %', key: 'ev.winProbability' },
  { label: 'Odds', key: 'odds' },
  { label: 'Event EV', key: 'ev.singleEvent' },
  { label: 'Season EV', key: 'ev.seasonTotal' },
  { label: 'Draft Priority Score', key: 'adpScore' },
  { label: 'Type', key: 'scoringType' },
  { label: 'Status', key: 'drafted' },
];

export default function ADPTable({ entries, onToggleDraft }) {
  const { sorted, sortKey, sortDir, toggleSort } = useSorting(entries);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">No entries to display.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {COLUMNS.map((col) => (
              <ColumnHeader
                key={col.key}
                label={col.label}
                sortKey={col.key}
                currentSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <ADPRow key={entry.id} entry={entry} onToggleDraft={onToggleDraft} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
