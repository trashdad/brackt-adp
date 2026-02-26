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
      {/* Rank */}
      <td className="px-3 py-1.5 font-pixel text-[10px] text-retro-light/30 w-10 border-r border-black/10 tabular-nums">
        {entry.adpRank}
      </td>

      {/* Name — Silkscreen is far more legible than Press Start 2P at data density */}
      <td className="px-3 py-1.5">
        <Link
          to={`/player/${entry.id}`}
          className="font-pixel text-[12px] font-bold text-retro-light group-hover:text-retro-cyan transition-colors tracking-wide"
        >
          {entry.name.toUpperCase()}
        </Link>
        {entry.evGap >= 7 && (
          <span className="ml-2 text-retro-red text-[10px] font-bold animate-pulse" title={`DROP_SIGNAL: ${entry.evGap} pts`}>
            !
          </span>
        )}
      </td>

      {/* Sport badge */}
      <td className="px-3 py-1.5">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-black/40 font-pixel text-[9px] text-white"
          style={{ backgroundColor: color }}
        >
          {entry.sportIcon} {entry.sportName.toUpperCase()}
        </span>
      </td>

      {/* Win % */}
      <td className="px-3 py-1.5 font-pixel text-[12px] text-retro-cyan/80 tabular-nums">
        {val(formatPercent(entry.ev?.winProbability))}
      </td>

      {/* Odds */}
      <td className="px-3 py-1.5 font-pixel text-[12px] text-retro-light/60 tabular-nums">
        <OddsTooltip entry={entry}>{val(formatAmericanOdds(entry.odds))}</OddsTooltip>
      </td>

      {/* Event EV */}
      <td className="px-3 py-1.5 font-pixel text-[12px] text-retro-light/60 tabular-nums">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.singleEvent))}</EVTooltip>
      </td>

      {/* Season EV */}
      <td className="px-3 py-1.5 font-pixel text-[12px] font-bold text-retro-light tabular-nums">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.seasonTotal))}</EVTooltip>
      </td>

      {/* Draft Priority Score */}
      <td className="px-3 py-1.5 font-pixel text-[12px] font-bold text-retro-purple tabular-nums">
        <PriorityTooltip entry={entry}>
          <div className="flex flex-col leading-tight">
            <span className="drop-shadow-[0_0_3px_rgba(157,80,187,0.6)]">{val(formatNumber(entry.adpScore))}</span>
            {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
              <span className="text-[9px] font-normal text-retro-gold/70">
                +{entry.scarcityBonus.toFixed(1)}
              </span>
            )}
          </div>
        </PriorityTooltip>
      </td>

      {/* Type */}
      <td className="px-3 py-1.5 font-pixel text-[9px] text-retro-light/25 tracking-wider">
        {entry.scoringType.toUpperCase()}
      </td>

      {/* Status */}
      <td className="px-3 py-1.5">
        {entry.drafted ? (
          <DraftedBadge draftedBy={entry.draftedBy} />
        ) : !entry.isPlaceholder ? (
          <button
            onClick={() => onToggleDraft(entry.id)}
            className="px-2.5 py-0.5 bg-retro-purple hover:bg-retro-magenta text-white border border-black font-pixel text-[10px] tracking-wider shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.4)] transition-all active:translate-y-0.5"
          >
            DRAFT
          </button>
        ) : null}
      </td>
    </tr>
  );
}
