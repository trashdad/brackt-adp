import { formatNumber } from '../../utils/formatters';
import { useTooltip } from '../../hooks/useTooltip.jsx';

export default function PriorityTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(280, 280);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const rawEV = entry.ev?.seasonTotal || 0;
  const bonus = entry.scarcityBonus || 0;
  const adjSq = entry.adjSq || 1.0;
  const score = entry.adpScore || 0;
  const hasAdjBoost = adjSq !== 1.0;

  // Reconstruct the pre-social subtotal (what adpScore was before adjSq multiplier)
  const preSocialScore = hasAdjBoost ? parseFloat((score / adjSq).toFixed(2)) : score;

  return (
    <span
      className="cursor-help underline decoration-dotted decoration-brand-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip(
        <>
          <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-3">
            DRAFT_PRIORITY_CALC
          </div>

          <div className="space-y-1.5">
            {/* Step 1: Raw EV */}
            <div className="flex justify-between items-center">
              <span className="text-retro-light/50 font-mono text-[11px]">Season EV</span>
              <span className="font-mono text-[12px] text-white">{formatNumber(rawEV)}</span>
            </div>

            {/* Step 2: Scarcity Bonus */}
            <div className="flex justify-between items-center">
              <span className="text-retro-light/50 font-mono text-[11px]">Scarcity Bonus</span>
              <span className="font-mono text-[12px] text-retro-gold">+{formatNumber(bonus)}</span>
            </div>

            {/* Step 3: Subtotal (before social) */}
            <div className="border-t border-white/10 pt-1.5 flex justify-between items-center">
              <span className="text-retro-light/40 font-mono text-[11px]">Subtotal (Capped)</span>
              <span className="font-mono text-[12px] text-white/70">{formatNumber(preSocialScore)}</span>
            </div>

            {/* Step 4: Cap rule indicator */}
            {entry.exceedsCapacity && (
              <div className="text-retro-gold text-[8px] font-retro uppercase animate-pulse">
                !! SCARCITY CAPPED BY ABOVE PLAYER !!
              </div>
            )}

            {/* Step 5: Social Quotient multiplier */}
            <div className="flex justify-between items-center">
              <span className="text-retro-light/50 font-mono text-[11px]">Adj. SQ (Coeff)</span>
              <span className={`font-mono text-[12px] ${hasAdjBoost ? 'text-retro-cyan font-bold' : 'text-white/30'}`}>
                x{adjSq.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Final Score */}
          <div className="border-t border-white/10 mt-2 pt-2 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="font-retro text-[9px] text-retro-cyan uppercase">DRAFT_PRIORITY</span>
              <span className="font-mono font-bold text-retro-lime text-[14px]">
                {formatNumber(score)}
              </span>
            </div>
          </div>

          {/* Formula explanation */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[9px] text-white/30 leading-relaxed italic font-mono">
              DPS = (EV + Scarcity) x Adj.SQ<br/>
              Scarcity cap: cannot exceed entry above.<br/>
              Adj.SQ applied AFTER cap (enables leapfrogging).
            </div>
          </div>
        </>,
        'p-4',
      )}
    </span>
  );
}
