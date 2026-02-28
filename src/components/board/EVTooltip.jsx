import { formatNumber } from '../../utils/formatters';
import { useTooltip } from '../../hooks/useTooltip.jsx';

export default function EVTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(220, 140);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const { ev } = entry;

  return (
    <span
      className="cursor-help"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip(
        <>
          <div className="flex justify-between border-b border-white/10 pb-2 mb-3">
            <span className="font-retro text-[8px] text-white/40 uppercase">WIN_PROB_EST</span>
            <span className="font-mono text-[12px] font-bold text-retro-gold">{ev.winProbability}%</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-retro text-[8px] text-white/40 uppercase tracking-tighter">Standing_Payout</span>
              <span className="font-mono text-[12px] text-white tabular-nums">{formatNumber(ev.singleEvent)}</span>
            </div>
            <div className="pt-2 border-t border-white/5">
              <p className="text-[7px] text-white/30 italic leading-tight uppercase font-mono">
                Points awarded once at end-of-season.<br/>
                Individual events/matches do not count.
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="font-retro text-[8px] text-retro-cyan uppercase tracking-widest">SEASON_TOTAL</span>
              <span className="font-mono text-[14px] font-black text-retro-lime tabular-nums">{formatNumber(ev.seasonTotal)}</span>
            </div>
          </div>
        </>,
        'p-4',
      )}
    </span>
  );
}
