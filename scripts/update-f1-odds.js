import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manualOddsPath = path.join(__dirname, '../server/data/manual-odds.json');

const oddsData = {
  "Lando Norris": { draftkings: "+175", fanduel: "+150", betmgm: "-118" },
  "Max Verstappen": { draftkings: "+300", fanduel: "+240", betmgm: "+300" },
  "Oscar Piastri": { draftkings: "+900", fanduel: "+500", betmgm: "+275" },
  "Charles Leclerc": { draftkings: "+400", fanduel: "+460", betmgm: "+4000" },
  "Lewis Hamilton": { draftkings: "+600", fanduel: "+800", betmgm: "+4000" },
  "George Russell": { draftkings: "+1400", fanduel: "+1700", betmgm: "+2500" }
};

let manualOdds = {};
try {
  manualOdds = JSON.parse(fs.readFileSync(manualOddsPath, 'utf8'));
} catch (e) {
  console.log("Could not read manual-odds.json, starting fresh.");
}

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');

for (const [name, odds] of Object.entries(oddsData)) {
  const id = `f1-${slugify(name)}`;
  
  if (!manualOdds[id]) {
    manualOdds[id] = { sport: 'f1', name, oddsBySource: {}, oddsByTournament: {}, timestamp: Date.now() };
  }
  
  // Clear any single source odds to avoid confusion
  manualOdds[id].oddsBySource = {};
  
  manualOdds[id].oddsByTournament = {
    draftkings: { avg: odds.draftkings },
    fanduel: { avg: odds.fanduel },
    betmgm: { avg: odds.betmgm }
  };
  manualOdds[id].timestamp = Date.now();
}

fs.writeFileSync(manualOddsPath, JSON.stringify(manualOdds, null, 2));
console.log("Updated F1 odds in manual-odds.json");
