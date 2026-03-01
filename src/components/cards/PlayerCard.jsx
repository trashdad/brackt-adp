import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';
import { formatAmericanOdds } from '../../services/oddsConverter';
import { formatNumber, formatPercent } from '../../utils/formatters';
import EVTooltip from '../board/EVTooltip';
import { useDungeonGate } from '../../context/DungeonGateContext';

export default function PlayerCard({ entry, onToggleDraft }) {
  const color = SPORT_COLORS[entry.sport] || '#888';
  const val = (v) => entry.isPlaceholder ? '—' : v;
  const { isFoe } = useDungeonGate();

  return (
    <div
      className={`snes-panel p-4 bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black shadow-[4px_4px_0_0_#000] ${
        entry.drafted ? 'opacity-30 grayscale' : entry.isPlaceholder ? 'opacity-40 italic' : ''
      }`}
    >
      {/* DPS hero row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[20px] font-bold text-retro-cyan drop-shadow-[0_0_4px_rgba(157,80,187,0.4)]">
            {val(formatNumber(entry.adpScore))}
          </span>
          <span className="font-retro text-[9px] text-retro-cyan/50 uppercase">DPS</span>
        </div>
        <span
          className="font-retro text-[9px] text-white px-2 py-1 border border-black shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
          style={{ backgroundColor: color }}
        >
          {entry.sportIcon} {entry.sportName.toUpperCase()}
        </span>
      </div>

      {/* Name + rank */}
      <div className="flex items-center justify-between mb-3">
        <Link to={`/player/${entry.id}`} className="font-retro text-[13px] text-retro-light hover:text-retro-cyan tracking-tight leading-relaxed">
          {entry.name.toUpperCase()}
        </Link>
        <span className="font-retro text-[10px] text-retro-light/40">{isFoe ? '—' : `#${entry.adpRank}`}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 border-t border-white/5 pt-3">
        <div>
          <span className="font-retro text-[8px] text-retro-cyan/60 uppercase">WIN_PROB</span>
          <p className="font-mono text-[13px] text-retro-cyan">{val(formatPercent(entry.ev?.winProbability))}</p>
        </div>
        <div>
          <span className="font-retro text-[8px] text-retro-purple/60 uppercase">ODDS</span>
          <p className="font-mono text-[13px] text-retro-purple">{val(formatAmericanOdds(entry.odds))}</p>
        </div>
        <div>
          <span className="font-retro text-[8px] text-retro-red/60 uppercase">EVENT_EV</span>
          <p className="font-mono text-[13px] text-retro-red">
            {val(formatNumber(entry.ev?.singleEvent))}
          </p>
        </div>
        <div>
          <span className="font-retro text-[8px] text-retro-gold/60 uppercase">SEASON_VAL</span>
          <p className="font-mono text-[13px] text-retro-gold">
            {val(formatNumber(entry.ev?.seasonTotal))}
          </p>
        </div>
      </div>
      {!entry.drafted && !entry.isPlaceholder && (
        <button
          onClick={() => onToggleDraft(entry.id)}
          className="w-full bg-retro-purple hover:bg-retro-magenta text-white border-2 border-black font-retro text-[10px] py-3 shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4)] transition-all active:translate-y-0.5"
        >
          [ DRAFT_PLAYER ]
        </button>
      )}
      {entry.drafted && (
        <span className="block text-center font-retro text-[9px] text-white/20 py-2 border-2 border-white/5">RECORDED_DRAFT</span>
      )}
    </div>
  );
}
