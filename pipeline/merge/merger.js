/**
 * Merge raw source files into unified live JSON per sport.
 * Reads from output/.raw/{source}/{sport}.json → writes to output/live/{sport}.json + manifest.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../scheduler/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'output', '.raw');
const LIVE_DIR = path.join(__dirname, '..', 'output', 'live');

/**
 * Normalize a name to lowercase alphanumeric for matching.
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Returns true if a string looks like an odds value rather than a name.
 * E.g. "+1,200", "-300", "500", "+50,000"
 */
function looksLikeOdds(name) {
  return /^[+-]?[\d,]+$/.test(name.replace(/\s/g, ''));
}

/**
 * Convert American odds string to a numeric value for comparison.
 * More positive = better for the bettor (higher payout).
 * -150 → 150 payout on $100 bet; +200 → $200 payout on $100 bet
 * For comparison: +200 > +150 > -150 > -200
 */
function oddsToComparable(oddsStr) {
  const n = parseFloat(oddsStr);
  if (isNaN(n)) return -Infinity;
  return n;
}

/**
 * Calculate implied probability from American odds.
 */
function impliedProbability(oddsStr) {
  const odds = parseFloat(oddsStr);
  if (isNaN(odds)) return 0;
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

/**
 * Calculate consensus odds as the average implied probability converted back to American.
 */
function calculateConsensusOdds(oddsBySource) {
  const values = Object.values(oddsBySource).map(parseFloat).filter((n) => !isNaN(n));
  if (values.length === 0) return null;

  // Average implied probability
  const avgProb =
    values.reduce((sum, odds) => {
      if (odds < 0) return sum + Math.abs(odds) / (Math.abs(odds) + 100);
      return sum + 100 / (odds + 100);
    }, 0) / values.length;

  if (avgProb <= 0 || avgProb >= 1) return null;

  // Convert back to American
  if (avgProb > 0.5) {
    const american = Math.round((-avgProb * 100) / (1 - avgProb));
    return `${american}`;
  } else {
    const american = Math.round((100 * (1 - avgProb)) / avgProb);
    return `+${american}`;
  }
}

/**
 * Read all raw source files for a given sport.
 */
async function readRawSourcesForSport(sportId) {
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
      // Only include live data (not historical)
      if (data.type !== 'historical') {
        sources.push(data);
      }
    } catch {
      // File doesn't exist for this source/sport combo — skip
    }
  }

  return sources;
}

/**
 * Merge multiple source files for a sport into a single unified output.
 */
function mergeSources(sportId, rawSources) {
  const entryMap = new Map(); // nameNormalized → merged entry
  const sourceIds = new Set();

  for (const source of rawSources) {
    sourceIds.add(source.source);

    for (const entry of source.entries || []) {
      // Skip entries where the "name" is actually an odds value
      if (looksLikeOdds(entry.name)) continue;

      const key = entry.nameNormalized || normalizeName(entry.name);

      if (!entryMap.has(key)) {
        entryMap.set(key, {
          name: entry.name,
          nameNormalized: key,
          oddsBySource: {},
          bestOdds: null,
          bestOddsSource: null,
          market: entry.market || 'outrights',
        });
      }

      const merged = entryMap.get(key);
      merged.oddsBySource[source.source] = entry.odds;

      // Track best odds (highest payout)
      if (
        !merged.bestOdds ||
        oddsToComparable(entry.odds) > oddsToComparable(merged.bestOdds)
      ) {
        merged.bestOdds = entry.odds;
        merged.bestOddsSource = source.source;
      }
    }
  }

  // Build final entries
  const entries = [];
  for (const merged of entryMap.values()) {
    entries.push({
      name: merged.name,
      nameNormalized: merged.nameNormalized,
      bestOdds: merged.bestOdds,
      bestOddsSource: merged.bestOddsSource,
      consensusOdds: calculateConsensusOdds(merged.oddsBySource),
      oddsBySource: merged.oddsBySource,
      impliedProbability: parseFloat(impliedProbability(merged.bestOdds).toFixed(4)),
      market: merged.market,
    });
  }

  // Sort by implied probability (highest first = favorites first)
  entries.sort((a, b) => b.impliedProbability - a.impliedProbability);

  return {
    sport: sportId,
    lastUpdated: new Date().toISOString(),
    sources: [...sourceIds],
    entries,
  };
}

/**
 * Get all sport IDs that have raw data available.
 */
async function getAvailableSports() {
  const sports = new Set();

  let sourceDirs;
  try {
    sourceDirs = await fs.readdir(RAW_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const dir of sourceDirs) {
    if (!dir.isDirectory()) continue;

    const dirPath = path.join(RAW_DIR, dir.name);
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          sports.add(file.replace('.json', ''));
        }
      }
    } catch {
      // skip
    }
  }

  return [...sports];
}

/**
 * Run the full merge pipeline: read all raw sources, merge per sport, write output.
 */
export async function runMerge() {
  await fs.mkdir(LIVE_DIR, { recursive: true });

  const sports = await getAvailableSports();
  logger.info(`Merging data for ${sports.length} sports`);

  const manifest = {
    lastUpdated: new Date().toISOString(),
    sports: {},
  };

  for (const sportId of sports) {
    try {
      const rawSources = await readRawSourcesForSport(sportId);
      if (rawSources.length === 0) continue;

      const merged = mergeSources(sportId, rawSources);
      const outputPath = path.join(LIVE_DIR, `${sportId}.json`);
      await fs.writeFile(outputPath, JSON.stringify(merged, null, 2));

      manifest.sports[sportId] = {
        entryCount: merged.entries.length,
        sources: merged.sources,
        lastUpdated: merged.lastUpdated,
      };

      logger.info(`Merged ${merged.entries.length} entries from ${merged.sources.length} sources`, {
        sport: sportId,
      });
    } catch (error) {
      logger.error(`Failed to merge ${sportId}: ${error.message}`);
    }
  }

  // Write manifest
  const manifestPath = path.join(LIVE_DIR, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  logger.info('Manifest written', { sports: Object.keys(manifest.sports).length });
}

export default runMerge;
