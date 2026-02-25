import { useState, useEffect, useCallback } from 'react';
import SPORTS from '../data/sports';
import MOCK_ENTRIES from '../data/mockData';
import { fetchOddsForSport } from '../services/oddsApi';
import { calculateSeasonTotalEV } from '../services/evCalculator';
import { slugify } from '../utils/formatters';
import { loadSettings } from '../utils/storage';

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

  // Sort by seasonTotal EV descending and assign ADP rank
  entries.sort((a, b) => b.ev.seasonTotal - a.ev.seasonTotal);
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
