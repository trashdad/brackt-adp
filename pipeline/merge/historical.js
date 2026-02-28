/**
 * Append-only merge for historical odds data.
 * Reads from output/.raw/{source}/{sport}.json (type=historical)
 * and appends to output/historical/{sport}.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../scheduler/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'output', '.raw');
const HISTORICAL_DIR = path.join(__dirname, '..', 'output', 'historical');

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Determine trend direction from history array.
 */
function calculateTrend(history) {
  if (!history || history.length < 2) return 'stable';

  const recent = history.slice(-5); // Look at last 5 data points
  const first = parseFloat(recent[0].odds);
  const last = parseFloat(recent[recent.length - 1].odds);

  if (isNaN(first) || isNaN(last)) return 'stable';

  // Compare using implied probability rather than raw odds values
  const toProb = (o) => o < 0 ? (-o) / (-o + 100) : 100 / (o + 100);
  const firstProb = toProb(first);
  const lastProb = toProb(last);
  const probDiff = lastProb - firstProb;
  if (Math.abs(probDiff) < 0.02) return 'stable'; // <2% probability shift
  return probDiff > 0 ? 'shortening' : 'lengthening';
}

/**
 * Load existing historical data for a sport, or return empty structure.
 */
async function loadExistingHistorical(sportId) {
  const filePath = path.join(HISTORICAL_DIR, `${sportId}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return { sport: sportId, entries: [] };
  }
}

/**
 * Read all raw historical source files for a sport.
 */
async function readHistoricalSourcesForSport(sportId) {
  const sources = [];

  let sourceDirs;
  try {
    sourceDirs = await fs.readdir(RAW_DIR, { withFileTypes: true });
  } catch {
    return sources;
  }

  for (const dir of sourceDirs) {
    if (!dir.isDirectory()) continue;

    const filePath = path.join(RAW_DIR, dir.name, `${sportId}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      // Include both historical and live data for trend tracking
      sources.push(data);
    } catch {
      // skip
    }
  }

  return sources;
}

/**
 * Merge new data points into historical entries.
 */
export async function runHistoricalMerge() {
  await fs.mkdir(HISTORICAL_DIR, { recursive: true });

  let sourceDirs;
  try {
    sourceDirs = await fs.readdir(RAW_DIR, { withFileTypes: true });
  } catch {
    logger.info('No raw data found for historical merge');
    return;
  }

  // Collect all sport IDs
  const sports = new Set();
  for (const dir of sourceDirs) {
    if (!dir.isDirectory()) continue;
    try {
      const files = await fs.readdir(path.join(RAW_DIR, dir.name));
      for (const f of files) {
        if (f.endsWith('.json')) sports.add(f.replace('.json', ''));
      }
    } catch {
      // skip
    }
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  for (const sportId of sports) {
    try {
      const existing = await loadExistingHistorical(sportId);
      const rawSources = await readHistoricalSourcesForSport(sportId);

      // Build a map of existing entries by normalized name
      const entryMap = new Map();
      for (const entry of existing.entries) {
        entryMap.set(entry.nameNormalized, entry);
      }

      // Add new data points from raw sources
      for (const source of rawSources) {
        for (const item of source.entries || []) {
          const key = item.nameNormalized || normalizeName(item.name);

          if (!entryMap.has(key)) {
            entryMap.set(key, {
              name: item.name,
              nameNormalized: key,
              history: [],
              trend: 'stable',
              openingOdds: item.odds,
              currentOdds: item.odds,
            });
          }

          const entry = entryMap.get(key);

          // Only add one data point per source per day
          const alreadyHasToday = entry.history.some(
            (h) => h.date === today && h.source === source.source
          );

          if (!alreadyHasToday) {
            entry.history.push({
              date: today,
              odds: item.odds,
              source: source.source,
            });
          }

          // Update current odds (use most recent)
          entry.currentOdds = item.odds;
        }
      }

      // Recalculate trends and finalize
      const entries = [];
      for (const entry of entryMap.values()) {
        // Sort history by date
        entry.history.sort((a, b) => a.date.localeCompare(b.date));
        entry.trend = calculateTrend(entry.history);

        if (entry.history.length > 0 && !entry.openingOdds) {
          entry.openingOdds = entry.history[0].odds;
        }

        entries.push(entry);
      }

      const historical = { sport: sportId, entries };
      const outputPath = path.join(HISTORICAL_DIR, `${sportId}.json`);
      await fs.writeFile(outputPath, JSON.stringify(historical, null, 2));

      logger.info(`Historical merge: ${entries.length} entries`, { sport: sportId });
    } catch (error) {
      logger.error(`Historical merge failed for ${sportId}: ${error.message}`);
    }
  }
}

export default runHistoricalMerge;
