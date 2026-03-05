
// Known sportsbook sources — each gets its own column
const ODDS_SOURCES = [
  'draftkings', 'fanduel', 'betmgm', 'bovada',
  'covers', 'vegasinsider', 'consensus', 'screenshot', 'research', 'other',
];

const CORE_HEADERS = [
  'id', 'rank', 'name', 'sport', 'odds',
  'win_pct', 'event_ev', 'season_ev', 'adp_score',
  'dropoff_velocity', 'adj_sq', 'social_pos', 'social_neg',
  'scarcity_bonus', 'ev_gap', 'exceeds_capacity',
  'drafted', 'drafted_by',
];

function escapeField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line) {
  const result = [];
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Collect all tournament IDs across entries for dynamic columns.
 */
function collectTournamentIds(boardEntries) {
  const ids = new Set();
  for (const e of boardEntries) {
    if (e.tournaments) {
      for (const tId of Object.keys(e.tournaments)) ids.add(tId);
    }
  }
  return [...ids].sort();
}

/**
 * Flatten oddsBySource from entry or from manual-odds tournament data.
 * For tournament sports, oddsBySource may be empty but oddsByTournament
 * has per-sportsbook data — we average those per source.
 */
function flattenSourceOdds(entry) {
  const result = {};

  // Direct oddsBySource (non-tournament sports, or manual entries)
  if (entry.oddsBySource) {
    for (const [src, odds] of Object.entries(entry.oddsBySource)) {
      result[src] = odds;
    }
  }

  return result;
}

/**
 * Export the full board to a CSV file download.
 * Odds are flattened into per-source columns for spreadsheet readability.
 * Tournament odds get their own columns (tournament_{id}).
 */
export function exportBoard(boardEntries) {
  const tournamentIds = collectTournamentIds(boardEntries);

  // Build full header row
  const sourceHeaders = ODDS_SOURCES.map(s => `odds_${s}`);
  const tournamentHeaders = tournamentIds.map(t => `tournament_${t.replace(/-/g, '_')}`);
  const allHeaders = [...CORE_HEADERS, ...sourceHeaders, ...tournamentHeaders];

  const rows = [allHeaders.join(',')];

  for (const e of boardEntries) {
    const sourceOdds = flattenSourceOdds(e);

    const row = [
      // Core fields
      escapeField(e.id),
      escapeField(e.adpRank ?? ''),
      escapeField(e.name),
      escapeField(e.sport),
      escapeField(e.odds ?? ''),
      escapeField(e.ev?.winProbability ?? ''),
      escapeField(e.ev?.singleEvent ?? ''),
      escapeField(e.ev?.seasonTotal ?? ''),
      escapeField(e.adpScore ?? ''),
      escapeField(e.dropoffVelocity ?? ''),
      escapeField(e.adjSq ?? ''),
      escapeField(e.socialPos ?? ''),
      escapeField(e.socialNeg ?? ''),
      escapeField(e.scarcityBonus ?? ''),
      escapeField(e.evGap ?? ''),
      escapeField(e.exceedsCapacity ? 'true' : 'false'),
      escapeField(e.drafted ? 'true' : 'false'),
      escapeField(e.draftedBy ?? ''),
      // Per-source odds columns
      ...ODDS_SOURCES.map(src => escapeField(sourceOdds[src] ?? '')),
      // Per-tournament odds columns
      ...tournamentIds.map(tId => escapeField(e.tournaments?.[tId]?.odds ?? '')),
    ];
    rows.push(row.join(','));
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  a.href = url;
  a.download = `brackt-adp-${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import board state from a CSV file.
 * Supports both new flat odds columns (odds_*) and legacy JSON columns (manual_sources).
 * Restores manual odds and draft state to the server; the app recalculates EV.
 * Returns { manualCount, draftedCount } on success.
 */
export function importBoard(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const lines = e.target.result.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV has no data rows');

        const headers = parseCSVLine(lines[0]);
        const idx = {};
        headers.forEach((h, i) => { idx[h.trim()] = i; });

        // Require at minimum: id, name, sport
        const required = ['id', 'name', 'sport'];
        const missing = required.filter((col) => idx[col] === undefined);
        if (missing.length > 0) {
          throw new Error(`CSV is missing required columns: ${missing.join(', ')}. Found: ${headers.map(h => h.trim()).join(', ')}`);
        }

        // Detect flat odds columns
        const oddsSourceCols = ODDS_SOURCES
          .map(src => ({ src, col: `odds_${src}` }))
          .filter(({ col }) => idx[col] !== undefined);
        const hasFlat = oddsSourceCols.length > 0;

        // Detect tournament columns
        const tournamentCols = headers
          .filter(h => h.trim().startsWith('tournament_'))
          .map(h => {
            const col = h.trim();
            const tId = col.replace('tournament_', '').replace(/_/g, '-');
            return { tId, col };
          });

        const manualOdds = {};
        const draftState = {};
        const socialScores = {};

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length < 3) continue;

          const id = cols[idx.id]?.trim();
          const name = cols[idx.name]?.trim();
          const sport = cols[idx.sport]?.trim();
          if (!id || !name || !sport) continue;

          // 1. Restore odds — prefer flat columns, fall back to legacy JSON
          let oddsBySource = {};
          let oddsByTournament = {};

          if (hasFlat) {
            for (const { src, col } of oddsSourceCols) {
              const val = cols[idx[col]]?.trim();
              if (val) oddsBySource[src] = val;
            }
            for (const { tId, col } of tournamentCols) {
              const val = cols[idx[col]]?.trim();
              if (val) {
                if (!oddsByTournament[tId]) oddsByTournament[tId] = {};
                oddsByTournament[tId].consensus = val;
              }
            }
          } else {
            // Legacy JSON columns
            try { oddsBySource = JSON.parse(cols[idx.manual_sources] || '{}'); } catch { /* ignore */ }
            try { oddsByTournament = JSON.parse(cols[idx.manual_tournaments] || '{}'); } catch { /* ignore */ }
          }

          const hasManual = Object.keys(oddsBySource).length > 0 || Object.keys(oddsByTournament).length > 0;
          if (hasManual) {
            manualOdds[id] = { sport, name, oddsBySource, oddsByTournament, timestamp: Date.now() };
          }

          // 2. Restore draft state
          const isDrafted = cols[idx.drafted]?.trim().toLowerCase() === 'true';
          if (isDrafted) {
            draftState[id] = { drafted: true, draftedBy: cols[idx.drafted_by]?.trim() || null };
          }

          // 3. Restore social scores if present
          const adjSq = parseFloat(cols[idx.adj_sq]);
          const socialPos = parseInt(cols[idx.social_pos], 10);
          const socialNeg = parseInt(cols[idx.social_neg], 10);
          if (!isNaN(adjSq) || !isNaN(socialPos) || !isNaN(socialNeg)) {
            socialScores[id] = {
              adjSq: isNaN(adjSq) ? 1.0 : adjSq,
              pos: isNaN(socialPos) ? 0 : socialPos,
              neg: isNaN(socialNeg) ? 0 : socialNeg,
            };
          }
        }

        // Convert manualOdds to per-sport PATCH calls for the unified odds store
        const patchCalls = [];
        const bySportSource = {}; // { sportId: { source: { slug: { name, odds } } } }
        const bySportTournament = {}; // { sportId: { tournamentId: { source: { slug: { name, odds } } } } }

        for (const [entryId, entry] of Object.entries(manualOdds)) {
          const { sport, name, oddsBySource, oddsByTournament } = entry;
          if (!sport) continue;
          const slug = entryId.replace(`${sport}-`, '');

          if (oddsBySource) {
            for (const [source, odds] of Object.entries(oddsBySource)) {
              if (!bySportSource[sport]) bySportSource[sport] = {};
              if (!bySportSource[sport][source]) bySportSource[sport][source] = {};
              bySportSource[sport][source][slug] = { name, odds };
            }
          }
          if (oddsByTournament) {
            for (const [tId, tSources] of Object.entries(oddsByTournament)) {
              if (typeof tSources === 'object' && tSources.consensus) {
                // Legacy tournament consensus format — use as 'import' source
                if (!bySportTournament[sport]) bySportTournament[sport] = {};
                if (!bySportTournament[sport][tId]) bySportTournament[sport][tId] = {};
                if (!bySportTournament[sport][tId]['import']) bySportTournament[sport][tId]['import'] = {};
                bySportTournament[sport][tId]['import'][slug] = { name, odds: tSources.consensus };
              } else if (typeof tSources === 'object') {
                for (const [source, odds] of Object.entries(tSources)) {
                  if (!bySportTournament[sport]) bySportTournament[sport] = {};
                  if (!bySportTournament[sport][tId]) bySportTournament[sport][tId] = {};
                  if (!bySportTournament[sport][tId][source]) bySportTournament[sport][tId][source] = {};
                  bySportTournament[sport][tId][source][slug] = { name, odds };
                }
              }
            }
          }
        }

        for (const [sportId, sources] of Object.entries(bySportSource)) {
          for (const [source, entries] of Object.entries(sources)) {
            patchCalls.push(
              fetch(`/api/odds/${sportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, entries }),
              })
            );
          }
        }
        for (const [sportId, tournaments] of Object.entries(bySportTournament)) {
          for (const [tId, sources] of Object.entries(tournaments)) {
            for (const [source, entries] of Object.entries(sources)) {
              patchCalls.push(
                fetch(`/api/odds/${sportId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ source, entries, tournament: tId }),
                })
              );
            }
          }
        }

        await Promise.all([
          ...patchCalls,
          fetch('/api/draft-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftState),
          }),
        ]);

        resolve({ manualCount: Object.keys(manualOdds).length, draftedCount: Object.keys(draftState).length });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
