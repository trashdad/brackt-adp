import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';
import { formatAmericanOdds } from '../../services/oddsConverter';
import { formatNumber, formatPercent } from '../../utils/formatters';
import DraftedBadge from './DraftedBadge';
import EVTooltip from './EVTooltip';
import OddsTooltip from './OddsTooltip';
import PriorityTooltip from './PriorityTooltip';
import SocialTooltip from './SocialTooltip';

const getVelocityColor = (v) => {
  if (v > 1.8) return 'text-retro-red font-black'; // Extreme cliff
  if (v > 1.2) return 'text-orange-500 font-bold'; // Acceleration
  if (v > 0.8) return 'text-retro-gold'; // Steady
  return 'text-retro-lime'; // Flattening
};

export default function ADPRow({ entry, onToggleDraft }) {
  const color = SPORT_COLORS[entry.sport] || '#888';
  const val = (v) => entry.isPlaceholder ? '—' : v;
  const velocity = entry.dropoffVelocity || 1.0;

  return (
    <tr
      className={`border-b border-black/20 hover:bg-white/5 transition-colors group ${
        entry.drafted ? 'opacity-30 grayscale bg-black/20' : entry.isPlaceholder ? 'opacity-40 italic' : ''
      }`}
    >
      {/* Rank */}
      <td className="px-3 py-2 font-mono text-[11px] text-retro-light/40 w-10 border-r border-black/10 tabular-nums text-center">
        {entry.adpRank}
      </td>

      {/* Name — Pixelify Sans is far more legible than Silkscreen/PressStart */}
      <td className="px-3 py-2">
        <Link
          to={`/player/${entry.id}`}
          className="font-retro text-[14px] font-medium text-retro-light group-hover:text-retro-cyan transition-colors tracking-wide"
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
      <td className="px-3 py-2">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-black/40 font-retro text-[10px] text-white"
          style={{ backgroundColor: color }}
        >
          <span className="scale-110">{entry.sportIcon}</span>
          <span>{entry.sportName.toUpperCase()}</span>
        </span>
      </td>

      {/* Win % */}
      <td className="px-3 py-2 font-mono text-[13px] text-retro-cyan/90 tabular-nums">
        {val(formatPercent(entry.ev?.winProbability))}
      </td>

      {/* Odds */}
      <td className="px-3 py-2 font-mono text-[13px] text-retro-light/70 tabular-nums">
        <OddsTooltip entry={entry}>{val(formatAmericanOdds(entry.odds))}</OddsTooltip>
      </td>

      {/* Dropoff Velocity */}
      <td className="px-3 py-2 font-mono text-[13px] tabular-nums">
        {entry.isPlaceholder ? '—' : (
          <span className={getVelocityColor(velocity)} title="MOMENTUM / INERTIA (Rate of EV decay)">
            {velocity.toFixed(2)}x
          </span>
        )}
      </td>

      {/* Season EV */}
      <td className="px-3 py-2 font-mono text-[13px] font-bold text-retro-light tabular-nums">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.seasonTotal))}</EVTooltip>
      </td>

      {/* Draft Priority Score */}
      <td className="px-3 py-2 font-mono text-[14px] font-bold text-retro-purple tabular-nums">
        <PriorityTooltip entry={entry}>
          <div className="flex flex-col leading-tight relative">
            <span className="drop-shadow-[0_0_4px_rgba(157,80,187,0.4)] text-retro-cyan">
              {val(formatNumber(entry.adpScore))}
              {entry.exceedsCapacity && (
                <span className="ml-1 text-retro-gold text-[10px]" title="EXCEEDS_CAPACITY">▲</span>
              )}
            </span>
            {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
              <span className="text-[10px] font-normal text-retro-gold/80">
                +{entry.scarcityBonus.toFixed(1)}
              </span>
            )}
          </div>
        </PriorityTooltip>
      </td>

      {/* Social Score + Quotient */}
      <td className="px-3 py-2 font-mono text-[13px] text-retro-cyan/90 tabular-nums">
        <SocialTooltip entry={entry}>{val(formatNumber(entry.socialScore || 0))}</SocialTooltip>
      </td>

      <td className="px-3 py-2 font-mono text-[13px] text-retro-gold/80 tabular-nums">
        <SocialTooltip entry={entry}>{val(formatNumber(entry.socialQuotient || 0))}</SocialTooltip>
      </td>

      {/* Status */}
      <td className="px-3 py-2">
        {entry.drafted ? (
          <DraftedBadge draftedBy={entry.draftedBy} />
        ) : !entry.isPlaceholder ? (
          <button
            onClick={() => onToggleDraft(entry.id)}
            className="px-3 py-1 bg-retro-purple hover:bg-retro-magenta text-white border border-black font-retro text-[11px] tracking-wider shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.4)] transition-all active:translate-y-0.5"
          >
            DRAFT
          </button>
        ) : null}
      </td>
    </tr>
  );
}
