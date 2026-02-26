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
    <div className="max-w-3xl mx-auto space-y-8">
      <Link to="/" className="font-retro text-[8px] text-retro-cyan hover:text-white transition-all flex items-center gap-2 group">
        <span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> RETURN_TO_DATABASE
      </Link>

      <div className="snes-panel p-10 bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black/60 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between mb-10 border-b-2 border-white/10 pb-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-retro text-white tracking-widest uppercase leading-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{entry.name}</h1>
            <span
              className="inline-flex items-center gap-2 px-3 py-2 border-2 border-black font-retro text-[8px] text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: color }}
            >
              {entry.sportIcon} {entry.sportName.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="font-retro text-[8px] text-retro-light/40 uppercase">Global_Rank</span>
            <span className="font-retro text-4xl text-retro-gold drop-shadow-[4px_4px_0_#000]">#{entry.adpRank}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-8 border-b-2 border-white/10 border-dashed">
          <div className="bg-black/20 p-4 border border-white/5 shadow-inner space-y-2">
            <p className="font-retro text-[7px] text-retro-cyan/60 uppercase tracking-widest">WIN_PROBABILITY</p>
            <p className="font-pixel text-2xl font-bold text-retro-cyan">{val(formatPercent(entry.ev?.winProbability))}</p>
          </div>
          <div className="bg-black/20 p-4 border border-white/5 shadow-inner space-y-2">
            <p className="font-retro text-[7px] text-retro-purple/60 uppercase tracking-widest">AMERICAN_ODDS</p>
            <p className="font-pixel text-2xl font-bold text-retro-purple">{val(formatAmericanOdds(entry.odds))}</p>
          </div>
          <div className="bg-black/20 p-4 border border-white/5 shadow-inner space-y-2">
            <p className="font-retro text-[7px] text-retro-red/60 uppercase tracking-widest">SEASON_VAL_EV</p>
            <p className="font-pixel text-2xl font-bold text-retro-red">{val(formatNumber(entry.ev?.seasonTotal))}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-6 items-center">
          <div className="bg-gradient-to-r from-retro-purple to-retro-magenta text-white px-6 py-4 border-2 border-black font-retro text-[10px] tracking-widest shadow-[4px_4px_0_0_#000,inset_2px_2px_0_rgba(255,255,255,0.2)]">
            ADP_SCORE: {val(formatNumber(entry.adpScore))}
          </div>
          {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
            <div className="bg-black/40 text-retro-gold px-4 py-3 border-2 border-retro-gold/30 font-retro text-[8px] shadow-[0_0_15px_rgba(255,215,0,0.1)]">
              +{(entry.scarcityBonus || 0).toFixed(2)} SCARCITY_PREMIUM
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 font-retro text-[7px] text-retro-light/30 flex gap-6 uppercase tracking-widest">
          <p>MODE: {entry.scoringType}_ENG</p>
          {sport && sport.eventsPerSeason > 1 && <p>NODE_COUNT: {sport.eventsPerSeason}_EVENTS</p>}
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
