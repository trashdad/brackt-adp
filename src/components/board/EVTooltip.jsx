import { useState } from 'react';
import { formatNumber } from '../../utils/formatters';

const TOOLTIP_WIDTH = 220;
const TOOLTIP_MARGIN = 8;

export default function EVTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(TOOLTIP_MARGIN, Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN));
    const fitsBelow = rect.bottom + 6 + 120 < window.innerHeight;
    setPos({
      x,
      y: fitsBelow ? rect.bottom + 6 : rect.top - 6,
      above: !fitsBelow,
    });
  };

  const { ev } = entry;

  return (
    <span className="cursor-help" onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
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
          className="bg-[#0a0a14] text-white border-2 border-black shadow-[4px_4px_0_0_#000] p-4 pointer-events-none"
        >
          <div className="flex justify-between border-b border-white/10 pb-2 mb-3">
            <span className="font-retro text-[8px] text-white/40 uppercase">WIN_PROB_EST</span>
            <span className="font-mono text-[12px] font-bold text-retro-gold">{ev.winProbability}%</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-retro text-[8px] text-white/40 uppercase">EVENT_EV</span>
              <span className="font-mono text-[12px] text-white tabular-nums">{formatNumber(ev.singleEvent)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <span className="font-retro text-[8px] text-retro-cyan uppercase tracking-widest">SEASON_TOTAL</span>
              <span className="font-mono text-[14px] font-black text-retro-lime tabular-nums">{formatNumber(ev.seasonTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
