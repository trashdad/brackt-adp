import SPORTS, { getSportById } from '../src/data/sports.js';
import ROSTERS from '../src/data/rosters.js';

console.log("IndyCar Sport:", getSportById('indycar'));
console.log("IndyCar Roster Length:", ROSTERS.indycar?.length);
console.log("IndyCar Active:", getSportById('indycar')?.active);
