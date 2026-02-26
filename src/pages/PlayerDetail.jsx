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
            <p className="font-retro text-[10px] text-retro-cyan/60 uppercase tracking-widest">WIN_PROBABILITY</p>
            <p className="font-mono text-3xl font-bold text-retro-cyan tabular-nums">{val(formatPercent(entry.ev?.winProbability))}</p>
          </div>
          <div className="bg-black/20 p-4 border border-white/5 shadow-inner space-y-2">
            <p className="font-retro text-[10px] text-retro-purple/60 uppercase tracking-widest">AMERICAN_ODDS</p>
            <p className="font-mono text-3xl font-bold text-retro-purple tabular-nums">{val(formatAmericanOdds(entry.odds))}</p>
          </div>
          <div className="bg-black/20 p-4 border border-white/5 shadow-inner space-y-2">
            <p className="font-retro text-[10px] text-retro-red/60 uppercase tracking-widest">SEASON_VAL_EV</p>
            <p className="font-mono text-3xl font-bold text-retro-red tabular-nums">{val(formatNumber(entry.ev?.seasonTotal))}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-6 items-center">
          <div className="bg-gradient-to-r from-retro-purple to-retro-magenta text-white px-6 py-4 border-2 border-black font-retro text-[14px] tracking-widest shadow-[4px_4px_0_0_#000,inset_2px_2px_0_rgba(255,255,255,0.2)]">
            ADP_SCORE: <span className="font-mono font-black">{val(formatNumber(entry.adpScore))}</span>
          </div>
          {!entry.isPlaceholder && entry.scarcityBonus > 0 && (
            <div className="bg-black/40 text-retro-gold px-4 py-3 border-2 border-retro-gold/30 font-mono text-[12px] uppercase tracking-wider">
              +{(entry.scarcityBonus || 0).toFixed(2)} SCARCITY_PREMIUM
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 font-mono text-[11px] text-retro-light/30 flex gap-10 uppercase tracking-[0.2em]">
          <p>MODE: {entry.scoringType}_ENG</p>
          {sport && sport.eventsPerSeason > 1 && <p>NODE_COUNT: {sport.eventsPerSeason}_EVENTS</p>}
        </div>

        {/* Historical trend indicator */}
        {entry.historicalTrend && (
          <div className="mt-6 flex items-center gap-4">
            <span className="font-retro text-[10px] text-gray-500 uppercase tracking-widest">SIGNAL_TREND:</span>
            <span className={`font-mono text-[12px] font-bold px-3 py-1 border border-black shadow-md ${
              entry.historicalTrend === 'shortening'
                ? 'bg-retro-lime/20 text-retro-lime'
                : entry.historicalTrend === 'lengthening'
                ? 'bg-retro-red/20 text-retro-red'
                : 'bg-white/5 text-retro-light/60'
            }`}>
              {entry.historicalTrend.toUpperCase()}
            </span>
          </div>
        )}

        {/* Multi-source odds breakdown */}
        {entry.oddsBySource && Object.keys(entry.oddsBySource).length > 1 && (
          <div className="mt-6 p-6 bg-black/30 border border-white/5">
            <p className="font-retro text-[10px] text-retro-cyan/40 mb-4 uppercase tracking-widest">_BOOKMAKER_POLLING:</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(entry.oddsBySource).map(([source, odds]) => (
                <div
                  key={source}
                  className={`font-mono text-[12px] px-3 py-1.5 border ${
                    source === entry.bestOddsSource
                      ? 'bg-retro-purple/20 border-retro-purple text-retro-purple font-bold'
                      : 'bg-white/5 border-white/10 text-retro-light/40'
                  }`}
                >
                  {source.toUpperCase()}: <span className="tabular-nums">{odds}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!entry.isPlaceholder && (
          <div className="mt-12 pt-12 border-t-2 border-white/10 border-dotted">
            <EVBreakdown entry={entry} />
          </div>
        )}

        <div className="mt-12 border-t-2 border-black pt-10">
          {entry.drafted ? (
            <div className="flex items-center justify-between p-6 bg-black/40 border-2 border-black shadow-inner">
              <span className="font-retro text-[12px] text-retro-light/40 tracking-widest">
                STATUS: [ DRAFTED_BY_{entry.draftedBy?.toUpperCase() || 'PLAYER' } ]
              </span>
              <button
                onClick={() => onToggleDraft(entry.id)}
                className="font-retro text-[11px] px-6 py-3 bg-retro-panel text-white border-2 border-black shadow-[inset_-2px_-2px_0_0_rgba(0,0,0,0.4)] hover:bg-gray-700 transition-all active:translate-y-0.5"
              >
                UNDRAFT
              </button>
            </div>
          ) : !entry.isPlaceholder ? (
            <button
              onClick={() => onToggleDraft(entry.id)}
              className="w-full font-retro text-[14px] px-10 py-6 bg-retro-purple hover:bg-retro-magenta text-white border-2 border-black shadow-[0_8px_0_0_#000,inset_2px_2px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_0_0_#000,inset_2px_2px_0_rgba(255,255,255,0.2)] transition-all active:translate-y-1 active:shadow-none uppercase tracking-[0.3em]"
            >
              INITIALIZE_DRAFT_SEQUENCE
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
