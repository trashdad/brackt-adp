import { formatNumber, formatPercent } from '../../utils/formatters';

export default function EVBreakdown({ entry }) {
  const { ev, scoringType, adpScore, scarcityBonus, evGap, sport } = entry;
  if (!ev) return null;

  const isQP = scoringType === 'qp';
  const perFinishEntries = Object.entries(ev.perFinish);
  const maxEVLine = Math.max(...perFinishEntries.map(e => e[1]), 0.1);
  const maxDist = ev.dist ? Math.max(...Object.values(ev.dist), 0.01) : 0.01;

  return (
    <div className="space-y-10">
      {/* 1. Monte Carlo Distribution */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-4 border-black pb-2">
          <h3 className="font-retro text-[10px] text-snes-blue tracking-widest">
            SIMULATION_RESULT
          </h3>
          <span className="font-retro text-[8px] text-snes-purple animate-pulse">CPU_ACTIVE</span>
        </div>
        <div className="bg-black p-6 border-4 border-snes-dark shadow-[inset_-4px_-4px_0_0_#444,inset_4px_4px_0_0_#111]">
          <div className="flex items-end gap-1.5 h-40">
            {ev.dist && Object.entries(ev.dist).map(([pos, prob]) => (
              <div key={pos} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative flex flex-col justify-end h-full">
                  <div 
                    className="w-full bg-snes-purple border border-white/20 transition-all group-hover:bg-snes-lavender"
                    style={{ height: `${(prob / maxDist) * 100}%`, imageRendering: 'pixelated' }}
                  >
                  </div>
                </div>
                <span className="font-retro text-[7px] text-gray-400">{pos}</span>
              </div>
            ))}
          </div>
          <p className="font-retro text-[7px] text-snes-lavender mt-4 text-center tracking-tighter">
            PROBABILITY_MAP_PER_RANK (5K_RUNS)
          </p>
        </div>
      </section>

      {/* 2. EV Calculation Table */}
      <section className="space-y-4">
        <h3 className="font-retro text-[10px] text-snes-blue border-b-4 border-black pb-2">
          POINTS_ALGORITHM
        </h3>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-snes-dark text-white font-retro text-[8px] tracking-tighter">
              <tr>
                <th className="px-3 py-3 border-b-2 border-black">FINISH</th>
                <th className="px-3 py-3 border-b-2 border-black">PROB</th>
                <th className="px-3 py-3 border-b-2 border-black text-right">EV</th>
              </tr>
            </thead>
            <tbody className="font-pixel text-[11px]">
              {perFinishEntries.map(([finish, val], idx) => {
                const prob = ev.dist ? (ev.dist[idx + 1] || 0) : 0;
                return (
                  <tr key={finish} className="border-b border-black/10 hover:bg-snes-lavender/10">
                    <td className="px-3 py-2 text-snes-blue font-retro text-[8px]">{finish.toUpperCase()}</td>
                    <td className="px-3 py-2 text-gray-500">{formatPercent(prob)}</td>
                    <td className="px-3 py-2 text-right font-bold text-black">
                      {val > 0 ? `+${val.toFixed(2)}` : '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-snes-light font-retro text-[9px] border-t-2 border-black">
              <tr>
                <td colSpan={2} className="px-3 py-3 font-bold text-snes-blue">TOTAL_EV</td>
                <td className="px-3 py-3 text-right font-black text-red-600">
                  {ev.singleEvent.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 3. Long-form ADP Calculation */}
      <section className="space-y-4">
        <h3 className="font-retro text-[10px] text-snes-blue border-b-4 border-black pb-2">
          CALCULATION_CORE
        </h3>
        <div className="bg-snes-blue text-white p-6 border-4 border-black shadow-[4px_4px_0_0_#A18FD1] font-retro text-[9px] space-y-6">
          <div className="space-y-3 border-b-2 border-white/10 pb-4">
            <div className="flex justify-between items-center opacity-60">
              <span>SINGLE_EV_BASE:</span>
              <span>{ev.singleEvent.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-snes-lavender uppercase">Season_Result:</span>
              <span className="text-lg text-white font-black underline decoration-red-500">{ev.seasonTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-red-400 font-bold">SCARCITY_BONUS</span>
              <span className="text-lg text-red-500">+{scarcityBonus?.toFixed(2) || '0.00'}</span>
            </div>

            <div className="bg-black/40 border-2 border-white/20 p-4 space-y-2 text-[8px] tracking-tighter">
              <div className="flex justify-between">
                <span>GAP_TO_NEXT:</span>
                <span className="text-snes-lavender">{(evGap || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SCARCITY_MULT:</span>
                <span className="text-snes-lavender">×0.50</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white">
                <span>NET_BONUS:</span>
                <span>+{scarcityBonus?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t-4 border-white border-double">
            <span className="text-white text-sm">FINAL_ADP:</span>
            <span className="text-2xl font-black text-white bg-red-600 px-3 py-1 border-4 border-black shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.3)]">
              {adpScore?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
