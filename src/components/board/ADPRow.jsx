import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';
import { formatAmericanOdds } from '../../services/oddsConverter';
import { formatNumber, formatPercent } from '../../utils/formatters';
import DraftedBadge from './DraftedBadge';
import EVTooltip from './EVTooltip';
import OddsTooltip from './OddsTooltip';
import PriorityTooltip from './PriorityTooltip';

export default function ADPRow({ entry, onToggleDraft }) {
  const color = SPORT_COLORS[entry.sport] || '#888';
  const val = (v) => entry.isPlaceholder ? '—' : v;

  return (
    <tr
      className={`border-b-2 border-black/10 hover:bg-black/5 transition-colors ${
        entry.drafted ? 'opacity-30 grayscale bg-gray-200' : entry.isPlaceholder ? 'opacity-40 italic' : ''
      }`}
    >
      <td className="px-3 py-3 font-retro text-[8px] text-gray-400 w-12 border-r border-black/5">
        #{entry.adpRank}
      </td>
      <td className="px-3 py-3">
        <Link
          to={`/player/${entry.id}`}
          className="font-retro text-[10px] text-snes-blue hover:text-snes-purple hover:underline tracking-tight"
        >
          {entry.name.toUpperCase()}
        </Link>
        {entry.evGap >= 7 && (
          <span className="ml-1 text-red-600 font-bold animate-pulse" title={`Significant dropoff: ${entry.evGap} pts`}>
            !
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black/20 font-retro text-[8px] text-white shadow-[1px_1px_0_0_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: color }}
        >
          {entry.sportIcon} {entry.sportName.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-3 font-pixel text-[11px] text-gray-600">
        {val(formatPercent(entry.ev?.winProbability))}
      </td>
      <td className="px-3 py-3 font-pixel text-[11px] text-gray-600">
        <OddsTooltip entry={entry}>{val(formatAmericanOdds(entry.odds))}</OddsTooltip>
      </td>
      <td className="px-3 py-3 font-pixel text-[11px] text-gray-600">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.singleEvent))}</EVTooltip>
      </td>
      <td className="px-3 py-3 font-pixel text-[11px] font-bold text-gray-900">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.seasonTotal))}</EVTooltip>
      </td>
      <td className="px-3 py-3 font-pixel text-[12px] font-bold text-snes-purple">
        <PriorityTooltip entry={entry}>
          {val(formatNumber(entry.adpScore))}
          {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
            <span className="block text-[9px] font-normal text-orange-600">
              +{entry.scarcityBonus.toFixed(1)}
            </span>
          )}
        </PriorityTooltip>
      </td>
      <td className="px-3 py-3 font-retro text-[8px] text-gray-400">
        {entry.scoringType.toUpperCase()}
      </td>
      <td className="px-3 py-3">
        {entry.drafted ? (
          <DraftedBadge draftedBy={entry.draftedBy} />
        ) : !entry.isPlaceholder ? (
          <button
            onClick={() => onToggleDraft(entry.id)}
            className="px-3 py-1 bg-snes-purple text-white border-2 border-black font-retro text-[8px] tracking-tighter hover:bg-snes-lavender active:translate-y-0.5 shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.3)] transition-all"
          >
            DRAFT
          </button>
        ) : null}
      </td>
    </tr>
  );
}
