/**
 * One-time migration: convert existing manual-odds.json + pipeline live data
 * into the new per-sport unified odds store format.
 *
 * Usage:
 *   node scripts/migrate-odds-store.js
 *
 * Requires the Express server to be running on localhost:3001.
 */

const API_BASE = 'http://localhost:3001';

const SPORT_IDS = [
  'afl', 'csgo', 'darts', 'fifa', 'f1', 'indycar', 'llws',
  'mlb', 'nba', 'ncaab', 'ncaaf', 'ncaaw', 'nfl', 'nhl',
  'pga', 'snooker', 'tennis_m', 'tennis_w', 'ucl', 'wnba',
];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  // Step 1: Fetch existing manual odds
  const manualResp = await fetch(`${API_BASE}/api/manual-odds`).catch(() => null);
  if (!manualResp?.ok) {
    console.error('Could not reach the API server. Is it running? (npm run server)');
    process.exit(1);
  }
  const manual = await manualResp.json();
  const manualCount = Object.keys(manual).length;
  console.log(`Found ${manualCount} entries in manual-odds store`);

  // Step 2: Group manual odds by sport
  const bySport = {};
  for (const [entryId, entry] of Object.entries(manual)) {
    const { sport } = entry;
    if (!sport) continue;
    if (!bySport[sport]) bySport[sport] = [];
    bySport[sport].push(entry);
  }

  // Step 3: For each sport, migrate manual odds via PATCH
  let totalMigrated = 0;

  for (const sportId of SPORT_IDS) {
    const sportEntries = bySport[sportId] || [];
    if (sportEntries.length === 0) continue;

    // Group by source for non-tournament odds
    const sourceGroups = {};
    const tournamentGroups = {}; // { tournamentId: { source: entries } }

    for (const entry of sportEntries) {
      const slug = slugify(entry.name);

      // Non-tournament sources
      if (entry.oddsBySource) {
        for (const [source, odds] of Object.entries(entry.oddsBySource)) {
          if (!sourceGroups[source]) sourceGroups[source] = {};
          sourceGroups[source][slug] = { name: entry.name, odds };
        }
      }

      // Tournament sources
      if (entry.oddsByTournament) {
        for (const [tId, tSources] of Object.entries(entry.oddsByTournament)) {
          for (const [source, odds] of Object.entries(tSources)) {
            if (!tournamentGroups[tId]) tournamentGroups[tId] = {};
            if (!tournamentGroups[tId][source]) tournamentGroups[tId][source] = {};
            tournamentGroups[tId][source][slug] = { name: entry.name, odds };
          }
        }
      }
    }

    // PATCH non-tournament odds by source
    for (const [source, entries] of Object.entries(sourceGroups)) {
      const resp = await fetch(`${API_BASE}/api/odds/${sportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, entries }),
      });
      if (resp.ok) {
        totalMigrated += Object.keys(entries).length;
      } else {
        console.error(`Failed to migrate ${sportId}/${source}:`, await resp.text());
      }
    }

    // PATCH tournament odds by source
    for (const [tId, tSourceGroups] of Object.entries(tournamentGroups)) {
      for (const [source, entries] of Object.entries(tSourceGroups)) {
        const resp = await fetch(`${API_BASE}/api/odds/${sportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, entries, tournament: tId }),
        });
        if (resp.ok) {
          totalMigrated += Object.keys(entries).length;
        } else {
          console.error(`Failed to migrate ${sportId}/${tId}/${source}:`, await resp.text());
        }
      }
    }

    console.log(`  ${sportId}: ${sportEntries.length} entries migrated`);
  }

  // Step 4: Migrate pipeline live data
  let pipelineMigrated = 0;
  for (const sportId of SPORT_IDS) {
    try {
      const resp = await fetch(`${API_BASE}/api/pipeline/live/${sportId}`);
      if (!resp.ok) continue;
      const pipeData = await resp.json();
      if (!pipeData?.entries?.length) continue;

      const entries = {};
      for (const e of pipeData.entries) {
        if (!e.name) continue;
        const slug = slugify(e.name);
        const odds = e.consensusOdds || e.bestOdds;
        if (odds) entries[slug] = { name: e.name, odds };
      }

      if (Object.keys(entries).length > 0) {
        await fetch(`${API_BASE}/api/odds/${sportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'pipeline', entries }),
        });
        pipelineMigrated += Object.keys(entries).length;
        console.log(`  ${sportId}: ${Object.keys(entries).length} pipeline entries migrated`);
      }
    } catch { /* skip */ }
  }

  console.log(`\nMigration complete: ${totalMigrated} manual + ${pipelineMigrated} pipeline entries`);
  console.log('You can now verify with: curl http://localhost:3001/api/odds/nfl | jq .');
}

main().catch((err) => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
