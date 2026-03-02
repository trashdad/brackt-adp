import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';
import { formatAmericanOdds } from '../../services/oddsConverter';
import { formatNumber, formatPercent } from '../../utils/formatters';
import DraftedBadge from './DraftedBadge';
import EVTooltip from './EVTooltip';
import IkynEVTooltip from './IkynEVTooltip';
import WAEVTooltip from './WAEVTooltip';
import OddsTooltip from './OddsTooltip';
import PriorityTooltip from './PriorityTooltip';
import SocialTooltip from './SocialTooltip';
import PlayerTooltip from './PlayerTooltip';
import { useLock } from '../../context/LockContext';


const getVelocityColor = (v) => {
  if (v > 1.8) return 'text-retro-red font-black'; // Extreme cliff
  if (v > 1.2) return 'text-orange-500 font-bold'; // Acceleration
  if (v > 0.8) return 'text-retro-gold'; // Steady
  return 'text-retro-lime'; // Flattening
};

export default function ADPRow({ entry, onToggleDraft }) {
  const color = SPORT_COLORS[entry.sport] || '#888';
  const val = (v) => entry.isPlaceholder ? '—' : v;
  const velocity = entry.dropoffVelocity ?? 1.0;
  const { isUnlocked } = useLock();


  return (
    <tr
      className={`border-b border-black/20 hover:bg-white/5 transition-colors group ${
        entry.drafted ? 'opacity-30 grayscale bg-black/20' : entry.isPlaceholder ? 'opacity-40 italic' : ''
      }`}
    >
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

      {/* ikyn_EV */}
      <td className="px-2 py-2 font-mono tabular-nums text-center w-16">
        {entry.ikynEV == null ? (
          <span className="text-retro-light/20 text-[11px]">—</span>
        ) : (
          <IkynEVTooltip entry={entry}>
            <span
              className={`font-bold ${entry.isPlaceholder ? 'text-[11px] opacity-40' : 'text-[13px]'}`}
              style={{ color: entry.isPlaceholder ? '#888' : `hsl(${Math.min(entry.ikynEV, 100) * 1.2}deg 100% 55%)` }}
            >
              {entry.ikynEV.toFixed(1)}
            </span>
          </IkynEVTooltip>
        )}
      </td>

      {/* WA_EV */}
      <td className="px-2 py-2 font-mono tabular-nums text-center w-16">
        {entry.waEV == null ? (
          <span className="text-retro-light/20 text-[11px]">—</span>
        ) : (
          <WAEVTooltip entry={entry}>
            <span
              className={`font-bold ${entry.isPlaceholder ? 'text-[11px] opacity-40' : 'text-[13px]'}`}
              style={{ color: entry.isPlaceholder ? '#888' : `hsl(${Math.min(entry.waEV, 100) * 1.2}deg 100% 65%)` }}
            >
              {entry.waEV.toFixed(1)}
            </span>
          </WAEVTooltip>
        )}
      </td>

      {/* Wizard_EV */}
      <td className="px-2 py-2 font-mono tabular-nums text-center w-16">
        {entry.wizardEV == null ? (
          <span className="text-retro-light/20 text-[11px]">—</span>
        ) : (
          <span
            className={`font-bold ${entry.isPlaceholder ? 'text-[11px] opacity-40' : 'text-[13px]'}`}
            style={{ color: entry.isPlaceholder ? '#888' : `hsl(${270 + Math.min(entry.wizardEV, 100) * 0.3}deg 80% 65%)` }}
            title={entry.ikynDetail?.wizardModel === 'ikyn' ? 'PL-MC (fixed field)' : 'WA (variable field)'}
          >
            {entry.wizardEV.toFixed(1)}
          </span>
        )}
      </td>

      {/* Rank */}
      <td className="px-3 py-2 font-mono text-[11px] text-retro-light/40 w-10 border-r border-black/10 tabular-nums text-center">
        {entry.adpRank}
      </td>

      {/* Name */}
      <td className="px-3 py-2">
        <PlayerTooltip entry={entry}>
          <Link
            to={`/player/${entry.id}`}
            className="font-retro text-[14px] font-medium text-retro-light group-hover:text-retro-cyan transition-colors tracking-wide"
          >
            {entry.name.toUpperCase()}
          </Link>
        </PlayerTooltip>
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
      <td className="px-1.5 py-2 font-mono text-[13px] text-retro-cyan/90 tabular-nums">
        {val(formatPercent(entry.ev?.winProbability))}
      </td>

      {/* Odds */}
      <td className="px-1.5 py-2 font-mono text-[13px] text-retro-light/70 tabular-nums">
        <OddsTooltip entry={entry}>{val(formatAmericanOdds(entry.odds))}</OddsTooltip>
      </td>

      {/* Season EV */}
      <td className="px-1.5 py-2 font-mono text-[13px] font-bold text-retro-light tabular-nums">
        <EVTooltip entry={entry}>{val(formatNumber(entry.ev?.seasonTotal))}</EVTooltip>
      </td>

      {/* Dropoff Velocity */}
      <td className="px-1.5 py-2 font-mono text-[13px] tabular-nums">
        {entry.isPlaceholder ? '—' : (
          <span className={getVelocityColor(velocity)} title="MOMENTUM / INERTIA (Rate of EV decay)">
            {velocity.toFixed(2)}x
          </span>
        )}
      </td>

      {/* Social Score */}
      <td className="px-1.5 py-2 font-mono text-[13px] tabular-nums">
        <SocialTooltip entry={entry}>
          <div className="flex gap-1 items-center justify-center">
            <span className="text-retro-light/50">[</span>
            <span className="text-retro-lime font-bold">{entry.socialPos || 0}</span>
            <span className="text-retro-light/50">/</span>
            <span className="text-retro-red font-bold">{entry.socialNeg || 0}</span>
            <span className="text-retro-light/50">]</span>
          </div>
        </SocialTooltip>
      </td>

      {/* Mkt vs Exp */}
      <td className="px-1.5 py-2 font-mono text-[13px] tabular-nums text-center">
        {!entry.isPlaceholder && entry.mktVsExp !== undefined ? (
           <span className={entry.mktVsExp > 0 ? 'text-retro-lime' : entry.mktVsExp < 0 ? 'text-retro-red' : 'text-retro-light/50'}>
             {entry.mktVsExp > 0 ? `+${entry.mktVsExp}` : entry.mktVsExp}
           </span>
        ) : '—'}
      </td>

      {/* Adj SQ */}
      <td className="px-1.5 py-2 font-mono text-[13px] text-retro-gold/80 tabular-nums">
        <SocialTooltip entry={entry}>{val(formatNumber(entry.adjSq || 1.0))}</SocialTooltip>
      </td>

      {/* Status */}
      <td className="px-3 py-2">
        {entry.drafted ? (
          <DraftedBadge
            draftedBy={entry.draftedBy}
            onClick={isUnlocked ? () => onToggleDraft(entry.id) : undefined}
            locked={!isUnlocked}
          />
        ) : !entry.isPlaceholder ? (
          <button
            onClick={() => onToggleDraft(entry.id)}
            disabled={!isUnlocked}
            className={`px-3 py-1 text-white border border-black font-retro text-[11px] tracking-wider shadow-[inset_-1px_-1px_0_0_rgba(0,0,0,0.4)] transition-all active:translate-y-0.5 ${
              isUnlocked
                ? 'bg-retro-purple hover:bg-retro-magenta cursor-pointer'
                : 'bg-retro-panel opacity-30 cursor-not-allowed'
            }`}
          >
            DRAFT
          </button>
        ) : null}
      </td>
    </tr>
  );
}
