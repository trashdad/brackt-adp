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
      className={`border-b border-black/20 hover:bg-white/5 transition-colors group ${
        entry.drafted ? 'opacity-30 grayscale bg-black/20' : entry.isPlaceholder ? 'opacity-40 italic' : ''
      }`}
    >
      <td className="px-3 py-2 font-retro text-[8px] text-retro-light/40 w-14 border-r border-black/10">
        {entry.adpRank}
      </td>
      <td className="px-4 py-2">
        <Link
          to={`/player/${entry.id}`}
          className="font-retro text-[9px] text-retro-light group-hover:text-retro-cyan hover:underline transition-colors tracking-tight"
        >
          {entry.name.toUpperCase()}
        </Link>
        {entry.evGap >= 7 && (
          <span className="ml-2 text-retro-red font-bold animate-pulse" title={`DROP_SIGNAL: ${entry.evGap} pts`}>
            !
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-1 border border-black/40 font-retro text-[7px] text-white shadow-[1px_1px_0_0_rgba(0,0,0,0.3)]"
          style={{ backgroundColor: color }}
        >
          {entry.sportIcon} {entry.sportName.toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-2 font-pixel text-[12px] text-retro-cyan/80">
        {val(formatPercent(entry.ev?.winProbability))}
      </td>
      <td className="px-4 py-2 font-pixel text-[12px] text-retro-light/60">
        <OddsTooltip entry={entry}>{val(formatAmericanOdds(entry.odds))}</OddsTooltip>
      </td>
      <td className="px-4 py-2 font-pixel text-[12px] text-retro-light/60">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.singleEvent))}</EVTooltip>
      </td>
      <td className="px-4 py-2 font-pixel text-[12px] font-bold text-retro-light">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.seasonTotal))}</EVTooltip>
      </td>
      <td className="px-4 py-2 font-pixel text-[13px] font-bold text-retro-purple">
        <PriorityTooltip entry={entry}>
          <div className="flex flex-col">
            <span className="drop-shadow-[0_0_2px_rgba(157,80,187,0.5)]">{val(formatNumber(entry.adpScore))}</span>
            {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
              <span className="text-[8px] font-normal text-retro-gold/80 mt-0.5">
                +{entry.scarcityBonus.toFixed(1)}
              </span>
            )}
          </div>
        </PriorityTooltip>
      </td>
      <td className="px-4 py-2 font-retro text-[7px] text-retro-light/30">
        {entry.scoringType.toUpperCase()}
      </td>
      <td className="px-4 py-2">
        {entry.drafted ? (
          <DraftedBadge draftedBy={entry.draftedBy} />
        ) : !entry.isPlaceholder ? (
          <button
            onClick={() => onToggleDraft(entry.id)}
            className="px-3 py-1 bg-retro-purple hover:bg-retro-magenta text-white border border-black font-retro text-[7px] tracking-widest shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.4),1px_1px_0_0_rgba(0,0,0,0.5)] transition-all active:translate-y-0.5"
          >
            DRAFT
          </button>
        ) : null}
      </td>
    </tr>
  );
}
