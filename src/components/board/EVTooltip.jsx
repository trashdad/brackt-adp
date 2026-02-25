import { useState } from 'react';
import { americanToImpliedProbability } from '../../services/oddsConverter';
import { getScoringTable } from '../../data/scoring';
import { formatNumber } from '../../utils/formatters';

function estimateFinishProbs(winProb) {
  const p1 = winProb;
  const p2 = Math.min(winProb * 1.2, 0.4);
  const p3 = Math.min(winProb * 1.1, 0.35);
  const p4 = Math.min(winProb * 1.0, 0.3);
  const usedTop4 = p1 + p2 + p3 + p4;
  const remaining = Math.max(0, 1 - usedTop4);
  return {
    1: p1, 2: p2, 3: p3, 4: p4,
    5: remaining * 0.25, 6: remaining * 0.25,
    7: remaining * 0.15, 8: remaining * 0.15,
    9: remaining * 0.06, 10: remaining * 0.06,
    11: remaining * 0.06, 12: remaining * 0.06,
    13: remaining * 0.02, 14: remaining * 0.02,
    15: remaining * 0.02, 16: remaining * 0.02,
  };
}

const TOOLTIP_WIDTH = 272;

export default function EVTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ x, y: rect.bottom + 6 });
  };

  const winProb = americanToImpliedProbability(entry.odds);
  const winPct = (winProb * 100).toFixed(1);
  const oddsNum = Math.abs(parseFloat(entry.odds));
  const isPositive = parseFloat(entry.odds) >= 0;
  const formula = isPositive
    ? `100 ÷ (${oddsNum}+100) = ${winPct}%`
    : `${oddsNum} ÷ (${oddsNum}+100) = ${winPct}%`;

  const probs = estimateFinishProbs(winProb);
  const scoringTable = getScoringTable(entry.scoringType);

  const rows = scoringTable.map((tier) => {
    const [start, end] = tier.range;
    let tierProb = 0;
    for (let p = start; p <= end; p++) tierProb += probs[p] || 0;
    return {
      finish: tier.finish,
      prob: (tierProb * 100).toFixed(1),
      points: tier.points,
      ev: (tierProb * tier.points).toFixed(2),
    };
  });

  return (
    <span
      className="cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          style={{
            position: 'fixed',
            top: pos.y,
            left: pos.x,
            width: TOOLTIP_WIDTH,
            zIndex: 9999,
          }}
          className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 pointer-events-none"
        >
          {/* Odds → Win prob */}
          <div className="mb-2 text-gray-400">
            <span className="font-mono text-white">{entry.odds}</span>
            <span className="mx-1">→</span>
            <span className="font-mono text-yellow-300">{formula}</span>
          </div>

          {/* Per-finish breakdown */}
          <table className="w-full mb-2">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700 text-right">
                <th className="text-left pb-1 font-normal">Finish</th>
                <th className="pb-1 font-normal">Prob</th>
                <th className="pb-1 font-normal">Pts</th>
                <th className="pb-1 font-normal">EV</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.finish} className="border-b border-gray-800 text-right">
                  <td className="py-0.5 text-left text-gray-300">{r.finish}</td>
                  <td className="py-0.5 font-mono text-gray-400">{r.prob}%</td>
                  <td className="py-0.5 font-mono text-gray-500">×{r.points}</td>
                  <td className="py-0.5 font-mono text-green-400">{r.ev}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-gray-700 pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Event EV</span>
              <span className="font-mono font-semibold text-white">
                {formatNumber(entry.ev.singleEvent)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">
                ×{entry.ev.eventsPerSeason} events = Season EV
              </span>
              <span className="font-mono font-bold text-green-300">
                {formatNumber(entry.ev.seasonTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
