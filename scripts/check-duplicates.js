
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANUAL_ODDS_PATH = join(__dirname, '..', 'server', 'data', 'manual-odds.json');

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function findDuplicates() {
  const manual = JSON.parse(readFileSync(MANUAL_ODDS_PATH, 'utf8'));
  const seen = {}; // sport: { normName: [ids] }
  const duplicates = [];

  for (const [id, entry] of Object.entries(manual)) {
    const sport = entry.sport;
    const name = entry.name;
    const norm = normalize(name);

    if (!seen[sport]) seen[sport] = {};
    if (!seen[sport][norm]) {
      seen[sport][norm] = [];
    }
    seen[sport][norm].push(id);
  }

  for (const [sport, teams] of Object.entries(seen)) {
    for (const [norm, ids] of Object.entries(teams)) {
      if (ids.length > 1) {
        duplicates.push({ sport, name: norm, ids });
      }
    }
  }

  if (duplicates.length === 0) {
    console.log("No exact name duplicates found in manual-odds.json");
  } else {
    console.log("Found duplicate entries in manual-odds.json:");
    duplicates.forEach(d => {
      console.log(`[${d.sport}] ${d.name}: ${d.ids.join(', ')}`);
    });
  }
}

findDuplicates();
