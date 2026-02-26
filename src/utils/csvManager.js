import { saveLocalDraftState, saveLocalManualOdds } from './storage';

const HEADERS = [
  'id', 'rank', 'name', 'sport', 'odds',
  'win_pct', 'event_ev', 'season_ev', 'adp_score',
  'drafted', 'drafted_by', 'manual_sources', 'manual_tournaments',
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
 * Export the full board to a CSV file download.
 * Computed fields (EV, adpScore) are included for readability but are not
 * required on import — they are recalculated by the app automatically.
 */
export function exportBoard(boardEntries) {
  const rows = [HEADERS.join(',')];

  for (const e of boardEntries) {
    const row = [
      escapeField(e.id),
      escapeField(e.adpRank ?? ''),
      escapeField(e.name),
      escapeField(e.sport),
      escapeField(e.odds ?? ''),
      escapeField(e.ev?.winProbability ?? ''),
      escapeField(e.ev?.singleEvent ?? ''),
      escapeField(e.ev?.seasonTotal ?? ''),
      escapeField(e.adpScore ?? ''),
      escapeField(e.drafted ? 'true' : 'false'),
      escapeField(e.draftedBy ?? ''),
      escapeField(e.oddsBySource ? JSON.stringify(e.oddsBySource) : '{}'),
      escapeField(e.oddsByTournament ? JSON.stringify(e.oddsByTournament) : '{}'),
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
        if (idx.id === undefined || idx.name === undefined || idx.sport === undefined) {
          throw new Error('CSV is missing required columns: id, name, sport');
        }

        const manualOdds = {};
        const draftState = {};

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          const id = cols[idx.id]?.trim();
          const name = cols[idx.name]?.trim();
          const sport = cols[idx.sport]?.trim();
          if (!id || !name || !sport) continue;

          // Restore manual odds if source data is present
          let oddsBySource = {};
          let oddsByTournament = {};
          try { oddsBySource = JSON.parse(cols[idx.manual_sources] || '{}'); } catch {}
          try { oddsByTournament = JSON.parse(cols[idx.manual_tournaments] || '{}'); } catch {}
          const hasManual = Object.keys(oddsBySource).length > 0 || Object.keys(oddsByTournament).length > 0;
          if (hasManual) {
            manualOdds[id] = { sport, name, oddsBySource, oddsByTournament, timestamp: Date.now() };
          }

          // Restore draft state
          if (cols[idx.drafted]?.trim() === 'true') {
            draftState[id] = { drafted: true, draftedBy: cols[idx.drafted_by]?.trim() || null };
          }
        }

        // Save to local fallback immediately for responsiveness
        saveLocalManualOdds(manualOdds);
        saveLocalDraftState(draftState);

        await Promise.all([
          fetch('/api/manual-odds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(manualOdds),
          }),
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
