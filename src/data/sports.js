const SPORTS = [
  { id: 'nfl', name: 'NFL', apiKey: 'americanfootball_nfl', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C8}', active: true },
  { id: 'nba', name: 'NBA', apiKey: 'basketball_nba', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true },
  { id: 'mlb', name: 'MLB', apiKey: 'baseball_mlb', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BE', active: true },
  { id: 'nhl', name: 'NHL', apiKey: 'icehockey_nhl', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3D2}', active: true },
  { id: 'ncaaf', name: 'NCAA Football', apiKey: 'americanfootball_ncaaf', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C8}', active: true },
  { id: 'ncaab', name: 'NCAA Basketball', apiKey: 'basketball_ncaab', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true },
  { id: 'ncaaw', name: 'NCAA Women\'s Basketball', apiKey: 'basketball_wncaab', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true },
  { id: 'wnba', name: 'WNBA', apiKey: 'basketball_wnba', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C0}', active: true },
  { id: 'afl', name: 'AFL', apiKey: 'aussierules_afl', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3C9}', active: true },
  { id: 'f1', name: 'Formula 1', apiKey: 'motorsport_formula1', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3CE}\uFE0F', active: true },
  { id: 'ucl', name: 'UEFA Champions League', apiKey: 'soccer_uefa_champs_league', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BD', active: true },
  { id: 'fifa', name: 'FIFA World Cup', apiKey: 'soccer_fifa_world_cup', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BD', active: true },
  { id: 'darts', name: 'Darts World Championship', apiKey: 'darts_pdc_world_championship', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3AF}', active: true },
  { id: 'snooker', name: 'Snooker World Championship', apiKey: 'snooker_world_championship', category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3B1}', active: true },
  { id: 'llws', name: 'Little League World Series', apiKey: null, category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u26BE', active: true },
  { id: 'indycar', name: 'IndyCar', apiKey: null, category: 'standard', eventsPerSeason: 1, market: 'outrights', icon: '\u{1F3CE}\uFE0F', active: true },
  { id: 'pga', name: 'PGA Golf', apiKey: 'golf_pga', category: 'qp', eventsPerSeason: 30, market: 'outrights', icon: '\u26F3', active: true },
  { id: 'tennis_m', name: 'Tennis (Men\'s)', apiKey: 'tennis_atp', category: 'qp', eventsPerSeason: 13, market: 'outrights', icon: '\u{1F3BE}', active: true },
  { id: 'tennis_w', name: 'Tennis (Women\'s)', apiKey: 'tennis_wta', category: 'qp', eventsPerSeason: 13, market: 'outrights', icon: '\u{1F3BE}', active: true },
  { id: 'csgo', name: 'Counter-Strike (BLAST)', apiKey: 'esports_csgo', category: 'qp', eventsPerSeason: 6, market: 'outrights', icon: '\u{1F3AE}', active: true },
];

export const SPORT_COLORS = {
  nfl: '#013369',
  nba: '#F58426',
  mlb: '#002D72',
  nhl: '#000000',
  ncaaf: '#8B0000',
  ncaab: '#FF6600',
  ncaaw: '#9B59B6',
  wnba: '#FF6A00',
  afl: '#01447B',
  f1: '#E10600',
  ucl: '#0D1B67',
  fifa: '#326295',
  darts: '#E42A2A',
  snooker: '#2D7D2D',
  llws: '#1C4587',
  indycar: '#1A1A1A',
  pga: '#00563F',
  tennis_m: '#4E9A06',
  tennis_w: '#C060A1',
  csgo: '#DE9B35',
};

export function getSportById(id) {
  return SPORTS.find((s) => s.id === id);
}

export function getSportsByCategory(category) {
  return SPORTS.filter((s) => s.category === category && s.active);
}

export default SPORTS;
