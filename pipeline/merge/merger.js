/**
 * Merge raw source files into unified live JSON per sport.
 * Reads from output/.raw/{source}/{sport}.json → writes to output/live/{sport}.json + manifest.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../scheduler/logger.js';
import ROSTERS from '../../src/data/rosters.js';

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
 * Resolve a canonical name from ROSTERS if possible.
 */
function getCanonicalName(name, sportId) {
  const sportRoster = ROSTERS[sportId];
  if (!sportRoster) return name;

  let normalizedInput = normalizeName(name);

  // Expand common abbreviations in the input
  const cityExpansions = {
    'la': 'losangeles',
    'ny': 'newyork',
    'sf': 'sanfrancisco',
    'gb': 'greenbay',
    'kc': 'kansascity',
    'tb': 'tampabay',
    'ne': 'newengland',
    'no': 'neworleans',
    'ari': 'arizona',
    'atl': 'atlanta',
    'bal': 'baltimore',
    'buf': 'buffalo',
    'car': 'carolina',
    'chi': 'chicago',
    'cin': 'cincinnati',
    'cle': 'cleveland',
    'dal': 'dallas',
    'den': 'denver',
    'det': 'detroit',
    'hou': 'houston',
    'ind': 'indianapolis',
    'jax': 'jacksonville',
    'lv': 'lasvegas',
    'min': 'minnesota',
    'phi': 'philadelphia',
    'pit': 'pittsburgh',
    'sea': 'seattle',
    'ten': 'tennessee',
    'was': 'washington',
  };

  // Try to replace city abbreviation at the start of the string
  for (const [abbr, expansion] of Object.entries(cityExpansions)) {
    if (normalizedInput.startsWith(abbr)) {
      // Check if it's just the abbreviation or abbreviation + rest
      // e.g., "larams" -> "losangelesrams"
      const rest = normalizedInput.slice(abbr.length);
      // Only expand if the rest also matches or if it's the whole string
      const expanded = expansion + rest;
      
      // If the expanded version matches a team exactly, use it
      for (const team of sportRoster) {
        if (normalizeName(team) === expanded) {
          normalizedInput = expanded;
          break;
        }
      }
    }
  }

  // 1. Exact match (normalized)
  for (const team of sportRoster) {
    if (normalizeName(team) === normalizedInput) return team;
  }

  // 2. Build mapping of aliases (city, mascot) to full names
  const cityMap = new Map();
  const mascotMap = new Map();

  for (const team of sportRoster) {
    const parts = team.split(' ');
    // Handle teams with multiple words in city/mascot
    // For simplicity, we'll try common splits:
    // "Kansas City Chiefs" -> city: "Kansas City", mascot: "Chiefs"
    // "New York Giants" -> city: "New York", mascot: "Giants"
    // "Philadelphia 76ers" -> city: "Philadelphia", mascot: "76ers"
    
    // Most team names are "City Mascot" or "City City Mascot"
    // Last word is usually the mascot
    const mascot = parts[parts.length - 1];
    const city = parts.slice(0, parts.length - 1).join(' ');

    if (city) {
      const normCity = normalizeName(city);
      if (!cityMap.has(normCity)) {
        cityMap.set(normCity, team);
      } else {
        // City is not unique (e.g., New York, Los Angeles), mark as null to avoid incorrect mapping
        cityMap.set(normCity, null);
      }
    }

    if (mascot) {
      const normMascot = normalizeName(mascot);
      if (!mascotMap.has(normMascot)) {
        mascotMap.set(normMascot, team);
      } else {
        // Mascot is not unique, mark as null
        mascotMap.set(normMascot, null);
      }
    }
  }

  // Check alias maps
  if (mascotMap.has(normalizedInput) && mascotMap.get(normalizedInput)) {
    return mascotMap.get(normalizedInput);
  }
  if (cityMap.has(normalizedInput) && cityMap.get(normalizedInput)) {
    return cityMap.get(normalizedInput);
  }

  // Special case for common abbreviations
  const abbreviations = {
    'kc': 'Kansas City Chiefs',
    'la': null, // Ambiguous
    'ny': null, // Ambiguous
    'sf': 'San Francisco 49ers',
    'gb': 'Green Bay Packers',
    'tb': 'Tampa Bay Buccaneers',
    'lar': 'Los Angeles Rams',
    'lac': 'Los Angeles Chargers',
    'nyj': 'New York Jets',
    'nyg': 'New York Giants',
    'phi': 'Philadelphia Eagles',
    'bal': 'Baltimore Ravens',
    'buf': 'Buffalo Bills',
    'det': 'Detroit Lions',
    'sea': 'Seattle Seahawks',
    'ne': 'New England Patriots',
    'den': 'Denver Broncos',
    'hou': 'Houston Texans',
    'jax': 'Jacksonville Jaguars',
    'min': 'Minnesota Vikings',
    'chi': 'Chicago Bears',
    'cle': 'Cleveland Browns',
    'cin': 'Cincinnati Bengals',
    'pit': 'Pittsburgh Steelers',
    'ari': 'Arizona Cardinals',
    'atl': 'Atlanta Falcons',
    'car': 'Carolina Panthers',
    'dal': 'Dallas Cowboys',
    'ind': 'Indianapolis Colts',
    'lv': 'Las Vegas Raiders',
    'no': 'New Orleans Saints',
    'ten': 'Tennessee Titans',
    'was': 'Washington Commanders',
  };

  if (sportId === 'nfl' && abbreviations[normalizedInput]) {
    return abbreviations[normalizedInput];
  }

  return name;
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

      const canonicalName = getCanonicalName(entry.name, sportId);
      
      // If a roster exists for this sport, but the name didn't match anything in it, skip it
      // (This filters out junk like "Time", "Odds", etc. from scrapers)
      if (ROSTERS[sportId]) {
        const normalizedCanonical = normalizeName(canonicalName);
        const rosterNormalized = ROSTERS[sportId].map(normalizeName);
        if (!rosterNormalized.includes(normalizedCanonical)) {
          logger.debug(`Skipping non-roster entry: ${entry.name}`, { sport: sportId });
          continue;
        }
      }

      const key = normalizeName(canonicalName);

      if (!entryMap.has(key)) {
        entryMap.set(key, {
          name: canonicalName,
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
