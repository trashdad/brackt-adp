import { RANKING_URLS, USER_AGENTS } from '../config.js';
import { nameAppearsInText } from '../utils/query-builder.js';
import { rankingWeight } from '../utils/scoring.js';

const DELAY_MS = 2000;

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Extract ranked names from HTML content.
 * Uses multiple heuristic patterns to find ranked lists in power ranking pages.
 */
function extractRankedNames(html) {
  const ranked = [];

  // Pattern 1: Numbered headings like "1. Kansas City Chiefs" or "1) Team Name"
  const numberedRegex = /(?:^|\n)\s*(\d{1,2})[.):\s-]+([A-Z][A-Za-z\s.''()-]+?)(?:\s*[(\n<])/gm;
  let match;
  while ((match = numberedRegex.exec(html)) !== null) {
    const rank = parseInt(match[1]);
    const name = match[2].trim();
    if (rank > 0 && rank <= 50 && name.length >= 3 && name.length <= 60) {
      ranked.push({ rank, name });
    }
  }

  // Pattern 2: HTML structured rankings — look for rank numbers near team names
  // Matches things like: <span class="rank">1</span>...<span class="team">Chiefs</span>
  const htmlRankRegex = /(?:rank|number|position)[^>]*>\s*(\d{1,2})\s*<[\s\S]*?(?:team|name|title|player)[^>]*>\s*([^<]{3,60})\s*</gi;
  while ((match = htmlRankRegex.exec(html)) !== null) {
    const rank = parseInt(match[1]);
    const name = match[2].trim();
    if (rank > 0 && rank <= 50) {
      ranked.push({ rank, name });
    }
  }

  // Pattern 3: Table rows with rank + name
  // <td>1</td><td>Kansas City Chiefs</td>
  const tableRegex = /<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/gi;
  while ((match = tableRegex.exec(html)) !== null) {
    const rank = parseInt(match[1]);
    const name = match[2].trim();
    if (rank > 0 && rank <= 50) {
      ranked.push({ rank, name });
    }
  }

  // Deduplicate by rank (keep first match per rank)
  const seen = new Set();
  return ranked.filter(r => {
    if (seen.has(r.rank)) return false;
    seen.add(r.rank);
    return true;
  }).sort((a, b) => a.rank - b.rank);
}

/**
 * Scrape power rankings for a sport.
 * Rankings are NOT accumulated — they replace previous values each run.
 * Returns { [entryId]: { score, avgRank, source } }
 */
export async function scrapePowerRankings(sport, rosterEntries) {
  const results = {};
  const urls = RANKING_URLS[sport.id];

  if (!urls || urls.length === 0) return results;

  for (const config of urls) {
    try {
      const res = await fetch(config.url, {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      if (!res.ok) {
        console.log(`  Rankings ${config.source} returned ${res.status} for ${sport.id}`);
        continue;
      }

      const html = await res.text();
      const ranked = extractRankedNames(html);

      if (ranked.length === 0) {
        console.log(`  Rankings ${config.source}: no ranked items found for ${sport.id}`);
        continue;
      }

      console.log(`  Rankings ${config.source}: found ${ranked.length} ranked items for ${sport.id}`);
      const maxRank = ranked.length;

      // Match ranked names against roster entries
      for (const rankedItem of ranked) {
        for (const entry of rosterEntries) {
          if (nameAppearsInText(entry.name, rankedItem.name) ||
              nameAppearsInText(rankedItem.name, entry.name)) {
            const weight = rankingWeight(rankedItem.rank, maxRank);

            if (!results[entry.id]) {
              results[entry.id] = { score: 0, avgRank: 0, rankCount: 0, source: config.source };
            }

            results[entry.id].score += weight;
            results[entry.id].avgRank = (results[entry.id].avgRank * results[entry.id].rankCount + rankedItem.rank) / (results[entry.id].rankCount + 1);
            results[entry.id].rankCount += 1;
            break; // matched this roster entry, move to next ranked item
          }
        }
      }
    } catch (err) {
      console.log(`  Rankings ${config.source} error: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  // Clean up internal fields
  for (const id of Object.keys(results)) {
    results[id].avgRank = Math.round(results[id].avgRank);
    delete results[id].rankCount;
  }

  return results;
}
