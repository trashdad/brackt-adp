const SPORTS = [
  { id: 'afl', name: 'AFL', apiKey: 'aussierules_afl', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C9}', active: true, scarcityWeight: 0.5, fieldSize: 18 },
  { id: 'csgo', name: 'Counter-Strike 2', apiKey: 'esports_csgo', category: 'standard', eventsPerSeason: 2, market: 'outrights', icon: '\u{1F3AE}', active: true, scarcityWeight: 0.4, fieldSize: 24, tournaments: [{ id: 'blast-spring-2026', name: 'BLAST Open Spring (Rotterdam)', qpEvent: true }, { id: 'cologne-2026', name: 'IEM Cologne Major', qpEvent: false }, { id: 'blast-fall-2026', name: 'BLAST Open Fall (Copenhagen)', qpEvent: true }, { id: 'singapore-2026', name: 'PGL Singapore Major', qpEvent: false }] },
  { id: 'darts', name: 'Darts World Championship', apiKey: 'darts_pdc_world_championship', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3AF}', active: true, scarcityWeight: 0.5, fieldSize: 32 },
  { id: 'fifa', name: 'FIFA World Cup', apiKey: 'soccer_fifa_world_cup', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BD', active: true, scarcityWeight: 0.5, fieldSize: 48 },
  { id: 'f1', name: 'Formula 1', apiKey: 'motorsport_formula1', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3CE}\uFE0F', active: true, scarcityWeight: 0.5, fieldSize: 20, tournaments: [{ id: 'draftkings', name: 'DraftKings' }, { id: 'fanduel', name: 'FanDuel' }, { id: 'betmgm', name: 'BetMGM' }] },
  { id: 'indycar', name: 'IndyCar', apiKey: null, category: 'standard', eventsPerSeason: 18, market: 'outrights', icon: '\u{1F3CE}\uFE0F', active: true, scarcityWeight: 0.5, fieldSize: 27, tournaments: [{ id: 'championship', name: 'Season Championship' }, { id: 'st-pete', name: 'St. Petersburg' }, { id: 'phoenix', name: 'Phoenix' }, { id: 'arlington', name: 'Arlington' }, { id: 'birmingham', name: 'Birmingham' }, { id: 'long-beach', name: 'Long Beach' }, { id: 'indy-road', name: 'Indy Road Course' }, { id: 'indianapolis-500', name: 'Indianapolis 500' }, { id: 'detroit', name: 'Detroit' }, { id: 'madison', name: 'Madison' }, { id: 'road-america', name: 'Road America' }, { id: 'mid-ohio', name: 'Mid-Ohio' }, { id: 'nashville', name: 'Nashville' }, { id: 'portland', name: 'Portland' }, { id: 'markham', name: 'Markham' }, { id: 'dc', name: 'Washington D.C.' }, { id: 'west-allis-1', name: 'West Allis (250)' }, { id: 'west-allis-2', name: 'Milwaukee Mile' }, { id: 'laguna-seca', name: 'Laguna Seca' }] },
  { id: 'llws', name: 'Little League World Series', apiKey: null, category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BE', active: true, scarcityWeight: 0.5, fieldSize: 20, evMultiplier: 0.75 },
  { id: 'mlb', name: 'MLB', apiKey: 'baseball_mlb', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BE', active: true, scarcityWeight: 0.5, fieldSize: 30 },
  { id: 'nba', name: 'NBA', apiKey: 'basketball_nba', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true, scarcityWeight: 0.5, fieldSize: 30 },
  { id: 'ncaab', name: 'NCAA Basketball', apiKey: 'basketball_ncaab', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true, scarcityWeight: 0.5, fieldSize: 68 },
  { id: 'ncaaf', name: 'NCAA Football', apiKey: 'americanfootball_ncaaf', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C8}', active: true, scarcityWeight: 0.5, fieldSize: 12 },
  { id: 'ncaaw', name: 'NCAA Women\'s Basketball', apiKey: 'basketball_wncaab', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true, scarcityWeight: 0.5, fieldSize: 68 },
  { id: 'nfl', name: 'NFL', apiKey: 'americanfootball_nfl', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C8}', active: true, scarcityWeight: 0.5, fieldSize: 32 },
  { id: 'nhl', name: 'NHL', apiKey: 'icehockey_nhl', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3D2}', active: true, scarcityWeight: 0.5, fieldSize: 32 },
  { id: 'pga', name: 'PGA Golf', apiKey: 'golf_pga', category: 'standard', eventsPerSeason: 4, market: 'outrights', icon: '\u26F3', active: true, scarcityWeight: 0.2, fieldSize: 80, tournaments: [
    { id: 'masters', name: 'The Masters', qpEvent: true },
    { id: 'pga-champ', name: 'PGA Championship', qpEvent: true },
    { id: 'us-open', name: 'US Open', qpEvent: true },
    { id: 'open-champ', name: 'The Open Championship', qpEvent: true },
    { id: 'the-players', name: 'The Players Championship', qpEvent: false },
    { id: 'wgc-match-play', name: 'WGC Dell Match Play', qpEvent: false },
    { id: 'genesis', name: 'Genesis Invitational', qpEvent: false },
    { id: 'arnold-palmer', name: 'Arnold Palmer Invitational', qpEvent: false },
    { id: 'bmw-championship', name: 'BMW Championship', qpEvent: false },
  ] },
  { id: 'snooker', name: 'Snooker World Championship', apiKey: 'snooker_world_championship', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3B1}', active: true, scarcityWeight: 0.5, fieldSize: 32 },
  { id: 'tennis_m', name: 'Tennis (Men\'s)', apiKey: 'tennis_atp', category: 'standard', eventsPerSeason: 4, market: 'outrights', icon: '\u{1F3BE}', active: true, scarcityWeight: 0.4, fieldSize: 64, tournaments: [
    { id: 'aus-open', name: 'Australian Open', qpEvent: true },
    { id: 'french-open', name: 'French Open', qpEvent: true },
    { id: 'wimbledon', name: 'Wimbledon', qpEvent: true },
    { id: 'us-open', name: 'US Open', qpEvent: true },
    // Reference events — form signals only, no QP. Clay swing (pre-RG) and hard swing (pre-Wimbledon/USO) are highest signal.
    { id: 'indian-wells', name: 'Indian Wells (BNP Paribas Open)', qpEvent: false },
    { id: 'miami-open', name: 'Miami Open', qpEvent: false },
    { id: 'monte-carlo', name: 'Monte Carlo Masters', qpEvent: false },   // clay indicator for French Open
    { id: 'madrid-open', name: 'Madrid Open', qpEvent: false },            // clay indicator for French Open
    { id: 'rome', name: 'Italian Open (Rome)', qpEvent: false },            // immediate pre-French Open clay form
    { id: 'canada-open', name: 'Canada Open (Montreal/Toronto)', qpEvent: false },
    { id: 'cincinnati', name: 'Cincinnati Open', qpEvent: false },          // hardcourt form before US Open
  ] },
  { id: 'tennis_w', name: 'Tennis (Women\'s)', apiKey: 'tennis_wta', category: 'standard', eventsPerSeason: 4, market: 'outrights', icon: '\u{1F3BE}', active: true, scarcityWeight: 0.4, fieldSize: 64, tournaments: [
    { id: 'aus-open', name: 'Australian Open', qpEvent: true },
    { id: 'french-open', name: 'French Open', qpEvent: true },
    { id: 'wimbledon', name: 'Wimbledon', qpEvent: true },
    { id: 'us-open', name: 'US Open', qpEvent: true },
    // Reference events — same rationale as men's. Rome/Madrid clay swing especially predictive for Swiatek/clay specialists.
    { id: 'indian-wells', name: 'Indian Wells', qpEvent: false },
    { id: 'miami-open', name: 'Miami Open', qpEvent: false },
    { id: 'madrid-open', name: 'Madrid Open', qpEvent: false },
    { id: 'rome', name: 'Italian Open (Rome)', qpEvent: false },
    { id: 'canada-open', name: 'Canada Open', qpEvent: false },
    { id: 'cincinnati', name: 'Cincinnati Open', qpEvent: false },
  ] },
  { id: 'ucl', name: 'UEFA Champions League', apiKey: 'soccer_uefa_champs_league', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BD', active: true, scarcityWeight: 0.5, fieldSize: 36 },
  { id: 'wnba', name: 'WNBA', apiKey: 'basketball_wnba', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true, scarcityWeight: 0.5, fieldSize: 12 },
];

export const SPORT_COLORS = {
  nfl: '#0055FF',      // Vibrant Blue
  nba: '#FF8800',      // Electric Orange
  mlb: '#FF0055',      // Bright Crimson
  nhl: '#00FFFF',      // Neon Cyan
  ncaaf: '#AA0000',    // Deep Red
  ncaab: '#FF4400',    // Flare Orange
  ncaaw: '#FF00FF',    // Neon Magenta
  wnba: '#FFCC00',     // Bright Gold
  afl: '#00AAFF',      // Sky Blue
  f1: '#FF0000',       // Racing Red
  ucl: '#5500FF',      // Deep Purple
  fifa: '#00FF00',     // Pitch Green
  darts: '#FFFF00',    // High-vis Yellow
  snooker: '#008800',  // Table Green
  llws: '#00CCCC',     // Aqua
  indycar: '#888888',  // Silver/Chrome
  pga: '#39FF14',      // Neon Lime
  tennis_m: '#CCFF00', // Tennis Ball Yellow
  tennis_w: '#FF66CC', // Hot Pink
  csgo: '#FFAA00',     // Orange-Gold
};

export function getSportById(id) {
  return SPORTS.find((s) => s.id === id);
}

export function getSportsByCategory(category) {
  return SPORTS.filter((s) => s.category === category && s.active);
}

export default SPORTS;
