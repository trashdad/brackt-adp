#!/usr/bin/env node
/**
 * Inject expert/pundit rankings and blog-sourced predictions into social scores.
 * This script adds high-weight "expert" source data from manually researched
 * sportswriter blogs, power rankings, and betting odds conjecture.
 *
 * Run: node scripts/inject-expert-data.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCORES_PATH = path.join(__dirname, '../server/data/social-scores.json');
const STORAGE_PATH = path.join(__dirname, '../server/data/social-storage.json');

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

function entryId(sport, name) {
  return `${sport}-${slugify(name)}`;
}

// Weight formula for expert rankings:
// Base: rank 1 → 7.0, last → 3.0 (linear decay)
// Agreement multiplier: scales 0.4–1.0 based on how many sources rank this entry
function expertWeight(rank, maxRank, sourceCount, totalSources) {
  const baseWeight = 3.0 + ((maxRank - rank) / maxRank) * 4.0;
  const agreementFactor = 0.4 + 0.6 * (sourceCount / totalSources);
  return baseWeight * agreementFactor;
}

// ─────────────────────────────────────────────────────────────
// EXPERT DATA — sourced from sportswriter blogs, odds sites,
// and pundit power rankings (Feb 2026)
// ─────────────────────────────────────────────────────────────

const EXPERT_DATA = {

  // ── Counter-Strike 2 ───────────────────────────────────────
  // Sources: HLTV Rankings, Esports.net, Hotspawn, Tips.GG
  csgo: {
    rankings: [
      { name: 'Vitality', rank: 1, sourceCount: 4, notes: 'HLTV #1, 1000 pts. Consensus best team. 2x Major champs 2025.' },
      { name: 'FURIA', rank: 2, sourceCount: 4, notes: 'HLTV #2, Valve #2. ESL Pro League S23 favorite (+225).' },
      { name: 'MOUZ', rank: 3, sourceCount: 4, notes: 'Valve #3, HLTV #4. Jimpphat breakout. Consistent podiums.' },
      { name: 'Falcons', rank: 4, sourceCount: 3, notes: 'HLTV #3. Strong roster but fewer trophies.' },
      { name: 'Team Spirit', rank: 5, sourceCount: 3, notes: '4 trophies in 2025. IGL experiment with magixx is risky.' },
      { name: 'FaZe Clan', rank: 6, sourceCount: 3, notes: 'HLTV #6. Championship pedigree but inconsistent.' },
      { name: 'The MongolZ', rank: 7, sourceCount: 2, notes: 'Won Esports World Cup 2025. Legit dark horse.' },
      { name: 'G2 Esports', rank: 8, sourceCount: 2, notes: 'IEM Krakow contender. Dependent on MalbsMd form.' },
      { name: 'Natus Vincere', rank: 9, sourceCount: 3, notes: 'Historical powerhouse, ~99% chance Cologne qualifier.' },
      { name: 'Aurora', rank: 10, sourceCount: 1, notes: 'ESL Pro League S23 odds at 19:1. Rising.' },
      { name: 'paiN Gaming', rank: 11, sourceCount: 1, notes: 'ESL Pro League participant.' },
      { name: 'Heroic', rank: 12, sourceCount: 1, notes: 'ESL Pro League S23 at 100:1.' },
      { name: 'FlyQuest', rank: 13, sourceCount: 1, notes: 'FUT Esports competitor (dark horse per Hotspawn).' },
      { name: 'Team Liquid', rank: 14, sourceCount: 2, notes: 'Rebuilding but NA mainstay.' },
      { name: 'Astralis', rank: 15, sourceCount: 2, notes: 'Former dynasty, still competing.' },
    ],
    sources: ['HLTV World Ranking', 'Esports.net Power Rankings', 'Hotspawn Predictions', 'Tips.GG Odds'],
  },

  // ── Snooker World Championship ─────────────────────────────
  // Sources: JustBookies, SnookerHQ, Racing Post, BestBettingSites, WST Rankings, Eurosport
  snooker: {
    rankings: [
      { name: 'Judd Trump', rank: 1, sourceCount: 5, notes: 'World #1, 4/1 favorite. Dominant all season. Won multiple ranking events.' },
      { name: 'Zhao Xintong', rank: 2, sourceCount: 4, notes: 'Defending champ, 9/2. Won World Grand Prix + Players Championship back-to-back Feb 2026. Red-hot form.' },
      { name: 'Mark Selby', rank: 3, sourceCount: 4, notes: '5/1. Won 3 ranking titles this season. Racing Post value pick for 5th Crucible crown.' },
      { name: "Ronnie O'Sullivan", rank: 4, sourceCount: 5, notes: '7/1. 7x champion but health concerns — pulled out of 2026 Masters. Dropped to #11.' },
      { name: 'Kyren Wilson', rank: 5, sourceCount: 4, notes: '8/1. World #2 by prize money. 2024 World Champion.' },
      { name: 'Wu Yize', rank: 6, sourceCount: 3, notes: '9/1. Rising Chinese star. Dark horse per Eurosport pundits.' },
      { name: 'Neil Robertson', rank: 7, sourceCount: 4, notes: '10/1. World #3. Century machine — 900+ career centuries.' },
      { name: 'Shaun Murphy', rank: 8, sourceCount: 3, notes: '10/1. Consistent performer. 2005 World Champion.' },
      { name: 'John Higgins', rank: 9, sourceCount: 4, notes: '14/1. World #6, 4x champion. Wizard of Wishaw still competing at top level.' },
      { name: 'Mark Allen', rank: 10, sourceCount: 3, notes: '16/1. World #9. UK Championship winner.' },
      { name: 'Mark Williams', rank: 11, sourceCount: 3, notes: '16/1. World #4, 2025 finalist. 3x World Champion at 50.' },
      { name: 'Jack Lisowski', rank: 12, sourceCount: 2, notes: '20/1. Dark horse — breakout season, improved match-winning ability.' },
      { name: 'Xiao Guodong', rank: 13, sourceCount: 2, notes: '22/1. World #10. Chinese contingent rising.' },
      { name: 'Zhang Anda', rank: 14, sourceCount: 2, notes: '25/1. Dark horse pick — won International Championship. Maximum break threat.' },
      { name: 'Ding Junhui', rank: 15, sourceCount: 3, notes: '28/1. World #15. 2024 finalist renaissance.' },
      { name: 'Barry Hawkins', rank: 16, sourceCount: 2, notes: 'World #14. Solid Crucible record — 3 semis.' },
      { name: 'Si Jiahui', rank: 17, sourceCount: 1, notes: 'World #16. Young Chinese talent.' },
      { name: 'Chris Wakelin', rank: 18, sourceCount: 1, notes: 'World #13. Career-best season.' },
      { name: 'Luca Brecel', rank: 19, sourceCount: 2, notes: '2023 World Champion. Capable of brilliance but inconsistent.' },
    ],
    sources: ['JustBookies Odds', 'SnookerHQ Rankings', 'Racing Post Predictions', 'WST Official Rankings', 'Eurosport Analysis'],
  },

  // ── AFL Premiership ────────────────────────────────────────
  // Sources: BeforeYouBet, ESPN Tiers, ZeroHanger, ESPN Predictions
  afl: {
    rankings: [
      { name: 'Brisbane Lions', rank: 1, sourceCount: 4, notes: 'ESPN Tier 1. $5 favorite. Chasing threepeat.' },
      { name: 'Geelong Cats', rank: 2, sourceCount: 4, notes: 'ESPN Tier 2. $8 odds. Elite midfield.' },
      { name: 'Gold Coast Suns', rank: 3, sourceCount: 3, notes: 'ESPN Tier 2. $8 odds. Breakout contender.' },
      { name: 'Greater Western Sydney Giants', rank: 4, sourceCount: 3, notes: 'ESPN Tier 2. Strong list.' },
      { name: 'Adelaide Crows', rank: 5, sourceCount: 3, notes: 'ESPN Tier 2. Resurgent.' },
      { name: 'Sydney Swans', rank: 6, sourceCount: 3, notes: 'ESPN Tier 3. $10 odds. Added Charlie Curnow.' },
      { name: 'Hawthorn Hawks', rank: 7, sourceCount: 3, notes: '$8 at bookies but ESPN Tier 4.' },
      { name: 'Fremantle Dockers', rank: 8, sourceCount: 2, notes: 'ESPN Tier 3. Could go either way.' },
      { name: 'Western Bulldogs', rank: 9, sourceCount: 2, notes: 'ESPN dark horse pick. Midfield dominance.' },
      { name: 'St Kilda Saints', rank: 10, sourceCount: 2, notes: 'ESPN big improver. Added Clayton Oliver.' },
      { name: 'Collingwood Magpies', rank: 11, sourceCount: 2, notes: 'ESPN Tier 5. Nick Daicos Brownlow tip.' },
      { name: 'Carlton Blues', rank: 12, sourceCount: 1, notes: 'ESPN Tier 5.' },
      { name: 'Port Adelaide Power', rank: 13, sourceCount: 1, notes: 'ESPN Tier 5.' },
      { name: 'North Melbourne Kangaroos', rank: 14, sourceCount: 1, notes: 'ESPN Tier 5. Rebuilding.' },
      { name: 'Essendon Bombers', rank: 15, sourceCount: 1, notes: 'ESPN Tier 6. No finals chance.' },
      { name: 'Melbourne Demons', rank: 16, sourceCount: 1, notes: 'ESPN Tier 6.' },
      { name: 'Richmond Tigers', rank: 17, sourceCount: 1, notes: 'ESPN Tier 6.' },
      { name: 'West Coast Eagles', rank: 18, sourceCount: 1, notes: 'ESPN Tier 6.' },
    ],
    sources: ['BeforeYouBet Odds', 'ESPN AFL Tiers', 'ZeroHanger Power Rankings', 'AFL Football Contenders'],
  },

  // ── UEFA Champions League ──────────────────────────────────
  // Sources: JustBookies, Oddspedia, beIN Sports Supercomputer, Goal.com
  ucl: {
    rankings: [
      { name: 'Arsenal', rank: 1, sourceCount: 4, notes: '7/2. 8-for-8 league phase. Opta 28.3% win prob.' },
      { name: 'Bayern Munich', rank: 2, sourceCount: 4, notes: '9/2. Opta 15.9% win prob.' },
      { name: 'PSG', rank: 3, sourceCount: 4, notes: '7/1. Defending champions. Opta 6.2%.' },
      { name: 'Barcelona', rank: 4, sourceCount: 4, notes: '8/1. Opta 8.8%.' },
      { name: 'Manchester City', rank: 5, sourceCount: 4, notes: '8/1. Pep factor.' },
      { name: 'Liverpool', rank: 6, sourceCount: 4, notes: '9/1. Opta 7.4%.' },
      { name: 'Real Madrid', rank: 7, sourceCount: 4, notes: '10/1. Record champions.' },
      { name: 'Chelsea', rank: 8, sourceCount: 3, notes: '18/1.' },
      { name: 'Newcastle', rank: 9, sourceCount: 2, notes: '33/1.' },
      { name: 'Tottenham', rank: 10, sourceCount: 2, notes: '33/1.' },
      { name: 'Atletico Madrid', rank: 11, sourceCount: 3, notes: '40/1.' },
      { name: 'Inter Milan', rank: 12, sourceCount: 3, notes: '50/1.' },
      { name: 'Borussia Dortmund', rank: 13, sourceCount: 2, notes: '50/1.' },
      { name: 'Sporting CP', rank: 14, sourceCount: 1, notes: '66/1.' },
      { name: 'Bayer Leverkusen', rank: 15, sourceCount: 2, notes: '66/1.' },
      { name: 'Galatasaray', rank: 16, sourceCount: 1, notes: '100/1.' },
      { name: 'Bodo Glimt', rank: 17, sourceCount: 1, notes: '150/1.' },
      { name: 'Benfica', rank: 18, sourceCount: 1, notes: '200/1.' },
      { name: 'Atalanta', rank: 19, sourceCount: 1, notes: '200/1.' },
      { name: 'Club Brugge', rank: 20, sourceCount: 1, notes: '250/1.' },
      { name: 'Juventus', rank: 21, sourceCount: 1, notes: '350/1.' },
      { name: 'Monaco', rank: 22, sourceCount: 1, notes: '500/1.' },
      { name: 'Olympiacos', rank: 23, sourceCount: 1, notes: '500/1.' },
    ],
    sources: ['JustBookies', 'Oddspedia', 'beIN Sports Supercomputer', 'Goal.com Power Rankings'],
  },

  // ── PGA Golf (averaged across 4 majors) ────────────────────
  // Sources: Golf Channel, VegasInsider, FanDuel, MyGolfSpy, Fried Egg, SI.com, ProGolfNow, SportsLine
  pga: {
    rankings: [
      { name: 'Scottie Scheffler', rank: 1, sourceCount: 10, notes: 'Favorite for ALL 4 majors. +300 Masters. World #1. SportsLine model top pick.' },
      { name: 'Rory McIlroy', rank: 2, sourceCount: 9, notes: 'Defending Masters champ. +500 Masters. World #2. Fried Egg: best ball-striker on Tour.' },
      { name: 'Xander Schauffele', rank: 3, sourceCount: 8, notes: '+1100 Masters. Won 2024 PGA + Open. SI.com dark horse for Grand Slam run.' },
      { name: 'Bryson DeChambeau', rank: 4, sourceCount: 7, notes: '+1200 Masters. LIV star. ProGolfNow: distance advantage at Augusta.' },
      { name: 'Jon Rahm', rank: 5, sourceCount: 7, notes: '+1400 Masters. Former World #1. Reunification speculation.' },
      { name: 'Tommy Fleetwood', rank: 6, sourceCount: 5, notes: '+1600 Masters, +1400 Open. Links specialist. GolfMagic: overdue for a major.' },
      { name: 'Ludvig Aberg', rank: 7, sourceCount: 5, notes: '+1800 Masters. 24yo phenom. Geoff Shackelford: generational talent, Augusta suits his game.' },
      { name: 'Collin Morikawa', rank: 8, sourceCount: 6, notes: '+1800 Masters. 2x major winner. Iron play elite per Fried Egg.' },
      { name: 'Justin Thomas', rank: 9, sourceCount: 5, notes: '+2500 Masters. 2x PGA Champ. Bounce-back candidate per SI.com.' },
      { name: 'Hideki Matsuyama', rank: 10, sourceCount: 4, notes: '+3500 Masters. 2021 Masters champ. Won 3 times in 2024-25.' },
      { name: 'Jordan Spieth', rank: 11, sourceCount: 5, notes: '+3500 Masters. Augusta specialist (1 win, 3 top-3s). Career Grand Slam quest.' },
      { name: 'Joaquin Niemann', rank: 12, sourceCount: 3, notes: '+3500 Masters. LIV standout. ProGolfNow: best putter in LIV.' },
      { name: 'Viktor Hovland', rank: 13, sourceCount: 4, notes: '+3500 Masters. 2023 FedEx Cup champ.' },
      { name: 'Tyrrell Hatton', rank: 14, sourceCount: 3, notes: '+3500 Masters. Splash Sports: undervalued in odds.' },
      { name: 'Cameron Young', rank: 15, sourceCount: 2, notes: '+5000 Masters. ProGolfNow sleeper pick. Massive power.' },
      { name: 'Robert MacIntyre', rank: 16, sourceCount: 3, notes: '+7000 Masters. Rising Scot. Breakout 2025 season.' },
      { name: 'Patrick Cantlay', rank: 17, sourceCount: 3, notes: 'Consistent top-10 machine. MyGolfSpy: elite putting stats.' },
      { name: 'Sam Burns', rank: 18, sourceCount: 3, notes: 'Top-15 world ranking. SportsLine model value pick.' },
      { name: 'Shane Lowry', rank: 19, sourceCount: 2, notes: 'Open Championship contender. Links pedigree.' },
      { name: 'Brooks Koepka', rank: 20, sourceCount: 4, notes: '5x major winner. LIV. Proven major performer.' },
      { name: 'Cameron Smith', rank: 21, sourceCount: 3, notes: '2022 Open champ. LIV. Short game wizard.' },
      { name: 'Sepp Straka', rank: 22, sourceCount: 1, notes: 'World #12. Under-the-radar consistent performer.' },
      { name: 'Russell Henley', rank: 23, sourceCount: 2, notes: 'Top-20 in world ranking. SportsLine model longshot value.' },
      { name: 'Chris Gotterup', rank: 24, sourceCount: 1, notes: 'ProGolfNow breakout pick. Young power player.' },
      { name: 'Wyndham Clark', rank: 25, sourceCount: 3, notes: '2023 US Open winner. Fried Egg: can win on any course.' },
      { name: 'Sahith Theegala', rank: 26, sourceCount: 2, notes: 'Fan favorite. MyGolfSpy: due for first major breakthrough.' },
      { name: 'Tony Finau', rank: 27, sourceCount: 2, notes: 'Consistent contender. PGA Tour veteran.' },
      { name: 'Min Woo Lee', rank: 28, sourceCount: 1, notes: 'Australian talent. Rising world ranking.' },
    ],
    sources: ['Golf Channel Major Odds', 'VegasInsider', 'FanDuel Research', 'MyGolfSpy', 'The Fried Egg', 'SI.com Golf', 'ProGolfNow', 'SportsLine Model', 'GolfMagic', 'Geoff Shackelford'],
  },

  // ── IndyCar ────────────────────────────────────────────────
  // Sources: FOX Sports, bet365, DraftKings, Beyond the Flag (full 25-driver rankings), RACER, Indy500 odds
  indycar: {
    rankings: [
      { name: 'Alex Palou', rank: 1, sourceCount: 6, notes: '4/7 favorite. 3 consecutive titles, 4 total. Beyond the Flag #1. Chip Ganassi dominance.' },
      { name: "Pato O'Ward", rank: 2, sourceCount: 6, notes: '11/2. Runner-up last season. Beyond the Flag #2. McLaren Arrow star. Indy 500 contender.' },
      { name: 'David Malukas', rank: 3, sourceCount: 3, notes: '18/1 in odds but Beyond the Flag #3 — breakout imminent. Meyer Shank upgrade.' },
      { name: 'Christian Lundgaard', rank: 4, sourceCount: 2, notes: '20/1 but Beyond the Flag #4. F2 pedigree. Rahal Letterman improved car.' },
      { name: 'Kyle Kirkwood', rank: 5, sourceCount: 5, notes: '7/1. Won 3 races in 2025 (2nd most). Andretti star. Indy 500 favorite.' },
      { name: 'Scott McLaughlin', rank: 6, sourceCount: 5, notes: '8/1. Penske veteran. 3x Supercars champ. Consistent top-5 finisher.' },
      { name: 'Josef Newgarden', rank: 7, sourceCount: 5, notes: '8/1. 2x consecutive Indy 500 winner. Penske. Oval king.' },
      { name: 'Scott Dixon', rank: 8, sourceCount: 5, notes: '16/1. 6x champion, all-time legend. 52 career wins. Beyond the Flag: still elite.' },
      { name: 'Will Power', rank: 9, sourceCount: 4, notes: '20/1. Moved to Andretti for 2026. 2018 champ. Indy 500 winner.' },
      { name: 'Colton Herta', rank: 10, sourceCount: 3, notes: 'Talented speedster. Fastest raw pace on grid per RACER.' },
      { name: 'Marcus Armstrong', rank: 11, sourceCount: 2, notes: 'Breakout candidate per Beyond the Flag. Ganassi seat upgrade.' },
      { name: 'Alexander Rossi', rank: 12, sourceCount: 3, notes: '70/1. 2016 Indy 500 winner. Veteran experience.' },
      { name: 'Felix Rosenqvist', rank: 13, sourceCount: 2, notes: '80/1. Dark horse per Beyond the Flag. Consistent midfield threat.' },
      { name: 'Christian Rasmussen', rank: 14, sourceCount: 2, notes: '100/1. Breakout candidate. Indy NXT champion.' },
      { name: 'Marcus Ericsson', rank: 15, sourceCount: 3, notes: '100/1. 2022 Indy 500 winner. Knows how to win the big one.' },
      { name: 'Santino Ferrucci', rank: 16, sourceCount: 1, notes: '120/1. AJ Foyt team. Indy 500 specialist.' },
      { name: 'Rinus VeeKay', rank: 17, sourceCount: 2, notes: 'Race winner. Dutch talent. Capable of upset victories.' },
      { name: 'Graham Rahal', rank: 18, sourceCount: 2, notes: 'Veteran presence. Team co-owner driver.' },
      { name: 'Nolan Siegel', rank: 19, sourceCount: 1, notes: 'Young American prospect. Arrow McLaren development.' },
      { name: 'Sting Ray Robb', rank: 20, sourceCount: 1, notes: 'Sophomore season. AJ Foyt team.' },
      { name: 'Romain Grosjean', rank: 21, sourceCount: 1, notes: 'Ex-F1. Fan favorite.' },
      { name: 'Agustin Canapino', rank: 22, sourceCount: 1, notes: 'Argentine racer. Juncos Hollinger.' },
      { name: 'Linus Lundqvist', rank: 23, sourceCount: 1, notes: 'Swedish prospect. Improving results.' },
      { name: 'Jack Harvey', rank: 24, sourceCount: 1, notes: 'British veteran. Dale Coyne.' },
      { name: 'Kyffin Simpson', rank: 25, sourceCount: 2, notes: 'Beyond the Flag dark horse. Young talent at Ganassi.' },
    ],
    sources: ['FOX Sports 2026 Odds', 'bet365 Championship Odds', 'DraftKings Sportsbook', 'Beyond the Flag Power Rankings', 'RACER Magazine', 'Indy 500 Odds'],
  },

  // ── Formula 1 ──────────────────────────────────────────────
  // Sources: GPFans, Covers, bet365, Sky Sports, theScore, Kym Illman, ESPN, F1-Analysis
  f1: {
    rankings: [
      { name: 'George Russell', rank: 1, sourceCount: 7, notes: '11/4 co-favorite. Mercedes PU advantage per theScore. Topped Bahrain pre-season testing. New regs suit Mercedes concept.' },
      { name: 'Max Verstappen', rank: 2, sourceCount: 8, notes: '11/4 co-favorite. 4x champion. Red Bull adapted well to 2026 active aero regs. Kym Illman: never bet against Max.' },
      { name: 'Lando Norris', rank: 3, sourceCount: 7, notes: '9/2. Reigning 2025 champion. McLaren strong but new PU unknown. ESPN: best overtaker on grid.' },
      { name: 'Oscar Piastri', rank: 4, sourceCount: 6, notes: '15/2. McLaren consistency. F1-Analysis: most improved driver trajectory.' },
      { name: 'Fernando Alonso', rank: 5, sourceCount: 5, notes: '15/2. Surprise — Aston Martin Honda PU optimism. theScore: Adrian Newey factor could be decisive.' },
      { name: 'Kimi Antonelli', rank: 6, sourceCount: 5, notes: '10/1. Mercedes prodigy, rookie. Sky Sports: generational talent, Merc betting big. Youngest F1 driver in decades.' },
      { name: 'Charles Leclerc', rank: 7, sourceCount: 6, notes: '20/1. Ferrari topped pre-season times but suspected sandbagging concern. New Ferrari PU untested in race conditions.' },
      { name: 'Lewis Hamilton', rank: 8, sourceCount: 6, notes: '33/1. First season at Ferrari. ESPN: integration risk but 7x WDC pedigree. Kym Illman: hungry for redemption.' },
      { name: 'Carlos Sainz', rank: 9, sourceCount: 4, notes: '66/1. Williams move. Williams invested heavily in 2026 regs. Potential surprise per F1-Analysis.' },
      { name: 'Lance Stroll', rank: 10, sourceCount: 3, notes: '80/1. Benefits from Aston Martin + Newey. Father investing heavily.' },
      { name: 'Isack Hadjar', rank: 11, sourceCount: 3, notes: '100/1. Red Bull junior, F2 champion. Rookie season but strong car.' },
      { name: 'Alexander Albon', rank: 12, sourceCount: 3, notes: '100/1. Williams. Team leader. Consistently extracts maximum from car.' },
      { name: 'Pierre Gasly', rank: 13, sourceCount: 2, notes: '150/1. Alpine. Cadillac/GM PU from 2026. Unknown quantity.' },
      { name: 'Nico Hulkenberg', rank: 14, sourceCount: 2, notes: '150/1. Sauber/Audi factory team. German backing. Experienced pair with Bortoleto.' },
      { name: 'Gabriel Bortoleto', rank: 15, sourceCount: 3, notes: '150/1. Sauber rookie. F2 champion. ESPN: best rookie crop in years.' },
      { name: 'Oliver Bearman', rank: 16, sourceCount: 2, notes: '200/1. Haas-Toyota. Impressed in 2024 Ferrari sub appearances.' },
      { name: 'Liam Lawson', rank: 17, sourceCount: 2, notes: '250/1. RB/VCARB. Red Bull pipeline. Aggressive racer.' },
      { name: 'Esteban Ocon', rank: 18, sourceCount: 1, notes: '250/1. Haas. Experienced midfielder.' },
      { name: 'Franco Colapinto', rank: 19, sourceCount: 2, notes: '500/1. Alpine. Argentine fan favorite. Raw speed shown in 2025 cameos.' },
      { name: 'Jack Doohan', rank: 20, sourceCount: 1, notes: '500/1. Alpine reserve/2nd driver. Son of Mick Doohan.' },
    ],
    sources: ['GPFans F1 Odds', 'Covers.com', 'bet365', 'Sky Sports F1', 'theScore', 'Kym Illman Blog', 'ESPN F1', 'F1-Analysis.com'],
  },

  // ── Little League World Series ─────────────────────────────
  // Sources: Sports Gambling Podcast, BetUS, Historical LLWS Records, Little League Official, ESPN
  llws: {
    rankings: [
      { name: 'Taipei', rank: 1, sourceCount: 5, notes: 'Won 2025 LLWS. 18 total titles (most all-time). Chinese Taipei = historically dominant.' },
      { name: 'Japan', rank: 2, sourceCount: 5, notes: '11 LLWS titles. 2nd most all-time. Exceptional fundamentals and discipline.' },
      { name: 'USA West', rank: 3, sourceCount: 4, notes: 'California pipeline. 8 titles from CA alone (most by US state). Hawaii adds 4 more.' },
      { name: 'USA Southwest', rank: 4, sourceCount: 4, notes: 'Texas powerhouse. Won/runner-up in 15 of last 21 LLWS on US side.' },
      { name: 'Caribbean', rank: 5, sourceCount: 3, notes: 'Curacao dynasty — 3 titles in last decade. Small island, outsized talent.' },
      { name: 'USA Southeast', rank: 6, sourceCount: 3, notes: 'Strong baseball region. Georgia/Florida talent. Frequent contender.' },
      { name: 'Mexico', rank: 7, sourceCount: 3, notes: 'Monterrey Industrial won 3 titles (2004, 2008). Latin American baseball tradition.' },
      { name: 'USA Mid-Atlantic', rank: 8, sourceCount: 3, notes: 'Pennsylvania/New Jersey. Home region — plays in Williamsport. 5 titles.' },
      { name: 'Latin America', rank: 9, sourceCount: 2, notes: 'Venezuela powerhouse. Maracaibo won 2000. Colombia rising.' },
      { name: 'South Korea', rank: 10, sourceCount: 3, notes: 'Won 2014, 2019 LLWS. Asia-Pacific power. Strong coaching systems.' },
      { name: 'USA Great Lakes', rank: 11, sourceCount: 2, notes: 'Ohio/Michigan/Indiana talent. Occasional champion.' },
      { name: 'Panama', rank: 12, sourceCount: 1, notes: 'Growing baseball nation. Caribbean qualifier threat.' },
      { name: 'USA New England', rank: 13, sourceCount: 2, notes: 'Recent contenders. Connecticut strong.' },
      { name: 'USA Northwest', rank: 14, sourceCount: 1, notes: 'Washington/Oregon. Sporadic but capable.' },
      { name: 'Canada', rank: 15, sourceCount: 2, notes: 'Vancouver (BC) won 2009. Occasional dark horse.' },
      { name: 'Australia', rank: 16, sourceCount: 1, notes: 'Baseball growing Down Under. Qualifier experience.' },
    ],
    sources: ['Sports Gambling Podcast LLWS Analysis', 'BetUS LLWS Patterns', 'Little League Official Records', 'Historical Championship Data', 'ESPN LLWS Coverage'],
  },

  // ── NFL (Super Bowl LX) ──────────────────────────────────────
  // Sources: CBS Power Rankings, ESPN FPI, VegasInsider, The Athletic, FiveThirtyEight
  nfl: {
    rankings: [
      { name: 'Kansas City Chiefs', rank: 1, sourceCount: 5, notes: '+500. Three-peat quest. Mahomes dynasty. CBS/ESPN consensus #1.' },
      { name: 'Detroit Lions', rank: 2, sourceCount: 5, notes: '+600. NFC favorite. Elite offense. Dan Campbell era.' },
      { name: 'Buffalo Bills', rank: 3, sourceCount: 5, notes: '+800. Josh Allen MVP caliber. Perennial contender.' },
      { name: 'Philadelphia Eagles', rank: 4, sourceCount: 4, notes: '+900. Saquon Barkley impact. NFC contender.' },
      { name: 'Baltimore Ravens', rank: 5, sourceCount: 4, notes: '+1000. Lamar Jackson. Elite rushing attack.' },
      { name: 'San Francisco 49ers', rank: 6, sourceCount: 4, notes: '+1200. Injury concerns but loaded roster.' },
      { name: 'Green Bay Packers', rank: 7, sourceCount: 3, notes: '+1400. Jordan Love ascension. Young core.' },
      { name: 'Houston Texans', rank: 8, sourceCount: 3, notes: '+1600. CJ Stroud sophomore leap. Rising AFC.' },
      { name: 'Dallas Cowboys', rank: 9, sourceCount: 3, notes: '+2000. Talent-rich but coaching questions.' },
      { name: 'Minnesota Vikings', rank: 10, sourceCount: 3, notes: '+2000. Sam Darnold or JJ McCarthy. Defense elite.' },
      { name: 'Cincinnati Bengals', rank: 11, sourceCount: 3, notes: '+2200. Joe Burrow health. When healthy, top 5.' },
      { name: 'Pittsburgh Steelers', rank: 12, sourceCount: 2, notes: '+2500. Russell Wilson or Fields. Strong defense.' },
      { name: 'Miami Dolphins', rank: 13, sourceCount: 2, notes: '+2500. Tua speed offense. Playoff contender.' },
      { name: 'Los Angeles Chargers', rank: 14, sourceCount: 2, notes: '+2800. Jim Harbaugh turnaround.' },
      { name: 'Washington Commanders', rank: 15, sourceCount: 2, notes: '+3000. Jayden Daniels OROY. Rising.' },
      { name: 'Chicago Bears', rank: 16, sourceCount: 1, notes: '+4000. Caleb Williams development.' },
      { name: 'Tampa Bay Buccaneers', rank: 17, sourceCount: 1, notes: '+4000. Baker Mayfield resurgence.' },
      { name: 'Los Angeles Rams', rank: 18, sourceCount: 1, notes: '+4500. Stafford veteran presence.' },
      { name: 'Atlanta Falcons', rank: 19, sourceCount: 1, notes: '+5000. Kirk Cousins or Penix.' },
      { name: 'Seattle Seahawks', rank: 20, sourceCount: 1, notes: '+5000. Geno Smith. NFC West.' },
    ],
    sources: ['CBS Power Rankings', 'ESPN FPI', 'VegasInsider Super Bowl Odds', 'The Athletic', 'FiveThirtyEight/538'],
  },

  // ── NBA (Championship) ──────────────────────────────────────
  // Sources: CBS Power Rankings, ESPN BPI, VegasInsider, The Athletic, FiveThirtyEight
  nba: {
    rankings: [
      { name: 'Oklahoma City Thunder', rank: 1, sourceCount: 5, notes: '+280. SGA MVP favorite. Best record in NBA. CBS/ESPN #1.' },
      { name: 'Boston Celtics', rank: 2, sourceCount: 5, notes: '+350. Defending champions. Tatum/Brown. Championship experience.' },
      { name: 'Cleveland Cavaliers', rank: 3, sourceCount: 4, notes: '+500. Donovan Mitchell. Best start in franchise history.' },
      { name: 'Denver Nuggets', rank: 4, sourceCount: 4, notes: '+700. Jokic 3x MVP. Championship DNA from 2023.' },
      { name: 'New York Knicks', rank: 5, sourceCount: 4, notes: '+800. Brunson/Towns. Deep roster. Big market energy.' },
      { name: 'Dallas Mavericks', rank: 6, sourceCount: 3, notes: '+1000. Luka/Kyrie. 2024 Finals experience.' },
      { name: 'Milwaukee Bucks', rank: 7, sourceCount: 3, notes: '+1200. Giannis/Dame. Veteran contender.' },
      { name: 'Phoenix Suns', rank: 8, sourceCount: 3, notes: '+1400. KD/Booker/Beal superteam. Win-now mode.' },
      { name: 'LA Lakers', rank: 9, sourceCount: 3, notes: '+1600. LeBron final seasons. AD health key.' },
      { name: 'Minnesota Timberwolves', rank: 10, sourceCount: 3, notes: '+1800. Anthony Edwards. Western playoff threat.' },
      { name: 'Golden State Warriors', rank: 11, sourceCount: 2, notes: '+2500. Curry window closing. Veteran savvy.' },
      { name: 'Memphis Grizzlies', rank: 12, sourceCount: 2, notes: '+2500. Ja Morant return. If healthy, dangerous.' },
      { name: 'Indiana Pacers', rank: 13, sourceCount: 2, notes: '+3000. Haliburton. Fast-paced offense.' },
      { name: 'Houston Rockets', rank: 14, sourceCount: 2, notes: '+3000. Young core. Jalen Green/Sengun. Rising.' },
      { name: 'Miami Heat', rank: 15, sourceCount: 2, notes: '+3500. Jimmy Butler. Heat Culture playoff performers.' },
      { name: 'Sacramento Kings', rank: 16, sourceCount: 1, notes: '+4000. Fox/Sabonis. Western bubble team.' },
      { name: 'Philadelphia 76ers', rank: 17, sourceCount: 1, notes: '+4500. Embiid health. High ceiling if healthy.' },
      { name: 'LA Clippers', rank: 18, sourceCount: 1, notes: '+5000. New arena. Kawhi uncertainty.' },
      { name: 'Orlando Magic', rank: 19, sourceCount: 1, notes: '+5000. Paolo Banchero. Young and improving.' },
      { name: 'San Antonio Spurs', rank: 20, sourceCount: 1, notes: '+6000. Wembanyama generational talent. Future favorite.' },
    ],
    sources: ['CBS Power Rankings', 'ESPN BPI', 'VegasInsider Championship Odds', 'The Athletic', 'FiveThirtyEight/538'],
  },

  // ── MLB (World Series) ──────────────────────────────────────
  // Sources: CBS Power Rankings, ESPN, VegasInsider, FanGraphs, The Athletic
  mlb: {
    rankings: [
      { name: 'Los Angeles Dodgers', rank: 1, sourceCount: 5, notes: '+350. Ohtani/Betts/Freeman. Defending champs. Consensus #1.' },
      { name: 'New York Yankees', rank: 2, sourceCount: 5, notes: '+600. Judge/Soto. AL pennant favorites.' },
      { name: 'Philadelphia Phillies', rank: 3, sourceCount: 4, notes: '+700. Deep lineup. Harper. NL contender.' },
      { name: 'Atlanta Braves', rank: 4, sourceCount: 4, notes: '+800. Acuna return. Loaded rotation.' },
      { name: 'Houston Astros', rank: 5, sourceCount: 4, notes: '+1000. Championship pedigree. Alvarez/Tucker.' },
      { name: 'Baltimore Orioles', rank: 6, sourceCount: 3, notes: '+1200. Young core maturing. Holliday/Henderson.' },
      { name: 'San Diego Padres', rank: 7, sourceCount: 3, notes: '+1400. Machado/Tatis. NL West threat.' },
      { name: 'Texas Rangers', rank: 8, sourceCount: 3, notes: '+1600. 2023 WS champs. Seager/Semien.' },
      { name: 'Cleveland Guardians', rank: 9, sourceCount: 2, notes: '+2000. AL Central favorites. Pitching depth.' },
      { name: 'Milwaukee Brewers', rank: 10, sourceCount: 2, notes: '+2000. Small market overachievers.' },
      { name: 'New York Mets', rank: 11, sourceCount: 3, notes: '+1800. Lindor. Steve Cohen spending.' },
      { name: 'Minnesota Twins', rank: 12, sourceCount: 2, notes: '+2500. Correa/Buxton when healthy.' },
      { name: 'Seattle Mariners', rank: 13, sourceCount: 2, notes: '+2500. Elite pitching staff. Julio Rodriguez.' },
      { name: 'Chicago Cubs', rank: 14, sourceCount: 1, notes: '+3000. Rebuilding contender.' },
      { name: 'Tampa Bay Rays', rank: 15, sourceCount: 1, notes: '+3500. Analytics-driven. Always competitive.' },
      { name: 'Arizona Diamondbacks', rank: 16, sourceCount: 2, notes: '+2500. 2023 WS runners-up. Young talent.' },
      { name: 'Toronto Blue Jays', rank: 17, sourceCount: 1, notes: '+4000. Vlad Jr. question. AL East.' },
      { name: 'Kansas City Royals', rank: 18, sourceCount: 1, notes: '+5000. Bobby Witt Jr. breakout.' },
      { name: 'Detroit Tigers', rank: 19, sourceCount: 1, notes: '+5000. 2024 playoff surprise. Young pitching.' },
      { name: 'Boston Red Sox', rank: 20, sourceCount: 1, notes: '+4500. Rebuilding. Casas/Yoshida.' },
    ],
    sources: ['CBS Power Rankings', 'ESPN Predictions', 'VegasInsider World Series Odds', 'FanGraphs Projections', 'The Athletic'],
  },

  // ── NHL (Stanley Cup) ──────────────────────────────────────
  // Sources: CBS Power Rankings, ESPN, VegasInsider, The Athletic, MoneyPuck
  nhl: {
    rankings: [
      { name: 'Edmonton Oilers', rank: 1, sourceCount: 5, notes: '+500. McDavid/Draisaitl. 2024 Cup runners-up. Consensus favorite.' },
      { name: 'Florida Panthers', rank: 2, sourceCount: 5, notes: '+600. Defending champions. Barkov/Tkachuk.' },
      { name: 'Dallas Stars', rank: 3, sourceCount: 4, notes: '+700. Deep balanced roster. Robertson/Hintz.' },
      { name: 'Colorado Avalanche', rank: 4, sourceCount: 4, notes: '+800. MacKinnon. 2022 Cup winners. Elite talent.' },
      { name: 'Carolina Hurricanes', rank: 5, sourceCount: 4, notes: '+900. Aho/Svechnikov. Perennial contender.' },
      { name: 'New York Rangers', rank: 6, sourceCount: 3, notes: '+1000. Shesterkin elite goalie. Panarin.' },
      { name: 'Toronto Maple Leafs', rank: 7, sourceCount: 3, notes: '+1200. Matthews/Marner. Playoff drought pressure.' },
      { name: 'Vegas Golden Knights', rank: 8, sourceCount: 3, notes: '+1400. 2023 Cup champs. Eichel/Stone.' },
      { name: 'Winnipeg Jets', rank: 9, sourceCount: 3, notes: '+1400. Hellebuyck Vezina. Best regular season team.' },
      { name: 'Tampa Bay Lightning', rank: 10, sourceCount: 2, notes: '+1800. Kucherov/Stamkos legacy. Back-to-back Cup experience.' },
      { name: 'Boston Bruins', rank: 11, sourceCount: 2, notes: '+2000. Swayman/Pastrnak. Veteran contender.' },
      { name: 'Washington Capitals', rank: 12, sourceCount: 2, notes: '+2500. Ovechkin chasing Gretzky record.' },
      { name: 'Minnesota Wild', rank: 13, sourceCount: 2, notes: '+2500. Kaprizov star. Kirill the Thrill.' },
      { name: 'New Jersey Devils', rank: 14, sourceCount: 2, notes: '+2500. Hughes brothers. Young core.' },
      { name: 'Los Angeles Kings', rank: 15, sourceCount: 1, notes: '+3000. Kopitar veteran. Playoff threat.' },
      { name: 'Nashville Predators', rank: 16, sourceCount: 1, notes: '+4000. Saros goaltending.' },
      { name: 'Vancouver Canucks', rank: 17, sourceCount: 2, notes: '+2500. Pettersson/Hughes. Pacific contender.' },
      { name: 'St. Louis Blues', rank: 18, sourceCount: 1, notes: '+5000. 2019 Cup champs experience.' },
      { name: 'Pittsburgh Penguins', rank: 19, sourceCount: 1, notes: '+5000. Crosby/Malkin final years.' },
      { name: 'Detroit Red Wings', rank: 20, sourceCount: 1, notes: '+5000. Rebuilding with young talent.' },
    ],
    sources: ['CBS Power Rankings', 'ESPN NHL Rankings', 'VegasInsider Stanley Cup Odds', 'The Athletic', 'MoneyPuck Model'],
  },

  // ── NCAA Football (College Football Playoff) ──────────────────
  // Sources: ESPN SP+, CBS, AP Preseason Poll, VegasInsider, 247Sports
  ncaaf: {
    rankings: [
      { name: 'Ohio State Buckeyes', rank: 1, sourceCount: 5, notes: '+300. 2024 CFP champions. Loaded roster. Consensus preseason #1.' },
      { name: 'Georgia Bulldogs', rank: 2, sourceCount: 5, notes: '+400. Kirby Smart dynasty. Elite recruiting. Back-to-back 2022-23 champs.' },
      { name: 'Texas Longhorns', rank: 3, sourceCount: 5, notes: '+500. Arch Manning era begins. SEC powerhouse.' },
      { name: 'Oregon Ducks', rank: 4, sourceCount: 4, notes: '+800. Big Ten contender. Dan Lanning rising.' },
      { name: 'Notre Dame Fighting Irish', rank: 5, sourceCount: 4, notes: '+1000. 2024 CFP finalist. Marcus Freeman.' },
      { name: 'Alabama Crimson Tide', rank: 6, sourceCount: 4, notes: '+1200. Kalen DeBoer year 2. Recruiting still elite.' },
      { name: 'Penn State Nittany Lions', rank: 7, sourceCount: 3, notes: '+1400. James Franklin breakthrough coming?' },
      { name: 'Michigan Wolverines', rank: 8, sourceCount: 3, notes: '+1800. Post-Harbaugh era. Sherrone Moore.' },
      { name: 'LSU Tigers', rank: 9, sourceCount: 3, notes: '+2000. Brian Kelly. SEC West contender.' },
      { name: 'Tennessee Volunteers', rank: 10, sourceCount: 3, notes: '+2000. Josh Heupel offense. SEC East threat.' },
      { name: 'USC Trojans', rank: 11, sourceCount: 2, notes: '+2500. Big Ten adjustment. Lincoln Riley.' },
      { name: 'Texas A&M Aggies', rank: 12, sourceCount: 2, notes: '+2500. Mike Elko. Recruiting powerhouse.' },
      { name: 'Ole Miss Rebels', rank: 13, sourceCount: 2, notes: '+2500. Lane Kiffin. Elite offense.' },
      { name: 'Clemson Tigers', rank: 14, sourceCount: 2, notes: '+3000. Dabo Swinney. ACC favorite.' },
      { name: 'Miami Hurricanes', rank: 15, sourceCount: 2, notes: '+3000. Mario Cristobal. Cam Ward if returns.' },
      { name: 'Oklahoma Sooners', rank: 16, sourceCount: 1, notes: '+3500. SEC transition year 2.' },
      { name: 'Florida Gators', rank: 17, sourceCount: 1, notes: '+4000. Billy Napier hot seat.' },
      { name: 'Colorado Buffaloes', rank: 18, sourceCount: 2, notes: '+3500. Deion Sanders. Travis Hunter if stays.' },
      { name: 'Iowa State Cyclones', rank: 19, sourceCount: 1, notes: '+5000. Big 12 contender.' },
      { name: 'Boise State Broncos', rank: 20, sourceCount: 1, notes: '+5000. Ashton Jeanty Heisman contender.' },
    ],
    sources: ['ESPN SP+ Preseason', 'CBS Sports Preseason Rankings', 'AP Preseason Poll', 'VegasInsider CFP Odds', '247Sports'],
  },

  // ── NCAA Men's Basketball (March Madness) ──────────────────────
  // Sources: CBS, ESPN BPI, KenPom, VegasInsider, AP Poll
  ncaab: {
    rankings: [
      { name: 'Duke Blue Devils', rank: 1, sourceCount: 5, notes: '+350. Cooper Flagg #1 pick. Jon Scheyer. Preseason AP #1.' },
      { name: 'UConn Huskies', rank: 2, sourceCount: 5, notes: '+500. Dan Hurley. Three-peat quest. Championship DNA.' },
      { name: 'Kansas Jayhawks', rank: 3, sourceCount: 4, notes: '+700. Bill Self. Perennial contender. Elite program.' },
      { name: 'Houston Cougars', rank: 4, sourceCount: 4, notes: '+800. Kelvin Sampson defense. Big 12 power.' },
      { name: 'Alabama Crimson Tide', rank: 5, sourceCount: 4, notes: '+1000. Nate Oats. SEC favorite.' },
      { name: 'Gonzaga Bulldogs', rank: 6, sourceCount: 3, notes: '+1200. Mark Few. WCC dominant. Transfer portal haul.' },
      { name: 'Purdue Boilermakers', rank: 7, sourceCount: 3, notes: '+1400. Post-Edey era. Matt Painter system.' },
      { name: 'Tennessee Volunteers', rank: 8, sourceCount: 3, notes: '+1600. Rick Barnes. SEC contender.' },
      { name: 'North Carolina Tar Heels', rank: 9, sourceCount: 3, notes: '+1600. Hubert Davis. Blue blood.' },
      { name: 'Kentucky Wildcats', rank: 10, sourceCount: 3, notes: '+1800. Mark Pope first year. Recruiting class.' },
      { name: 'Arizona Wildcats', rank: 11, sourceCount: 2, notes: '+2000. Tommy Lloyd. Big 12 newcomer.' },
      { name: 'Florida Gators', rank: 12, sourceCount: 2, notes: '+2200. Todd Golden. SEC sleeper.' },
      { name: 'Iowa State Cyclones', rank: 13, sourceCount: 2, notes: '+2500. TJ Otzelberger. Big 12 contender.' },
      { name: 'Illinois Fighting Illini', rank: 14, sourceCount: 2, notes: '+2500. Big Ten contender.' },
      { name: 'Michigan Wolverines', rank: 15, sourceCount: 2, notes: '+3000. Dusty May rebuild.' },
      { name: 'St. John\'s Red Storm', rank: 16, sourceCount: 2, notes: '+3000. Rick Pitino. Big East surprise.' },
      { name: 'Arkansas Razorbacks', rank: 17, sourceCount: 1, notes: '+3500. John Calipari year 2.' },
      { name: 'Marquette Golden Eagles', rank: 18, sourceCount: 1, notes: '+3500. Shaka Smart. Big East.' },
      { name: 'Creighton Bluejays', rank: 19, sourceCount: 1, notes: '+4000. Greg McDermott. Consistent.' },
      { name: 'Auburn Tigers', rank: 20, sourceCount: 2, notes: '+2500. Bruce Pearl. SEC deep.' },
    ],
    sources: ['CBS Sports Rankings', 'ESPN BPI', 'KenPom Preseason', 'VegasInsider Championship Odds', 'AP Poll'],
  },

  // ── NCAA Women's Basketball ──────────────────────────────────
  // Sources: ESPN, AP Poll, CBS, Charlie Creme Bracketology, Her Hoop Stats
  ncaaw: {
    rankings: [
      { name: 'South Carolina Gamecocks', rank: 1, sourceCount: 5, notes: 'Dawn Staley dynasty. 2024 undefeated champions. Consensus #1.' },
      { name: 'UConn Huskies', rank: 2, sourceCount: 5, notes: 'Geno Auriemma. Paige Bueckers. 11x champions.' },
      { name: 'LSU Tigers', rank: 3, sourceCount: 4, notes: 'Kim Mulkey. Post-Angel Reese era. Still elite recruiting.' },
      { name: 'Iowa Hawkeyes', rank: 4, sourceCount: 4, notes: 'Post-Caitlin Clark. Program elevated. Bluder system.' },
      { name: 'UCLA Bruins', rank: 5, sourceCount: 3, notes: 'Cori Close. Big Ten move. Rising program.' },
      { name: 'Texas Longhorns', rank: 6, sourceCount: 3, notes: 'Vic Schaefer. SEC contender.' },
      { name: 'Stanford Cardinal', rank: 7, sourceCount: 3, notes: 'Tara VanDerveer legacy. ACC power.' },
      { name: 'Notre Dame Fighting Irish', rank: 8, sourceCount: 3, notes: 'Niele Ivey. Hannah Hidalgo star.' },
      { name: 'Duke Blue Devils', rank: 9, sourceCount: 2, notes: 'Kara Lawson. Rising program.' },
      { name: 'Ole Miss Rebels', rank: 10, sourceCount: 2, notes: 'Yolanda Griffith. SEC sleeper.' },
      { name: 'Ohio State Buckeyes', rank: 11, sourceCount: 2, notes: 'Big Ten contender.' },
      { name: 'Louisville Cardinals', rank: 12, sourceCount: 2, notes: 'Jeff Walz. ACC consistent.' },
      { name: 'Vanderbilt Commodores', rank: 13, sourceCount: 2, notes: 'Shea Ralph. SEC surprise.' },
      { name: 'Oklahoma Sooners', rank: 14, sourceCount: 1, notes: 'Jennie Baranczyk. SEC newcomer.' },
      { name: 'NC State Wolfpack', rank: 15, sourceCount: 1, notes: '2024 Final Four run. Wes Moore.' },
      { name: 'Tennessee Lady Volunteers', rank: 16, sourceCount: 2, notes: 'Kim Caldwell new era. Storied program.' },
      { name: 'Michigan Wolverines', rank: 17, sourceCount: 1, notes: 'Big Ten competitive.' },
      { name: 'Baylor Bears', rank: 18, sourceCount: 1, notes: 'Nicki Collen. Big 12.' },
      { name: 'USC Trojans', rank: 19, sourceCount: 1, notes: 'JuJu Watkins star. Lindsay Gottlieb.' },
      { name: 'Kentucky Wildcats', rank: 20, sourceCount: 1, notes: 'Kenny Brooks. SEC rebuilding.' },
    ],
    sources: ['ESPN Rankings', 'AP Women\'s Poll', 'CBS Sports', 'Charlie Creme Bracketology', 'Her Hoop Stats'],
  },

  // ── WNBA ──────────────────────────────────────────────────
  // Sources: ESPN, CBS, Swish Appeal, VegasInsider, The Athletic
  wnba: {
    rankings: [
      { name: 'New York Liberty', rank: 1, sourceCount: 5, notes: '+300. 2024 champions. Sabrina Ionescu/Breanna Stewart. Consensus favorite.' },
      { name: 'Las Vegas Aces', rank: 2, sourceCount: 5, notes: '+350. A\'ja Wilson 2x MVP. Becky Hammon. Dynasty threat.' },
      { name: 'Minnesota Lynx', rank: 3, sourceCount: 4, notes: '+500. Napheesa Collier MVP candidate. Cheryl Reeve.' },
      { name: 'Connecticut Sun', rank: 4, sourceCount: 4, notes: '+700. Alyssa Thomas. Defensive powerhouse.' },
      { name: 'Seattle Storm', rank: 5, sourceCount: 3, notes: '+900. Jewell Loyd. Rebuilding contender.' },
      { name: 'Indiana Fever', rank: 6, sourceCount: 4, notes: '+1000. Caitlin Clark sophomore year. Biggest draw in WNBA.' },
      { name: 'Phoenix Mercury', rank: 7, sourceCount: 2, notes: '+1800. Diana Taurasi farewell? Kahleah Copper.' },
      { name: 'Chicago Sky', rank: 8, sourceCount: 2, notes: '+2000. Angel Reese. Young core.' },
      { name: 'Atlanta Dream', rank: 9, sourceCount: 1, notes: '+2500. Rhyne Howard. Improving.' },
      { name: 'Dallas Wings', rank: 10, sourceCount: 1, notes: '+3000. Arike Ogunbowale star.' },
      { name: 'Washington Mystics', rank: 11, sourceCount: 1, notes: '+3500. Rebuilding.' },
      { name: 'Golden State Valkyries', rank: 12, sourceCount: 2, notes: '+2500. Expansion team. Bay Area market. Unknown roster.' },
      { name: 'Los Angeles Sparks', rank: 13, sourceCount: 1, notes: '+5000. Rebuilding. Cameron Brink return.' },
    ],
    sources: ['ESPN WNBA Rankings', 'CBS Sports', 'Swish Appeal', 'VegasInsider WNBA Odds', 'The Athletic'],
  },

  // ── FIFA World Cup 2026 ──────────────────────────────────────
  // Sources: CBS, ESPN, VegasInsider, FIFA Rankings, Opta/Stats Perform
  fifa: {
    rankings: [
      { name: 'France', rank: 1, sourceCount: 5, notes: '+400. Mbappe. 2018 champs, 2022 finalists. Deepest squad in world.' },
      { name: 'England', rank: 2, sourceCount: 5, notes: '+500. 2024 Euro finalists. Bellingham/Saka. Golden generation.' },
      { name: 'Argentina', rank: 3, sourceCount: 5, notes: '+600. Defending champs. Messi farewell tour? 2022 WC winners.' },
      { name: 'Brazil', rank: 4, sourceCount: 4, notes: '+700. Vinicius Jr. Endrick. Rebuilding but talent-rich.' },
      { name: 'Spain', rank: 5, sourceCount: 5, notes: '+500. 2024 Euro champions. Yamal/Pedri. Youngest elite squad.' },
      { name: 'Germany', rank: 6, sourceCount: 4, notes: '+800. Hosts (partial). Musiala/Wirtz. 4x champions.' },
      { name: 'Portugal', rank: 7, sourceCount: 3, notes: '+1200. Post-Ronaldo era. Strong squad depth.' },
      { name: 'Netherlands', rank: 8, sourceCount: 3, notes: '+1400. Total football tradition. Gakpo/De Jong.' },
      { name: 'Italy', rank: 9, sourceCount: 2, notes: '+2000. 2020 Euro champs. Rebuilding cycle.' },
      { name: 'Belgium', rank: 10, sourceCount: 2, notes: '+2500. Golden generation aging. De Bruyne swan song.' },
      { name: 'United States', rank: 11, sourceCount: 4, notes: '+1600. Co-hosts. Pulisic/McKennie/Reyna. Home advantage massive.' },
      { name: 'Mexico', rank: 12, sourceCount: 3, notes: '+2500. Co-hosts. Home support. CONCACAF power.' },
      { name: 'Uruguay', rank: 13, sourceCount: 2, notes: '+3000. Nunez/Valverde. South American dark horse.' },
      { name: 'Colombia', rank: 14, sourceCount: 2, notes: '+3500. 2024 Copa America finalists. Luis Diaz.' },
      { name: 'Croatia', rank: 15, sourceCount: 2, notes: '+3000. Modric last dance. 2022 semifinalists.' },
      { name: 'Denmark', rank: 16, sourceCount: 1, notes: '+5000. Hojlund. Dark horse.' },
      { name: 'Morocco', rank: 17, sourceCount: 2, notes: '+4000. 2022 semifinalists. African powerhouse.' },
      { name: 'Japan', rank: 18, sourceCount: 2, notes: '+4000. Asian champions. Kubo/Mitoma. Rising force.' },
      { name: 'Canada', rank: 19, sourceCount: 1, notes: '+8000. Co-hosts. Alphonso Davies. Historic opportunity.' },
      { name: 'South Korea', rank: 20, sourceCount: 1, notes: '+6000. Son Heung-min final WC. 2002 semifinalists at home.' },
    ],
    sources: ['CBS Sports WC Predictions', 'ESPN Power Rankings', 'VegasInsider World Cup Odds', 'FIFA World Rankings', 'Opta/Stats Perform'],
  },

  // ── PDC Darts World Championship ──────────────────────────────
  // Sources: Sky Sports Darts, PDC Rankings, VegasInsider, Sporting Life, DartsNews
  darts: {
    rankings: [
      { name: 'Luke Littler', rank: 1, sourceCount: 5, notes: '+200. 17yo phenomenon. Won 2025 Worlds. Youngest ever champion. Consensus #1.' },
      { name: 'Luke Humphries', rank: 2, sourceCount: 5, notes: '+350. 2024 World Champion. World #1. Consistent excellence.' },
      { name: 'Michael van Gerwen', rank: 3, sourceCount: 4, notes: '+600. 3x World Champion. MvG still elite at 35.' },
      { name: 'Gian van Veen', rank: 4, sourceCount: 3, notes: '+1200. Dutch prodigy. Rising fast through PDC ranks.' },
      { name: 'Gary Anderson', rank: 5, sourceCount: 3, notes: '+1400. 2x World Champion. The Flying Scotsman.' },
      { name: 'Jonny Clayton', rank: 6, sourceCount: 3, notes: '+1600. The Ferret. Multiple major titles.' },
      { name: 'Stephen Bunting', rank: 7, sourceCount: 2, notes: '+2000. Consistent performer. The Bullet.' },
      { name: 'Rob Cross', rank: 8, sourceCount: 2, notes: '+2500. 2018 World Champion. Voltage.' },
      { name: 'Gerwyn Price', rank: 9, sourceCount: 3, notes: '+2000. 2021 World Champion. The Iceman. Welsh fire.' },
      { name: 'Josh Rock', rank: 10, sourceCount: 2, notes: '+2500. Northern Irish talent. Young contender.' },
      { name: 'Danny Noppert', rank: 11, sourceCount: 2, notes: '+3000. The Freeze. Dutch pipeline.' },
      { name: 'Chris Dobey', rank: 12, sourceCount: 1, notes: '+3500. Hollywood. Masters champion.' },
      { name: 'Nathan Aspinall', rank: 13, sourceCount: 1, notes: '+4000. The Asp. Major semi-finalist.' },
      { name: 'James Wade', rank: 14, sourceCount: 2, notes: '+4000. The Machine. Left-handed legend.' },
      { name: 'Damon Heta', rank: 15, sourceCount: 1, notes: '+4500. The Heat. Australian star.' },
      { name: 'Dave Chisnall', rank: 16, sourceCount: 1, notes: '+5000. Chizzy. 180 machine.' },
      { name: 'Michael Smith', rank: 17, sourceCount: 2, notes: '+3500. Bully Boy. 2023 World Champion.' },
      { name: 'Ross Smith', rank: 18, sourceCount: 1, notes: '+5000. Smudger. Grand Slam winner.' },
      { name: 'Ryan Searle', rank: 19, sourceCount: 1, notes: '+5000. Heavy Metal. Power scorer.' },
      { name: 'Beau Greaves', rank: 20, sourceCount: 2, notes: '+6000. Women\'s #1 crossing to PDC. Historic dark horse.' },
    ],
    sources: ['Sky Sports Darts', 'PDC Order of Merit', 'VegasInsider', 'Sporting Life Darts', 'DartsNews'],
  },

  // ── Men's Tennis (Grand Slam favorites) ──────────────────────
  // Sources: ATP Rankings, ESPN, Tennis Channel, Oddschecker, The Tennis Podcast
  tennis_m: {
    rankings: [
      { name: 'Jannik Sinner', rank: 1, sourceCount: 5, notes: 'World #1. 2024 AO + USO champion. Italian ice. Consensus top player.' },
      { name: 'Carlos Alcaraz', rank: 2, sourceCount: 5, notes: 'World #2. 2024 RG + Wimbledon. 4 Slams at 22. Generational.' },
      { name: 'Novak Djokovic', rank: 3, sourceCount: 5, notes: '24 Grand Slams. GOAT debate. 37yo but still dangerous at any Slam.' },
      { name: 'Alexander Zverev', rank: 4, sourceCount: 4, notes: 'World #3. 2024 RG finalist. Overdue for first Slam.' },
      { name: 'Daniil Medvedev', rank: 5, sourceCount: 3, notes: '2021 USO champion. 2024 AO finalist. Hard court specialist.' },
      { name: 'Taylor Fritz', rank: 6, sourceCount: 3, notes: 'American #1. 2024 USO finalist. Rising contender.' },
      { name: 'Jack Draper', rank: 7, sourceCount: 3, notes: 'British hope. Lefty power. Breakout 2024-25 season.' },
      { name: 'Ben Shelton', rank: 8, sourceCount: 2, notes: 'American youngster. Huge serve. 2023 USO semifinalist.' },
      { name: 'Casper Ruud', rank: 9, sourceCount: 2, notes: '3x Slam finalist. Clay court elite. Consistent top 10.' },
      { name: 'Holger Rune', rank: 10, sourceCount: 2, notes: 'Danish talent. Inconsistent but high ceiling.' },
      { name: 'Alex de Minaur', rank: 11, sourceCount: 2, notes: 'Australian #1. Speed demon. Improved on hard courts.' },
      { name: 'Andrey Rublev', rank: 12, sourceCount: 2, notes: 'Russian firepower. Masters winner. Slam breakthrough pending.' },
      { name: 'Stefanos Tsitsipas', rank: 13, sourceCount: 2, notes: '2023 AO finalist. Greek star. Clay specialist.' },
      { name: 'Felix Auger-Aliassime', rank: 14, sourceCount: 1, notes: 'Canadian talent. Big serve. Top 10 potential.' },
      { name: 'Lorenzo Musetti', rank: 15, sourceCount: 1, notes: 'Italian flair. Shotmaking ability. Clay talent.' },
      { name: 'Hubert Hurkacz', rank: 16, sourceCount: 1, notes: 'Polish power. Big server. Wimbledon semifinalist.' },
      { name: 'Tommy Paul', rank: 17, sourceCount: 1, notes: 'American. AO semifinalist. Consistent improver.' },
      { name: 'Frances Tiafoe', rank: 18, sourceCount: 1, notes: 'American fan favorite. 2022 USO semifinalist.' },
      { name: 'Joao Fonseca', rank: 19, sourceCount: 2, notes: 'Brazilian teenager. Next Gen champion. Future star.' },
      { name: 'Learner Tien', rank: 20, sourceCount: 1, notes: 'American 19yo. 2025 AO breakout. Future contender.' },
    ],
    sources: ['ATP Rankings', 'ESPN Tennis', 'Tennis Channel', 'Oddschecker Slam Odds', 'The Tennis Podcast'],
  },

  // ── Women's Tennis (Grand Slam favorites) ──────────────────────
  // Sources: WTA Rankings, ESPN, Tennis Channel, Oddschecker, The Tennis Podcast
  tennis_w: {
    rankings: [
      { name: 'Aryna Sabalenka', rank: 1, sourceCount: 5, notes: 'World #1. 2024 AO + USO champion. Power baseline game. Consensus favorite.' },
      { name: 'Iga Swiatek', rank: 2, sourceCount: 5, notes: 'World #2. 4x RG champion. Clay GOAT. Dominant on dirt.' },
      { name: 'Coco Gauff', rank: 3, sourceCount: 4, notes: '2023 USO champion. American star. 21yo. Improving every year.' },
      { name: 'Elena Rybakina', rank: 4, sourceCount: 4, notes: '2022 Wimbledon champion. Huge serve + power. When healthy, top 3.' },
      { name: 'Jessica Pegula', rank: 5, sourceCount: 3, notes: '2024 USO finalist. American veteran. Consistent top 5.' },
      { name: 'Jasmine Paolini', rank: 6, sourceCount: 3, notes: '2024 RG + Wimbledon finalist. Italian breakout star.' },
      { name: 'Qinwen Zheng', rank: 7, sourceCount: 3, notes: '2024 AO finalist. Olympic gold. Chinese superstar.' },
      { name: 'Madison Keys', rank: 8, sourceCount: 3, notes: '2025 AO champion. 30yo resurgence. Power game.' },
      { name: 'Mirra Andreeva', rank: 9, sourceCount: 3, notes: '17yo Russian prodigy. Youngest top 20 player. Future #1 candidate.' },
      { name: 'Karolina Muchova', rank: 10, sourceCount: 2, notes: 'Czech shotmaker. 2023 RG finalist. Injury comeback.' },
      { name: 'Emma Navarro', rank: 11, sourceCount: 2, notes: 'American. 2024 USO quarterfinalist. Rising fast.' },
      { name: 'Naomi Osaka', rank: 12, sourceCount: 2, notes: '4x Slam champion. Comeback from motherhood. Grand stage performer.' },
      { name: 'Paula Badosa', rank: 13, sourceCount: 2, notes: 'Spanish talent. Injury comeback. 2022 top 5.' },
      { name: 'Diana Shnaider', rank: 14, sourceCount: 1, notes: 'Russian youngster. Fast riser. Hard court ability.' },
      { name: 'Linda Noskova', rank: 15, sourceCount: 1, notes: 'Czech teenager. Beat Swiatek at AO. Big match player.' },
      { name: 'Jelena Ostapenko', rank: 16, sourceCount: 1, notes: '2017 RG champion. Latvian. All-or-nothing game.' },
      { name: 'Barbora Krejcikova', rank: 17, sourceCount: 2, notes: '2024 Wimbledon champion. Czech. Doubles + singles elite.' },
      { name: 'Elina Svitolina', rank: 18, sourceCount: 1, notes: 'Ukrainian. Consistent Slam quarterfinalist.' },
      { name: 'Leylah Fernandez', rank: 19, sourceCount: 1, notes: 'Canadian. 2021 USO finalist. Lefty firepower.' },
      { name: 'Emma Raducanu', rank: 20, sourceCount: 1, notes: '2021 USO champion. British. Comeback trajectory.' },
    ],
    sources: ['WTA Rankings', 'ESPN Tennis', 'Tennis Channel', 'Oddschecker Slam Odds', 'The Tennis Podcast'],
  },
};


// ─────────────────────────────────────────────────────────────
// INJECTION LOGIC
// ─────────────────────────────────────────────────────────────

function run() {
  console.log('=== Expert Data Injection ===\n');

  // Load existing scores
  let scores = {};
  if (fs.existsSync(SCORES_PATH)) {
    try {
      scores = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8'));
    } catch (e) { /* start fresh */ }
  }

  let totalInjected = 0;

  for (const [sport, data] of Object.entries(EXPERT_DATA)) {
    const maxRank = data.rankings.length;
    let sportInjected = 0;

    console.log(`${sport.toUpperCase()} (${data.rankings.length} entries)`);
    console.log(`  Sources: ${data.sources.join(', ')}`);

    for (const item of data.rankings) {
      const id = entryId(sport, item.name);

      if (!scores[id]) {
        scores[id] = { socialScore: 0, socialQuotient: 1.0, sources: {} };
      }
      if (!scores[id].sources) scores[id].sources = {};

      const totalSources = data.sources.length;
      const weight = expertWeight(item.rank, maxRank, item.sourceCount || 1, totalSources);

      // Inject as "expert" source — replaces previous expert data each run
      scores[id].sources.expert = {
        score: parseFloat(weight.toFixed(2)),
        rank: item.rank,
        notes: item.notes,
        sourcesUsed: data.sources.length,
        sourcesAgreed: item.sourceCount || 1,
      };

      // Recalculate total socialScore from all sources
      let total = 0;
      for (const src of Object.values(scores[id].sources)) {
        total += src.score || 0;
      }
      scores[id].socialScore = parseFloat(total.toFixed(2));

      // Recalculate quotient (strong signal: max 1.35x)
      const quotient = 1.0 + (Math.log10(1 + total) * 0.12);
      scores[id].socialQuotient = Math.round(Math.min(quotient, 1.35) * 100) / 100;
      scores[id].lastUpdated = new Date().toISOString();

      sportInjected++;
    }

    console.log(`  Injected: ${sportInjected} entries\n`);
    totalInjected += sportInjected;
  }

  // Save
  fs.mkdirSync(path.dirname(SCORES_PATH), { recursive: true });
  fs.writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2));

  // Also update storage if it exists
  if (fs.existsSync(STORAGE_PATH)) {
    try {
      const storage = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
      storage.scores = scores;
      fs.writeFileSync(STORAGE_PATH, JSON.stringify(storage, null, 2));
    } catch (e) { /* skip storage update */ }
  }

  // Print top entries per sport
  console.log('=== Top Entries by Sport ===\n');
  for (const sport of Object.keys(EXPERT_DATA)) {
    const sportEntries = Object.entries(scores)
      .filter(([id]) => id.startsWith(`${sport}-`))
      .sort(([, a], [, b]) => b.socialScore - a.socialScore)
      .slice(0, 5);

    console.log(`${sport.toUpperCase()}:`);
    for (const [id, data] of sportEntries) {
      const expert = data.sources?.expert;
      console.log(`  ${id}: score=${data.socialScore} (${data.socialQuotient}x)${expert ? ` [Expert #${expert.rank}]` : ''}`);
    }
    console.log();
  }

  console.log(`=== Done: ${totalInjected} expert entries injected across ${Object.keys(EXPERT_DATA).length} sports ===`);
}

run();
