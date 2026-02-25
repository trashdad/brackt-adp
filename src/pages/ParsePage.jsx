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
  const [sportsbook, setSportsbook] = useState('draftkings');
  const [customSportsbook, setCustomSportsbook] = useState('');
  const [results, setResults] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const activeSports = SPORTS.filter((s) => s.active);
  const roster = ROSTERS[sportId] || [];

  const handleParse = () => {
    const parsed = parseOddsText(text);
    const matched = matchTeams(parsed, sportId);
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
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = () => {
    const source = sportsbook === 'other' ? customSportsbook.trim() : sportsbook;
    if (!source) return;

    const manual = loadManualOdds();

    for (const row of results) {
      if (!row.checked || !row.matchedName) continue;
      const entryId = `${sportId}-${slugify(row.matchedName)}`;

      if (!manual[entryId]) {
        manual[entryId] = {
          sport: sportId,
          name: row.matchedName,
          oddsBySource: {},
          timestamp: Date.now(),
        };
      }

      manual[entryId].oddsBySource[source] = row.odds;
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
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                {activeSports.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>

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
                            value={row.matchedName}
                            onChange={(e) => updateResult(idx, 'matchedName', e.target.value)}
                            className={`w-full border rounded px-1.5 py-1 text-sm ${
                              !row.matchedName
                                ? 'border-red-300 bg-red-50'
                                : row.confidence < 0.7
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-gray-300'
                            }`}
                          >
                            <option value="">-- Select --</option>
                            {roster.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
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
