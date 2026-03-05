import { useTooltip } from '../../hooks/useTooltip.jsx';
import { getConfidenceTier } from '../../utils/confidenceScore';

export default function ConfidenceTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(260, 280);

  if (entry.isPlaceholder || entry.ccs == null) return <span>{children}</span>;

  const detail = entry.ikynDetail;
  const ccs = entry.ccs;
  const pm = entry.plusMinus;
  const pmPct = entry.plusMinusPct;
  const tier = entry.confidenceTier;
  const raWev = entry.riskAdjustedWEV;

  // Model agreement
  const ikynEV = detail?.ev;
  const waEV = detail?.waEV;
  const modelDelta = (ikynEV != null && waEV != null) ? Math.abs(ikynEV - waEV) : null;

  // Determine which probs we used for entropy
  const model = detail?.wizardModel;
  const probs = model === 'ikyn' ? detail?.posProbs : detail?.waPosProbs;

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
            <span className="font-retro text-[8px] text-white/40 uppercase tracking-widest">CONFIDENCE</span>
            <div className="text-right">
              <span className={`font-mono text-[13px] font-black ${entry.confidenceColor}`}>
                {pm != null ? `\u00b1${pm.toFixed(1)}` : '\u2014'}
              </span>
              <span className="font-mono text-[9px] text-white/30 ml-1">
                ({pmPct != null ? `${pmPct.toFixed(0)}%` : '\u2014'})
              </span>
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-white/40 uppercase">Certainty Tier</span>
            <span className={`font-retro text-[10px] font-bold ${entry.confidenceColor}`}>
              {tier}
            </span>
          </div>

          {/* CCS score */}
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-white/40 uppercase">Composite Score (CCS)</span>
            <span className="font-mono text-[10px] text-retro-cyan">{(ccs * 100).toFixed(1)}%</span>
          </div>

          {/* Component breakdown */}
          <div className="border-t border-white/10 pt-2 space-y-1">
            <div className="font-retro text-[7px] text-white/30 uppercase tracking-widest mb-1">
              Components
            </div>

            {/* Entropy */}
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-white/40">Distribution Entropy (50%)</span>
              <span className="font-mono text-[10px] text-retro-purple">
                {probs ? (1 - computeEntropyRatio(probs)).toFixed(2) : '\u2014'}
              </span>
            </div>

            {/* Model agreement */}
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-white/40">Model Agreement (25%)</span>
              <span className="font-mono text-[10px] text-retro-lime">
                {modelDelta != null ? `\u0394${modelDelta.toFixed(1)}` : 'N/A'}
              </span>
            </div>

            {/* Sport predictability */}
            <div className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-white/40">Sport Predictability (25%)</span>
              <span className="font-mono text-[10px] text-retro-gold">
                {tier}
              </span>
            </div>
          </div>

          {/* Entropy bar visualization */}
          {probs && (
            <div className="border-t border-white/10 pt-2">
              <div className="font-retro text-[7px] text-white/30 uppercase tracking-widest mb-1">
                Probability Spread
              </div>
              <div className="flex gap-0.5 items-end h-6">
                {probs.slice(0, 8).map((p, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-retro-cyan/40 rounded-t-sm"
                    style={{ height: `${Math.max(p * 100 * 4, 1)}%` }}
                    title={`Pos ${i + 1}: ${(p * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[7px] text-white/20">1st</span>
                <span className="font-mono text-[7px] text-white/20">8th</span>
              </div>
            </div>
          )}

          {/* Risk-adjusted EV */}
          {raWev != null && (
            <div className="border-t border-white/10 pt-2 flex justify-between items-center">
              <span className="font-mono text-[9px] text-white/40 uppercase">Risk-Adj. WizEV</span>
              <span className="font-mono text-[11px] font-bold text-retro-purple">{raWev.toFixed(1)}</span>
            </div>
          )}

          {/* Explanation */}
          <div className="border-t border-white/5 pt-1.5">
            <p className="font-mono text-[7px] text-white/20 leading-tight italic">
              Error band = how much this pick's value could vary.<br />
              Tight bands (green) = reliable signal.<br />
              Wide bands (red) = high variance, less certainty.
            </p>
          </div>
        </div>,
      )}
    </span>
  );
}

function computeEntropyRatio(probs) {
  const maxH = Math.log2(8);
  let H = 0;
  for (const p of probs) {
    if (p > 0) H -= p * Math.log2(p);
  }
  return H / maxH;
}
