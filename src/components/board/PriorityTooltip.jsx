import { formatNumber } from '../../utils/formatters';
import { useTooltip } from '../../hooks/useTooltip.jsx';

export default function PriorityTooltip({ entry, children }) {
  const { handleMouseMove, handleMouseLeave, renderTooltip } = useTooltip(320, 450);

  if (entry.isPlaceholder || !entry.math) return <span>{children}</span>;

  const m = entry.math;
  const score = entry.adpScore || 0;

  return (
    <span
      className="cursor-help underline decoration-dotted decoration-brand-300"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {renderTooltip(
        <>
          <div className="font-retro text-[8px] text-white/40 uppercase tracking-wide mb-3 border-b border-white/10 pb-1">
            DPS_MATHEMATICAL_BREAKDOWN
          </div>

          <div className="space-y-2">
            {/* Step 1: Marginal Value (VOR) */}
            <div className="space-y-0.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Season EV</span>
                <span className="font-mono text-white">{formatNumber(m.rawEV)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Replacement EV</span>
                <span className="font-mono text-retro-red">-{formatNumber(m.replacementEV)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-t border-white/5 mt-0.5 pt-0.5">
                <span className="text-retro-cyan font-mono font-bold">Marginal Value (VOR)</span>
                <span className="font-mono text-retro-cyan font-bold">{formatNumber(m.marginalValue)}</span>
              </div>
              <p className="text-[7px] text-white/20 italic leading-tight">Value over the last draftable player in this sport.</p>
            </div>

            {/* Step 2: Hybrid Value */}
            <div className="bg-white/5 p-1.5 rounded space-y-0.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Hybrid (50% VOR / 50% EV)</span>
                <span className="font-mono text-white">{formatNumber(m.hybridValue)}</span>
              </div>
              <p className="text-[7px] text-white/20 italic leading-tight">Balances raw point volume with positional scarcity.</p>
            </div>

            {/* Step 3: Risk Adjustment */}
            <div className="space-y-0.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Stability Sigma (Risk)</span>
                <span className="font-mono text-retro-purple">{formatNumber(m.sigma, 2)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Efficiency (Points/Risk)</span>
                <span className="font-mono text-retro-lime font-bold">{formatNumber(m.efficiency, 2)}</span>
              </div>
              <p className="text-[7px] text-white/20 italic leading-tight">
                {m.events > 1 
                  ? `Stability Model: Sigma reduced by sqrt(${m.events}) events.` 
                  : "Standard Model: Single-event variance applied."}
              </p>
            </div>

            {/* Step 4: Multipliers */}
            <div className="border-t border-white/10 pt-1.5 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Confidence (GCI)</span>
                <span className="font-mono text-white">x{m.confidenceMult.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Eff. Floor Boost</span>
                <span className="font-mono text-white">x{m.efficiencyMult.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Adj. SQ (Sentiment)</span>
                <span className="font-mono text-white">x{m.adjSq.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-retro-light/50 font-mono">Scarcity Bonus</span>
                <span className="font-mono text-retro-gold">+{formatNumber(m.scarcityBonus)}</span>
              </div>
            </div>
          </div>

          {/* Final Score */}
          <div className="border-t border-white/20 mt-3 pt-2 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="font-retro text-[9px] text-retro-cyan uppercase">FINAL_DPS</span>
              <span className="font-mono font-black text-retro-lime text-[16px] drop-shadow-[0_0_5px_rgba(163,230,53,0.5)]">
                {formatNumber(score)}
              </span>
            </div>
            <div className="text-[7px] text-white/40 uppercase tracking-tighter text-right font-retro">
              Model: {m.modelUsed}
            </div>
          </div>
        </>,
        'p-4 bg-[#1a1a2e] border border-retro-cyan/30 shadow-[0_0_20px_rgba(0,255,255,0.1)]',
      )}
    </span>
  );
}
