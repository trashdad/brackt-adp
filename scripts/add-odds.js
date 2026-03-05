/**
 * Reusable script to add odds data from screenshots to the Brackt ADP system.
 *
 * Usage:
 *   node scripts/add-odds.js <sport_id> [tournament_id] [source_label]
 *
 * The script reads a JSON array of [name, odds] pairs from stdin.
 *
 * Examples:
 *   echo '[["Kansas City Chiefs","+450"],["Detroit Lions","+600"]]' | node scripts/add-odds.js nfl
 *   echo '[["Scottie Scheffler","+500"]]' | node scripts/add-odds.js pga masters draftkings
 *   echo '[["Aryna Sabalenka","+275"]]' | node scripts/add-odds.js tennis_w wimbledon screenshot
 *
 * Arguments:
 *   sport_id      - Required. One of: nfl, nba, mlb, nhl, ncaaf, ncaab, ncaaw, wnba,
 *                   afl, f1, ucl, fifa, darts, snooker, llws, indycar, pga,
 *                   tennis_m, tennis_w, csgo
 *   tournament_id - Optional. For tournament sports (pga, tennis_m, tennis_w, csgo).
 *                   e.g. masters, wimbledon, us-open, cologne-2026
 *   source_label  - Optional. Label for the odds source (default: "screenshot")
 *
 * The Express server must be running on localhost:3001.
 */

const API_BASE = 'http://localhost:3001';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  const [,, sportId, tournamentId, sourceLabel = 'screenshot'] = process.argv;

  if (!sportId) {
    console.error('Usage: echo \'[["Name","+odds"],...]\' | node scripts/add-odds.js <sport_id> [tournament_id] [source_label]');
    console.error('Sports: nfl nba mlb nhl ncaaf ncaab ncaaw wnba afl f1 ucl fifa darts snooker llws indycar pga tennis_m tennis_w csgo');
    process.exit(1);
  }

  // Read JSON from stdin
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = Buffer.concat(chunks).toString('utf8').trim();

  let oddsData;
  try {
    oddsData = JSON.parse(input);
  } catch (err) {
    console.error('Failed to parse stdin as JSON:', err.message);
    console.error('Expected format: [["Name", "+odds"], ["Name2", "+odds2"]]');
    process.exit(1);
  }

  if (!Array.isArray(oddsData) || oddsData.length === 0) {
    console.error('Expected a non-empty JSON array of [name, odds] pairs');
    process.exit(1);
  }

  // Build entries for the PATCH endpoint
  const entries = {};
  const newNames = [];

  for (const [name, odds] of oddsData) {
    if (!name || !odds) {
      console.warn(`Skipping invalid entry: [${name}, ${odds}]`);
      continue;
    }
    const slug = slugify(name);
    entries[slug] = { name, odds: String(odds) };
    newNames.push(name);
  }

  if (Object.keys(entries).length === 0) {
    console.error('No valid entries to add');
    process.exit(1);
  }

  // PATCH to the unified odds store
  const body = { source: sourceLabel, entries };
  if (tournamentId) body.tournament = tournamentId;

  const resp = await fetch(`${API_BASE}/api/odds/${sportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Failed to save:', text);
    process.exit(1);
  }

  const result = await resp.json();
  console.log(`Added ${Object.keys(entries).length} entries for ${sportId}${tournamentId ? ` / ${tournamentId}` : ''} (source: ${sourceLabel}) [v${result.version}]`);
  if (newNames.length > 0) {
    console.log(`Names added: ${newNames.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
