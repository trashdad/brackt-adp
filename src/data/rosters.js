const ROSTERS = {
  // ── NFL — 32 teams ───────────────────────────────────────────────
  nfl: [
    'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
    'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
    'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
    'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
    'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
    'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
    'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
    'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders',
  ],

  // ── NBA — 30 teams ──────────────────────────────────────────────
  nba: [
    'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
    'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets',
    'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
    'LA Clippers', 'LA Lakers', 'Memphis Grizzlies', 'Miami Heat',
    'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
    'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
    'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors',
    'Utah Jazz', 'Washington Wizards',
  ],

  // ── MLB — 30 teams ──────────────────────────────────────────────
  mlb: [
    'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox',
    'Chicago Cubs', 'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians',
    'Colorado Rockies', 'Detroit Tigers', 'Houston Astros', 'Kansas City Royals',
    'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins', 'Milwaukee Brewers',
    'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
    'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants',
    'Seattle Mariners', 'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers',
    'Toronto Blue Jays', 'Washington Nationals',
  ],

  // ── NHL — 32 teams ──────────────────────────────────────────────
  nhl: [
    'Anaheim Ducks', 'Boston Bruins', 'Buffalo Sabres', 'Calgary Flames',
    'Carolina Hurricanes', 'Chicago Blackhawks', 'Colorado Avalanche', 'Columbus Blue Jackets',
    'Dallas Stars', 'Detroit Red Wings', 'Edmonton Oilers', 'Florida Panthers',
    'Los Angeles Kings', 'Minnesota Wild', 'Montreal Canadiens', 'Nashville Predators',
    'New Jersey Devils', 'New York Islanders', 'New York Rangers', 'Ottawa Senators',
    'Philadelphia Flyers', 'Pittsburgh Penguins', 'San Jose Sharks', 'Seattle Kraken',
    'St. Louis Blues', 'Tampa Bay Lightning', 'Toronto Maple Leafs', 'Utah Hockey Club',
    'Vancouver Canucks', 'Vegas Golden Knights', 'Washington Capitals', 'Winnipeg Jets',
  ],

  // ── NCAA Football — Top 40 FBS programs ─────────────────────────
  ncaaf: [
    'Ohio State Buckeyes', 'Georgia Bulldogs', 'Texas Longhorns', 'Notre Dame Fighting Irish',
    'Oregon Ducks', 'Alabama Crimson Tide', 'Penn State Nittany Lions', 'Michigan Wolverines',
    'LSU Tigers', 'Texas A&M Aggies', 'Ole Miss Rebels', 'USC Trojans',
    'Tennessee Volunteers', 'Oklahoma Sooners', 'Clemson Tigers', 'Florida Gators',
    'Auburn Tigers', 'Missouri Tigers', 'Miami Hurricanes', 'Florida State Seminoles',
    'Louisville Cardinals', 'Iowa Hawkeyes', 'South Carolina Gamecocks', 'Colorado Buffaloes',
    'Kansas State Wildcats', 'Arizona State Sun Devils', 'Washington Huskies', 'Iowa State Cyclones',
    'BYU Cougars', 'Utah Utes', 'Nebraska Cornhuskers', 'Baylor Bears',
    'SMU Mustangs', 'Arizona Wildcats', 'Texas Tech Red Raiders', 'Indiana Hoosiers',
    'Boise State Broncos', 'Tulane Green Wave', 'Memphis Tigers', 'UNLV Rebels',
  ],

  // ── NCAA Men's Basketball — Top 40 programs ─────────────────────
  ncaab: [
    'Duke Blue Devils', 'UConn Huskies', 'Kansas Jayhawks', 'Houston Cougars',
    'Purdue Boilermakers', 'Michigan Wolverines', 'Arizona Wildcats', 'Illinois Fighting Illini',
    'Florida Gators', 'Iowa State Cyclones', 'Gonzaga Bulldogs', 'Tennessee Volunteers',
    'Alabama Crimson Tide', 'North Carolina Tar Heels', 'Kentucky Wildcats', 'Arkansas Razorbacks',
    'Nebraska Cornhuskers', 'Michigan State Spartans', "St. John's Red Storm", 'Louisville Cardinals',
    'Virginia Cavaliers', 'Vanderbilt Commodores', 'BYU Cougars', 'Wisconsin Badgers',
    'Texas Tech Red Raiders', 'NC State Wolfpack', 'Iowa Hawkeyes', 'Miami Hurricanes',
    'Texas A&M Aggies', 'Clemson Tigers', 'Villanova Wildcats', "Saint Mary's Gaels",
    'SMU Mustangs', 'Texas Longhorns', 'Ohio State Buckeyes', 'Auburn Tigers',
    'UCLA Bruins', 'TCU Horned Frogs', 'Creighton Bluejays', 'Marquette Golden Eagles',
  ],

  // ── NCAA Women's Basketball — Top 25 programs ───────────────────
  ncaaw: [
    'South Carolina Gamecocks', 'UConn Huskies', 'Iowa Hawkeyes', 'LSU Tigers',
    'UCLA Bruins', 'Texas Longhorns', 'Stanford Cardinal', 'Notre Dame Fighting Irish',
    'Vanderbilt Commodores', 'Duke Blue Devils', 'Michigan Wolverines', 'Oklahoma Sooners',
    'NC State Wolfpack', 'Louisville Cardinals', 'Tennessee Lady Volunteers', 'Ohio State Buckeyes',
    'Ole Miss Rebels', 'Iowa State Cyclones', 'Baylor Bears', 'North Carolina Tar Heels',
    'Michigan State Spartans', 'Maryland Terrapins', 'Kentucky Wildcats', 'USC Trojans',
    'Texas Tech Lady Raiders',
  ],

  // ── WNBA — 13 teams ─────────────────────────────────────────────
  wnba: [
    'Atlanta Dream', 'Chicago Sky', 'Connecticut Sun', 'Dallas Wings',
    'Golden State Valkyries', 'Indiana Fever', 'Las Vegas Aces', 'Los Angeles Sparks',
    'Minnesota Lynx', 'New York Liberty', 'Phoenix Mercury', 'Seattle Storm',
    'Washington Mystics',
  ],

  // ── AFL — 18 teams ──────────────────────────────────────────────
  afl: [
    'Adelaide Crows', 'Brisbane Lions', 'Carlton Blues', 'Collingwood Magpies',
    'Essendon Bombers', 'Fremantle Dockers', 'Geelong Cats', 'Gold Coast Suns',
    'Greater Western Sydney Giants', 'Hawthorn Hawks', 'Melbourne Demons', 'North Melbourne Kangaroos',
    'Port Adelaide Power', 'Richmond Tigers', 'St Kilda Saints', 'Sydney Swans',
    'West Coast Eagles', 'Western Bulldogs',
  ],

  // ── Formula 1 — 20 drivers (2025 grid) ──────────────────────────
  f1: [
    'Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris',
    'Oscar Piastri', 'George Russell', 'Carlos Sainz', 'Fernando Alonso',
    'Lance Stroll', 'Pierre Gasly', 'Esteban Ocon', 'Alexander Albon',
    'Nico Hulkenberg', 'Yuki Tsunoda', 'Liam Lawson', 'Kimi Antonelli',
    'Oliver Bearman', 'Isack Hadjar', 'Franco Colapinto', 'Gabriel Bortoleto',
  ],

  // ── UEFA Champions League — Top 32 clubs ────────────────────────
  ucl: [
    'Real Madrid', 'Manchester City', 'Bayern Munich', 'Arsenal', 'Barcelona',
    'Liverpool', 'PSG', 'Inter Milan', 'Chelsea', 'Atletico Madrid',
    'Borussia Dortmund', 'Juventus', 'Napoli', 'Tottenham', 'Newcastle',
    'Bayer Leverkusen', 'Atalanta', 'Sporting CP', 'Benfica', 'AC Milan',
    'Monaco', 'Marseille', 'Ajax', 'PSV Eindhoven', 'Eintracht Frankfurt',
    'Athletic Bilbao', 'Villarreal', 'Club Brugge', 'Galatasaray', 'Olympiacos',
    'Slavia Prague', 'Copenhagen', 'Bodo Glimt',
  ],

  // ── FIFA World Cup — Top 40 nations ─────────────────────────────
  fifa: [
    'Spain', 'England', 'France', 'Brazil', 'Argentina',
    'Portugal', 'Germany', 'Netherlands', 'Italy', 'Belgium',
    'Norway', 'Colombia', 'Uruguay', 'Croatia', 'United States',
    'Mexico', 'Morocco', 'Switzerland', 'Ecuador', 'Senegal',
    'Japan', 'South Korea', 'Australia', 'Canada', 'Ghana',
    'Egypt', 'Ivory Coast', 'Algeria', 'Saudi Arabia', 'Iran',
    'Denmark', 'Austria', 'Turkey', 'Poland', 'Sweden',
    'Scotland', 'Paraguay', 'South Africa', 'Qatar', 'New Zealand',
    'Wales',
  ],

  // ── Darts — Top 34 PDC players ──────────────────────────────────
  darts: [
    'Luke Littler', 'Luke Humphries', 'Gian van Veen', 'Michael van Gerwen',
    'Jonny Clayton', 'Stephen Bunting', 'Gary Anderson', 'James Wade',
    'Josh Rock', 'Gerwyn Price', 'Danny Noppert', 'Chris Dobey',
    'Ryan Searle', 'Nathan Aspinall', 'Ross Smith', 'Martin Schindler',
    'Jermaine Wattimena', 'Damon Heta', 'Mike De Decker', 'Rob Cross',
    'Luke Woodhouse', 'Dave Chisnall', 'Daryl Gurney', 'Wessel Nijman',
    'Ryan Joyce', 'Beau Greaves', 'Niko Springer', 'Justin Hood',
    'Michael Smith', 'Dirk van Duijvenbode', 'Charlie Manby', 'Callan Rydz',
    'Krzysztof Ratajski', "William O'Connor",
  ],

  // ── Snooker — Top 40 world ranked players ───────────────────────
  snooker: [
    'Judd Trump', 'Kyren Wilson', 'Neil Robertson', 'Mark Williams',
    'Zhao Xintong', 'John Higgins', 'Mark Selby', 'Shaun Murphy',
    'Mark Allen', 'Xiao Guodong', 'Wu Yize',
    'Chris Wakelin', 'Barry Hawkins', 'Ding Junhui', 'Si Jiahui',
    'Stuart Bingham', 'Zhang Anda', 'Jak Jones', 'Ali Carter',
    'Jack Lisowski', 'Luca Brecel', 'Gary Wilson', 'Allister Carter',
    'Stan Moody', "Joe O'Connor", 'Hossein Vafaei', 'Elliot Slessor',
    'David Gilbert', 'Stephen Maguire', 'Anthony McGill', 'Aaron Hill',
    'Zhou Yuelong', 'Jackson Page', 'Yuan Sijun', 'Thepchaiya Un-Nooh',
    'Pang Junxu',
  ],

  // ── Little League World Series — Regional slots ─────────────────
  llws: [
    'USA Great Lakes', 'USA New England', 'USA Southeast', 'USA Southwest',
    'USA West', 'USA Midwest', 'USA Mid-Atlantic', 'USA Mountain',
    'USA Metro', 'USA Northwest', 'Japan', 'Taipei', 'Mexico',
    'Caribbean', 'Canada', 'Latin America', 'Europe-Africa', 'Asia-Pacific',
    'Australia', 'Panama',
  ],

  // ── IndyCar — Full-time drivers (2025) ──────────────────────────
  indycar: [
    'Josef Newgarden', 'Alex Palou', 'Scott McLaughlin', "Pato O'Ward",
    'Will Power', 'Scott Dixon', 'Colton Herta', 'Kyle Kirkwood',
    'Marcus Ericsson', 'Christian Lundgaard', 'Santino Ferrucci', 'Graham Rahal',
    'Alexander Rossi', 'Felix Rosenqvist', 'Rinus VeeKay', 'David Malukas',
    'Nolan Siegel', 'Kyffin Simpson', 'Sting Ray Robb', 'Marcus Armstrong',
    'Conor Daly', 'Robert Shwartzman', 'Callum Ilott', 'Louis Foster',
    'Devlin DeFrancesco', 'Christian Rasmussen', 'Jacob Abel', 'Mick Schumacher',
    'Takuma Sato',
  ],

  // ── PGA Golf — Top 50 players ───────────────────────────────────
  pga: [
    'Scottie Scheffler', 'Rory McIlroy', 'Xander Schauffele', 'Collin Morikawa',
    'Ludvig Aberg', 'Viktor Hovland', 'Justin Thomas', 'Hideki Matsuyama',
    'Tommy Fleetwood', 'Jon Rahm', 'Bryson DeChambeau', 'Patrick Cantlay',
    'Sam Burns', 'Shane Lowry', 'Matt Fitzpatrick', 'Russell Henley',
    'Tyrrell Hatton', 'Cameron Young', 'Sungjae Im', 'Wyndham Clark',
    'Brooks Koepka', 'Robert MacIntyre', 'Justin Rose', 'Sepp Straka',
    'Harris English', 'Keegan Bradley', 'Brian Harman', 'Tony Finau',
    'Joaquin Niemann', 'Maverick McNealy', 'Jordan Spieth', 'Tom Kim',
    'Akshay Bhatia', 'Min Woo Lee', 'Aaron Rai', 'Cameron Smith',
    'Corey Conners', 'Max Greyserman', 'Jason Day', 'Kurt Kitayama',
    'Ryan Fox', 'Adam Scott', 'J.J. Spaun', 'Si Woo Kim',
    'Tom Hoge', 'Daniel Berger', 'Rasmus Hojgaard', 'Dustin Johnson',
    'Davis Thompson', 'Ben Griffin', 'Patrick Reed', 'Chris Gotterup',
  ],

  // ── Tennis Men's (ATP) — Top 56 players ─────────────────────────
  tennis_m: [
    'Carlos Alcaraz', 'Jannik Sinner', 'Alexander Zverev', 'Novak Djokovic',
    'Felix Auger-Aliassime', 'Taylor Fritz', 'Alex de Minaur', 'Lorenzo Musetti',
    'Ben Shelton', 'Jack Draper', 'Alexander Bublik', 'Casper Ruud',
    'Daniil Medvedev', 'Holger Rune', 'Andrey Rublev', 'Tommy Paul',
    'Karen Khachanov', 'Jiri Lehecka', 'Jakub Mensik', 'Francisco Cerundolo',
    'Flavio Cobolli', 'Denis Shapovalov', 'Joao Fonseca', 'Stefanos Tsitsipas',
    'Frances Tiafoe', 'Ugo Humbert', 'Arthur Fils', 'Grigor Dimitrov',
    'Matteo Berrettini', 'Alejandro Davidovich Fokina', 'Hubert Hurkacz',
    'Giovanni Mpetshi Perricard', 'Sebastian Korda', 'Learner Tien',
    'Gabriel Diallo', 'Alex Michelsen', 'Nicolas Jarry', 'Lorenzo Sonego',
    'Jan-Lennard Struff', 'Cameron Norrie', 'Reilly Opelka', 'Tomas Machac',
    'Nick Kyrgios', 'Tallon Griekspoor',
    // Expanded coverage (ATP 45–70)
    'Alexei Popyrin', 'Miomir Kecmanovic', 'Nuno Borges', 'Alejandro Tabilo',
    'Mariano Navone', 'Botic van de Zandschulp', 'Daniel Altmaier', 'Roman Safiullin',
    'Mattia Bellucci', 'Brandon Nakashima', 'Hamad Medjedovic', 'Luca Van Assche',
  ],

  // ── Tennis Women's (WTA) — Top 47 players ──────────────────────
  tennis_w: [
    'Aryna Sabalenka', 'Iga Swiatek', 'Coco Gauff', 'Elena Rybakina',
    'Jessica Pegula', 'Madison Keys', 'Jasmine Paolini', 'Mirra Andreeva',
    'Amanda Anisimova', 'Belinda Bencic', 'Clara Tauson', 'Linda Noskova',
    'Elina Svitolina', 'Emma Navarro', 'Naomi Osaka', 'Karolina Muchova',
    'Diana Shnaider', 'Elise Mertens', 'Leylah Fernandez', 'Jelena Ostapenko',
    'Qinwen Zheng', 'Emma Raducanu', 'Ekaterina Alexandrova', 'Liudmila Samsonova',
    'Victoria Mboko', 'Marketa Vondrousova', 'Iva Jovic', 'Barbora Krejcikova',
    'Maya Joint', 'Paula Badosa', 'Anastasia Potapova', 'Sonay Kartal',
    'Marta Kostyuk', 'Tereza Valentova', 'Veronika Kudermetova',
    // Expanded coverage (WTA 16–50)
    'Daria Kasatkina', 'Caroline Garcia', 'Donna Vekic', 'Maria Sakkari',
    'Beatriz Haddad Maia', 'Dayana Yastremska', 'Danielle Collins', 'Magdalena Frech',
    'Sorana Cirstea', 'Sofia Kenin', 'Anhelina Kalinina', 'Diane Parry',
  ],

  // ── Counter-Strike 2 — Top 20 teams (Feb 2026 HLTV) ─────────────
  csgo: [
    'Vitality', 'FURIA', 'Falcons', 'MOUZ', 'PARIVISION',
    'Team Spirit', 'The MongolZ', 'Natus Vincere', 'FaZe Clan', 'Aurora',
    'G2 Esports', 'Astralis', 'Team Liquid', '3DMAX', 'paiN Gaming',
    'GamerLegion', 'B8', 'NRG', 'Heroic', 'Ninjas in Pyjamas',
  ],
};
export default ROSTERS;
