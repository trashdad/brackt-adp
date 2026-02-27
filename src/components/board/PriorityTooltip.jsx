import { useState } from 'react';
import { formatNumber } from '../../utils/formatters';

const TOOLTIP_WIDTH = 260;
const TOOLTIP_MARGIN = 8;

export default function PriorityTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const handleMouseMove = (e) => {
    const x = Math.max(TOOLTIP_MARGIN, Math.min(e.clientX + 10, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN));
    const fitsBelow = e.clientY + 20 + 160 < window.innerHeight;
    setPos({
      x,
      y: fitsBelow ? e.clientY + 20 : e.clientY - 20,
      above: !fitsBelow,
    });
  };

  const rawEV = entry.ev?.seasonTotal || 0;
  const bonus = entry.scarcityBonus || 0;
  const score = entry.adpScore || 0;

  return (
    <span
      className="cursor-help underline decoration-dotted decoration-brand-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          style={{
            position: 'fixed',
            [pos.above ? 'bottom' : 'top']: pos.above ? window.innerHeight - pos.y : pos.y,
            left: pos.x,
            width: TOOLTIP_WIDTH,
            zIndex: 9999,
          }}
          className="bg-[#0a0a14] text-white text-xs border-2 border-black shadow-[4px_4px_0_0_#000] p-4 pointer-events-none"
        >
          <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-3">
            DRAFT_PRIORITY_CALC
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-retro-light/50 font-mono text-[11px]">Simulation EV (Raw)</span>
              <span className="font-mono text-[12px] text-white">{formatNumber(rawEV)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-retro-light/50 font-mono text-[11px]">Positional Scarcity</span>
              <span className="font-mono text-[12px] text-retro-gold">+{formatNumber(bonus)}</span>
            </div>

            <div className="border-t border-white/10 my-2 pt-2 flex justify-between items-center">
              <span className="font-retro text-[9px] text-retro-cyan uppercase">PRIORITY_SCORE</span>
              <span className="font-mono font-bold text-retro-lime text-[14px]">
                {formatNumber(score)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[9px] text-white/30 leading-relaxed italic font-mono">
              Priority = Raw EV + (EV Gap x 0.5). Scarce players get a boost.
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
