import { formatNumber, formatPercent } from '../../utils/formatters';

export default function EVBreakdown({ entry }) {
  const { ev, scoringType, adpScore, scarcityBonus, evGap } = entry;
  if (!ev || !ev.perFinish) return null;

  const perFinishEntries = Object.entries(ev.perFinish);
  if (perFinishEntries.length === 0) return null;

  const maxDist = ev.dist ? Math.max(...Object.values(ev.dist), 0.01) : 0.01;

  return (
    <div className="space-y-12">
      {/* 1. Monte Carlo Distribution */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-retro text-[9px] text-retro-cyan tracking-widest uppercase">
            &gt; SIM_CORE_OUTPUT
          </h3>
          <div className="flex items-center gap-3 font-retro text-[7px] text-retro-purple">
            <span className="animate-pulse">PROCESSING...</span>
            <span className="text-white/20">5,000_ITERATIONS</span>
          </div>
        </div>
        <div className="bg-black/60 p-8 border-2 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_4px_0_0_rgba(255,255,255,0.05)]">
          <div className="flex items-end gap-2 h-48">
            {ev.dist && Object.entries(ev.dist).map(([pos, prob]) => (
              <div key={pos} className="flex-1 flex flex-col items-center gap-3 group relative">
                <div className="w-full relative flex flex-col justify-end h-full">
                  <div 
                    className="w-full bg-gradient-to-t from-retro-purple via-retro-magenta to-retro-cyan border-t-2 border-white/40 transition-all group-hover:brightness-125 shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                    style={{ height: `${(prob / maxDist) * 100}%` }}
                  >
                  </div>
                </div>
                <span className="font-retro text-[7px] text-white/30 group-hover:text-retro-cyan transition-colors">{pos}</span>
                {prob > 0.01 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-retro text-[6px] text-retro-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {(prob * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="font-retro text-[7px] text-white/20 mt-6 text-center tracking-[0.2em] uppercase">
            DISTRIBUTION_MATRIX_BY_RANK
          </p>
        </div>
      </section>

      {/* 2. EV Calculation Table */}
      <section className="space-y-6">
        <h3 className="font-retro text-[9px] text-retro-cyan border-b border-white/10 pb-3 uppercase">
          &gt; PROBABILITY_WEIGHTS
        </h3>
        <div className="bg-black/40 border-2 border-black shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A1A2E] text-white/40 font-retro text-[7px] tracking-widest uppercase">
              <tr>
                <th className="px-4 py-4 border-b border-white/5">RANK_F</th>
                <th className="px-4 py-4 border-b border-white/5">PROB_P</th>
                <th className="px-4 py-4 border-b border-white/5 text-right">VAL_EV</th>
              </tr>
            </thead>
            <tbody className="font-pixel text-[12px] text-retro-light/80">
              {perFinishEntries.map(([finish, val], idx) => {
                const prob = ev.dist ? (ev.dist[idx + 1] || 0) : 0;
                return (
                  <tr key={finish} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3 text-retro-purple font-retro text-[7px] group-hover:text-retro-cyan">{finish.toUpperCase()}</td>
                    <td className="px-4 py-3 opacity-60 group-hover:opacity-100">{formatPercent(prob)}</td>
                    <td className="px-4 py-3 text-right font-bold text-white group-hover:text-retro-cyan">
                      {val > 0 ? `+${val.toFixed(2)}` : '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#1A1A2E] font-retro text-[8px] border-t-2 border-black">
              <tr>
                <td colSpan={2} className="px-4 py-5 font-bold text-retro-light/40 tracking-widest uppercase">SUM_EVENT_TOTAL</td>
                <td className="px-4 py-5 text-right font-black text-retro-cyan drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                  {ev.singleEvent.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. Long-form ADP Calculation */}
      <section className="space-y-6">
        <h3 className="font-retro text-[9px] text-retro-cyan border-b border-white/10 pb-3 uppercase">
          &gt; ADP_LOGIC_PROCESSOR
        </h3>
        <div className="bg-[#0a0a14] border-2 border-black p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-retro text-[8px] space-y-8 relative overflow-hidden">
          {/* Scanline overlay for this section */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,2px_100%]" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center opacity-40">
              <span>BASE_EV_VAL:</span>
              <span className="text-white">{ev.singleEvent.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-retro-purple uppercase tracking-widest">SEASON_SCALED_VAL:</span>
              <span className="text-2xl text-white font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{ev.seasonTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex justify-between items-start">
              <span className="text-retro-gold font-bold tracking-widest uppercase underline underline-offset-8 decoration-retro-gold/30">SCARCITY_MODIFIER</span>
              <span className="text-2xl text-retro-gold">+{scarcityBonus?.toFixed(2) || '0.00'}</span>
            </div>

            <div className="bg-black/60 border border-white/5 p-6 space-y-3 shadow-inner">
              <div className="flex justify-between opacity-60">
                <span>GAP_TO_NEXT_UNIT:</span>
                <span className="text-retro-light">{(evGap || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between opacity-60">
                <span>CORE_SCARCITY_MULT:</span>
                <span className="text-retro-light">×0.50</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/5 font-bold text-retro-gold">
                <span>CALCULATED_NET_PREMIUM:</span>
                <span>+{scarcityBonus?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t-2 border-white/10 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-[7px] tracking-widest uppercase">OUTPUT_SIGNAL</span>
              <span className="text-white text-sm tracking-[0.3em] font-black uppercase">FINAL_ADP</span>
            </div>
            <div className="text-4xl font-black text-white bg-retro-purple px-6 py-3 border-2 border-white/20 shadow-[0_0_30px_rgba(157,80,187,0.3),inset_2px_2px_0_rgba(255,255,255,0.3)]">
              {adpScore?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
