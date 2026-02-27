import { formatNumber } from '../../utils/formatters';
import { useTooltip } from '../../hooks/useTooltip.jsx';

const SOURCE_LABELS = {
  reddit: { label: 'Reddit', color: 'text-orange-400' },
  bluesky: { label: 'Bluesky', color: 'text-sky-400' },
  news: { label: 'News', color: 'text-emerald-400' },
  rankings: { label: 'Rankings', color: 'text-yellow-400' },
};

export default function SocialTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(240, 180);

  if (entry.isPlaceholder) return <span>{children}</span>;

  const score = entry.socialScore || 0;
  const quotient = entry.socialQuotient || 1.0;
  const sources = entry.socialSources || {};
  const hasSources = Object.keys(sources).length > 0;

  if (score <= 0 && !hasSources) return <span>{children}</span>;

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
            SOCIAL_SIGNAL
          </div>

          {hasSources ? (
            <div className="space-y-1.5">
              {Object.entries(sources).map(([key, data]) => {
                const config = SOURCE_LABELS[key] || { label: key, color: 'text-white' };
                return (
                  <div key={key} className="flex justify-between items-center">
                    <span className={`font-mono text-[11px] ${config.color}`}>
                      {config.label}
                      {data.mentions > 0 && (
                        <span className="text-white/30 ml-1">({data.mentions})</span>
                      )}
                      {data.articles > 0 && (
                        <span className="text-white/30 ml-1">({data.articles} art.)</span>
                      )}
                      {data.avgRank > 0 && (
                        <span className="text-white/30 ml-1">(#{data.avgRank})</span>
                      )}
                    </span>
                    <span className="font-mono text-[12px] text-white">
                      {formatNumber(data.score)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-white/40 font-mono text-[11px]">
              No source breakdown available
            </div>
          )}

          <div className="border-t border-white/10 mt-2 pt-2 flex justify-between items-center">
            <span className="font-retro text-[9px] text-retro-cyan uppercase">TOTAL</span>
            <span className="font-mono font-bold text-retro-lime text-[13px]">
              {formatNumber(score)}
            </span>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="font-retro text-[9px] text-retro-gold uppercase">EV_MULT</span>
            <span className="font-mono font-bold text-retro-gold text-[13px]">
              {quotient.toFixed(2)}x
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-[9px] text-white/30 leading-relaxed italic font-mono">
              Social quotient multiplies Season EV. Sources: Reddit, Bluesky, News, Rankings.
            </div>
          </div>
        </>,
        'p-3',
      )}
    </span>
  );
}
