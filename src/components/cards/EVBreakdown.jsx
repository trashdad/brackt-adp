import { formatNumber } from '../../utils/formatters';

export default function EVBreakdown({ ev, category }) {
  if (!ev || !ev.perFinish) return null;

  const maxVal = Math.max(...Object.values(ev.perFinish), 0.1);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        EV Breakdown ({category === 'qp' ? 'QP' : 'Standard'} Scoring)
      </h3>
      <div className="space-y-1">
        {Object.entries(ev.perFinish).map(([finish, val]) => (
          <div key={finish} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 text-right">{finish}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-brand-500 h-full rounded-full transition-all"
                style={{ width: `${(val / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-600 w-12 text-right">
              {formatNumber(val)}
            </span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
        <span className="text-gray-500">Single Event EV</span>
        <span className="font-semibold">{formatNumber(ev.singleEvent)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Season Total EV ({ev.eventsPerSeason} events)</span>
        <span className="font-bold text-brand-700">{formatNumber(ev.seasonTotal)}</span>
      </div>
    </div>
  );
}
