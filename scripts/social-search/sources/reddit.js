import { SUBREDDITS, USER_AGENTS, WEIGHTS } from '../config.js';
import { buildSportQuery, nameAppearsInText } from '../utils/query-builder.js';
import { detectRanking } from '../utils/scoring.js';

const DELAY_MS = 1200;

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Search Reddit for a sport-level query, then scan results for roster name mentions.
 * Returns { [entryId]: { score, mentions } }
 */
export async function searchReddit(sport, rosterEntries, processedIds) {
  const results = {};
  const subreddits = SUBREDDITS[sport.id] || ['sportsbook'];
  const query = buildSportQuery(sport, 'odds');

  // Search each subreddit + global
  const searchTargets = [
    { path: `/search.json`, label: 'global' },
    ...subreddits.map(sub => ({ path: `/r/${sub}/search.json`, label: sub })),
  ];

  for (const target of searchTargets) {
    try {
      const url = `https://www.reddit.com${target.path}?q=${encodeURIComponent(query)}&sort=new&t=month&limit=25&restrict_sr=${target.label !== 'global'}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': `BracktADP_SSS/2.0 (${randomUA()})` },
      });

      if (res.status === 429) {
        console.log(`  Reddit rate limited on ${target.label}, backing off...`);
        await sleep(5000);
        continue;
      }
      if (!res.ok) continue;

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const post of posts) {
        const postId = `reddit_${post.data.id}`;
        if (processedIds.has(postId)) continue;

        const title = post.data.title || '';
        const selftext = post.data.selftext || '';
        const fullText = title + ' ' + selftext;

        // Check which roster entries appear in this post
        for (const entry of rosterEntries) {
          if (!nameAppearsInText(entry.name, fullText)) continue;

          if (!results[entry.id]) results[entry.id] = { score: 0, mentions: 0, postIds: [] };

          let weight = WEIGHTS.reddit;

          // Ranking detection bonus
          const ranking = detectRanking(fullText, entry.name);
          if (ranking) {
            weight += ranking.bonus;
          }

          // Relative ordering bonus: if this entry appears before others
          const entryIdx = fullText.toLowerCase().indexOf(entry.name.toLowerCase());
          for (const other of rosterEntries) {
            if (other.id === entry.id) continue;
            const otherIdx = fullText.toLowerCase().indexOf(other.name.toLowerCase());
            if (entryIdx !== -1 && otherIdx !== -1 && entryIdx < otherIdx) {
              weight += 0.2;
              break; // only one bonus per post
            }
          }

          results[entry.id].score += weight;
          results[entry.id].mentions += 1;
          results[entry.id].postIds.push(postId);
        }

        processedIds.add(postId);
      }
    } catch (err) {
      console.log(`  Reddit error (${target.label}): ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  return results;
}
