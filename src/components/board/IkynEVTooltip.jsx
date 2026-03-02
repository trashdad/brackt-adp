import { useTooltip } from '../../hooks/useTooltip.jsx';
import { IKYN_SCORE_TABLE } from '../../utils/ikynEV';

const POS_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];

export default function IkynEVTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(240, 260);

  const detail = entry.ikynDetail;
  if (!detail) return <span>{children}</span>;

  const { ev, posProbs, dps, sportTotal, fieldSize, isPlaceholder } = detail;
  const dpsShare = sportTotal > 0 ? (dps / sportTotal) * 100 : 0;

  return (
    <span
      className="cursor-help"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip(
        <div className="p-3 space-y-2">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-retro text-[8px] text-white/40 uppercase tracking-widest">IKYN_EV</span>
            <span className="font-mono text-[13px] font-black text-retro-lime">{ev.toFixed(2)}</span>
          </div>

          {/* Placeholder notice */}
          {isPlaceholder && (
            <div className="bg-retro-gold/10 border border-retro-gold/20 px-2 py-1">
              <p className="font-mono text-[8px] text-retro-gold/70 leading-tight">
                NO LIVE ODDS — baseline DPS used<br />
                (50% of sport min · dilution only)
              </p>
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-white/40 uppercase">DPS {isPlaceholder ? '(baseline)' : '(strength)'}</span>
              <span className={`font-mono text-[10px] ${isPlaceholder ? 'text-retro-gold/60' : 'text-retro-cyan'}`}>{dps.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-white/40 uppercase">Sport DPS total</span>
              <span className="font-mono text-[10px] text-white/60">{sportTotal.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-white/40 uppercase">DPS share</span>
              <span className="font-mono text-[10px] text-retro-gold">{dpsShare.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-white/40 uppercase">Field size</span>
              <span className="font-mono text-[10px] text-white/60">{fieldSize}</span>
            </div>
          </div>

          {/* Per-position breakdown */}
          <div className="border-t border-white/10 pt-2">
            <div className="font-retro text-[7px] text-white/30 uppercase tracking-widest mb-1.5">
              Pos · Prob · Pts · EV contrib
            </div>
            <div className="space-y-0.5">
              {posProbs.map((prob, i) => {
                const pts = IKYN_SCORE_TABLE[i];
                const contrib = prob * pts;
                const barW = Math.round(prob * 100 * 2); // scale for display
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="font-retro text-[8px] text-white/30 w-6 shrink-0">{POS_LABELS[i]}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-retro-cyan/50 rounded-sm"
                        style={{ width: `${Math.min(barW, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-white/40 w-8 text-right shrink-0">
                      {(prob * 100).toFixed(1)}%
                    </span>
                    <span className="font-mono text-[8px] text-white/25 w-5 text-right shrink-0">
                      ×{pts}
                    </span>
                    <span className="font-mono text-[9px] text-retro-lime/80 w-8 text-right shrink-0 tabular-nums">
                      {contrib.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formula note */}
          <div className="border-t border-white/5 pt-1.5">
            <p className="font-mono text-[7px] text-white/20 leading-tight italic">
              Plackett-Luce MC · 300k sims<br />
              EV = Σ P(pos_i) × score(pos_i)<br />
              {isPlaceholder ? 'Unknowns: DPS = min(sport) × 0.5' : `Full field: ${fieldSize} competitors`}
            </p>
          </div>
        </div>,
      )}
    </span>
  );
}
