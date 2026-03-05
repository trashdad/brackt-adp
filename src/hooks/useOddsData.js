import { useState, useEffect, useCallback, useRef } from 'react';
import SPORTS from '../data/sports';
import ROSTERS from '../data/rosters';
import { calculateSeasonTotalEV, calculateHistoricallyWeightedEV, applyPositionalScarcity } from '../services/evCalculator';
import { slugify } from '../utils/formatters';
import { fetchAppConfig } from '../utils/storage';
import { loadAllPipelineData } from '../services/dataLoader';
import { americanToImpliedProbability, probabilityToAmerican } from '../services/oddsConverter';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Convert a unified odds store entry into the raw item format expected by buildEntries.
 * The store entries already have pre-computed consensus, bestOdds, bestSource.
 */
function storeEntryToRawItem(entry) {
  const oddsBySource = {};
  for (const [src, val] of Object.entries(entry.sources || {})) {
    oddsBySource[src] = val.odds;
  }

  // Build oddsByTournament in the format expected downstream
  const oddsByTournament = {};
  for (const [tId, tSources] of Object.entries(entry.tournamentSources || {})) {
    oddsByTournament[tId] = {};
    for (const [src, val] of Object.entries(tSources)) {
      oddsByTournament[tId][src] = val.odds;
    }
  }

  return {
    name: entry.name,
    odds: entry.consensus,
    oddsBySource,
    oddsByTournament,
    bestOdds: entry.bestOdds,
    bestOddsSource: entry.bestSource,
    tournaments: entry.tournaments || {},
  };
}

/**
 * Convert pipeline live data for a sport into the { name, odds } format expected by buildEntries.
 */
function pipelineToRawItems(pipelineData) {
  if (!pipelineData || !pipelineData.entries) return [];
  return pipelineData.entries
    .filter((entry) => !/^[+-]?[\d,]+$/.test(entry.name.replace(/\s/g, '')))
    .map((entry) => ({
      name: entry.name,
      odds: entry.consensusOdds || entry.bestOdds,
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
 * @param socialScores - { entryId: { socialScore, socialQuotient } } (optional)
 */
function buildEntries(rawBySport, historicalBySport = {}, scarcityModifier, socialScores = {}) {
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

    // For items with tournament data but no main odds, compute average
    for (const item of apiItems) {
      if (!item.odds && item.tournaments && Object.keys(item.tournaments).length > 0) {
        let sumProb = 0, count = 0;
        for (const t of Object.values(item.tournaments)) {
          if (t.consensus) {
            sumProb += americanToImpliedProbability(t.consensus);
            count++;
          }
        }
        if (count > 0 && sport.tournaments) {
          const avgProb = sumProb / count;
          const avgOdds = probabilityToAmerican(avgProb);
          if (avgOdds != null) item.odds = (avgOdds > 0 ? '+' : '') + avgOdds;
        }
      }
    }

    // Process roster entries
    for (const name of rosterNames) {
      const key = normalize(name);
      if (processedRosterKeys.has(key)) continue;
      processedRosterKeys.add(key);

      const apiItem = apiLookup.get(key);
      const entryId = `${sport.id}-${slugify(name)}`;
      const social = socialScores[entryId] || { pos: 0, neg: 0, adjSq: 1.0, mktVsExp: 0 };

      if (apiItem) {
        matchedApiKeys.add(key);
        const historical = historicalLookup.get(key);

        let ev;
        if (historical && historical.history && historical.history.length >= 2) {
          ev = calculateHistoricallyWeightedEV(
            apiItem.odds, sport.category, sport.eventsPerSeason, historical, sport.id
          );
        } else {
          ev = calculateSeasonTotalEV(apiItem.odds, sport.category, sport.eventsPerSeason, sport.id);
        }
        if (sport.evMultiplier != null && ev) {
          ev = { ...ev, singleEvent: ev.singleEvent * sport.evMultiplier, seasonTotal: ev.seasonTotal * sport.evMultiplier };
        }

        entries.push({
          id: entryId,
          name,
          nameNormalized: normalize(name),
          sport: sport.id,
          sportName: sport.name,
          sportIcon: sport.icon,
          scoringType: sport.category,
          odds: apiItem.odds,
          ev,
          socialPos: social.pos || 0,
          socialNeg: social.neg || 0,
          adjSq: social.adjSq || 1.0,
          mktVsExp: social.mktVsExp || 0,
          expertComments: social.expertComments || [],
          socialSources: social.sources || {},
          notes: social.sources?.expert?.notes || '',
          trapSignal: social.trapSignal || 'NEUTRAL',
          adpScore: 0,
          scarcityBonus: 0,
          evGap: 0,
          isPlaceholder: false,
          drafted: false,
          draftedBy: null,
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
          id: entryId,
          name,
          nameNormalized: normalize(name),
          sport: sport.id,
          sportName: sport.name,
          sportIcon: sport.icon,
          scoringType: sport.category,
          odds: null,
          ev: null,
          socialPos: social.pos || 0,
          socialNeg: social.neg || 0,
          adjSq: social.adjSq || 1.0,
          mktVsExp: social.mktVsExp || 0,
          expertComments: social.expertComments || [],
          socialSources: social.sources || {},
          notes: social.sources?.expert?.notes || '',
          trapSignal: social.trapSignal || 'NEUTRAL',
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
        matchedApiKeys.add(key);
        const historical = historicalLookup.get(key);
        const entryId = `${sport.id}-${slugify(item.name)}`;
        const social = socialScores[entryId] || { pos: 0, neg: 0, adjSq: 1.0, mktVsExp: 0 };

        let ev;
        if (historical && historical.history && historical.history.length >= 2) {
          ev = calculateHistoricallyWeightedEV(
            item.odds, sport.category, sport.eventsPerSeason, historical, sport.id
          );
        } else {
          ev = calculateSeasonTotalEV(item.odds, sport.category, sport.eventsPerSeason, sport.id);
        }
        if (sport.evMultiplier != null && ev) {
          ev = { ...ev, singleEvent: ev.singleEvent * sport.evMultiplier, seasonTotal: ev.seasonTotal * sport.evMultiplier };
        }

        entries.push({
          id: entryId,
          name: item.name,
          nameNormalized: normalize(item.name),
          sport: sport.id,
          sportName: sport.name,
          sportIcon: sport.icon,
          scoringType: sport.category,
          odds: item.odds,
          ev,
          socialPos: social.pos || 0,
          socialNeg: social.neg || 0,
          adjSq: social.adjSq || 1.0,
          mktVsExp: social.mktVsExp || 0,
          expertComments: social.expertComments || [],
          socialSources: social.sources || {},
          notes: social.sources?.expert?.notes || '',
          trapSignal: social.trapSignal || 'NEUTRAL',
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
    applyPositionalScarcity(sportEntries, scarcityModifier);
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

export default function useOddsData(scarcityModifier) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const activeSports = SPORTS.filter((s) => s.active);
    const sportIds = activeSports.map((s) => s.id);

    // Step 1: Load from unified odds store (primary source)
    const rawBySport = {};
    await Promise.all(
      activeSports.map(async (sport) => {
        try {
          const resp = await fetch(`/api/odds/${sport.id}`);
          if (resp.ok) {
            const storeData = await resp.json();
            if (storeData.entries && Object.keys(storeData.entries).length > 0) {
              rawBySport[sport.id] = Object.values(storeData.entries).map(storeEntryToRawItem);
              return;
            }
          }
        } catch { /* fall through to pipeline/API fallback */ }

        // Fallback: try pipeline data
        try {
          const pipeResp = await fetch(`/api/pipeline/live/${sport.id}`);
          if (pipeResp.ok) {
            const pipeData = await pipeResp.json();
            if (pipeData?.entries?.length > 0) {
              rawBySport[sport.id] = pipelineToRawItems(pipeData);
              return;
            }
          }
        } catch { /* continue */ }

        rawBySport[sport.id] = [];
      })
    );

    // Step 2: Load historical data for EV weighting
    let historicalBySport = {};
    try {
      const pipelineData = await loadAllPipelineData(sportIds);
      historicalBySport = pipelineData?.historicalBySport || {};
    } catch { /* historical data unavailable */ }

    // Step 3: Load social scores
    let socialScores = {};
    try {
      const socialScoresResp = await fetch('/api/social-scores');
      if (socialScoresResp.ok) {
        socialScores = await socialScoresResp.json();
      }
    } catch { /* continue without social scores */ }

    setEntries(buildEntries(rawBySport, historicalBySport, scarcityModifier, socialScores));
    setLastUpdated(new Date());
    setLoading(false);
  }, [scarcityModifier]);

  // Initial load + periodic refresh
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; });

  useEffect(() => {
    refreshRef.current();
    let timer;
    fetchAppConfig().then((cfg) => {
      const intervalMs = ((cfg.refreshInterval) || 24) * 60 * 60 * 1000;
      timer = setInterval(() => refreshRef.current(), intervalMs);
    });
    return () => { if (timer) clearInterval(timer); };
  }, []);

  return { entries, loading, lastUpdated, refresh };
}
