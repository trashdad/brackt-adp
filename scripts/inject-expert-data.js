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
const SCORES_PATH = path.join(__dirname, '../public/data/social-scores.json');
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
