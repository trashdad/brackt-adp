/**
 * Mock/seed data for development and API fallback.
 * Each entry has: name, sport id, American odds.
 */
const MOCK_ENTRIES = [
  // NFL
  { name: 'Kansas City Chiefs', sport: 'nfl', odds: '+350' },
  { name: 'Philadelphia Eagles', sport: 'nfl', odds: '+550' },
  { name: 'San Francisco 49ers', sport: 'nfl', odds: '+700' },
  { name: 'Buffalo Bills', sport: 'nfl', odds: '+800' },
  { name: 'Detroit Lions', sport: 'nfl', odds: '+1000' },
  { name: 'Baltimore Ravens', sport: 'nfl', odds: '+1200' },
  { name: 'Dallas Cowboys', sport: 'nfl', odds: '+1500' },
  { name: 'Miami Dolphins', sport: 'nfl', odds: '+2000' },

  // NBA
  { name: 'Boston Celtics', sport: 'nba', odds: '+250' },
  { name: 'Denver Nuggets', sport: 'nba', odds: '+450' },
  { name: 'Milwaukee Bucks', sport: 'nba', odds: '+600' },
  { name: 'Oklahoma City Thunder', sport: 'nba', odds: '+700' },
  { name: 'Phoenix Suns', sport: 'nba', odds: '+1200' },
  { name: 'Minnesota Timberwolves', sport: 'nba', odds: '+1400' },
  { name: 'LA Lakers', sport: 'nba', odds: '+1800' },
  { name: 'New York Knicks', sport: 'nba', odds: '+2000' },

  // MLB
  { name: 'Los Angeles Dodgers', sport: 'mlb', odds: '+350' },
  { name: 'Atlanta Braves', sport: 'mlb', odds: '+600' },
  { name: 'Houston Astros', sport: 'mlb', odds: '+800' },
  { name: 'New York Yankees', sport: 'mlb', odds: '+900' },
  { name: 'Philadelphia Phillies', sport: 'mlb', odds: '+1000' },
  { name: 'Texas Rangers', sport: 'mlb', odds: '+1200' },

  // NHL
  { name: 'Edmonton Oilers', sport: 'nhl', odds: '+500' },
  { name: 'Boston Bruins', sport: 'nhl', odds: '+600' },
  { name: 'Carolina Hurricanes', sport: 'nhl', odds: '+800' },
  { name: 'Dallas Stars', sport: 'nhl', odds: '+900' },
  { name: 'Colorado Avalanche', sport: 'nhl', odds: '+1000' },
  { name: 'Florida Panthers', sport: 'nhl', odds: '+1200' },

  // NCAA Football
  { name: 'Georgia Bulldogs', sport: 'ncaaf', odds: '+300' },
  { name: 'Michigan Wolverines', sport: 'ncaaf', odds: '+500' },
  { name: 'Ohio State Buckeyes', sport: 'ncaaf', odds: '+600' },
  { name: 'Alabama Crimson Tide', sport: 'ncaaf', odds: '+800' },
  { name: 'Texas Longhorns', sport: 'ncaaf', odds: '+1200' },

  // NCAA Basketball
  { name: 'UConn Huskies', sport: 'ncaab', odds: '+400' },
  { name: 'Houston Cougars', sport: 'ncaab', odds: '+600' },
  { name: 'Purdue Boilermakers', sport: 'ncaab', odds: '+800' },
  { name: 'Duke Blue Devils', sport: 'ncaab', odds: '+1200' },
  { name: 'Kansas Jayhawks', sport: 'ncaab', odds: '+1500' },

  // NCAA Women's Basketball
  { name: 'South Carolina Gamecocks', sport: 'ncaaw', odds: '+200' },
  { name: 'Iowa Hawkeyes', sport: 'ncaaw', odds: '+500' },
  { name: 'LSU Tigers', sport: 'ncaaw', odds: '+700' },
  { name: 'Stanford Cardinal', sport: 'ncaaw', odds: '+1200' },

  // WNBA
  { name: 'Las Vegas Aces', sport: 'wnba', odds: '+250' },
  { name: 'New York Liberty', sport: 'wnba', odds: '+350' },
  { name: 'Connecticut Sun', sport: 'wnba', odds: '+800' },
  { name: 'Seattle Storm', sport: 'wnba', odds: '+1200' },

  // AFL
  { name: 'Collingwood Magpies', sport: 'afl', odds: '+400' },
  { name: 'Brisbane Lions', sport: 'afl', odds: '+500' },
  { name: 'Melbourne Demons', sport: 'afl', odds: '+700' },
  { name: 'Sydney Swans', sport: 'afl', odds: '+1000' },

  // Formula 1
  { name: 'Max Verstappen', sport: 'f1', odds: '+150' },
  { name: 'Lewis Hamilton', sport: 'f1', odds: '+500' },
  { name: 'Lando Norris', sport: 'f1', odds: '+600' },
  { name: 'Charles Leclerc', sport: 'f1', odds: '+800' },
  { name: 'Carlos Sainz', sport: 'f1', odds: '+1500' },

  // UEFA Champions League
  { name: 'Manchester City', sport: 'ucl', odds: '+300' },
  { name: 'Real Madrid', sport: 'ucl', odds: '+400' },
  { name: 'Bayern Munich', sport: 'ucl', odds: '+600' },
  { name: 'Arsenal', sport: 'ucl', odds: '+800' },
  { name: 'PSG', sport: 'ucl', odds: '+1000' },

  // FIFA World Cup
  { name: 'Brazil', sport: 'fifa', odds: '+400' },
  { name: 'France', sport: 'fifa', odds: '+500' },
  { name: 'Argentina', sport: 'fifa', odds: '+600' },
  { name: 'England', sport: 'fifa', odds: '+700' },
  { name: 'Germany', sport: 'fifa', odds: '+1200' },

  // Darts
  { name: 'Luke Humphries', sport: 'darts', odds: '+300' },
  { name: 'Luke Littler', sport: 'darts', odds: '+400' },
  { name: 'Michael van Gerwen', sport: 'darts', odds: '+600' },
  { name: 'Gerwyn Price', sport: 'darts', odds: '+1500' },

  // Snooker
  { name: 'Ronnie O\'Sullivan', sport: 'snooker', odds: '+350' },
  { name: 'Judd Trump', sport: 'snooker', odds: '+400' },
  { name: 'Mark Selby', sport: 'snooker', odds: '+800' },
  { name: 'Neil Robertson', sport: 'snooker', odds: '+1200' },

  // Little League World Series
  { name: 'Taipei', sport: 'llws', odds: '+300' },
  { name: 'Japan', sport: 'llws', odds: '+400' },
  { name: 'USA Southwest', sport: 'llws', odds: '+600' },
  { name: 'Mexico', sport: 'llws', odds: '+1000' },

  // IndyCar
  { name: 'Josef Newgarden', sport: 'indycar', odds: '+350' },
  { name: 'Alex Palou', sport: 'indycar', odds: '+400' },
  { name: 'Scott McLaughlin', sport: 'indycar', odds: '+600' },
  { name: 'Pato O\'Ward', sport: 'indycar', odds: '+900' },

  // PGA Golf (QP)
  { name: 'Scottie Scheffler', sport: 'pga', odds: '+500' },
  { name: 'Rory McIlroy', sport: 'pga', odds: '+800' },
  { name: 'Jon Rahm', sport: 'pga', odds: '+1000' },
  { name: 'Viktor Hovland', sport: 'pga', odds: '+1400' },
  { name: 'Xander Schauffele', sport: 'pga', odds: '+1600' },
  { name: 'Wyndham Clark', sport: 'pga', odds: '+2000' },
  { name: 'Brooks Koepka', sport: 'pga', odds: '+2500' },
  { name: 'Collin Morikawa', sport: 'pga', odds: '+3000' },

  // Tennis Men's (QP)
  { name: 'Novak Djokovic', sport: 'tennis_m', odds: '+200' },
  { name: 'Carlos Alcaraz', sport: 'tennis_m', odds: '+300' },
  { name: 'Jannik Sinner', sport: 'tennis_m', odds: '+400' },
  { name: 'Daniil Medvedev', sport: 'tennis_m', odds: '+1200' },
  { name: 'Alexander Zverev', sport: 'tennis_m', odds: '+1500' },
  { name: 'Stefanos Tsitsipas', sport: 'tennis_m', odds: '+2500' },

  // Tennis Women's (QP)
  { name: 'Iga Swiatek', sport: 'tennis_w', odds: '+250' },
  { name: 'Aryna Sabalenka', sport: 'tennis_w', odds: '+350' },
  { name: 'Coco Gauff', sport: 'tennis_w', odds: '+600' },
  { name: 'Elena Rybakina', sport: 'tennis_w', odds: '+1000' },
  { name: 'Jessica Pegula', sport: 'tennis_w', odds: '+1800' },

  // Counter-Strike BLAST (QP)
  { name: 'FaZe Clan', sport: 'csgo', odds: '+300' },
  { name: 'Natus Vincere', sport: 'csgo', odds: '+400' },
  { name: 'Vitality', sport: 'csgo', odds: '+500' },
  { name: 'G2 Esports', sport: 'csgo', odds: '+800' },
  { name: 'Cloud9', sport: 'csgo', odds: '+1500' },
];

export default MOCK_ENTRIES;
