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
    'St. Louis Blues', 'Tampa Bay Lightning', 'Toronto Maple Leafs', 'Utah Mammoth',
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
    'Texas Tech Lady Raiders', 'Oregon Ducks',
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
    "Ronnie O'Sullivan", 'Chang Bingyu',
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
    'Australia', 'Panama', 'Curacao',
  ],

  // ── IndyCar — 2026 season (full-time + confirmed Indy 500 entrants) ──
  indycar: [
    // Full-time
    'Josef Newgarden', 'Alex Palou', 'Scott McLaughlin', "Pato O'Ward",
    'Will Power', 'Scott Dixon', 'Kyle Kirkwood', 'Marcus Ericsson',
    'Christian Lundgaard', 'Santino Ferrucci', 'Graham Rahal', 'Alexander Rossi',
    'Felix Rosenqvist', 'Rinus VeeKay', 'David Malukas', 'Nolan Siegel',
    'Kyffin Simpson', 'Sting Ray Robb', 'Marcus Armstrong', 'Robert Shwartzman',
    'Callum Ilott', 'Louis Foster', 'Christian Rasmussen', 'Jacob Abel',
    'Mick Schumacher', 'Romain Grosjean', 'Dennis Hauger', 'Caio Collet',
    // Indy 500 entries / part-time
    'Takuma Sato', 'Helio Castroneves', 'Ryan Hunter-Reay', 'Jack Harvey',
    'Ed Carpenter', 'Conor Daly',
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

  // ── Tennis Men's (ATP) — Top 128 players (Mar 2026 rankings) ────
  tennis_m: [
    // ATP 1–10
    'Carlos Alcaraz', 'Jannik Sinner', 'Novak Djokovic', 'Alexander Zverev',
    'Lorenzo Musetti', 'Alex de Minaur', 'Taylor Fritz', 'Ben Shelton',
    'Felix Auger-Aliassime', 'Alexander Bublik',
    // ATP 11–20
    'Daniil Medvedev', 'Jakub Mensik', 'Casper Ruud', 'Jack Draper',
    'Flavio Cobolli', 'Karen Khachanov', 'Andrey Rublev', 'Holger Rune',
    'Alejandro Davidovich Fokina', 'Francisco Cerundolo',
    // ATP 21–30
    'Luciano Darderi', 'Frances Tiafoe', 'Jiri Lehecka', 'Tommy Paul',
    'Tallon Griekspoor', 'Valentin Vacherot', 'Learner Tien', 'Arthur Rinderknech',
    'Cameron Norrie', 'Brandon Nakashima',
    // ATP 31–40
    'Tomas Martin Etcheverry', 'Arthur Fils', 'Corentin Moutet', 'Ugo Humbert',
    'Joao Fonseca', 'Jaume Munar', 'Sebastian Korda', 'Gabriel Diallo',
    'Denis Shapovalov', 'Alejandro Tabilo',
    // ATP 41–50
    'Jenson Brooksby', 'Grigor Dimitrov', 'Stefanos Tsitsipas', 'Alex Michelsen',
    'Alexei Popyrin', 'Fabian Marozsan', 'Zizou Bergs', 'Adrian Mannarino',
    'Nuno Borges', 'Tomas Machac',
    // ATP 51–60
    'Marin Cilic', 'Terence Atmane', 'Sebastian Baez', 'Giovanni Mpetshi Perricard',
    'Daniel Altmaier', 'Marton Fucsovics', 'Kamil Majchrzak', 'Miomir Kecmanovic',
    'Botic van de Zandschulp', 'Valentin Royer',
    // ATP 61–70
    'Lorenzo Sonego', 'Vit Kopriva', 'Ignacio Buse', 'Damir Dzumhur',
    'Yannick Hanfmann', 'Matteo Berrettini', 'Camilo Ugo Carabelli', 'Reilly Opelka',
    'Marcos Giron', 'Juan Manuel Cerundolo',
    // ATP 71–80
    'Hubert Hurkacz', 'Aleksandar Kovacevic', 'Ethan Quinn', 'Thiago Agustin Tirante',
    'Emilio Nava', 'Arthur Cazaux', 'Raphael Collignon', 'Eliot Spizzirri',
    'Mariano Navone', 'Jan-Lennard Struff',
    // ATP 81–90
    'Alexandre Muller', 'Francisco Comesana', 'James Duckworth', 'Filip Misolic',
    'Matteo Arnaldi', 'Jesper de Jong', 'Jacob Fearnley', 'Alexander Shevchenko',
    'Aleksandar Vukic', 'Cristian Garin',
    // ATP 91–100
    'Adam Walton', 'Stan Wawrinka', 'Roberto Bautista Agut', 'Mattia Bellucci',
    'Patrick Kypson', 'Hugo Gaston', 'Alexander Blockx', 'Roman Andres Burruchaga',
    'Zachary Svajda', 'Carlos Taberner',
    // ATP 101–110
    'Vilius Gaubas', 'Quentin Halys', 'Rafael Jodar', 'Adolfo Daniel Vallejo',
    'Luca Van Assche', 'Pedro Martinez', 'Pablo Carreno Busta', 'Sebastian Ofner',
    'Dalibor Svrcina', 'Hamad Medjedovic',
    // ATP 111–120
    'Benjamin Bonzi', 'Yibing Wu', 'Sho Shimabukuro', 'Francesco Maestrelli',
    'Marcelo Tomas Barrios Vera', 'Jordan Thompson', 'Rinky Hijikata', 'Tristan Schoolkate',
    'Dino Prizmic', 'Dusan Lajovic',
    // ATP 121–128
    'Elmer Moller', 'Jan Choinski', 'Coleman Wong', 'Titouan Droguet',
    'Andrea Pellegrino', 'Mackenzie McDonald', 'Christopher O\'Connell', 'Otto Virtanen',
    // Notable wildcards / former top players likely to appear
    'Nicolas Jarry', 'Nick Kyrgios', 'Gael Monfils', 'David Goffin',
    'Borna Coric', 'Luca Nardi', 'Roman Safiullin',
  ],

  // ── Tennis Women's (WTA) — Top 64 players (Mar 2026 rankings) ──
  tennis_w: [
    // WTA 1–10
    'Aryna Sabalenka', 'Iga Swiatek', 'Elena Rybakina', 'Coco Gauff',
    'Jessica Pegula', 'Amanda Anisimova', 'Jasmine Paolini', 'Mirra Andreeva',
    'Elina Svitolina', 'Victoria Mboko',
    // WTA 11–20
    'Ekaterina Alexandrova', 'Belinda Bencic', 'Karolina Muchova', 'Linda Noskova',
    'Madison Keys', 'Naomi Osaka', 'Clara Tauson', 'Iva Jovic',
    'Liudmila Samsonova', 'Emma Navarro',
    // WTA 21–30
    'Diana Shnaider', 'Elise Mertens', 'Anna Kalinskaya', 'Qinwen Zheng',
    'Emma Raducanu', 'Jelena Ostapenko', 'Leylah Fernandez', 'Marta Kostyuk',
    'Maya Joint', 'Wang Xinyu',
    // WTA 31–40
    'Alexandra Eala', 'Maria Sakkari', 'Jaqueline Cristian', 'Marie Bouzkova',
    'Sorana Cirstea', 'Janice Tjen', 'Sara Bejlek', 'Lois Boisson',
    'Ann Li', 'McCartney Kessler',
    // WTA 41–50
    'Elisabetta Cocciaretto', 'Hailey Baptiste', 'Katerina Siniakova', 'Sofia Kenin',
    'Marketa Vondrousova', 'Tereza Valentova', 'Magda Linette', 'Jessica Bouzas Maneiro',
    'Dayana Yastremska', 'Barbora Krejcikova',
    // WTA 51–64
    'Antonia Ruzic', 'Sonay Kartal', 'Laura Siegemund', 'Veronika Kudermetova',
    'Tatjana Maria', 'Varvara Gracheva', 'Magdalena Frech', 'Daria Kasatkina',
    'Emiliana Arango', 'Elsa Jacquemot', 'Camila Osorio', 'Peyton Stearns',
    'Cristina Bucsa', 'Solana Sierra',
    // WTA just outside top 64 — frequent Grand Slam participants
    'Beatriz Haddad Maia', 'Paula Badosa', 'Danielle Collins', 'Donna Vekic',
    'Anastasia Potapova', 'Lulu Sun', 'Katie Boulter', 'Yulia Putintseva',
    'Ajla Tomljanovic', 'Caty McNally', 'Caroline Garcia', 'Victoria Azarenka',
    'Ons Jabeur',
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
