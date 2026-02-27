import { formatNumber, formatPercent } from '../../utils/formatters';

export default function EVBreakdown({ entry }) {
  const { ev, scoringType, adpScore, scarcityBonus, evGap } = entry;
  if (!ev || !ev.perFinish) return null;

  // 1. Sort distribution entries numerically (1-16) to ensure chart order is correct
  const distEntries = ev.dist 
    ? Object.entries(ev.dist).sort((a, b) => Number(a[0]) - Number(b[0]))
    : [];

  if (distEntries.length === 0) return null;

  const maxDist = Math.max(...distEntries.map(e => e[1]), 0.01);

  return (
    <div className="space-y-12">
      {/* 1. Monte Carlo Distribution */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-retro text-[12px] text-retro-cyan tracking-widest uppercase">
            &gt; SIM_CORE_OUTPUT
          </h3>
          <div className="flex items-center gap-3 font-mono text-[10px] text-retro-purple uppercase">
            <span className="text-retro-lime font-bold">COMPLETED</span>
            <span className="text-white/20">5,000_ITERATIONS</span>
          </div>
        </div>
        <div className="bg-black/60 p-8 border-2 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_4px_0_0_rgba(255,255,255,0.05)]">
          <div className="flex items-stretch gap-2 h-64">
            {distEntries.map(([pos, prob]) => (
              <div key={pos} className="flex-1 flex flex-col group relative">
                {/* The Bar Container */}
                <div className="flex-grow relative flex flex-col justify-end min-h-0 mb-3">
                  <div 
                    className="w-full bg-gradient-to-t from-retro-purple via-retro-magenta to-retro-cyan border-t-2 border-white/40 transition-all group-hover:brightness-125 shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                    style={{ height: `${(prob / maxDist) * 100}%`, minHeight: prob > 0 ? '2px' : '0' }}
                  >
                  </div>
                  {/* Hover Probability Label */}
                  {prob > 0.005 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 font-mono text-[9px] text-retro-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 bg-black/80 px-1 py-0.5 border border-white/10">
                      {(prob * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                {/* Rank Label */}
                <span className="font-mono text-[10px] text-white/30 group-hover:text-retro-cyan transition-colors text-center border-t border-white/5 pt-2">
                  {pos}
                </span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] text-white/20 mt-6 text-center tracking-[0.2em] uppercase">
            DISTRIBUTION_MATRIX_BY_RANK
          </p>
        </div>
      </section>

      {/* 2. EV Calculation Table */}
      <section className="space-y-6">
        <h3 className="font-retro text-[12px] text-retro-cyan border-b border-white/10 pb-3 uppercase">
          &gt; PROBABILITY_WEIGHTS
        </h3>
        <div className="bg-black/40 border-2 border-black shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A1A2E] text-white/40 font-mono text-[10px] tracking-widest uppercase">
              <tr>
                <th className="px-4 py-4 border-b border-white/5">RANK_F</th>
                <th className="px-4 py-4 border-b border-white/5">PROB_P</th>
                <th className="px-4 py-4 border-b border-white/5 text-right">VAL_EV</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px] text-retro-light/80">
              {Object.entries(ev.perFinish).map(([finish, val]) => {
                const rankMatch = finish.match(/(\d+)(?:st|nd|rd|th)?(?:-(\d+))?/);
                let totalProb = 0;
                if (rankMatch && ev.dist) {
                  const start = parseInt(rankMatch[1]);
                  const end = rankMatch[2] ? parseInt(rankMatch[2]) : start;
                  for (let r = start; r <= end; r++) {
                    totalProb += (ev.dist[r] || 0);
                  }
                }

                return (
                  <tr key={finish} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3 text-retro-purple font-mono font-bold group-hover:text-retro-cyan">{finish.toUpperCase()}</td>
                    <td className="px-4 py-3 opacity-60 group-hover:opacity-100 tabular-nums">{formatPercent(totalProb)}</td>
                    <td className="px-4 py-3 text-right font-bold text-white group-hover:text-retro-cyan tabular-nums">
                      {val > 0 ? `+${val.toFixed(2)}` : '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#1A1A2E] font-mono text-[11px] border-t-2 border-black">
              <tr>
                <td colSpan={2} className="px-4 py-5 font-bold text-retro-light/40 tracking-widest uppercase">SUM_EVENT_TOTAL</td>
                <td className="px-4 py-5 text-right font-black text-retro-cyan drop-shadow-[0_0_8px_rgba(0,245,255,0.4)] tabular-nums">
                  {ev.singleEvent.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. Long-form ADP Calculation */}
      <section className="space-y-6">
        <h3 className="font-retro text-[12px] text-retro-cyan border-b border-white/10 pb-3 uppercase">
          &gt; ADP_LOGIC_PROCESSOR
        </h3>
        <div className="bg-[#0a0a14] border-2 border-black p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-mono text-[11px] space-y-8 relative overflow-hidden">
          {/* Scanline overlay for this section */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,2px_100%]" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center opacity-40 uppercase tracking-wider">
              <span>BASE_EV_VAL:</span>
              <span className="text-white tabular-nums">{ev.singleEvent.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-retro-purple uppercase tracking-[0.2em] font-bold">SEASON_SCALED_VAL:</span>
              <span className="text-3xl text-white font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] tabular-nums">{ev.seasonTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex justify-between items-start">
              <span className="text-retro-gold font-bold tracking-widest uppercase underline underline-offset-8 decoration-retro-gold/30">SCARCITY_MODIFIER</span>
              <span className="text-2xl text-retro-gold tabular-nums">+{scarcityBonus?.toFixed(2) || '0.00'}</span>
            </div>

            <div className="bg-black/60 border border-white/5 p-6 space-y-3 shadow-inner uppercase tracking-wider">
              <div className="flex justify-between opacity-60">
                <span>GAP_TO_NEXT_UNIT:</span>
                <span className="text-retro-light tabular-nums">{(evGap || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between opacity-60">
                <span>CORE_SCARCITY_MULT:</span>
                <span className="text-retro-light tabular-nums">×0.50</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/5 font-bold text-retro-gold">
                <span>CALCULATED_NET_PREMIUM:</span>
                <span className="tabular-nums">+{scarcityBonus?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t-2 border-white/10 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-[9px] tracking-widest uppercase">OUTPUT_SIGNAL</span>
              <span className="text-white text-base tracking-[0.3em] font-black uppercase">FINAL_ADP</span>
            </div>
            <div className="text-5xl font-black text-white bg-retro-purple px-8 py-4 border-2 border-white/20 shadow-[0_0_40px_rgba(157,80,187,0.4),inset_2px_2px_0_rgba(255,255,255,0.3)] tabular-nums">
              {adpScore?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
