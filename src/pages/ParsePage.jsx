import { useState } from 'react';
import { Link } from 'react-router-dom';
import SPORTS from '../data/sports';
import ROSTERS from '../data/rosters';
import { SPORTSBOOKS } from '../data/sportsbooks';
import { parseOddsText, matchTeams } from '../utils/oddsTextParser';
import { slugify } from '../utils/formatters';
import { useLock } from '../context/LockContext';

export default function ParsePage({ onOddsSubmitted }) {
  const { isUnlocked } = useLock();
  const [text, setText] = useState('');
  const [sportId, setSportId] = useState('nfl');
  const [tournamentId, setTournamentId] = useState('');
  const [sportsbook, setSportsbook] = useState('draftkings');
  const [customSportsbook, setCustomSportsbook] = useState('');
  const [results, setResults] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [parsedSportId, setParsedSportId] = useState(null);

  const activeSports = SPORTS.filter((s) => s.active);
  const activeSportId = parsedSportId || sportId;
  const activeSport = SPORTS.find(s => s.id === activeSportId);
  const roster = ROSTERS[activeSportId] || [];

  const handleParse = () => {
    const parsed = parseOddsText(text);
    const matched = matchTeams(parsed, sportId);
    setParsedSportId(sportId);
    setResults(
      matched.map((r, i) => ({
        key: i,
        nameText: r.nameText,
        odds: r.odds,
        matchedName: r.matchedName || '',
        confidence: r.confidence,
        checked: true,
      }))
    );
    setSubmitted(false);
  };

  const updateResult = (idx, field, value) => {
    setResults((prev) =>
      prev.map((r, i) => {
        if (i === idx) {
          const updated = { ...r, [field]: value };
          if (field === 'matchedName' && value === '__custom__' && !updated.customName) {
            updated.customName = r.nameText;
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleSubmit = async () => {
    const source = sportsbook === 'other' ? customSportsbook.trim() : sportsbook;
    if (!source) return;

    const submitSport = parsedSportId || sportId;
    const entries = {};

    for (const row of results) {
      const finalName = row.matchedName === '__custom__' ? (row.customName || '').trim() : row.matchedName;
      if (!row.checked || !finalName) continue;

      const oddsNum = parseFloat(row.odds);
      if (isNaN(oddsNum) || Math.abs(oddsNum) < 100) continue;

      const normalizedOdds = (oddsNum > 0 ? '+' : '') + oddsNum;
      const slug = slugify(finalName);
      entries[slug] = { name: finalName, odds: normalizedOdds };
    }

    if (Object.keys(entries).length === 0) return;

    const body = { source, entries };
    if (activeSport?.tournaments && tournamentId) body.tournament = tournamentId;

    await fetch(`/api/odds/${submitSport}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((err) => {
      console.warn('[BRACKT] Failed to sync odds to server:', err?.message || String(err));
    });
    setSubmitted(true);
    if (onOddsSubmitted) onOddsSubmitted();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-4 snes-panel bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] border-black/40">
        <div>
          <h1 className="font-retro text-[18px] text-retro-cyan drop-shadow-md tracking-widest uppercase">_SIGNAL_PARSER</h1>
          <p className="font-mono text-[11px] text-retro-light/40 mt-2 tracking-widest uppercase">
            EXTRACT_ODDS_FROM_RAW_TEXT_BUFFERS
          </p>
        </div>
        <Link
          to="/"
          className="font-retro text-[11px] px-6 py-3 bg-white/5 text-retro-cyan border border-retro-cyan/30 hover:bg-white/10 transition-all active:translate-y-0.5 uppercase tracking-widest"
        >
          &lt;&lt; BACK_TO_DASHBOARD
        </Link>
      </div>

      {/* Lock overlay */}
      <div className="relative">
        {!isUnlocked && (
          <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center gap-3 pointer-events-auto cursor-not-allowed">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-retro-red/70" fill="currentColor">
              <rect x="5" y="11" width="14" height="10" rx="1"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            <span className="font-retro text-retro-red/80 text-[12px] tracking-[0.3em] uppercase">ACCESS_DENIED</span>
            <span className="font-mono text-white/30 text-[10px] tracking-wider">Click the wizard in the header to unlock</span>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left panel — input */}
        <div className="space-y-6">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="PASTE_RAW_DATA_HERE..."
              rows={16}
              className="w-full bg-black/40 border-2 border-black p-6 font-mono text-[12px] text-retro-cyan/80 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-retro-cyan/30 shadow-inner"
            />
            <div className="absolute inset-0 border-b-2 border-white/5 pointer-events-none" />
          </div>

          <div className="snes-panel p-6 bg-retro-panel space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-retro text-[10px] text-retro-light/60 uppercase tracking-widest">SOURCE_NODE</label>
                <select
                  value={sportsbook}
                  onChange={(e) => setSportsbook(e.target.value)}
                  className="w-full bg-black/40 border-2 border-black px-3 py-2 font-mono text-[12px] text-white focus:outline-none"
                >
                  {SPORTSBOOKS.map((sb) => (
                    <option key={sb.id} value={sb.id}>{sb.name.toUpperCase()}</option>
                  ))}
                  <option value="other">CUSTOM_SOURCE...</option>
                </select>
              </div>

              {sportsbook === 'other' && (
                <div className="space-y-2">
                  <label className="block font-retro text-[10px] text-retro-light/60 uppercase tracking-widest">NODE_NAME</label>
                  <input
                    type="text"
                    value={customSportsbook}
                    onChange={(e) => setCustomSportsbook(e.target.value)}
                    placeholder="ENTER_NAME..."
                    className="w-full bg-black/40 border-2 border-black px-3 py-2 font-mono text-[12px] text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block font-retro text-[10px] text-retro-light/60 uppercase tracking-widest">TARGET_SPORT</label>
                <select
                  value={parsedSportId || sportId}
                  onChange={(e) => { 
                    const newSportId = e.target.value;
                    setSportId(newSportId); 
                    setParsedSportId(null); 
                    setResults([]); 
                    setSubmitted(false);
                    const newSport = SPORTS.find(s => s.id === newSportId);
                    setTournamentId(newSport?.tournaments?.[0]?.id || '');
                  }}
                  className="w-full bg-black/40 border-2 border-black px-3 py-2 font-mono text-[12px] text-white focus:outline-none"
                >
                  {activeSports.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {activeSport?.tournaments && (
                <div className="space-y-2">
                  <label className="block font-retro text-[10px] text-retro-light/60 uppercase tracking-widest">TOURNAMENT_ID</label>
                  <select
                    value={tournamentId}
                    onChange={(e) => setTournamentId(e.target.value)}
                    className="w-full bg-black/40 border-2 border-black px-3 py-2 font-mono text-[12px] text-white focus:outline-none"
                  >
                    <option value="">-- SELECT_UNIT --</option>
                    {activeSport.tournaments.map((t) => (
                      <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleParse}
              disabled={!text.trim()}
              className="w-full font-retro text-[12px] px-6 py-4 bg-gradient-to-br from-retro-purple to-retro-magenta text-white border-2 border-black shadow-[0_4px_0_0_#000,inset_1px_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none uppercase tracking-widest disabled:opacity-50"
            >
              EXECUTE_PARSER
            </button>
          </div>
        </div>

        {/* Right panel — results */}
        <div className="space-y-6">
          {results.length > 0 ? (
            <>
              <div className="flex items-center justify-between border-b-2 border-white/10 pb-4">
                <p className="font-mono text-[11px] text-retro-cyan uppercase tracking-widest">
                  {results.length} UNITS_DETECTED
                </p>
                {submitted ? (
                  <span className="font-retro text-[10px] px-4 py-2 bg-retro-lime/20 text-retro-lime border border-retro-lime/40 uppercase tracking-widest animate-pulse">
                    LINK_ESTABLISHED
                  </span>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!results.some((r) => r.checked && r.matchedName)}
                    className="font-retro text-[11px] px-6 py-2 bg-retro-cyan text-black border-2 border-black shadow-[0_4px_0_0_#00A3A8,inset_1px_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 transition-all active:translate-y-0.5 active:shadow-none uppercase tracking-widest disabled:opacity-50"
                  >
                    SUBMIT_DATA
                  </button>
                )}
              </div>

              <div className="snes-panel bg-black/40 overflow-hidden border-black/60">
                <table className="w-full border-collapse">
                  <thead className="bg-[#1A1A2E] font-retro text-[8px] text-white/40 tracking-widest uppercase">
                    <tr>
                      <th className="px-4 py-4 border-b border-white/5 w-10"></th>
                      <th className="px-4 py-4 text-left border-b border-white/5">TEAM_PLAYER_MAPPING</th>
                      <th className="px-4 py-4 text-left border-b border-white/5 w-32">ODDS_VAL</th>
                      <th className="px-4 py-4 border-b border-white/5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px] text-retro-light/80">
                    {results.map((row, idx) => (
                      <tr key={row.key} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={(e) => updateResult(idx, 'checked', e.target.checked)}
                            className="w-4 h-4 bg-black/40 border-black/60 rounded-none text-retro-purple focus:ring-0"
                          />
                        </td>
                        <td className="px-4 py-3 space-y-2">
                          <select
                            value={row.matchedName === '__custom__' ? '__custom__' : row.matchedName}
                            onChange={(e) => updateResult(idx, 'matchedName', e.target.value)}
                            className={`w-full bg-black/60 border border-white/10 px-3 py-1.5 font-mono text-[12px] text-white focus:border-retro-cyan/50 ${
                              !row.matchedName
                                ? 'border-retro-red/40 bg-retro-red/10'
                                : row.confidence < 0.7 && row.matchedName !== '__custom__'
                                ? 'border-retro-gold/40 bg-retro-gold/10'
                                : ''
                            }`}
                          >
                            <option value="">-- AUTO_SELECT --</option>
                            {roster.map((name) => (
                              <option key={name} value={name}>{name.toUpperCase()}</option>
                            ))}
                            <option value="__custom__">_MANUAL_ENTRY_</option>
                          </select>
                          
                          {row.matchedName === '__custom__' && (
                            <input
                              type="text"
                              value={row.customName || ''}
                              onChange={(e) => updateResult(idx, 'customName', e.target.value)}
                              placeholder="ENTER_NAME..."
                              className="w-full bg-black/60 border border-retro-cyan/30 px-3 py-1.5 font-mono text-[12px] text-retro-cyan uppercase"
                            />
                          )}
                          
                          <div className="font-retro text-[7px] text-white/20 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                            BUF_RAW: "{row.nameText}"
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.odds}
                            onChange={(e) => updateResult(idx, 'odds', e.target.value)}
                            className="w-full bg-black/60 border border-white/10 px-3 py-1.5 font-mono text-[12px] text-retro-cyan text-center tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.confidence > 0 && row.confidence < 0.7 && (
                            <span className="text-retro-gold font-bold font-retro text-[14px] animate-pulse" title="LOW_CONFIDENCE_MATCH">?</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 snes-panel bg-black/20 border-white/5 opacity-40">
              <div className="w-12 h-12 border-4 border-white/10 border-t-retro-cyan rounded-full animate-spin mb-6" />
              <p className="font-retro text-[10px] tracking-[0.2em] uppercase">AWAITING_BUFFER_INPUT...</p>
            </div>
          )}
        </div>
      </div>
      </div>{/* end lock wrapper */}
    </div>
  );
}
