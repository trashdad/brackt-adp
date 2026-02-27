import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manualOddsPath = path.join(__dirname, '../server/data/manual-odds.json');

const oddsData = [
  {
    id: "csgo-g2-esports",
    sport: "csgo",
    name: "G2 Esports",
    tournament: "cologne-2026",
    odds: "+400"
  },
  {
    id: "tennis_w-jessica-pegula",
    sport: "tennis_w",
    name: "Jessica Pegula",
    tournament: "french-open",
    odds: "+1200"
  },
  {
    id: "pga-adam-scott",
    sport: "pga",
    name: "Adam Scott",
    tournament: "masters",
    odds: "+10000"
  }
];

let manualOdds = {};
try {
  manualOdds = JSON.parse(fs.readFileSync(manualOddsPath, 'utf8'));
} catch (e) {
  manualOdds = {};
}

for (const data of oddsData) {
  if (!manualOdds[data.id]) {
    manualOdds[data.id] = { 
      sport: data.sport, 
      name: data.name, 
      oddsBySource: {}, 
      oddsByTournament: {}, 
      timestamp: Date.now() 
    };
  }
  
  manualOdds[data.id].oddsByTournament[data.tournament] = { avg: data.odds };
  manualOdds[data.id].timestamp = Date.now();
}

fs.writeFileSync(manualOddsPath, JSON.stringify(manualOdds, null, 2));
console.log("Updated manual-odds.json with new internet data.");
