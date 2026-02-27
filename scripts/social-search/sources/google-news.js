import { USER_AGENTS, WEIGHTS, PREMIUM_SOURCES } from '../config.js';
import { buildSportQuery, nameAppearsInText } from '../utils/query-builder.js';

const DELAY_MS = 1500;

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Parse RSS XML items from Google News. Uses regex — no external deps needed.
 */
function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';

    items.push({
      title: decodeHTMLEntities(title),
      source: decodeHTMLEntities(source),
      pubDate: pubDate ? new Date(pubDate) : null,
      link,
    });
  }

  return items;
}

function decodeHTMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Search Google News RSS for sport-level mentions.
 * Returns { [entryId]: { score, mentions, articles } }
 */
export async function searchGoogleNews(sport, rosterEntries, processedIds) {
  const results = {};
  const query = buildSportQuery(sport, 'odds');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30); // last 30 days

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': randomUA() },
    });

    if (!res.ok) {
      console.log(`  Google News returned ${res.status}`);
      return results;
    }

    const xml = await res.text();
    const items = parseRSSItems(xml);

    for (const item of items) {
      // Filter to recent articles
      if (item.pubDate && item.pubDate < cutoff) continue;

      const articleId = `news_${hashString(item.link || item.title)}`;
      if (processedIds.has(articleId)) continue;

      const text = item.title;
      const isPremium = PREMIUM_SOURCES.some(src =>
        item.source.toLowerCase().includes(src.toLowerCase())
      );

      for (const entry of rosterEntries) {
        if (!nameAppearsInText(entry.name, text)) continue;

        if (!results[entry.id]) results[entry.id] = { score: 0, mentions: 0, articles: 0, postIds: [] };

        const weight = isPremium ? WEIGHTS.premiumNews : WEIGHTS.news;

        results[entry.id].score += weight;
        results[entry.id].mentions += 1;
        results[entry.id].articles += 1;
        results[entry.id].postIds.push(articleId);
      }

      processedIds.add(articleId);
    }
  } catch (err) {
    console.log(`  Google News error: ${err.message}`);
  }

  await sleep(DELAY_MS);
  return results;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
