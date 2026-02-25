import { useState, useEffect, useCallback } from 'react';
import SPORTS from '../data/sports';
import ROSTERS from '../data/rosters';
import { fetchOddsForSport } from '../services/oddsApi';
import { calculateSeasonTotalEV, calculateHistoricallyWeightedEV } from '../services/evCalculator';
import { slugify } from '../utils/formatters';
import { loadSettings } from '../utils/storage';
import { loadAllPipelineData } from '../services/dataLoader';

// Scarcity premium constants — controls how much intra-sport EV dominance boosts ADP rank.
// W: overall bonus strength (0.5 = up to ~50% of topEV added for a perfectly dominant entry)
// k: exponential decay exponent (2 = quadratic; only large gaps at the top get meaningful bonuses)
const ADP_SCARCITY_WEIGHT = 0.5;
const ADP_SCARCITY_K      = 2;

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * For each entry, compute an adpScore = ev.seasonTotal + scarcityBonus.
 * Skips placeholder entries.
 */
function applyScarcityPremium(entries) {
  const bySport = {};
  for (const entry of entries) {
    if (entry.isPlaceholder) continue;
    if (!bySport[entry.sport]) bySport[entry.sport] = [];
    bySport[entry.sport].push(entry);
  }

  for (const sportEntries of Object.values(bySport)) {
    sportEntries.sort((a, b) => b.ev.seasonTotal - a.ev.seasonTotal);
    const topEV    = sportEntries[0].ev.seasonTotal;
    const bottomEV = sportEntries[sportEntries.length - 1].ev.seasonTotal;
    const sportRange = Math.max(topEV - bottomEV, 1);

    for (let i = 0; i < sportEntries.length; i++) {
      const entry  = sportEntries[i];
      const nextEV = i < sportEntries.length - 1
        ? sportEntries[i + 1].ev.seasonTotal
        : entry.ev.seasonTotal; // last entry: gap = 0

      const gap           = Math.max(entry.ev.seasonTotal - nextEV, 0);
      const normalizedGap = gap / sportRange;
      const relativePos   = entry.ev.seasonTotal / Math.max(topEV, 1);
      const scarcityBonus = parseFloat(
        (normalizedGap * Math.pow(relativePos, ADP_SCARCITY_K) * topEV * ADP_SCARCITY_WEIGHT).toFixed(2)
      );

      entry.evGap         = parseFloat(gap.toFixed(2));
      entry.scarcityBonus = scarcityBonus;
      entry.adpScore      = parseFloat((entry.ev.seasonTotal + scarcityBonus).toFixed(2));
    }
  }
}

/**
 * Convert pipeline live data for a sport into the { name, odds } format expected by buildEntries.
 * Uses consensusOdds if available, falls back to bestOdds.
 * Also preserves multi-source fields for enrichment.
 */
function pipelineToRawItems(pipelineData) {
  if (!pipelineData || !pipelineData.entries) return [];
  return pipelineData.entries.map((entry) => ({
    name: entry.name,
    odds: entry.consensusOdds || entry.bestOdds,
    // Multi-source enrichment fields
    oddsBySource: entry.oddsBySource || {},
    bestOdds: entry.bestOdds,
    bestOddsSource: entry.bestOddsSource,
  }));
}

/**
 * Build the full board entries from raw odds data, merged with rosters.
 * Roster entries with no API match become placeholders.
 *
 * @param rawBySport - { sportId: [{ name, odds, oddsBySource?, bestOdds?, bestOddsSource? }] }
 * @param historicalBySport - { sportId: { entries: [{ nameNormalized, history, trend, ... }] } } (optional)
 */
function buildEntries(rawBySport, historicalBySport = {}) {
  const entries = [];

  for (const sport of SPORTS) {
    if (!sport.active) continue;

    const apiItems = rawBySport[sport.id] || [];
    const rosterNames = ROSTERS[sport.id] || [];

    // Build historical lookup for this sport
    const historicalData = historicalBySport[sport.id];
    const historicalLookup = new Map();
    if (historicalData && historicalData.entries) {
      for (const h of historicalData.entries) {
        historicalLookup.set(h.nameNormalized, h);
      }
    }

    // Build normalized lookup from API items
    const apiLookup = new Map();
    for (const item of apiItems) {
      apiLookup.set(normalize(item.name), item);
    }

    // Track which API items were matched by roster
    const matchedApiKeys = new Set();

    // Process roster entries
    for (const name of rosterNames) {
      const key = normalize(name);
      const apiItem = apiLookup.get(key);

      if (apiItem) {
        matchedApiKeys.add(key);
        const historical = historicalLookup.get(key);

        // Calculate EV, optionally weighted by historical data
        let ev;
        if (historical && historical.history && historical.history.length >= 2) {
          ev = calculateHistoricallyWeightedEV(
            apiItem.odds, sport.category, sport.eventsPerSeason, historical
          );
        } else {
          ev = calculateSeasonTotalEV(apiItem.odds, sport.category, sport.eventsPerSeason);
        }

        entries.push({
          id: `${sport.id}-${slugify(name)}`,
          name,
          sport: sport.id,
          sportName: sport.name,
          sportIcon: sport.icon,
          scoringType: sport.category,
          odds: apiItem.odds,
          ev,
          adpScore: 0,
          scarcityBonus: 0,
          evGap: 0,
          isPlaceholder: false,
          drafted: false,
          draftedBy: null,
          // Multi-source enrichment (backward-compatible optional fields)
          ...(apiItem.oddsBySource && Object.keys(apiItem.oddsBySource).length > 0 && {
            oddsBySource: apiItem.oddsBySource,
            bestOdds: apiItem.bestOdds,
            bestOddsSource: apiItem.bestOddsSource,
          }),
          ...(historical && {
            historicalTrend: historical.trend,
          }),
        });
      } else {
        entries.push({
          id: `${sport.id}-${slugify(name)}`,
          name,
          sport: sport.id,
          sportName: sport.name,
          sportIcon: sport.icon,
          scoringType: sport.category,
          odds: null,
          ev: null,
          adpScore: -1,
          scarcityBonus: 0,
          evGap: 0,
          isPlaceholder: true,
          drafted: false,
          draftedBy: null,
        });
      }
    }

    // Add API items not matched by any roster entry
    for (const item of apiItems) {
      const key = normalize(item.name);
      if (!matchedApiKeys.has(key)) {
        const historical = historicalLookup.get(key);

        let ev;
        if (historical && historical.history && historical.history.length >= 2) {
          ev = calculateHistoricallyWeightedEV(
            item.odds, sport.category, sport.eventsPerSeason, historical
          );
        } else {
          ev = calculateSeasonTotalEV(item.odds, sport.category, sport.eventsPerSeason);
        }

        entries.push({
          id: `${sport.id}-${slugify(item.name)}`,
          name: item.name,
          sport: sport.id,
          sportName: sport.name,
          sportIcon: sport.icon,
          scoringType: sport.category,
          odds: item.odds,
          ev,
          adpScore: 0,
          scarcityBonus: 0,
          evGap: 0,
          isPlaceholder: false,
          drafted: false,
          draftedBy: null,
          ...(item.oddsBySource && Object.keys(item.oddsBySource).length > 0 && {
            oddsBySource: item.oddsBySource,
            bestOdds: item.bestOdds,
            bestOddsSource: item.bestOddsSource,
          }),
          ...(historical && {
            historicalTrend: historical.trend,
          }),
        });
      }
    }
  }

  // Apply scarcity premium to real entries, then sort
  applyScarcityPremium(entries);
  entries.sort((a, b) => {
    if (a.isPlaceholder && !b.isPlaceholder) return 1;
    if (!a.isPlaceholder && b.isPlaceholder) return -1;
    return b.adpScore - a.adpScore;
  });
  entries.forEach((e, i) => {
    e.adpRank = i + 1;
  });

  return entries;
}

export default function useOddsData() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { apiKey } = loadSettings();

    const activeSports = SPORTS.filter((s) => s.active);
    const sportIds = activeSports.map((s) => s.id);

    // Step 1: Try loading pipeline data first
    let pipelineData = null;
    try {
      pipelineData = await loadAllPipelineData(sportIds);
    } catch {
      // Pipeline data not available — continue with API fallback
    }

    const rawBySport = {};
    const historicalBySport = pipelineData?.historicalBySport || {};

    // Step 2: For each sport, prefer pipeline data, fall back to direct API
    await Promise.all(
      activeSports.map(async (sport) => {
        // Check if pipeline has live data for this sport
        const pipelineLive = pipelineData?.liveBySport?.[sport.id];
        if (pipelineLive && pipelineLive.entries && pipelineLive.entries.length > 0) {
          rawBySport[sport.id] = pipelineToRawItems(pipelineLive);
          return;
        }

        // Fallback to direct Odds API call (existing behavior)
        if (!sport.apiKey || !apiKey) {
          rawBySport[sport.id] = [];
          return;
        }
        const result = await fetchOddsForSport(sport.apiKey, apiKey);
        rawBySport[sport.id] = result || [];
      })
    );

    setEntries(buildEntries(rawBySport, historicalBySport));
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { refreshInterval } = loadSettings();
    const intervalMs = (refreshInterval || 24) * 60 * 60 * 1000;
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh]);

  return { entries, loading, lastUpdated, refresh };
}
