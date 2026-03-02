import { useTooltip } from '../../hooks/useTooltip.jsx';
import { IKYN_SCORE_TABLE } from '../../utils/ikynEV';

const POS_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];

export default function WAEVTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(240, 300);

  const detail = entry.ikynDetail;
  if (!detail?.waEV) return <span>{children}</span>;

  const { waEV, waPosProbs, winProb, winProbNorm, dpsShare, pBlend, sportSumP, sportAlpha } = detail;
  const rawPct    = winProb != null ? (winProb * 100) : null;
  const normPct   = winProbNorm != null ? (winProbNorm * 100) : null;
  const dpsPct    = (dpsShare * 100);
  const blendPct  = (pBlend * 100);
  const alphaPct  = sportAlpha != null ? (sportAlpha * 100).toFixed(0) : '0';

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
            <span className="font-retro text-[8px] text-white/40 uppercase tracking-widest">WA_EV</span>
            <span className="font-mono text-[13px] font-black text-retro-cyan">{waEV.toFixed(2)}</span>
          </div>

          {/* Calibration info */}
          <div className="flex justify-between">
            <span className="font-mono text-[9px] text-white/30 uppercase">Sport α (DPS weight)</span>
            <span className="font-mono text-[10px] text-retro-purple/80">{alphaPct}%</span>
          </div>

          {/* Blend components */}
          <div className="space-y-1">
            {sportAlpha > 0 && (
              <div className="flex justify-between">
                <span className="font-mono text-[9px] text-white/40 uppercase">DPS share ({alphaPct}%)</span>
                <span className="font-mono text-[10px] text-retro-lime">{dpsPct.toFixed(2)}%</span>
              </div>
            )}
            {rawPct != null && (
              <>
                <div className="flex justify-between">
                  <span className="font-mono text-[9px] text-white/40 uppercase">Market p (raw)</span>
                  <span className="font-mono text-[10px] text-white/40">{rawPct.toFixed(2)}%</span>
                </div>
                {sportSumP > 1 && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-white/40 uppercase">Sport Σp</span>
                    <span className="font-mono text-[10px] text-retro-red/60">{(sportSumP * 100).toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-mono text-[9px] text-white/40 uppercase">
                    Market p norm ({(100 - parseFloat(alphaPct)).toFixed(0)}%)
                  </span>
                  <span className="font-mono text-[10px] text-retro-gold">{normPct.toFixed(2)}%</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-white/5 pt-1">
              <span className="font-mono text-[9px] text-retro-cyan/70 uppercase">p_blend</span>
              <span className="font-mono text-[10px] font-bold text-retro-cyan">{blendPct.toFixed(2)}%</span>
            </div>
          </div>

          {/* Per-position breakdown */}
          <div className="border-t border-white/10 pt-2">
            <div className="font-retro text-[7px] text-white/30 uppercase tracking-widest mb-1.5">
              Pos · P(k) · Pts · EV contrib
            </div>
            <div className="space-y-0.5">
              {waPosProbs.map((prob, i) => {
                const pts     = IKYN_SCORE_TABLE[i];
                const contrib = prob * pts;
                const barW    = Math.round(prob * 100 * 4);
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
                    <span className="font-mono text-[9px] text-retro-cyan/80 w-8 text-right shrink-0 tabular-nums">
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
              α auto-calibrated per sport → Σ WA_EV ≤ 340<br />
              p = α×dps + (1-α)×mktNorm<br />
              P(k) = p × (1-p)^k<br />
              WA_EV = Σ score[k] × P(k)
            </p>
          </div>
        </div>,
      )}
    </span>
  );
}
