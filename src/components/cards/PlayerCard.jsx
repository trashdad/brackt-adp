import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';
import { formatAmericanOdds } from '../../services/oddsConverter';
import { formatNumber, formatPercent } from '../../utils/formatters';

export default function PlayerCard({ entry, onToggleDraft }) {
  const color = SPORT_COLORS[entry.sport] || '#888';

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
        entry.drafted ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-gray-400">#{entry.adpRank}</span>
        <span
          className="text-xs font-medium text-white px-2 py-0.5 rounded"
          style={{ backgroundColor: color }}
        >
          {entry.sportIcon} {entry.sportName}
        </span>
      </div>
      <Link to={`/player/${entry.id}`} className="text-base font-semibold text-gray-900 hover:text-brand-600 block mb-2">
        {entry.name}
      </Link>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-500 text-xs">Win %</span>
          <p className="font-medium">{formatPercent(entry.ev.winProbability)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Odds</span>
          <p className="font-mono font-medium">{formatAmericanOdds(entry.odds)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Event EV</span>
          <p className="font-medium">{formatNumber(entry.ev.singleEvent)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Season EV</span>
          <p className="font-bold text-brand-700">{formatNumber(entry.ev.seasonTotal)}</p>
        </div>
      </div>
      {!entry.drafted && (
        <button
          onClick={() => onToggleDraft(entry.id)}
          className="w-full px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
        >
          Draft
        </button>
      )}
      {entry.drafted && (
        <span className="block text-center text-xs text-gray-400 py-1.5">Drafted</span>
      )}
    </div>
  );
}
