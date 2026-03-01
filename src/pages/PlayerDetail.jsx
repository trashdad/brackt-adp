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

        {!entry.isPlaceholder && entry.math && (
          <div className="mt-12 pt-12 border-t-2 border-white/10 border-dotted space-y-10">
            <h2 className="font-retro text-lg text-retro-cyan tracking-[0.2em] uppercase">Mathematical_Breakdown</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Pillar 1: Surplus Value (VBD) */}
              <div className="space-y-4">
                <h3 className="font-retro text-[10px] text-white/60 uppercase border-b border-white/10 pb-2 flex justify-between">
                  Pillar_1: Surplus_Value (VBD)
                  <span className="text-retro-cyan font-mono">{formatNumber(entry.math.marginalValue)}</span>
                </h3>
                <div className="bg-black/20 p-4 border border-white/5 rounded-sm space-y-3">
                  <p className="font-mono text-[11px] text-retro-light/70 leading-relaxed">
                    Instead of raw points, we measure <span className="text-white italic">Value Over Replacement (VOR)</span>. 
                    The replacement level for <span className="text-retro-cyan">{entry.sport.toUpperCase()}</span> is currently set at <span className="text-white">{formatNumber(entry.math.replacementEV)} EV</span>.
                  </p>
                  <p className="font-mono text-[11px] text-retro-light/70 leading-relaxed border-t border-white/5 pt-3">
                    <span className="text-retro-gold font-bold">HYBRID_SCORE:</span> We blend 50% VOR and 50% Raw EV to ensure we don't pass on elite total point volume while still respecting positional scarcity.
                  </p>
                </div>
              </div>

              {/* Pillar 2: Stability Risk (Sigma) */}
              <div className="space-y-4">
                <h3 className="font-retro text-[10px] text-white/60 uppercase border-b border-white/10 pb-2 flex justify-between">
                  Pillar_2: Stability_Risk (Sigma)
                  <span className="text-retro-purple font-mono">{formatNumber(entry.math.sigma, 2)}</span>
                </h3>
                <div className="bg-black/20 p-4 border border-white/5 rounded-sm space-y-3">
                  <p className="font-mono text-[11px] text-retro-light/70 leading-relaxed">
                    <span className="text-retro-purple font-bold">MODEL:</span> {entry.math.modelUsed.toUpperCase()}
                  </p>
                  <p className="font-mono text-[11px] text-retro-light/70 leading-relaxed">
                    {entry.math.events > 1 ? (
                      `Because this sport has ${entry.math.events} events, we apply the Law of Large Numbers. The risk (sigma) is reduced by the square root of the event count, making this a highly predictable anchor for your lineup.`
                    ) : (
                      "As a single-event sport, this entry carries the baseline variance. Points are high-reward but high-risk compared to multi-event anchors."
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar 3: Efficiency & Multipliers */}
            <div className="space-y-6 bg-retro-cyan/5 p-8 border-2 border-retro-cyan/20 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <span className="font-retro text-[12px] text-retro-cyan uppercase tracking-widest">FINAL_EFFICIENCY_CALCULATION</span>
                <span className="font-mono text-3xl font-black text-retro-lime drop-shadow-[0_0_10px_rgba(163,230,53,0.3)]">
                  {formatNumber(entry.adpScore)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center space-y-1">
                  <p className="font-retro text-[8px] text-white/40 uppercase">GCI_Coeff</p>
                  <p className="font-mono text-lg text-white">x{entry.math.confidenceMult.toFixed(2)}</p>
                  <p className="text-[7px] text-retro-light/30 italic">Predictability boost</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-retro text-[8px] text-white/40 uppercase">Floor_Boost</p>
                  <p className="font-mono text-lg text-white">x{entry.math.efficiencyMult.toFixed(2)}</p>
                  <p className="text-[7px] text-retro-light/30 italic">Win Prob &gt; 5% bonus</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-retro text-[8px] text-white/40 uppercase">Adj_Sentiment</p>
                  <p className="font-mono text-lg text-white">x{entry.math.adjSq.toFixed(2)}</p>
                  <p className="text-[7px] text-retro-light/30 italic">Social tie-breaker</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-retro text-[8px] text-white/40 uppercase">Scarcity</p>
                  <p className="font-mono text-lg text-white">+{formatNumber(entry.math.scarcityBonus)}</p>
                  <p className="text-[7px] text-retro-light/30 italic">Tier gap premium</p>
                </div>
              </div>

              <div className="border-t border-retro-cyan/10 mt-6 pt-6">
                <p className="font-mono text-[10px] text-retro-light/50 italic leading-relaxed text-center">
                  FORMULA: ( (HybridValue / sqrt(Sigma)) * 10 + Scarcity ) * GCI * EfficiencyMult * Sentiment
                </p>
              </div>
            </div>
          </div>
        )}

        {!entry.isPlaceholder && entry.ev && entry.ev.dist && (
          <div className="mt-12 p-8 bg-retro-gold/5 border-2 border-retro-gold/20 rounded-lg space-y-6">
            <h2 className="font-retro text-[12px] text-retro-gold uppercase tracking-[0.2em]">Scoring_Probability_Model (Plackett-Luce)</h2>
            <p className="font-mono text-[11px] text-retro-light/60 leading-relaxed italic">
              Our model does not just predict winners. We use a <span className="text-white italic">Field Approximation Model</span> to calculate the likelihood of every finishing position. 
              Because your league rewards 70pts for 2nd and 50pts for 3rd, favorites are heavily weighted for their ability to capture these "Safety Net" points.
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Object.entries(entry.ev.dist).slice(0, 8).map(([rank, prob]) => (
                <div key={rank} className="bg-black/40 p-2 border border-white/5 text-center space-y-1">
                  <p className="font-retro text-[7px] text-white/30">Rank_{rank}</p>
                  <p className="font-mono text-[10px] text-retro-gold">{(prob * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/20 font-mono uppercase text-center tracking-widest">
              Total_Points_Probability_Weighted_Across_Field
            </p>
          </div>
        )}

        {/* Tournament Compilation for Multi-Event Sports */}
        {!entry.isPlaceholder && entry.tournaments && Object.keys(entry.tournaments).length > 0 && (
          <div className="mt-12 p-8 bg-black/40 border-2 border-retro-purple/30 rounded-lg space-y-6">
            <h2 className="font-retro text-[12px] text-retro-purple uppercase tracking-[0.2em]">Tournament_Compilation_Model</h2>
            <p className="font-mono text-[11px] text-retro-light/60 leading-relaxed italic">
              Individual events do not award points. We compile odds from all scheduled tournaments to derive a <span className="text-white italic">Canonical Season Probability</span>. 
              This prevents a single "hot week" from skewing the final season standing prediction.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(entry.tournaments).map(([tId, tData]) => (
                <div key={tId} className="bg-white/5 p-3 border border-white/10 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-retro-light/40 uppercase">{tId.replace(/-/g, ' ')}</span>
                  <span className="font-mono text-[11px] text-retro-gold font-bold">{tData.odds}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="font-retro text-[9px] text-white/40 uppercase">DERIVED_AVERAGE_ODDS:</span>
              <span className="font-mono text-xl text-retro-gold drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]">{entry.odds}</span>
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
