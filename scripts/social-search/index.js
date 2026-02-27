#!/usr/bin/env node
/**
 * Social Search Script v2 (SSS)
 * Multi-source social scoring: Reddit, Bluesky, Google News, Power Rankings
 *
 * Usage: node scripts/social-search/index.js [--sport nfl] [--skip-rankings] [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS, QUOTIENT } from './config.js';
import { calculateQuotient, applyDecay } from './utils/scoring.js';
import { searchReddit } from './sources/reddit.js';
import { searchBluesky } from './sources/bluesky.js';
import { searchGoogleNews } from './sources/google-news.js';
import { scrapePowerRankings } from './sources/power-rankings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
const sportFilter = args.includes('--sport') ? args[args.indexOf('--sport') + 1] : null;
const skipRankings = args.includes('--skip-rankings');
const dryRun = args.includes('--dry-run');

// --- Load rosters (eval from the ES module source) ---
function loadRosters() {
  const content = fs.readFileSync(PATHS.rosters, 'utf-8');
  const match = content.match(/const SPORTS = (\[[\s\S]*?\]);\s*\n/);
  // Rosters are separate — look for the ROSTERS export
  const rostersPath = path.join(path.dirname(PATHS.rosters), 'rosters.js');
  const rostersContent = fs.readFileSync(rostersPath, 'utf-8');
  const rostersMatch = rostersContent.match(/const ROSTERS = (\{[\s\S]*?\});\s*export default/);
  if (!rostersMatch) {
    console.error('Could not parse ROSTERS from rosters.js');
    process.exit(1);
  }
  return eval(`(${rostersMatch[1]})`);
}

function loadSports() {
  const content = fs.readFileSync(PATHS.rosters, 'utf-8');
  // Actually load from sports.js
  const sportsPath = path.join(path.dirname(PATHS.rosters), 'sports.js');
  const sportsContent = fs.readFileSync(sportsPath, 'utf-8');
  const match = sportsContent.match(/const SPORTS = (\[[\s\S]*?\]);\s*\n/);
  if (!match) {
    console.error('Could not parse SPORTS from sports.js');
    process.exit(1);
  }
  return eval(`(${match[1]})`);
}

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// --- Load storage ---
function loadStorage() {
  if (fs.existsSync(PATHS.storage)) {
    try {
      const data = JSON.parse(fs.readFileSync(PATHS.storage, 'utf-8'));
      if (!data.processedIds) data.processedIds = {};
      if (!data.scores) data.scores = {};
      return data;
    } catch (e) { /* fall through */ }
  }
  return { processedIds: {}, scores: {} };
}

function loadDraftState() {
  if (fs.existsSync(PATHS.draftState)) {
    try {
      return JSON.parse(fs.readFileSync(PATHS.draftState, 'utf-8'));
    } catch (e) { /* fall through */ }
  }
  return {};
}

// --- Main ---
async function run() {
  console.log('=== Social Search Script v2 (SSS) ===');
  console.log(`Options: sport=${sportFilter || 'all'}, skipRankings=${skipRankings}, dryRun=${dryRun}\n`);

  const ROSTERS = loadRosters();
  const SPORTS = loadSports();
  const draftState = loadDraftState();
  const storage = loadStorage();

  // Apply decay to existing accumulated scores
  if (Object.keys(storage.scores).length > 0) {
    console.log(`Applying ${QUOTIENT.decayFactor}x decay to ${Object.keys(storage.scores).length} existing scores...`);
    applyDecay(storage.scores);
  }

  // Build processed ID sets per source
  const processedIds = {
    reddit: new Set(storage.processedIds.reddit || []),
    bluesky: new Set(storage.processedIds.bluesky || []),
    news: new Set(storage.processedIds.news || []),
  };

  // Build roster entries grouped by sport
  const sportEntries = {};
  for (const [sportId, names] of Object.entries(ROSTERS)) {
    if (sportFilter && sportId !== sportFilter) continue;

    sportEntries[sportId] = [];
    for (const name of names) {
      const id = `${sportId}-${slugify(name)}`;
      // Include all entries (not just undrafted) for scoring
      sportEntries[sportId].push({ id, name, drafted: !!(draftState[id]?.drafted) });
    }
  }

  const activeSports = SPORTS.filter(s => s.active && (!sportFilter || s.id === sportFilter));
  const totalSports = activeSports.length;
  let processed = 0;

  for (const sport of activeSports) {
    const entries = sportEntries[sport.id];
    if (!entries || entries.length === 0) continue;

    processed++;
    console.log(`\n[${processed}/${totalSports}] ${sport.icon} ${sport.name} (${entries.length} entries)`);

    // --- Reddit ---
    console.log('  Searching Reddit...');
    const redditResults = await searchReddit(sport, entries, processedIds.reddit);
    mergeSourceResults(storage.scores, redditResults, 'reddit');
    const redditHits = Object.keys(redditResults).length;
    if (redditHits > 0) console.log(`  Reddit: ${redditHits} entries matched`);

    // --- Bluesky ---
    console.log('  Searching Bluesky...');
    const bskyResults = await searchBluesky(sport, entries, processedIds.bluesky);
    mergeSourceResults(storage.scores, bskyResults, 'bluesky');
    const bskyHits = Object.keys(bskyResults).length;
    if (bskyHits > 0) console.log(`  Bluesky: ${bskyHits} entries matched`);

    // --- Google News ---
    console.log('  Searching Google News...');
    const newsResults = await searchGoogleNews(sport, entries, processedIds.news);
    mergeSourceResults(storage.scores, newsResults, 'news');
    const newsHits = Object.keys(newsResults).length;
    if (newsHits > 0) console.log(`  News: ${newsHits} entries matched`);

    // --- Power Rankings ---
    if (!skipRankings) {
      console.log('  Scraping power rankings...');
      const rankResults = await scrapePowerRankings(sport, entries);
      // Rankings REPLACE (not accumulate) — they're point-in-time
      mergeRankingResults(storage.scores, rankResults);
      const rankHits = Object.keys(rankResults).length;
      if (rankHits > 0) console.log(`  Rankings: ${rankHits} entries matched`);
    }
  }

  // Recalculate quotients for all entries
  console.log('\nRecalculating quotients...');
  for (const id of Object.keys(storage.scores)) {
    const entry = storage.scores[id];
    // Sum all source scores
    let total = 0;
    if (entry.sources) {
      for (const src of Object.values(entry.sources)) {
        total += src.score || 0;
      }
    }
    entry.socialScore = parseFloat(total.toFixed(2));
    entry.socialQuotient = calculateQuotient(total);
    entry.lastUpdated = new Date().toISOString();
  }

  // Persist processed IDs (convert Sets back to arrays)
  storage.processedIds = {
    reddit: [...processedIds.reddit].slice(-5000),   // cap at 5000 to prevent unbounded growth
    bluesky: [...processedIds.bluesky].slice(-5000),
    news: [...processedIds.news].slice(-5000),
  };

  if (dryRun) {
    console.log('\n[DRY RUN] Would write scores:');
    const top10 = Object.entries(storage.scores)
      .sort(([, a], [, b]) => b.socialScore - a.socialScore)
      .slice(0, 10);
    for (const [id, data] of top10) {
      console.log(`  ${id}: score=${data.socialScore}, quotient=${data.socialQuotient}`);
    }
    return;
  }

  // Save storage
  fs.mkdirSync(path.dirname(PATHS.storage), { recursive: true });
  fs.writeFileSync(PATHS.storage, JSON.stringify(storage, null, 2));

  // Save public scores (frontend consumption)
  fs.mkdirSync(path.dirname(PATHS.scores), { recursive: true });
  fs.writeFileSync(PATHS.scores, JSON.stringify(storage.scores, null, 2));

  // Summary
  const totalScored = Object.values(storage.scores).filter(s => s.socialScore > 0).length;
  const topEntries = Object.entries(storage.scores)
    .sort(([, a], [, b]) => b.socialScore - a.socialScore)
    .slice(0, 5);

  console.log(`\n=== SSS Complete ===`);
  console.log(`${totalScored} entries with social scores > 0`);
  console.log('\nTop 5:');
  for (const [id, data] of topEntries) {
    console.log(`  ${id}: score=${data.socialScore} (${data.socialQuotient}x)`);
  }
}

/**
 * Merge source results into the scores object (accumulative).
 */
function mergeSourceResults(scores, sourceResults, sourceName) {
  for (const [entryId, data] of Object.entries(sourceResults)) {
    if (!scores[entryId]) {
      scores[entryId] = { socialScore: 0, socialQuotient: 1.0, sources: {} };
    }
    if (!scores[entryId].sources) scores[entryId].sources = {};

    const existing = scores[entryId].sources[sourceName] || { score: 0, mentions: 0 };
    existing.score = parseFloat((existing.score + data.score).toFixed(2));
    existing.mentions = (existing.mentions || 0) + (data.mentions || 0);
    if (data.articles) existing.articles = (existing.articles || 0) + data.articles;
    scores[entryId].sources[sourceName] = existing;
  }
}

/**
 * Merge ranking results (replaces previous ranking data).
 */
function mergeRankingResults(scores, rankResults) {
  // Clear old ranking sources for entries that are NOT in new results
  for (const id of Object.keys(scores)) {
    if (scores[id].sources?.rankings && !rankResults[id]) {
      delete scores[id].sources.rankings;
    }
  }

  for (const [entryId, data] of Object.entries(rankResults)) {
    if (!scores[entryId]) {
      scores[entryId] = { socialScore: 0, socialQuotient: 1.0, sources: {} };
    }
    if (!scores[entryId].sources) scores[entryId].sources = {};

    scores[entryId].sources.rankings = {
      score: parseFloat(data.score.toFixed(2)),
      avgRank: data.avgRank,
      source: data.source,
    };
  }
}

run().catch(err => {
  console.error('SSS fatal error:', err);
  process.exit(1);
});
