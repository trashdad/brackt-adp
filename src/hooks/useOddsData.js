import { useState, useEffect, useCallback } from 'react';
import SPORTS from '../data/sports';
import ROSTERS from '../data/rosters';
import { fetchOddsForSport } from '../services/oddsApi';
import { calculateSeasonTotalEV, calculateHistoricallyWeightedEV, applyPositionalScarcity } from '../services/evCalculator';
import { slugify } from '../utils/formatters';
import { loadSettings } from '../utils/storage';
import { loadAllPipelineData } from '../services/dataLoader';
import { americanToImpliedProbability, removeVig, probabilityToAmerican } from '../services/oddsConverter';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Convert pipeline live data for a sport into the { name, odds } format expected by buildEntries.
 * Uses consensusOdds if available, falls back to bestOdds.
 * Also preserves multi-source fields for enrichment.
 */
function pipelineToRawItems(pipelineData) {
  if (!pipelineData || !pipelineData.entries) return [];
  return pipelineData.entries
    .filter((entry) => !/^[+-]?[\d,]+$/.test(entry.name.replace(/\s/g, '')))
    .map((entry) => ({
      name: entry.name,
      odds: entry.consensusOdds || entry.bestOdds,
      // Multi-source enrichment fields
      oddsBySource: entry.oddsBySource || {},
      oddsByTournament: entry.oddsByTournament || {},
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
    const processedRosterKeys = new Set();

    // Process roster entries
    for (const name of rosterNames) {
      const key = normalize(name);
      if (processedRosterKeys.has(key)) continue; // Skip if roster itself has duplicates
      processedRosterKeys.add(key);

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
          ...(apiItem.tournaments && Object.keys(apiItem.tournaments).length > 0 && {
            tournaments: apiItem.tournaments,
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

    // Add API items not matched by any roster entry, ensuring no duplicates
    for (const item of apiItems) {
      const key = normalize(item.name);
      if (!matchedApiKeys.has(key)) {
        matchedApiKeys.add(key); // Mark as matched/processed
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
          ...(item.tournaments && Object.keys(item.tournaments).length > 0 && {
            tournaments: item.tournaments,
          }),
          ...(historical && {
            historicalTrend: historical.trend,
          }),
        });
      }
    }
  }

  // Group real entries by sport and apply scarcity
  const bySport = {};
  for (const entry of entries) {
    if (entry.isPlaceholder) continue;
    if (!bySport[entry.sport]) bySport[entry.sport] = [];
    bySport[entry.sport].push(entry);
  }

  for (const sportEntries of Object.values(bySport)) {
    applyPositionalScarcity(sportEntries);
  }

  entries.sort((a, b) => {
    if (a.isPlaceholder && !b.isPlaceholder) return 1;
    if (!a.isPlaceholder && b.isPlaceholder) return -1;
    return (b.adpScore || 0) - (a.adpScore || 0);
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

    // Step 3: Merge manual odds from server
    const manualOddsResp = await fetch('/api/manual-odds').catch(() => null);
    const manualOdds = manualOddsResp?.ok ? await manualOddsResp.json() : {};
    for (const [entryId, manual] of Object.entries(manualOdds)) {
      const { sport, name, oddsBySource: manualSources, oddsByTournament: manualTournaments } = manual;
      if (!sport) continue;

      if (!rawBySport[sport]) rawBySport[sport] = [];
      const items = rawBySport[sport];
      const key = normalize(name);
      const existing = items.find((item) => normalize(item.name) === key);

      if (existing) {
        if (manualSources) {
          if (!existing.oddsBySource) existing.oddsBySource = {};
          for (const [src, odds] of Object.entries(manualSources)) {
            existing.oddsBySource[src] = odds;
          }
        }
        if (manualTournaments) {
          if (!existing.oddsByTournament) existing.oddsByTournament = {};
          for (const [tId, tSources] of Object.entries(manualTournaments)) {
            if (!existing.oddsByTournament[tId]) existing.oddsByTournament[tId] = {};
            for (const [src, odds] of Object.entries(tSources)) {
              existing.oddsByTournament[tId][src] = odds;
            }
          }
        }
      } else {
        // Create new raw item from manual data
        const newItem = { 
          name, 
          odds: null, 
          oddsBySource: manualSources ? { ...manualSources } : {},
          oddsByTournament: manualTournaments ? JSON.parse(JSON.stringify(manualTournaments)) : {}
        };
        items.push(newItem);
      }
    }

    // Step 4: For entries with multi-source odds, apply vig removal and set consensus
    for (const [sId, items] of Object.entries(rawBySport)) {
      const sport = SPORTS.find(s => s.id === sId);
      
      for (const item of items) {
        // Resolve consensus for main odds
        if (item.oddsBySource && Object.keys(item.oddsBySource).length > 0) {
          const { consensus } = removeVig(item.oddsBySource);
          if (consensus) {
            item.odds = consensus;
          } else if (!item.odds) {
            const firstOdds = Object.values(item.oddsBySource).find(Boolean);
            if (firstOdds) item.odds = firstOdds;
          }

          let bestSrc = null, bestVal = null, bestProb = Infinity;
          for (const [src, odds] of Object.entries(item.oddsBySource)) {
            const prob = americanToImpliedProbability(odds);
            if (prob > 0 && prob < bestProb) {
              bestProb = prob;
              bestSrc = src;
              bestVal = odds;
            }
          }
          if (bestSrc) {
            item.bestOdds = bestVal;
            item.bestOddsSource = bestSrc;
          }
        }

        // Resolve consensus and population for tournament odds
        const hasTournamentData = item.oddsByTournament && Object.keys(item.oddsByTournament).length > 0;
        
        if (hasTournamentData) {
          if (!item.tournaments) item.tournaments = {};
          let sumProb = 0;
          let count = 0;

          for (const [tId, tSources] of Object.entries(item.oddsByTournament)) {
            const { consensus } = removeVig(tSources);
            let tOdds = consensus;
            if (!tOdds) {
              const firstOdds = Object.values(tSources).find(Boolean);
              if (firstOdds) tOdds = firstOdds;
            }
            if (tOdds) {
              item.tournaments[tId] = { odds: tOdds };
              sumProb += americanToImpliedProbability(tOdds);
              count++;
            }
          }

          // For sports with tournament structure, ALWAYS set item.odds to the average
          // of available tournament odds. This is the canonical odds figure used for EV.
          if (count > 0 && sport?.tournaments) {
            const avgProb = sumProb / count;
            const avgOddsNum = probabilityToAmerican(avgProb);
            if (avgOddsNum != null) {
              item.odds = (avgOddsNum > 0 ? '+' : '') + avgOddsNum;
            }
          } else if (!item.odds && count > 0) {
            // Non-tournament sport with multi-source data: use average as fallback
            const avgProb = sumProb / count;
            const avgOddsNum = probabilityToAmerican(avgProb);
            if (avgOddsNum != null) {
              item.odds = (avgOddsNum > 0 ? '+' : '') + avgOddsNum;
            }
          }
        }
      }
    }

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
