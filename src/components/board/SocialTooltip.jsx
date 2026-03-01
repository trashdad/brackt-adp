import { formatNumber } from '../../utils/formatters';
import { useTooltip } from '../../hooks/useTooltip.jsx';

export default function SocialTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(260, 200);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const pos = entry.socialPos || 0;
  const neg = entry.socialNeg || 0;
  const mktVsExp = entry.mktVsExp !== undefined ? entry.mktVsExp : 0;
  const adjSq = entry.adjSq || 1.0;

  if (pos === 0 && neg === 0 && adjSq === 1.0) return <span>{children}</span>;

  return (
    <span
      className="cursor-help underline decoration-dotted decoration-retro-cyan/30"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip(
        <>
          <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-2">
            SUBJECTIVE_COEFFICIENT
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[11px] text-white/70">Mentions (Pos/Neg)</span>
              <div className="font-mono text-[12px]">
                <span className="text-retro-lime">+{pos}</span>
                <span className="text-white/30 mx-1">/</span>
                <span className="text-retro-red">-{neg}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-mono text-[11px] text-white/70">Mkt vs. Expert</span>
              <span className={`font-mono text-[12px] ${mktVsExp > 0 ? 'text-retro-lime' : mktVsExp < 0 ? 'text-retro-red' : 'text-white'}`}>
                {mktVsExp > 0 ? `+${mktVsExp}` : mktVsExp}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-mono text-[11px] text-white/70">Scarcity Modifier</span>
              <span className="font-mono text-[12px] text-retro-cyan">
                {['llws', 'f1', 'indycar', 'snooker'].includes(entry.sport) ? 'Yes (1.10x)' : 'No (1.00x)'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
            <span className="font-retro text-[9px] text-retro-gold uppercase">ADJ_SQ</span>
            <span className="font-mono font-bold text-retro-gold text-[14px]">
              {adjSq.toFixed(2)}x
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-[9px] text-white/30 leading-relaxed italic font-mono uppercase tracking-tighter">
              Dampening: SQ_ADJ = 1 + (SQ - 1) * 0.5<br/>
              Prevents hype from overriding fundamentals.<br/>
              Acts as tie-breaker for equivalent EV.
            </div>
          </div>
        </>,
        'p-3',
      )}
    </span>
  );
}
