import { useTooltip } from '../../hooks/useTooltip.jsx';
import { IKYN_SCORE_TABLE } from '../../utils/ikynEV';

const POS_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];

export default function WizardEVTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(280, 380);

  const detail = entry.ikynDetail;
  if (!detail) return <span>{children}</span>;

  const { ev: ikynEV, waEV, wizardEV, wizardModel, posProbs, waPosProbs,
          dps, sportTotal, fieldSize, isPlaceholder,
          wizardWinPct, winProb } = detail;

  const isIkyn = wizardModel === 'ikyn';
  const activeProbs = isIkyn ? posProbs : waPosProbs;
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
            <span className="font-retro text-[8px] text-white/40 uppercase tracking-widest">WIZARD_EV</span>
            <span className="font-mono text-[13px] font-black text-retro-purple">
              {wizardEV?.toFixed(2) ?? '\u2014'}
            </span>
          </div>

          {/* Model badge */}
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-white/40 uppercase">Model</span>
            <span className={`font-retro text-[9px] px-1.5 py-0.5 ${isIkyn ? 'bg-retro-lime/10 text-retro-lime' : 'bg-retro-cyan/10 text-retro-cyan'}`}>
              {isIkyn ? 'PL-MC (300k sims)' : 'PL-WA (prob-first)'}
            </span>
          </div>

          {/* Both model values */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-1.5 ${isIkyn ? 'bg-white/5 border border-retro-lime/20' : 'bg-white/3'}`}>
              <div className="font-mono text-[7px] text-white/30 uppercase">IKYN_EV</div>
              <div className={`font-mono text-[12px] font-bold ${isIkyn ? 'text-retro-lime' : 'text-white/40'}`}>
                {ikynEV?.toFixed(1) ?? '\u2014'}
              </div>
            </div>
            <div className={`p-1.5 ${!isIkyn ? 'bg-white/5 border border-retro-cyan/20' : 'bg-white/3'}`}>
              <div className="font-mono text-[7px] text-white/30 uppercase">WA_EV</div>
              <div className={`font-mono text-[12px] font-bold ${!isIkyn ? 'text-retro-cyan' : 'text-white/40'}`}>
                {waEV?.toFixed(1) ?? '\u2014'}
              </div>
            </div>
          </div>

          {/* Key inputs */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40 font-mono">DPS share</span>
              <span className="font-mono text-retro-gold">{dpsShare.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40 font-mono">Field size</span>
              <span className="font-mono text-white/60">{fieldSize}</span>
            </div>
            {winProb != null && (
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40 font-mono">Implied Win%</span>
                <span className="font-mono text-retro-gold">{(winProb * 100).toFixed(2)}%</span>
              </div>
            )}
            {wizardWinPct != null && (
              <div className="flex justify-between text-[10px]">
                <span className="text-white/40 font-mono">Wizard Win%</span>
                <span className="font-mono text-retro-cyan">{(wizardWinPct * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Per-position breakdown */}
          {activeProbs && (
            <div className="border-t border-white/10 pt-2">
              <div className="font-retro text-[7px] text-white/30 uppercase tracking-widest mb-1.5">
                Pos {'\u00b7'} Prob {'\u00b7'} Pts {'\u00b7'} EV
              </div>
              <div className="space-y-0.5">
                {activeProbs.map((prob, i) => {
                  const pts = IKYN_SCORE_TABLE[i];
                  const contrib = prob * pts;
                  const barW = Math.round(prob * 100 * 3);
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="font-retro text-[8px] text-white/30 w-6 shrink-0">{POS_LABELS[i]}</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm ${isIkyn ? 'bg-retro-lime/40' : 'bg-retro-cyan/40'}`}
                          style={{ width: `${Math.min(barW, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[8px] text-white/40 w-8 text-right shrink-0">
                        {(prob * 100).toFixed(1)}%
                      </span>
                      <span className="font-mono text-[8px] text-white/25 w-5 text-right shrink-0">
                        {'\u00d7'}{pts}
                      </span>
                      <span className={`font-mono text-[9px] w-8 text-right shrink-0 tabular-nums ${isIkyn ? 'text-retro-lime/80' : 'text-retro-cyan/80'}`}>
                        {contrib.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isPlaceholder && (
            <div className="bg-retro-gold/10 border border-retro-gold/20 px-2 py-1">
              <p className="font-mono text-[8px] text-retro-gold/70 leading-tight">
                NO LIVE ODDS {'\u2014'} baseline DPS used (50% of sport min)
              </p>
            </div>
          )}
        </div>,
      )}
    </span>
  );
}
