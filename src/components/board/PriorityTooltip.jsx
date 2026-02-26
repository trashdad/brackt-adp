import { useState } from 'react';
import { formatNumber } from '../../utils/formatters';

const TOOLTIP_WIDTH = 260;

export default function PriorityTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ x, y: rect.bottom + 6 });
  };

  const rawEV = entry.ev?.seasonTotal || 0;
  const bonus = entry.scarcityBonus || 0;
  const score = entry.adpScore || 0;

  return (
    <span 
      className="cursor-help underline decoration-dotted decoration-brand-300" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          style={{ position: 'fixed', top: pos.y, left: pos.x, width: TOOLTIP_WIDTH, zIndex: 9999 }}
          className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-4 pointer-events-none border border-gray-700"
        >
          <div className="text-gray-500 uppercase tracking-wide text-[10px] mb-3">
            Draft Priority Calculation
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Simulation EV (Raw)</span>
              <span className="font-mono text-white">{formatNumber(rawEV)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Positional Scarcity</span>
              <span className="font-mono text-orange-400">+{formatNumber(bonus)}</span>
            </div>
            
            <div className="border-t border-gray-700 my-2 pt-2 flex justify-between items-center">
              <span className="font-semibold text-gray-200">Priority Score</span>
              <span className="font-mono font-bold text-brand-400 text-sm">
                {formatNumber(score)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-800">
            <div className="text-[10px] text-gray-500 leading-relaxed italic">
              Priority Score = Raw EV + (EV Gap to next player × 0.5). 
              Highly scarce players get a priority boost.
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
