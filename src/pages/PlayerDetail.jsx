import { useParams, Link } from 'react-router-dom';
import { getSportById, SPORT_COLORS } from '../data/sports';
import { formatAmericanOdds } from '../services/oddsConverter';
import { formatPercent, formatNumber } from '../utils/formatters';
import EVBreakdown from '../components/cards/EVBreakdown';

export default function PlayerDetail({ boardEntries, onToggleDraft }) {
  const { id } = useParams();
  const entry = boardEntries.find((e) => e.id === id);

  if (!entry) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Player/team not found.</p>
        <Link to="/" className="text-brand-600 text-sm hover:underline">Back to board</Link>
      </div>
    );
  }

  const sport = getSportById(entry.sport);
  const color = SPORT_COLORS[entry.sport] || '#888';
  const val = (v) => entry.isPlaceholder ? '—' : v;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Back to board</Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{entry.name}</h1>
            <span
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {entry.sportIcon} {entry.sportName}
            </span>
          </div>
          <span className="text-3xl font-bold text-gray-300">#{entry.adpRank}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-4 border-y border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Win Probability</p>
            <p className="text-lg font-bold">{val(formatPercent(entry.ev?.winProbability))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">American Odds</p>
            <p className="text-lg font-bold font-mono">{val(formatAmericanOdds(entry.odds))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Single Event EV</p>
            <p className="text-lg font-bold">{val(formatNumber(entry.ev?.singleEvent))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Season Total EV</p>
            <p className="text-lg font-bold text-brand-700">{val(formatNumber(entry.ev?.seasonTotal))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ADP Score</p>
            <p className="text-lg font-bold text-brand-700">{val(formatNumber(entry.adpScore))}</p>
            {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
              <p className="text-[10px] text-orange-400 font-mono">+{entry.scarcityBonus.toFixed(2)} scarcity</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1">
            Scoring type: <strong className="uppercase">{entry.scoringType}</strong>
            {sport && sport.eventsPerSeason > 1 && ` \u00B7 ${sport.eventsPerSeason} events/season`}
          </p>
        </div>

        {!entry.isPlaceholder && (
          <div className="mt-6">
            <EVBreakdown ev={entry.ev} category={entry.scoringType} />
          </div>
        )}

        <div className="mt-6">
          {entry.drafted ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Drafted{entry.draftedBy ? ` by ${entry.draftedBy}` : ''}
              </span>
              <button
                onClick={() => onToggleDraft(entry.id)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
              >
                Undraft
              </button>
            </div>
          ) : !entry.isPlaceholder ? (
            <button
              onClick={() => onToggleDraft(entry.id)}
              className="w-full px-4 py-2 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 transition"
            >
              Mark as Drafted
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
