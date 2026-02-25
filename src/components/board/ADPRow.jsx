import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';
import { formatAmericanOdds } from '../../services/oddsConverter';
import { formatNumber, formatPercent } from '../../utils/formatters';
import DraftedBadge from './DraftedBadge';
import EVTooltip from './EVTooltip';

export default function ADPRow({ entry, onToggleDraft }) {
  const color = SPORT_COLORS[entry.sport] || '#888';

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        entry.drafted ? 'opacity-40' : ''
      }`}
    >
      <td className="px-3 py-2 text-sm font-medium text-gray-500 w-12">
        {entry.adpRank}
      </td>
      <td className="px-3 py-2">
        <Link
          to={`/player/${entry.id}`}
          className="text-sm font-medium text-gray-900 hover:text-brand-600"
        >
          {entry.name}
        </Link>
      </td>
      <td className="px-3 py-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {entry.sportIcon} {entry.sportName}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">
        {formatPercent(entry.ev.winProbability)}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 font-mono">
        {formatAmericanOdds(entry.odds)}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">
        <EVTooltip entry={entry}>{formatNumber(entry.ev.singleEvent)}</EVTooltip>
      </td>
      <td className="px-3 py-2 text-sm font-semibold text-gray-900">
        <EVTooltip entry={entry}>{formatNumber(entry.ev.seasonTotal)}</EVTooltip>
      </td>
      <td className="px-3 py-2 text-sm font-bold text-brand-700">
        {formatNumber(entry.adpScore)}
        {entry.scarcityBonus > 0 && (
          <span className="block text-[10px] font-normal text-orange-400 font-mono">
            +{entry.scarcityBonus.toFixed(1)}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500 uppercase">
        {entry.scoringType}
      </td>
      <td className="px-3 py-2">
        {entry.drafted ? (
          <DraftedBadge draftedBy={entry.draftedBy} />
        ) : (
          <button
            onClick={() => onToggleDraft(entry.id)}
            className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            Draft
          </button>
        )}
      </td>
    </tr>
  );
}
