import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SPORT_COLORS } from '../../data/sports';

// Expert source info per sport — labels and citations
const SPORT_SOURCES = {
  csgo: [
    { name: 'HLTV World Ranking', url: 'https://www.hltv.org/ranking/teams' },
    { name: 'Esports.net', url: 'https://www.esports.net/wiki/teams/best-cs2-teams/' },
    { name: 'Hotspawn', url: 'https://www.hotspawn.com/counter-strike/news/best-cs2-teams' },
    { name: 'Tips.GG', url: 'https://tips.gg/' },
  ],
  snooker: [
    { name: 'JustBookies', url: 'https://www.justbookies.com/snooker-world-championship-odds/' },
    { name: 'SnookerHQ', url: 'https://snookerhq.com/' },
    { name: 'Racing Post', url: 'https://www.racingpost.com/sport/snooker-tips/' },
    { name: 'World Snooker Tour', url: 'https://www.wst.tv/rankings' },
    { name: 'Eurosport', url: 'https://www.eurosport.com/snooker/' },
  ],
  afl: [
    { name: 'BeforeYouBet', url: 'https://www.beforeyoubet.com.au/2026-afl-premiership-odds' },
    { name: 'ESPN AFL Tiers', url: 'https://www.espn.com/afl/' },
    { name: 'ZeroHanger', url: 'https://www.zerohanger.com/afl/power-rankings/' },
    { name: 'Squiggle', url: 'https://squiggle.com.au/power-rankings/' },
  ],
  ucl: [
    { name: 'JustBookies', url: 'https://www.justbookies.com/champions-league-odds/' },
    { name: 'Oddspedia', url: 'https://oddspedia.com/' },
    { name: 'beIN Supercomputer', url: 'https://www.beinsports.com/' },
    { name: 'Goal.com', url: 'https://www.goal.com/' },
  ],
  pga: [
    { name: 'Golf Channel', url: 'https://www.golfchannel.com/' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/golf/odds/masters/' },
    { name: 'FanDuel Research', url: 'https://www.fanduel.com/research/' },
    { name: 'MyGolfSpy', url: 'https://mygolfspy.com/' },
    { name: 'The Fried Egg', url: 'https://thefriedegg.com/' },
    { name: 'SI.com Golf', url: 'https://www.si.com/golf/' },
    { name: 'ProGolfNow', url: 'https://progolfnow.com/' },
    { name: 'SportsLine', url: 'https://www.sportsline.com/golf/' },
    { name: 'GolfMagic', url: 'https://www.golfmagic.com/' },
  ],
  indycar: [
    { name: 'FOX Sports', url: 'https://www.foxsports.com/stories/motor/2026-indycar-title-odds' },
    { name: 'bet365', url: 'https://news.bet365.com/' },
    { name: 'DraftKings', url: 'https://sportsbook.draftkings.com/' },
    { name: 'Beyond the Flag', url: 'https://beyondtheflag.com/' },
    { name: 'RACER', url: 'https://racer.com/' },
  ],
  f1: [
    { name: 'GPFans', url: 'https://www.gpfans.com/' },
    { name: 'Covers.com', url: 'https://www.covers.com/f1/' },
    { name: 'Sky Sports F1', url: 'https://www.skysports.com/f1/' },
    { name: 'bet365', url: 'https://news.bet365.com/' },
    { name: 'theScore', url: 'https://www.thescore.com/f1/' },
    { name: 'Kym Illman', url: 'https://www.kymillman.com/' },
    { name: 'ESPN F1', url: 'https://www.espn.com/f1/' },
  ],
  llws: [
    { name: 'SGP Analysis', url: 'https://www.sportsgamblingpodcast.com/' },
    { name: 'BetUS', url: 'https://www.betus.com.pa/sportsbook/little-league/' },
    { name: 'Little League Official', url: 'https://www.littleleague.org/' },
    { name: 'ESPN LLWS', url: 'https://www.espn.com/mlb/littleleagueworldseries/' },
  ],
  nfl: [
    { name: 'CBS Power Rankings', url: 'https://www.cbssports.com/nfl/powerrankings/' },
    { name: 'ESPN FPI', url: 'https://www.espn.com/nfl/fpi' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/nfl/odds/futures/' },
    { name: 'The Athletic', url: 'https://theathletic.com/nfl/' },
    { name: 'FiveThirtyEight', url: 'https://projects.fivethirtyeight.com/nfl-predictions/' },
  ],
  nba: [
    { name: 'CBS Power Rankings', url: 'https://www.cbssports.com/nba/powerrankings/' },
    { name: 'ESPN BPI', url: 'https://www.espn.com/nba/bpi' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/nba/odds/futures/' },
    { name: 'The Athletic', url: 'https://theathletic.com/nba/' },
    { name: 'FiveThirtyEight', url: 'https://projects.fivethirtyeight.com/nba-predictions/' },
  ],
  mlb: [
    { name: 'CBS Power Rankings', url: 'https://www.cbssports.com/mlb/powerrankings/' },
    { name: 'ESPN', url: 'https://www.espn.com/mlb/' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/mlb/odds/futures/' },
    { name: 'FanGraphs', url: 'https://www.fangraphs.com/' },
    { name: 'The Athletic', url: 'https://theathletic.com/mlb/' },
  ],
  nhl: [
    { name: 'CBS Power Rankings', url: 'https://www.cbssports.com/nhl/powerrankings/' },
    { name: 'ESPN', url: 'https://www.espn.com/nhl/' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/nhl/odds/futures/' },
    { name: 'The Athletic', url: 'https://theathletic.com/nhl/' },
    { name: 'MoneyPuck', url: 'https://moneypuck.com/' },
  ],
  ncaaf: [
    { name: 'ESPN SP+', url: 'https://www.espn.com/college-football/fpi' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/college-football/rankings/' },
    { name: 'AP Top 25', url: 'https://apnews.com/hub/ap-top-25-college-football-poll' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/college-football/odds/futures/' },
    { name: '247Sports', url: 'https://247sports.com/' },
  ],
  ncaab: [
    { name: 'CBS Sports', url: 'https://www.cbssports.com/college-basketball/rankings/' },
    { name: 'ESPN BPI', url: 'https://www.espn.com/mens-college-basketball/bpi' },
    { name: 'KenPom', url: 'https://kenpom.com/' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/college-basketball/odds/futures/' },
    { name: 'AP Poll', url: 'https://apnews.com/hub/ap-top-25-college-basketball-poll' },
  ],
  ncaaw: [
    { name: 'ESPN', url: 'https://www.espn.com/womens-college-basketball/' },
    { name: 'AP Poll', url: 'https://apnews.com/hub/ap-top-25-womens-college-basketball-poll' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/college-basketball/rankings/' },
    { name: 'Charlie Creme', url: 'https://www.espn.com/womens-college-basketball/bracketology' },
    { name: 'Her Hoop Stats', url: 'https://herhoopstats.com/' },
  ],
  wnba: [
    { name: 'ESPN', url: 'https://www.espn.com/wnba/' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/wnba/' },
    { name: 'Swish Appeal', url: 'https://www.swishappeal.com/' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/wnba/odds/futures/' },
    { name: 'The Athletic', url: 'https://theathletic.com/wnba/' },
  ],
  fifa: [
    { name: 'CBS Sports', url: 'https://www.cbssports.com/soccer/world-cup/' },
    { name: 'ESPN', url: 'https://www.espn.com/soccer/fifa-world-cup/' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/soccer/odds/world-cup/' },
    { name: 'FIFA Rankings', url: 'https://www.fifa.com/fifa-world-ranking/men' },
    { name: 'Opta', url: 'https://www.statsperform.com/' },
  ],
  darts: [
    { name: 'Sky Sports Darts', url: 'https://www.skysports.com/darts/' },
    { name: 'PDC Order of Merit', url: 'https://www.pdc.tv/order-of-merit/pdc-order-merit' },
    { name: 'VegasInsider', url: 'https://www.vegasinsider.com/' },
    { name: 'Sporting Life', url: 'https://www.sportinglife.com/darts/' },
    { name: 'DartsNews', url: 'https://dartsnews.com/' },
  ],
  tennis_m: [
    { name: 'ATP Rankings', url: 'https://www.atptour.com/en/rankings/singles' },
    { name: 'ESPN Tennis', url: 'https://www.espn.com/tennis/' },
    { name: 'Tennis Channel', url: 'https://www.tennischannel.com/' },
    { name: 'Oddschecker', url: 'https://www.oddschecker.com/tennis/' },
    { name: 'The Tennis Podcast', url: 'https://thetennispodcast.com/' },
  ],
  tennis_w: [
    { name: 'WTA Rankings', url: 'https://www.wtatennis.com/rankings/singles' },
    { name: 'ESPN Tennis', url: 'https://www.espn.com/tennis/' },
    { name: 'Tennis Channel', url: 'https://www.tennischannel.com/' },
    { name: 'Oddschecker', url: 'https://www.oddschecker.com/tennis/' },
    { name: 'The Tennis Podcast', url: 'https://thetennispodcast.com/' },
  ],
};

export default function ExpertRankings({ entries, sportId }) {
  const ranked = useMemo(() => {
    return entries
      .filter(e => e.socialSources?.expert?.rank)
      .sort((a, b) => a.socialSources.expert.rank - b.socialSources.expert.rank);
  }, [entries]);

  const sources = SPORT_SOURCES[sportId] || [];

  if (ranked.length === 0 && sources.length === 0) return null;

  const color = SPORT_COLORS[sportId] || '#888';
  const maxScore = ranked.length > 0 ? ranked[0].socialSources.expert.score : 1;

  return (
    <div className="snes-panel border-black/40 p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-black/30" style={{ backgroundColor: color + '20' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-retro text-[11px] text-retro-cyan tracking-widest uppercase">
            &gt; EXPERT_RANKINGS
          </h3>
          <span className="font-mono text-[9px] text-white/30 uppercase">
            {ranked.length} ranked &middot; {sources.length} sources
          </span>
        </div>
      </div>

      {/* Rankings Table */}
      {ranked.length > 0 && (
        <div className="px-4 py-3">
          <div className="space-y-1">
            {ranked.map((entry) => {
              const expert = entry.socialSources.expert;
              const barWidth = (expert.score / maxScore) * 100;
              return (
                <div key={entry.id} className="flex items-center gap-2 group">
                  {/* Rank */}
                  <span className="font-mono text-[11px] text-retro-gold w-6 text-right tabular-nums">
                    #{expert.rank}
                  </span>

                  {/* Bar + Name */}
                  <div className="flex-1 relative">
                    <div
                      className="absolute inset-y-0 left-0 opacity-20 rounded-sm"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                    <div className="relative flex items-center justify-between px-2 py-0.5">
                      <Link
                        to={`/player/${entry.id}`}
                        className="font-retro text-[10px] text-retro-light hover:text-retro-cyan transition-colors tracking-wide truncate"
                      >
                        {entry.name.toUpperCase()}
                      </Link>
                      <span className="font-mono text-[10px] text-white/40 ml-2 shrink-0 max-w-[55%] truncate" title={expert.notes}>
                        {expert.notes}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <span className="font-mono text-[11px] text-retro-lime w-8 text-right tabular-nums">
                    {expert.score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-black/20">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-retro text-[8px] text-white/30 uppercase tracking-wide">SOURCES:</span>
            {sources.map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[9px] text-retro-cyan/60 hover:text-retro-cyan transition-colors underline decoration-dotted"
              >
                {src.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
