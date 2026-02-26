import { useState } from 'react';
import { formatAmericanOdds, removeVig } from '../../services/oddsConverter';
import SPORTS from '../../data/sports';

const TOOLTIP_WIDTH = 260;

export default function OddsTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const oddsBySource = entry.oddsBySource;
  const hasSources = oddsBySource && Object.keys(oddsBySource).length > 0;
  const hasTournaments = entry.tournaments && Object.keys(entry.tournaments).length > 0;

  if (!hasSources && !hasTournaments) return <span>{children}</span>;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ x, y: rect.bottom + 6 });
  };

  const sources = hasSources ? Object.entries(oddsBySource) : [];
  const vigFreeData = sources.length > 1 ? removeVig(oddsBySource) : null;
  
  const sport = SPORTS.find(s => s.id === entry.sport);
  const tournamentList = hasTournaments ? Object.entries(entry.tournaments).map(([id, data]) => {
    const tConfig = sport?.tournaments?.find(t => t.id === id);
    return { name: tConfig?.name || id, odds: data.odds, isEstimated: data.isEstimated };
  }) : [];

  return (
    <span className="cursor-help underline decoration-dotted decoration-gray-300" onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <div
          style={{ position: 'fixed', top: pos.y, left: pos.x, width: TOOLTIP_WIDTH, zIndex: 9999 }}
          className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 pointer-events-none border border-gray-700"
        >
          {hasSources && (
            <>
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
            </>
          )}

          {hasTournaments && (
            <div className={hasSources ? 'mt-4 border-t border-gray-700 pt-3' : ''}>
              <div className="text-gray-500 uppercase tracking-wide text-[10px] mb-2">
                Major Tournaments
              </div>
              <div className="space-y-1.5">
                {tournamentList.map((t) => (
                  <div key={t.name} className="flex justify-between items-center">
                    <span className="text-gray-300 truncate mr-2" title={t.name}>
                      {t.name} {t.isEstimated && <span className="text-[9px] text-gray-500 italic">(Est.)</span>}
                    </span>
                    <span className="font-mono text-brand-300 bg-brand-900/40 px-1.5 py-0.5 rounded leading-none border border-brand-800/50">
                      {formatAmericanOdds(t.odds)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-gray-500 italic">
                Main odds show the average across majors
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
