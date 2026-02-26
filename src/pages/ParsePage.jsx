import { useState } from 'react';
import { Link } from 'react-router-dom';
import SPORTS from '../data/sports';
import ROSTERS from '../data/rosters';
import { SPORTSBOOKS } from '../data/sportsbooks';
import { parseOddsText, matchTeams } from '../utils/oddsTextParser';
import { loadManualOdds, saveManualOdds } from '../utils/storage';
import { slugify } from '../utils/formatters';

export default function ParsePage({ onOddsSubmitted }) {
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
          // If switching to "custom", initialize customName with the parsed text if empty
          if (field === 'matchedName' && value === '__custom__' && !updated.customName) {
            updated.customName = r.nameText;
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleSubmit = () => {
    const source = sportsbook === 'other' ? customSportsbook.trim() : sportsbook;
    if (!source) return;

    const submitSport = parsedSportId || sportId;
    const manual = loadManualOdds();

    for (const row of results) {
      const finalName = row.matchedName === '__custom__' ? (row.customName || '').trim() : row.matchedName;
      if (!row.checked || !finalName) continue;

      // Validate odds: must be a number with optional +/- prefix, absolute value >= 100
      const oddsNum = parseFloat(row.odds);
      if (isNaN(oddsNum) || Math.abs(oddsNum) < 100) continue;

      // Normalize: ensure +/- prefix
      const normalizedOdds = (oddsNum > 0 ? '+' : '') + oddsNum;
      const entryId = `${submitSport}-${slugify(finalName)}`;

      if (!manual[entryId]) {
        manual[entryId] = {
          sport: submitSport,
          name: finalName,
          oddsBySource: {},
          oddsByTournament: {},
          timestamp: Date.now(),
        };
      }

      if (!manual[entryId].oddsByTournament) {
        manual[entryId].oddsByTournament = {};
      }

      if (activeSport?.tournaments && tournamentId) {
        if (!manual[entryId].oddsByTournament[tournamentId]) {
          manual[entryId].oddsByTournament[tournamentId] = {};
        }
        manual[entryId].oddsByTournament[tournamentId][source] = normalizedOdds;
      } else {
        manual[entryId].oddsBySource[source] = normalizedOdds;
      }

      manual[entryId].timestamp = Date.now();
    }

    saveManualOdds(manual);
    setSubmitted(true);
    if (onOddsSubmitted) onOddsSubmitted();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Paste & Parse Odds</h1>
          <p className="text-xs text-gray-500">
            Paste odds text from a sportsbook, select the source and sport, then parse and submit.
          </p>
        </div>
        <Link
          to="/"
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
        >
          Back to Board
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel — input */}
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste odds text here..."
            rows={14}
            className="w-full border border-gray-300 rounded-md p-3 text-sm font-mono placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sportsbook</label>
              <select
                value={sportsbook}
                onChange={(e) => setSportsbook(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                {SPORTSBOOKS.map((sb) => (
                  <option key={sb.id} value={sb.id}>{sb.name}</option>
                ))}
                <option value="other">Other...</option>
              </select>
            </div>

            {sportsbook === 'other' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Custom Name</label>
                <input
                  type="text"
                  value={customSportsbook}
                  onChange={(e) => setCustomSportsbook(e.target.value)}
                  placeholder="e.g. Pinnacle"
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sport</label>
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
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                {activeSports.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>

            {activeSport?.tournaments && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tournament</label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-[150px]"
                >
                  <option value="">-- Select --</option>
                  {activeSport.tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleParse}
              disabled={!text.trim()}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition"
            >
              Parse
            </button>
          </div>
        </div>

        {/* Right panel — results */}
        <div className="space-y-3">
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{results.length} line(s) parsed</p>
                {submitted ? (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-700">
                    Submitted
                  </span>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!results.some((r) => r.checked && r.matchedName)}
                    className="px-4 py-1.5 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    Submit
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-2 py-2 w-8"></th>
                      <th className="px-2 py-2 text-left">Team / Player</th>
                      <th className="px-2 py-2 text-left">Odds</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={row.key} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={(e) => updateResult(idx, 'checked', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row.matchedName === '__custom__' ? '__custom__' : row.matchedName}
                            onChange={(e) => updateResult(idx, 'matchedName', e.target.value)}
                            className={`w-full border rounded px-1.5 py-1 text-sm mb-1 ${
                              !row.matchedName
                                ? 'border-red-300 bg-red-50'
                                : row.confidence < 0.7 && row.matchedName !== '__custom__'
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-gray-300'
                            }`}
                          >
                            <option value="">-- Select --</option>
                            {roster.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                            <option value="__custom__">Other / New Player...</option>
                          </select>
                          
                          {row.matchedName === '__custom__' && (
                            <input
                              type="text"
                              value={row.customName || ''}
                              onChange={(e) => updateResult(idx, 'customName', e.target.value)}
                              placeholder="Enter custom name"
                              className="w-full border border-brand-300 rounded px-1.5 py-1 text-sm bg-brand-50"
                            />
                          )}
                          
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Parsed: "{row.nameText}"
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.odds}
                            onChange={(e) => updateResult(idx, 'odds', e.target.value)}
                            className="w-20 border border-gray-300 rounded px-1.5 py-1 text-sm font-mono text-center"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          {row.confidence > 0 && row.confidence < 0.7 && (
                            <span className="text-amber-500 font-bold" title="Low confidence match">?</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {results.length === 0 && (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Parsed results will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
