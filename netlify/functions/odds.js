/**
 * Unified odds API — Netlify Function.
 *
 * Routes (via netlify.toml redirect /api/odds/* → this function):
 *   GET   /api/odds/versions        → version numbers for all sports
 *   GET   /api/odds/:sportId        → full pre-computed odds for a sport
 *   PATCH /api/odds/:sportId        → merge source-specific odds into a sport
 */

import { readStore, writeStore } from './_store.js';

// Inline the odds converter functions to avoid cross-directory imports in Netlify Functions

function americanToImpliedProbability(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

function probabilityToAmerican(prob) {
  if (prob <= 0 || prob >= 1) return null;
  if (prob > 0.5) return Math.round((-prob * 100) / (1 - prob));
  return Math.round((100 * (1 - prob)) / prob);
}

function formatOdds(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function computeConsensus(oddsBySource) {
  const entries = Object.entries(oddsBySource);
  const parsed = entries
    .map(([src, val]) => [src, typeof val === 'string' ? parseFloat(val) : val])
    .filter(([, n]) => !isNaN(n));

  if (parsed.length === 0) return { consensus: null, bestOdds: null, bestSource: null };

  const probs = parsed.map(([src, odds]) => {
    const prob = odds < 0
      ? Math.abs(odds) / (Math.abs(odds) + 100)
      : 100 / (odds + 100);
    return [src, prob];
  });

  const totalImplied = probs.reduce((sum, [, p]) => sum + p, 0);
  const trueProbs = totalImplied > 1
    ? probs.map(([src, p]) => [src, p / totalImplied])
    : probs;

  const avgProb = trueProbs.reduce((s, [, p]) => s + p, 0) / trueProbs.length;
  const consensusNum = probabilityToAmerican(avgProb);
  const consensus = consensusNum != null ? formatOdds(consensusNum) : null;

  let bestSrc = null, bestVal = null, bestProb = Infinity;
  for (const [src, prob] of probs) {
    if (prob > 0 && prob < bestProb) {
      bestProb = prob;
      bestSrc = src;
      const rawOdds = parsed.find(([s]) => s === src)?.[1];
      bestVal = rawOdds != null ? formatOdds(rawOdds) : null;
    }
  }

  return { consensus, bestOdds: bestVal, bestSource: bestSrc };
}

// Sport IDs (hardcoded to avoid importing from src/)
const SPORT_IDS = [
  'afl', 'csgo', 'darts', 'fifa', 'f1', 'indycar', 'llws',
  'mlb', 'nba', 'ncaab', 'ncaaf', 'ncaaw', 'nfl', 'nhl',
  'pga', 'snooker', 'tennis_m', 'tennis_w', 'ucl', 'wnba',
];

const SAFE_ID = /^[a-z0-9_-]+$/i;

function emptySport() {
  return { version: 0, lastModified: null, entries: {} };
}

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
    entry.consensus = avgOdds != null ? formatOdds(avgOdds) : null;
    entry.bestOdds = null;
    entry.bestSource = null;
  }
}

export const handler = async (event) => {
  const subPath = event.path.replace(/^\/api\/odds\/?/, '');

  // GET /api/odds/versions
  if (subPath === 'versions' && event.httpMethod === 'GET') {
    const versions = {};
    await Promise.all(
      SPORT_IDS.map(async (sportId) => {
        const data = await readStore(`odds-${sportId}`);
        versions[sportId] = data?.version || 0;
      })
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(versions),
    };
  }

  // Extract sportId
  const sportId = subPath;
  if (!sportId || !SAFE_ID.test(sportId)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing sport ID' }) };
  }

  // GET /api/odds/:sportId
  if (event.httpMethod === 'GET') {
    const data = await readStore(`odds-${sportId}`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data && data.entries ? data : emptySport()),
    };
  }

  // PATCH /api/odds/:sportId
  if (event.httpMethod === 'PATCH') {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { source, entries: incomingEntries, tournament } = body;
    if (!source || typeof source !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "source" field' }) };
    }
    if (!incomingEntries || typeof incomingEntries !== 'object') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "entries" object' }) };
    }

    const store = (await readStore(`odds-${sportId}`)) || emptySport();
    if (!store.entries) store.entries = {};
    const now = new Date().toISOString();

    for (const [slug, { name, odds }] of Object.entries(incomingEntries)) {
      if (!store.entries[slug]) {
        store.entries[slug] = {
          name: name || slug,
          sources: {},
          tournamentSources: {},
          consensus: null,
          bestOdds: null,
          bestSource: null,
          tournaments: {},
        };
      }

      const entry = store.entries[slug];
      if (name) entry.name = name;

      if (tournament) {
        if (!entry.tournamentSources[tournament]) entry.tournamentSources[tournament] = {};
        entry.tournamentSources[tournament][source] = { odds, updatedAt: now };

        const tOddsBySource = {};
        for (const [src, val] of Object.entries(entry.tournamentSources[tournament])) {
          tOddsBySource[src] = val.odds;
        }
        const { consensus } = computeConsensus(tOddsBySource);
        if (!entry.tournaments) entry.tournaments = {};
        entry.tournaments[tournament] = { consensus };
      } else {
        entry.sources[source] = { odds, updatedAt: now };
      }

      recomputeEntryConsensus(entry);
    }

    store.version = (store.version || 0) + 1;
    store.lastModified = now;

    await writeStore(`odds-${sportId}`, store);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, version: store.version }),
    };
  }

  // DELETE /api/odds/:sportId
  if (event.httpMethod === 'DELETE') {
    await writeStore(`odds-${sportId}`, emptySport());
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
