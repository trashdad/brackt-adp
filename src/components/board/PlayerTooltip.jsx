import { formatAmericanOdds } from '../../services/oddsConverter';
import { useTooltip } from '../../hooks/useTooltip.jsx';

export default function PlayerTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(280, 240);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const expertComments = entry.expertComments || [];
  const consensusOdds = formatAmericanOdds(entry.odds);

  return (
    <span
      className="cursor-help"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip(
        <>
          <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-2">
            CANDIDATE_INSIGHTS
          </div>

          <div className="mb-3">
            <div className="text-[10px] text-retro-cyan/60 uppercase font-mono mb-1">Market Consensus</div>
            <div className="text-[18px] font-mono font-bold text-retro-light drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              {consensusOdds}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="text-[10px] text-retro-gold/60 uppercase font-mono mb-1">Expert Consensus Summary</div>
            {expertComments.length > 0 ? (
              expertComments.map((comment, i) => (
                <div key={i} className="flex gap-2 group">
                  <span className="text-retro-gold/40 font-mono text-[11px] mt-0.5">•</span>
                  <p className="text-[11px] text-retro-light/90 leading-relaxed font-mono">
                    {comment}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-white/30 italic font-mono">
                No expert commentary available for this candidate.
              </p>
            )}
          </div>

          {/* Social sentiment (moved from table column) */}
          {(entry.socialPos > 0 || entry.socialNeg > 0) && (
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="text-[10px] text-retro-gold/60 uppercase font-mono mb-1">Social Sentiment</div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[11px] text-retro-lime font-bold">{entry.socialPos || 0}</span>
                  <span className="font-mono text-[9px] text-white/30">POS</span>
                </div>
                <span className="text-white/20">/</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[11px] text-retro-red font-bold">{entry.socialNeg || 0}</span>
                  <span className="font-mono text-[9px] text-white/30">NEG</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-white/10">
            <div className="text-[9px] text-white/20 leading-relaxed italic font-mono">
              Market consensus derived from aggregate sportsbook feeds. Expert summaries compiled from 12+ verified sports periodicals.
            </div>
          </div>
        </>,
        'p-4 bg-[#1A1A2E]/95 backdrop-blur-md border border-retro-cyan/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]',
      )}
    </span>
  );
}
