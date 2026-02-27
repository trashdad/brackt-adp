import { useState } from 'react';
import { formatAmericanOdds, removeVig } from '../../services/oddsConverter';
import SPORTS from '../../data/sports';

const TOOLTIP_WIDTH = 260;
const TOOLTIP_MARGIN = 8;

export default function OddsTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const oddsBySource = entry.oddsBySource;
  const hasSources = oddsBySource && Object.keys(oddsBySource).length > 0;
  const hasTournaments = entry.tournaments && Object.keys(entry.tournaments).length > 0;

  if (!hasSources && !hasTournaments) return <span>{children}</span>;

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

  const sources = hasSources ? Object.entries(oddsBySource) : [];
  const vigFreeData = sources.length > 1 ? removeVig(oddsBySource) : null;

  const sport = SPORTS.find(s => s.id === entry.sport);
  const tournamentList = hasTournaments ? Object.entries(entry.tournaments).map(([id, data]) => {
    const tConfig = sport?.tournaments?.find(t => t.id === id);
    return { name: tConfig?.name || id, odds: data.odds, isEstimated: data.isEstimated };
  }) : [];

  return (
    <span className="cursor-help underline decoration-dotted decoration-retro-light/30" onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
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
          className="bg-[#0a0a14] text-white text-xs border-2 border-black shadow-[4px_4px_0_0_#000] p-3 pointer-events-none"
        >
          {hasSources && (
            <>
              <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-2">
                ODDS_BY_SOURCE
              </div>
              <div className="space-y-1">
                {sources.map(([source, odds]) => {
                  const isBest = source === entry.bestOddsSource;
                  return (
                    <div key={source} className="flex justify-between">
                      <span className="text-retro-light/60 capitalize font-mono text-[11px]">{source}</span>
                      <span className={`font-mono text-[12px] ${isBest ? 'text-retro-lime font-bold' : 'text-white'}`}>
                        {formatAmericanOdds(odds)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {vigFreeData && vigFreeData.consensus && (
                <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
                  <span className="text-retro-light/40 font-mono text-[11px]">Consensus (vig-free)</span>
                  <span className="font-mono font-bold text-retro-gold text-[12px]">
                    {vigFreeData.consensus}
                  </span>
                </div>
              )}
            </>
          )}

          {hasTournaments && (
            <div className={hasSources ? 'mt-3 border-t border-white/10 pt-3' : ''}>
              <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-2">
                MAJOR_TOURNAMENTS
              </div>
              <div className="space-y-1.5">
                {tournamentList.map((t) => (
                  <div key={t.name} className="flex justify-between items-center">
                    <span className="text-retro-light/60 truncate mr-2 font-mono text-[11px]" title={t.name}>
                      {t.name} {t.isEstimated && <span className="text-[9px] text-white/30 italic">(Est.)</span>}
                    </span>
                    <span className="font-mono text-brand-300 bg-brand-900/40 px-1.5 py-0.5 leading-none border border-brand-800/50 text-[11px]">
                      {formatAmericanOdds(t.odds)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] text-white/30 italic font-mono">
                Main odds show the average across majors
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
