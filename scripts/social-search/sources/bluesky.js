import { USER_AGENTS, WEIGHTS } from '../config.js';
import { buildSportQuery, nameAppearsInText } from '../utils/query-builder.js';
import { detectRanking } from '../utils/scoring.js';

const DELAY_MS = 2000;
const BSKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts';

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Search Bluesky for sport-level mentions, then match against roster entries.
 * Returns { [entryId]: { score, mentions } }
 */
export async function searchBluesky(sport, rosterEntries, processedIds) {
  const results = {};
  const query = buildSportQuery(sport, 'odds');

  try {
    const url = `${BSKY_API}?q=${encodeURIComponent(query)}&limit=25&sort=latest`;
    const res = await fetch(url, {
      headers: { 'User-Agent': randomUA() },
    });

    if (res.status === 429) {
      console.log(`  Bluesky rate limited, backing off...`);
      await sleep(10000);
      return results;
    }
    if (!res.ok) {
      console.log(`  Bluesky returned ${res.status}`);
      return results;
    }

    const data = await res.json();
    const posts = data?.posts || [];

    for (const post of posts) {
      const postId = `bsky_${post.uri?.split('/').pop() || Date.now()}`;
      if (processedIds.has(postId)) continue;

      const text = post.record?.text || '';
      const likes = post.likeCount || 0;
      const reposts = post.repostCount || 0;

      // Engagement multiplier: base 1.0, scales with likes+reposts
      const engagement = 1 + Math.log2(1 + likes + reposts) / 5;

      for (const entry of rosterEntries) {
        if (!nameAppearsInText(entry.name, text)) continue;

        if (!results[entry.id]) results[entry.id] = { score: 0, mentions: 0, postIds: [] };

        let weight = WEIGHTS.bluesky * engagement;

        // Ranking detection
        const ranking = detectRanking(text, entry.name);
        if (ranking) {
          weight += ranking.bonus;
        }

        results[entry.id].score += weight;
        results[entry.id].mentions += 1;
        results[entry.id].postIds.push(postId);
      }

      processedIds.add(postId);
    }
  } catch (err) {
    console.log(`  Bluesky error: ${err.message}`);
  }

  await sleep(DELAY_MS);
  return results;
}
