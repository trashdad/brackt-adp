import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manualOddsPath = path.join(__dirname, '../server/data/manual-odds.json');

const indycarData = [
  { name: 'Alex Palou', championship: '-175', indy500: '+600' },
  { name: "Pato O'Ward", championship: '+550', indy500: '+550' },
  { name: 'Kyle Kirkwood', championship: '+700', indy500: '+1400' },
  { name: 'Josef Newgarden', championship: '+800', indy500: '+600' },
  { name: 'Scott McLaughlin', championship: '+800', indy500: '+1000' },
  { name: 'Scott Dixon', championship: '+1100', indy500: '+900' },
  { name: 'Will Power', championship: '+2000', indy500: '+1600' },
  { name: 'David Malukas', championship: '+3300', indy500: '+1000' },
  { name: 'Marcus Ericsson', championship: '+4000', indy500: '+1200' },
  { name: 'Alexander Rossi', championship: '+5000', indy500: '+1400' },
  { name: 'Colton Herta', championship: '+1200', indy500: '+1400' },
  { name: 'Graham Rahal', championship: '+10000', indy500: '+4000' },
  { name: 'Mick Schumacher', championship: '+13000', indy500: '+6600' },
  { name: 'Takuma Sato', championship: '+20000', indy500: '+1000' },
];

let manualOdds = {};
if (fs.existsSync(manualOddsPath)) {
  manualOdds = JSON.parse(fs.readFileSync(manualOddsPath, 'utf8'));
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

for (const driver of indycarData) {
  const id = `indycar-${slugify(driver.name)}`;
  
  manualOdds[id] = {
    sport: 'indycar',
    name: driver.name,
    oddsBySource: {},
    oddsByTournament: {
      'championship': { draftkings: driver.championship },
      'indianapolis-500': { draftkings: driver.indy500 }
    },
    timestamp: Date.now()
  };
}

fs.writeFileSync(manualOddsPath, JSON.stringify(manualOdds, null, 2));
console.log(`Updated manual-odds.json with ${indycarData.length} IndyCar entries using draftkings source.`);
