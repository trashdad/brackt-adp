import { useState } from 'react';
import { STANDARD_SCORING, QP_SCORING } from '../../data/scoring';
import { formatNumber } from '../../utils/formatters';

const TOOLTIP_WIDTH = 280;

/**
 * Back-calculate the total tier probability from the stored EV contribution.
 * perFinish[tier] = tierTotalProb × points, so prob = ev / points.
 */
function TierRow({ finish, evContrib, points, evClass = 'text-green-400' }) {
  const prob = points > 0 ? (evContrib / points) * 100 : 0;
  return (
    <tr className="border-b border-gray-800 text-right">
      <td className="py-0.5 text-left text-gray-300">{finish}</td>
      <td className="py-0.5 font-mono text-gray-400">{prob.toFixed(1)}%</td>
      <td className="py-0.5 font-mono text-gray-500">×{points}</td>
      <td className={`py-0.5 font-mono ${evClass}`}>{evContrib.toFixed(2)}</td>
    </tr>
  );
}

function TableHead({ ptLabel = 'Pts' }) {
  return (
    <thead>
      <tr className="text-gray-500 border-b border-gray-700 text-right">
        <th className="text-left pb-1 font-normal">Finish</th>
        <th className="pb-1 font-normal">Prob</th>
        <th className="pb-1 font-normal">{ptLabel}</th>
        <th className="pb-1 font-normal">EV</th>
      </tr>
    </thead>
  );
}

export default function EVTooltip({ entry, children }) {
  const [pos, setPos] = useState(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ x, y: rect.bottom + 6 });
  };

  const { ev, odds } = entry;
  const oddsNum = Math.abs(parseFloat(odds));
  const isPositive = parseFloat(odds) >= 0;
  const formula = isPositive
    ? `100÷(${oddsNum}+100) = ${ev.winProbability}%`
    : `${oddsNum}÷(${oddsNum}+100) = ${ev.winProbability}%`;

  return (
    <span className="cursor-default" onMouseEnter={handleMouseEnter} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <div
          style={{ position: 'fixed', top: pos.y, left: pos.x, width: TOOLTIP_WIDTH, zIndex: 9999 }}
          className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 pointer-events-none"
        >
          {/* Odds → win probability */}
          <div className="mb-2 text-gray-400">
            <span className="font-mono text-white">{odds}</span>
            <span className="mx-1">→</span>
            <span className="font-mono text-yellow-300">{formula}</span>
          </div>

          {ev.isQP ? (
            <>
              {/* Stage 1: per-event QP */}
              <div className="text-gray-500 uppercase tracking-wide text-[10px] mb-1">
                Per-event QP
              </div>
              <table className="w-full mb-1">
                <TableHead ptLabel="QP" />
                <tbody>
                  {QP_SCORING.map((tier) => (
                    <TierRow
                      key={tier.finish}
                      finish={tier.finish}
                      evContrib={ev.perFinish[tier.finish] || 0}
                      points={tier.points}
                      evClass="text-blue-300"
                    />
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between text-gray-400 mb-3 border-b border-gray-700 pb-2">
                <span>E[QP/event]</span>
                <span className="font-mono text-white">
                  {formatNumber(ev.expectedQPPerEvent)} <span className="text-gray-600">of 20 max</span>
                </span>
              </div>

              {/* Stage 2: season rank → standard scoring */}
              <div className="text-gray-500 uppercase tracking-wide text-[10px] mb-1">
                Season rank · standard scoring
              </div>
              <div className="text-gray-400 mb-1">
                Season strength:{' '}
                <span className="font-mono text-yellow-300">{ev.seasonStrength}%</span>
                <span className="text-gray-600"> ({formatNumber(ev.expectedQPPerEvent)}÷20)</span>
              </div>
              <table className="w-full mb-2">
                <TableHead />
                <tbody>
                  {STANDARD_SCORING.map((tier) => (
                    <TierRow
                      key={tier.finish}
                      finish={tier.finish}
                      evContrib={ev.seasonPerFinish[tier.finish] || 0}
                      points={tier.points}
                    />
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-gray-400">Season EV</span>
                <span className="font-mono font-bold text-green-300">{formatNumber(ev.seasonTotal)}</span>
              </div>
            </>
          ) : (
            <>
              {/* Standard sports: single-stage */}
              <table className="w-full mb-2">
                <TableHead />
                <tbody>
                  {STANDARD_SCORING.map((tier) => (
                    <TierRow
                      key={tier.finish}
                      finish={tier.finish}
                      evContrib={ev.perFinish[tier.finish] || 0}
                      points={tier.points}
                    />
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-700 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Event EV</span>
                  <span className="font-mono font-semibold text-white">{formatNumber(ev.singleEvent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Season EV</span>
                  <span className="font-mono font-bold text-green-300">{formatNumber(ev.seasonTotal)}</span>
                </div>
              </div>
            </>
          )}

          {/* Scarcity premium — shown for any entry with a meaningful intra-sport gap */}
          {entry.scarcityBonus > 0 && (
            <div className="border-t border-gray-700 pt-2 mt-1 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">EV Gap (sport)</span>
                <span className="font-mono text-yellow-200">+{entry.evGap.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Scarcity Bonus</span>
                <span className="font-mono text-orange-300">+{entry.scarcityBonus.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ADP Score</span>
                <span className="font-mono font-bold text-white">{entry.adpScore.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
