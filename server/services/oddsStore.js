/**
 * Unified per-sport odds store with source-level merge.
 *
 * Each sport is stored as a separate key: `odds-{sportId}`
 * Format:
 * {
 *   version: number,
 *   lastModified: ISO string,
 *   entries: {
 *     [slugifiedName]: {
 *       name: string,
 *       sources: { [source]: { odds: string, updatedAt: ISO string } },
 *       tournamentSources: { [tournamentId]: { [source]: { odds: string, updatedAt: ISO string } } },
 *       consensus: string|null,
 *       bestOdds: string|null,
 *       bestSource: string|null,
 *       tournaments: { [tournamentId]: { consensus: string|null } }
 *     }
 *   }
 * }
 */

import { computeConsensus, americanToImpliedProbability, probabilityToAmerican } from './oddsConverter.js';

const EMPTY_SPORT = () => ({ version: 0, lastModified: null, entries: {} });

/**
 * Read sport odds data using the provided storage reader.
 * @param {Function} readFn - async (name) => data
 * @param {string} sportId
 */
export async function readSportOdds(readFn, sportId) {
  const data = await readFn(`odds-${sportId}`);
  if (!data || !data.entries) return EMPTY_SPORT();
  return data;
}

/**
 * Merge new odds into a sport's store and recompute consensus.
 * @param {Function} readFn - async (name) => data
 * @param {Function} writeFn - async (name, data) => void
 * @param {string} sportId
 * @param {string} source - sportsbook source name (e.g. "draftkings")
 * @param {Object} entries - { slugifiedName: { name, odds } }
 * @param {string|null} tournament - tournament ID if applicable
 */
export async function mergeSportOdds(readFn, writeFn, sportId, source, entries, tournament = null) {
  const store = await readSportOdds(readFn, sportId);
  const now = new Date().toISOString();

  for (const [slug, { name, odds }] of Object.entries(entries)) {
    if (!store.entries[slug]) {
      store.entries[slug] = {
        name,
        sources: {},
        tournamentSources: {},
        consensus: null,
        bestOdds: null,
        bestSource: null,
        tournaments: {},
      };
    }

    const entry = store.entries[slug];
    // Update name if provided (prefer most recent)
    if (name) entry.name = name;

    if (tournament) {
      // Tournament-specific odds
      if (!entry.tournamentSources[tournament]) entry.tournamentSources[tournament] = {};
      entry.tournamentSources[tournament][source] = { odds, updatedAt: now };

      // Recompute tournament consensus
      const tSources = entry.tournamentSources[tournament];
      const tOddsBySource = {};
      for (const [src, val] of Object.entries(tSources)) {
        tOddsBySource[src] = val.odds;
      }
      const { consensus } = computeConsensus(tOddsBySource);
      if (!entry.tournaments) entry.tournaments = {};
      entry.tournaments[tournament] = { consensus };
    } else {
      // Main (non-tournament) odds
      entry.sources[source] = { odds, updatedAt: now };
    }

    // Recompute main consensus from all non-tournament sources
    recomputeEntryConsensus(entry);
  }

  store.version = (store.version || 0) + 1;
  store.lastModified = now;

  await writeFn(`odds-${sportId}`, store);
  return store;
}

/**
 * Recompute consensus, bestOdds, bestSource for a single entry.
 * Uses main sources. If no main sources but tournament sources exist,
 * averages tournament consensus values.
 */
function recomputeEntryConsensus(entry) {
  const mainOddsBySource = {};
  for (const [src, val] of Object.entries(entry.sources)) {
    mainOddsBySource[src] = val.odds;
  }

  if (Object.keys(mainOddsBySource).length > 0) {
    const result = computeConsensus(mainOddsBySource);
    entry.consensus = result.consensus;
    entry.bestOdds = result.bestOdds;
    entry.bestSource = result.bestSource;
    return;
  }

  // Fallback: average tournament consensus values
  const tournamentConsensuses = Object.values(entry.tournaments || {})
    .map(t => t.consensus)
    .filter(Boolean);

  if (tournamentConsensuses.length > 0) {
    let sumProb = 0;
    for (const odds of tournamentConsensuses) {
      sumProb += americanToImpliedProbability(odds);
    }
    const avgProb = sumProb / tournamentConsensuses.length;
    const avgOdds = probabilityToAmerican(avgProb);
    entry.consensus = avgOdds != null ? (avgOdds > 0 ? `+${avgOdds}` : `${avgOdds}`) : null;
    entry.bestOdds = null;
    entry.bestSource = null;
  }
}

/**
 * Get version numbers for all sport stores.
 * @param {Function} readFn - async (name) => data
 * @param {string[]} sportIds
 */
export async function getAllVersions(readFn, sportIds) {
  const versions = {};
  await Promise.all(
    sportIds.map(async (sportId) => {
      const data = await readFn(`odds-${sportId}`);
      versions[sportId] = data?.version || 0;
    })
  );
  return versions;
}
