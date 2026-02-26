import { useState } from 'react';
import { formatNumber } from '../../utils/formatters';

const TOOLTIP_WIDTH = 200;

export default function EVTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ x, y: rect.bottom + 6 });
  };

  const { ev, odds } = entry;

  return (
    <span className="cursor-help" onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <div
          style={{ position: 'fixed', top: pos.y, left: pos.x, width: TOOLTIP_WIDTH, zIndex: 9999 }}
          className="bg-gray-900 text-white text-[11px] rounded shadow-xl p-2 pointer-events-none border border-gray-700"
        >
          <div className="flex justify-between border-b border-gray-800 pb-1 mb-1">
            <span className="text-gray-400">Implied Win %</span>
            <span className="font-mono text-yellow-400">{ev.winProbability}%</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Event EV</span>
              <span className="font-mono">{formatNumber(ev.singleEvent)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-800">
              <span className="text-gray-400 font-medium">Season EV</span>
              <span className="font-mono font-bold text-green-400">{formatNumber(ev.seasonTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

