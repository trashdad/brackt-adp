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
      <Link to="/" className="font-retro text-[8px] text-snes-lavender hover:text-white transition-colors">&lt; GO_BACK</Link>

      <div className="snes-panel p-8 bg-white border-black shadow-[8px_8px_0_0_#000]">
        <div className="flex items-start justify-between mb-8 border-b-4 border-black pb-4">
          <div>
            <h1 className="text-xl font-retro text-snes-blue tracking-tight uppercase leading-tight">{entry.name}</h1>
            <span
              className="inline-flex items-center gap-1 mt-3 px-3 py-1 border-2 border-black font-retro text-[8px] text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]"
              style={{ backgroundColor: color }}
            >
              {entry.sportIcon} {entry.sportName.toUpperCase()}
            </span>
          </div>
          <span className="font-retro text-3xl text-snes-light drop-shadow-[2px_2px_0_#000]">#{entry.adpRank}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-6 border-b-4 border-black border-double">
          <div className="space-y-1">
            <p className="font-retro text-[7px] text-gray-400 uppercase">WIN_PROB</p>
            <p className="font-pixel text-xl font-bold text-snes-blue">{val(formatPercent(entry.ev?.winProbability))}</p>
          </div>
          <div className="space-y-1">
            <p className="font-retro text-[7px] text-gray-400 uppercase">ODDS</p>
            <p className="font-pixel text-xl font-bold text-snes-purple">{val(formatAmericanOdds(entry.odds))}</p>
          </div>
          <div className="space-y-1">
            <p className="font-retro text-[7px] text-gray-400 uppercase">SEASON_EV</p>
            <p className="font-pixel text-xl font-bold text-red-600">{val(formatNumber(entry.ev?.seasonTotal))}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <div className="bg-snes-blue text-white px-4 py-2 border-4 border-black font-retro text-[9px] shadow-[4px_4px_0_0_#A18FD1]">
            ADP_SCORE: {val(formatNumber(entry.adpScore))}
          </div>
          {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
            <div className="bg-white text-orange-600 px-3 py-1 border-2 border-orange-600 font-retro text-[7px]">
              +{(entry.scarcityBonus || 0).toFixed(2)} SCARCITY
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t-2 border-black/5 font-retro text-[7px] text-gray-400 space-y-1 uppercase tracking-tighter">
          <p>SCORING_MODE: {entry.scoringType}</p>
          {sport && sport.eventsPerSeason > 1 && <p>TOTAL_EVENTS: {sport.eventsPerSeason}</p>}
        </div>

        {/* Historical trend indicator */}
        {entry.historicalTrend && (
          <div className="mt-4 flex items-center gap-2">
            <span className="font-retro text-[7px] text-gray-500 uppercase tracking-tighter">ODDS_TREND:</span>
            <span className={`font-retro text-[8px] px-2 py-1 border border-black shadow-[1px_1px_0_0_rgba(0,0,0,0.1)] ${
              entry.historicalTrend === 'shortening'
                ? 'bg-green-100 text-green-700'
                : entry.historicalTrend === 'lengthening'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {entry.historicalTrend.toUpperCase()}
            </span>
          </div>
        )}

        {/* Multi-source odds breakdown */}
        {entry.oddsBySource && Object.keys(entry.oddsBySource).length > 1 && (
          <div className="mt-4 p-4 bg-gray-50 border-2 border-black/5">
            <p className="font-retro text-[7px] text-gray-400 mb-3 uppercase tracking-tighter">BOOKMAKER_POLLING:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(entry.oddsBySource).map(([source, odds]) => (
                <div
                  key={source}
                  className={`font-pixel text-[10px] px-2 py-1 border-2 ${
                    source === entry.bestOddsSource
                      ? 'bg-snes-lavender/20 border-snes-purple text-snes-purple font-bold'
                      : 'bg-white border-black/10 text-gray-500'
                  }`}
                >
                  {source.toUpperCase()}: {odds}
                </div>
              ))}
            </div>
          </div>
        )}

        {!entry.isPlaceholder && (
          <div className="mt-10 pt-10 border-t-4 border-black border-dotted">
            <EVBreakdown entry={entry} />
          </div>
        )}

        <div className="mt-10 border-t-4 border-black pt-8">
          {entry.drafted ? (
            <div className="flex items-center justify-between p-4 bg-black/5 border-2 border-black">
              <span className="font-retro text-[10px] text-gray-400">
                STATUS: [DRAFTED{entry.draftedBy ? `_BY_${entry.draftedBy.toUpperCase()}` : ''}]
              </span>
              <button
                onClick={() => onToggleDraft(entry.id)}
                className="font-retro text-[9px] px-4 py-2 bg-snes-dark text-white border-4 border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.3)] hover:bg-gray-700 transition-all active:translate-y-0.5"
              >
                UNDRAFT
              </button>
            </div>
          ) : !entry.isPlaceholder ? (
            <button
              onClick={() => onToggleDraft(entry.id)}
              className="w-full font-retro text-[10px] px-6 py-4 bg-snes-purple text-white border-4 border-black shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.4),4px_4px_0_0_#000] hover:bg-snes-lavender transition-all active:translate-y-1"
            >
              INITIALIZE_DRAFT_SEQUENCE
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
