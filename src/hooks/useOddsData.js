import { useState, useEffect, useCallback } from 'react';
import SPORTS from '../data/sports';
import MOCK_ENTRIES from '../data/mockData';
import { fetchOddsForSport } from '../services/oddsApi';
import { calculateSeasonTotalEV } from '../services/evCalculator';
import { slugify } from '../utils/formatters';
import { loadSettings } from '../utils/storage';

// Scarcity premium constants — controls how much intra-sport EV dominance boosts ADP rank.
// W: overall bonus strength (0.5 = up to ~50% of topEV added for a perfectly dominant entry)
// k: exponential decay exponent (2 = quadratic; only large gaps at the top get meaningful bonuses)
const ADP_SCARCITY_WEIGHT = 0.5;
const ADP_SCARCITY_K      = 2;

/**
 * For each entry, compute an adpScore = ev.seasonTotal + scarcityBonus.
 *
 * Within each sport, entries are ranked by ev.seasonTotal. The gap to the next-lower
 * entry is normalized by the sport's EV range, then weighted by the entry's relative
 * position (exponential decay). This rewards dominant entries that are significantly
 * better than their nearest peer — those must be drafted much earlier because early
 * draft capital is exponentially more valuable than later picks.
 *
 *   gap_i           = ev_i - ev_{i+1}
 *   normalizedGap_i = gap_i / sportRange
 *   relativePos_i   = ev_i / topEV_sport
 *   scarcityBonus_i = normalizedGap_i × relativePos_i^k × topEV_sport × W
 *   adpScore_i      = ev.seasonTotal + scarcityBonus_i
 *
 * Also sets entry.evGap (raw gap in EV pts) and entry.scarcityBonus on each entry.
 * ev.seasonTotal is never modified.
 */
function applyScarcityPremium(entries) {
  const bySport = {};
  for (const entry of entries) {
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
 * Build the full board entries from raw odds data.
 */
function buildEntries(rawBySport) {
  const entries = [];

  for (const sport of SPORTS) {
    if (!sport.active) continue;
    const items = rawBySport[sport.id] || [];

    for (const item of items) {
      const ev = calculateSeasonTotalEV(item.odds, sport.category, sport.eventsPerSeason);
      entries.push({
        id: `${sport.id}-${slugify(item.name)}`,
        name: item.name,
        sport: sport.id,
        sportName: sport.name,
        sportIcon: sport.icon,
        scoringType: sport.category,
        odds: item.odds,
        ev,
        drafted: false,
        draftedBy: null,
      });
    }
  }

  // Apply scarcity premium, then sort by adpScore and assign ADP rank
  applyScarcityPremium(entries);
  entries.sort((a, b) => b.adpScore - a.adpScore);
  entries.forEach((e, i) => {
    e.adpRank = i + 1;
  });

  return entries;
}

/**
 * Produce a sport -> entries mapping from mock data.
 */
function getMockBySport() {
  const map = {};
  for (const entry of MOCK_ENTRIES) {
    if (!map[entry.sport]) map[entry.sport] = [];
    map[entry.sport].push({ name: entry.name, odds: entry.odds });
  }
  return map;
}

export default function useOddsData() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { apiKey } = loadSettings();

    if (!apiKey) {
      // Use mock data
      const mockMap = getMockBySport();
      setEntries(buildEntries(mockMap));
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    // Try fetching from API, fall back to mock per sport
    const mockMap = getMockBySport();
    const rawBySport = {};

    const promises = SPORTS.filter((s) => s.active && s.apiKey).map(async (sport) => {
      const result = await fetchOddsForSport(sport.apiKey, apiKey);
      rawBySport[sport.id] = result && result.length > 0 ? result : (mockMap[sport.id] || []);
    });

    await Promise.all(promises);

    // Fill in sports without API keys with mock data
    for (const sport of SPORTS) {
      if (sport.active && !sport.apiKey) {
        rawBySport[sport.id] = mockMap[sport.id] || [];
      }
    }

    setEntries(buildEntries(rawBySport));
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, lastUpdated, refresh };
}
