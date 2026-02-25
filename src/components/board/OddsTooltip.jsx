import { useState } from 'react';
import { formatAmericanOdds, removeVig } from '../../services/oddsConverter';

const TOOLTIP_WIDTH = 260;

export default function OddsTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const oddsBySource = entry.oddsBySource;
  const hasSources = oddsBySource && Object.keys(oddsBySource).length > 0;

  if (!hasSources) return <span>{children}</span>;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ x, y: rect.bottom + 6 });
  };

  const sources = Object.entries(oddsBySource);
  const vigFreeData = sources.length > 1 ? removeVig(oddsBySource) : null;

  return (
    <span className="cursor-default" onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <div
          style={{ position: 'fixed', top: pos.y, left: pos.x, width: TOOLTIP_WIDTH, zIndex: 9999 }}
          className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 pointer-events-none"
        >
          <div className="text-gray-500 uppercase tracking-wide text-[10px] mb-2">
            Odds by Source
          </div>
          <div className="space-y-1">
            {sources.map(([source, odds]) => {
              const isBest = source === entry.bestOddsSource;
              return (
                <div key={source} className="flex justify-between">
                  <span className="text-gray-300 capitalize">{source}</span>
                  <span className={`font-mono ${isBest ? 'text-green-400 font-bold' : 'text-white'}`}>
                    {formatAmericanOdds(odds)}
                  </span>
                </div>
              );
            })}
          </div>
          {vigFreeData && vigFreeData.consensus && (
            <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
              <span className="text-gray-400">Consensus (vig-free)</span>
              <span className="font-mono font-bold text-yellow-300">
                {vigFreeData.consensus}
              </span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
